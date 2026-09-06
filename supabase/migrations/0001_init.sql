-- Finance OS — initial schema (BLUEPRINT.md §5).
-- Plain SQL, no Supabase-CLI-specific syntax, so it applies unchanged to a
-- real Supabase project later. RLS uses app_current_user_id() (docs/DECISIONS.md)
-- so it works against local Postgres now and against auth.uid() on Supabase later.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Session-local "who is asking" — stands in for Supabase's auth.uid().
-- ---------------------------------------------------------------------------
create or replace function app_current_user_id() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$ language sql stable;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type bank_account_bucket as enum ('operating', 'tax', 'reserve', 'od', 'card');
create type user_role as enum ('owner', 'ops');
create type txn_source as enum ('csv', 'pdf', 'razorpay', 'manual');
create type category_group as enum (
  'revenue', 'direct_nonlabour', 'direct_labour', 'sales_labour', 'mgmt_labour',
  'opex', 'tax_gst', 'tax_tds', 'tax_income', 'loan_principal', 'loan_interest',
  'owner_draw', 'capex', 'transfer', 'other'
);
create type rule_match_type as enum ('party', 'contains', 'regex');
create type party_kind as enum ('customer', 'vendor', 'employee', 'government', 'bank', 'owner');
create type invoice_status as enum ('draft', 'sent', 'part_paid', 'paid', 'written_off');
create type bill_status as enum ('open', 'part_paid', 'paid');
create type labour_bucket as enum ('direct', 'sales', 'management');
create type cash_initiative_status as enum ('on_track', 'off_track', 'done');
create type message_channel as enum ('whatsapp', 'email');
create type message_status as enum ('queued', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table company (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  gstin text,
  pan text,
  udyam_no text,
  is_msme boolean not null default false,
  industry_template text not null,
  fy_start_month int not null default 4,
  currency text not null default 'INR',
  owner_market_salary_monthly bigint not null default 0, -- paise
  owner_bucket labour_bucket not null default 'direct',
  created_at timestamptz not null default now()
);

create table app_user (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name text not null,
  phone_whatsapp text not null unique,
  email text,
  roles user_role[] not null default array['owner','ops']::user_role[],
  notify_daily boolean not null default true,
  notify_weekly boolean not null default true,
  created_at timestamptz not null default now()
);

create table bank_account (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name text not null,
  bank text,
  masked_account_no text,
  bucket bank_account_bucket not null,
  opening_balance bigint not null default 0, -- paise
  opening_date date not null default current_date,
  credit_limit bigint,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table category (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company(id) on delete cascade, -- null = global default
  name text not null,
  "group" category_group not null,
  is_cash_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table party (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  name text not null,
  kind party_kind not null,
  gstin text,
  pan text,
  udyam_no text,
  is_msme boolean not null default false,
  payment_terms_days int not null default 0,
  tds_section text,
  tds_rate_pct numeric(5,2),
  whatsapp text,
  email text,
  opted_out boolean not null default false, -- v1 must, not a should: reminder opt-out
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table category_rule (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  match_type rule_match_type not null,
  pattern text not null,
  category_id uuid not null references category(id),
  party_id uuid references party(id),
  created_by uuid references app_user(id),
  hit_count int not null default 0,
  created_at timestamptz not null default now()
);

create table transaction (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  bank_account_id uuid not null references bank_account(id) on delete cascade,
  txn_date date not null,
  value_date date,
  description_raw text not null,
  amount bigint not null, -- paise, signed: credit +, debit -
  balance_after bigint,
  party_id uuid references party(id),
  category_id uuid references category(id),
  confidence numeric(4,3),
  source txn_source not null default 'manual',
  dedupe_hash text not null,
  matched_invoice_id uuid,
  matched_bill_id uuid,
  reviewed_by uuid references app_user(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, dedupe_hash)
);

create table invoice (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  party_id uuid not null references party(id),
  invoice_no text not null,
  invoice_date date not null,
  delivery_date date,
  due_date date not null,
  taxable_amount bigint not null,
  gst_rate_pct numeric(5,2) not null default 0,
  gst_amount bigint not null default 0,
  total_amount bigint not null,
  tds_expected_amount bigint not null default 0,
  amount_received bigint not null default 0,
  status invoice_status not null default 'draft',
  msme_deadline date,
  reminder_stage int not null default 0,
  payment_link_url text,
  revenue_stream text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table transaction
  add constraint transaction_matched_invoice_fk foreign key (matched_invoice_id) references invoice(id);

create table bill (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  party_id uuid not null references party(id),
  bill_no text,
  bill_date date not null,
  due_date date not null,
  total_amount bigint not null,
  gst_amount bigint not null default 0,
  amount_paid bigint not null default 0,
  status bill_status not null default 'open',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table transaction
  add constraint transaction_matched_bill_fk foreign key (matched_bill_id) references bill(id);

create table labour_cost (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  month char(7) not null, -- 'YYYY-MM'
  bucket labour_bucket not null,
  amount bigint not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (company_id, month, bucket, source)
);

create table target (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  metric text not null,
  value numeric not null,
  green_band numeric,
  amber_band numeric,
  effective_from date not null default current_date,
  created_at timestamptz not null default now()
);

create table kpi_snapshot (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  as_of_date date not null,
  metric text not null,
  value numeric not null,
  trend_13w jsonb not null default '[]',
  colour text,
  inputs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (company_id, as_of_date, metric)
);

create table cash_initiative (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  quarter text not null,
  lever text not null,
  description text,
  owner_user_id uuid references app_user(id),
  baseline_value numeric,
  target_value numeric,
  current_value numeric,
  status cash_initiative_status not null default 'on_track',
  created_at timestamptz not null default now()
);

create table message_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  to_party_id uuid references party(id),
  to_user_id uuid references app_user(id),
  channel message_channel not null,
  template text not null,
  rendered_body text not null,
  sent_at timestamptz,
  status message_status not null default 'queued',
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table import_batch (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references company(id) on delete cascade,
  bank_account_id uuid not null references bank_account(id),
  file_name text not null,
  file_hash text not null,
  rows_total int not null default 0,
  rows_new int not null default 0,
  rows_duplicate int not null default 0,
  rows_error int not null default 0,
  uploaded_by uuid references app_user(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on transaction (company_id, txn_date);
create index on transaction (company_id, category_id);
create index on invoice (company_id, status, due_date);
create index on bill (company_id, status, due_date);
create index on kpi_snapshot (company_id, metric, as_of_date);
create index on party (company_id, kind);

-- ---------------------------------------------------------------------------
-- Row-Level Security — every tenant table scoped by company_id.
-- ---------------------------------------------------------------------------

-- security definer + owned by a superuser (the migrator role) so this lookup
-- bypasses RLS on app_user itself — without it, every policy that queries
-- app_user to find "which company is this caller in" recurses into app_user's
-- own RLS policy infinitely.
create or replace function app_current_company_id() returns uuid as $$
  select company_id from app_user where id = app_current_user_id();
$$ language sql stable security definer set search_path = public;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'company','app_user','bank_account','category','category_rule','party',
    'transaction','invoice','bill','labour_cost','target','kpi_snapshot',
    'cash_initiative','message_log','import_batch'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- company: visible/writable only to users who belong to it.
create policy company_isolation on company
  using (id = app_current_company_id())
  with check (id = app_current_company_id());

-- app_user: visible/writable only within the caller's own company.
create policy app_user_isolation on app_user
  using (company_id = app_current_company_id())
  with check (company_id = app_current_company_id());

-- every other tenant table follows the same company_id-scoped shape.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'bank_account','category','category_rule','party','transaction','invoice',
    'bill','labour_cost','target','kpi_snapshot','cash_initiative','message_log','import_batch'
  ])
  loop
    execute format(
      'create policy %I_isolation on %I using (company_id = app_current_company_id()) with check (company_id = app_current_company_id())',
      t, t
    );
  end loop;
end $$;

-- global (company_id is null) categories are readable by everyone.
create policy category_global_read on category
  for select using (company_id is null);
