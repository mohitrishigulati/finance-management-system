# Finance OS — System Blueprint for Claude Code

**BuildOur AI Foundations · Vol. 03 companion build file**
**Version 1.0 · September 2026**

> A general-purpose finance management system for Indian small and mid-size businesses (₹50 lakh – ₹50 crore turnover), built on the Seven-Layer Money Framework from *Think Like a CFO*. Designed once as a shared core, then customised per client through configuration, not code.

---

## 0. How to use this file

This file is the **system brief** (Vol. 01) and the **design language** (Vol. 02) for one product: Finance OS. Hand it to Claude Code at the start of the build session and keep it in the repository root.

```
/finance-management-system
  CLAUDE.md              ← points here; short operating instructions for Claude Code
  BLUEPRINT.md           ← this file (the source of truth for WHAT)
  DESIGN.md              ← Section 15 of this file, extracted (the source of truth for LOOK)
  FORMULAS.md            ← Section 9 of this file, extracted (the source of truth for MATH)
  /config/templates/     ← industry templates (Section 13)
  /apps/web              ← Next.js app
  /supabase              ← migrations, RLS policies, edge functions
  /packages/finance-core ← pure TypeScript: formulas, classifiers, formatters (no I/O)
  /tests                 ← acceptance tests from Section 17
  /docs                  ← source narrative (Think Like a CFO) and build decisions log
```

**Suggested `CLAUDE.md`:**

```md
Read BLUEPRINT.md before any task. Formulas live in FORMULAS.md and packages/finance-core;
never re-implement a formula in a screen. Visual rules live in DESIGN.md; never invent a
colour, radius or spacing outside it. Build in the slice order of BLUEPRINT.md Section 16.
Every slice ends with its acceptance test passing and one screenshot on a 390px viewport.
Report deviations from DESIGN.md before adding any new screen. Indian formatting everywhere:
₹12,34,567 · 23 Aug 2026 · FY26-27 / Q2 FY27. Never store bank credentials.
```

**Kick-off prompt for the first session:**

> "Read BLUEPRINT.md end to end. Interrogate it: list holes, risks and simpler versions, one question at a time, before writing any code. Then build Slice 1 (Section 16) only."

---

## 1. Layer 1 · The Problem

**One sentence, one number.**
Indian business owners see their money once a month, three weeks late, formatted for the government. They cannot answer "how many days of cash do I have?", "how long until an invoice becomes cash?", or "what did I really earn after paying myself?" — and so most growing businesses drift onto an overdraft they never intended to have, and some "grow broke" while their P&L shows a profit (Miltz reports inadequate cash flow in 80–90% of the businesses his team audits).

**The number the system must move (the scoreboard from day one):**
- Primary: **Runway in days** (cash ÷ average daily outflow).
- Secondary: **Overdue receivables in ₹**, **Cash Conversion Cycle in days**, **True profit %**.

If these four are not visibly moving within 90 days of go-live, the system is not done, however finished it looks.

**What this is NOT:** an accounting package, a GST filing tool, a Tally replacement, a bank aggregator, a payment gateway. It sits *above* those and reads from them.

---

## 2. Layer 2 · The Users

| User | Needs to (verbs) | Device / moment | Patience |
|---|---|---|---|
| **Owner** (CFO-of-one) | See runway, overdue, seven numbers; approve a category rule; choose the quarter's lever; read the Monday message | Phone, WhatsApp, 30 seconds between calls | **Low** — design for this person |
| **Ops / Admin** (the "Ritu") | Upload statements, categorise exceptions, raise invoices, send reminders, mark payments, move money between accounts when told | Laptop, mornings; phone otherwise | Moderate |
| **CA / Accountant** | Export decision-book vs compliance-book reconciliation, GST liability, TDS ledger, quarterly | Laptop, quarterly | High, but zero tolerance for wrong numbers |
| **Customers / Vendors** | Receive invoices, reminders, payment links | WhatsApp / email | Never log in |
| **BuildOur operator** (you) | Provision a new company, choose a template, set targets, monitor health across tenants | Laptop | Moderate |

**v1 rule:** two roles log in (Owner, Ops). CA gets exports, not a login. Customers and vendors get WhatsApp. This halves the build.

---

## 3. Layer 3 · The Solution (the loop)

Seven boxes, input to output, every step labelled AUTO / AI / HUMAN.

```
1  Money moves in the bank → statement uploaded (CSV/PDF/XLS) or
   payment webhook (Razorpay) lands ............................................ AUTO
                    ↓
2  Every transaction is parsed, deduplicated, and categorised: party, category,
   account bucket (Operating/Tax/Reserve), direct vs opex vs labour ............. AI
                    ↓
3  Low-confidence categorisations (< 0.8) queue for Ops; approved answers become
   permanent rules for that party ............................................... HUMAN
                    ↓
4  Nightly, finance-core recomputes the seven numbers, GST liability, TDS
   receivable, ageing, LER, Power of One, and 13-week trends ................... AUTO
                    ↓
5  Receivables past due (or past the MSME 45-day clock) enter a reminder
   sequence: T-5 nudge, T+1, T+7, T+15, with UPI/Razorpay link ................ AUTO
                    ↓
6  Ops works the Collect queue: one tap to send the drafted reminder,
   record a payment, or escalate to Owner ....................................... HUMAN
                    ↓
7  Daily 6pm cash message; Monday 9am seven-number scoreboard with AI narrative
   (what moved, why, one recommended action) to Owner's WhatsApp ............... AUTO / AI
                    ↺
   Owner picks one lever per quarter; system tracks it as a Rock on the scoreboard.
```

**Seven-box test passed:** if you cannot draw it in seven boxes you are building two systems. We are building one: *bank in → numbers out → one human decision a quarter.*

---

## 4. Layer 4 · Features

### MUST (v1 ships these only)
1. **Company setup wizard** — legal name, GSTIN, PAN, Udyam no., FY start (April), industry template, owner market salary, three bank accounts (Operating / Tax / Reserve) with opening balances, target values for the seven numbers.
2. **Statement import** — CSV/XLSX from the top Indian banks (HDFC, ICICI, SBI, Axis, Kotak, Yes, IndusInd, IDFC First) plus a generic column-mapper; PDF via text extraction with confirmation table. Idempotent (re-uploading the same month adds nothing).
3. **AI categorisation** with a rule engine on top (party → category memory); exceptions queue.
4. **Parties** — customers and vendors with GSTIN, payment terms in days, TDS section/rate if applicable, MSME flag, WhatsApp number.
5. **Invoices (receivables)** — create/import, GST computed on invoice date, TDS expected, due date, status, ageing, MSME 45-day clock. Manual mark-paid and auto-match to incoming bank credits.
6. **Bills (payables)** — vendor bills with due dates, for payable days and AP ageing.
7. **The seven numbers**, computed nightly and on demand: Runway · CCC · True Profit % · Direct/Sales/Mgmt LER · Power of One table · Core Capital fill % · Overdue receivables. All formulas from Section 9.
8. **Screens (4 + setup):** Cash Today · Collect · Scoreboard · Levers · Setup. (Section 10.)
9. **WhatsApp messages:** daily 6pm cash; Monday 9am scoreboard; reminder sequence to customers. (Section 11.)
10. **Exports for CA:** transactions with categories (CSV), GST liability by month, TDS receivable ledger by party, decision-book vs compliance-book bridge (owner salary adjustment, tax parked vs due).
11. **Multi-tenant** from day one: every row carries `company_id`; RLS enforced.

### SHOULD (after two weeks of daily use by two real companies)
- Razorpay webhook for automatic receipt matching.
- Tally XML / Zoho Books CSV import of sales & purchase registers.
- Waterfall chart: gross margin by customer / product / location.
- Budget vs actual by category.
- Cash forecast 13 weeks forward (committed receivables + payables + recurring).
- Employee register with labour bucket (direct / sales / management) for automatic LER; until then labour is entered as monthly figures in Setup.
- Bank-feed via Account Aggregator (Sahamati) once a licensed FIU partner is chosen.

### LATER (parked, in writing)
- GST return preparation or filing · payroll · inventory management · multi-currency · investor reporting · full double-entry ledger · mobile native apps · white-label per client domain · marketplace of industry templates.

**Must test:** cover a feature with your hand and re-read the loop in Section 3. If the loop still works, it is not a Must.

---

## 5. Layer 5 · The Data

Nouns, plain-word fields, relationships as sentences. No fact stored twice; every derived number is computed by `finance-core` and cached in `kpi_snapshot`, never hand-edited.

### 5.1 Entities

**company** — id, name, legal_name, gstin, pan, udyam_no, industry_template, fy_start_month (default 4), currency (INR), owner_market_salary_monthly, created_at.

**user** — id, company_id, name, phone_whatsapp, email, role (`owner` | `ops`), notify_daily (bool), notify_weekly (bool).

**bank_account** — id, company_id, name, bank, masked_account_no (last 4 only), bucket (`operating` | `tax` | `reserve` | `od` | `card`), opening_balance, opening_date, current_balance (derived, cached), credit_limit (for od/card).

**transaction** — id, company_id, bank_account_id, txn_date, value_date, description_raw, amount (signed: credit +, debit −), balance_after (if present), party_id (nullable), category_id, confidence (0–1), source (`csv` | `pdf` | `razorpay` | `manual`), dedupe_hash (bank + date + amount + description), matched_invoice_id / matched_bill_id (nullable), reviewed_by (nullable).

**category** — id, company_id (null = global default), name, group (`revenue` | `direct_nonlabour` | `direct_labour` | `sales_labour` | `mgmt_labour` | `opex` | `tax_gst` | `tax_tds` | `tax_income` | `loan_principal` | `loan_interest` | `owner_draw` | `capex` | `transfer` | `other`), is_cash_only (bool — e.g. transfers and loan principal do not hit P&L).

**category_rule** — id, company_id, match_type (`party` | `contains` | `regex`), pattern, category_id, party_id (nullable), created_by, hit_count.

**party** — id, company_id, name, kind (`customer` | `vendor` | `employee` | `government` | `bank` | `owner`), gstin, pan, udyam_no, is_msme (bool), payment_terms_days, tds_section (e.g. `194J`, `194C`), tds_rate_pct, whatsapp, email, notes.

**invoice** — id, company_id, party_id, invoice_no, invoice_date, delivery_date (for billing-cycle days), due_date, taxable_amount, gst_rate_pct, gst_amount, total_amount, tds_expected_amount, amount_received, status (`draft` | `sent` | `part_paid` | `paid` | `written_off`), msme_deadline (delivery_date + 45 if company.is_msme), reminder_stage (0–4), payment_link_url.

**bill** — id, company_id, party_id, bill_no, bill_date, due_date, total_amount, gst_amount, amount_paid, status.

**labour_cost** — id, company_id, month (YYYY-MM), bucket (`direct` | `sales` | `management`), amount, source (`manual` | `payroll_import`). Owner market salary is written here automatically as `direct` or `management` per Setup answer.

**target** — id, company_id, metric (enum of the seven + sub-metrics), value, green_band, amber_band, effective_from.

**kpi_snapshot** — id, company_id, as_of_date, metric, value, trend_13w (json array), colour (`green` | `amber` | `red`), inputs (json — every input used, for auditability).

**cash_initiative** (the quarterly Rock) — id, company_id, quarter (e.g. `Q2 FY27`), lever (one of the seven), description, owner_user_id, baseline_value, target_value, current_value, status.

**message_log** — id, company_id, to_party_id / to_user_id, channel (`whatsapp` | `email`), template, rendered_body, sent_at, status, provider_message_id.

**import_batch** — id, company_id, bank_account_id, file_name, file_hash, rows_total, rows_new, rows_duplicate, rows_error, uploaded_by, created_at.

### 5.2 Relationships (as sentences)
- A Company has many Users, Bank Accounts, Parties, Categories, Rules, Invoices, Bills, Labour Costs, Targets, Snapshots, Initiatives.
- A Bank Account has many Transactions.
- A Transaction belongs to one Category and optionally one Party; it may match at most one Invoice or one Bill.
- A Party has many Invoices (if customer) or Bills (if vendor).
- An Invoice has many Message Log entries (reminders).
- A Category Rule points to one Category and optionally one Party.
- A KPI Snapshot is derived from Transactions, Invoices, Bills, Labour Costs and Targets — and stores the inputs it used.

### 5.3 Data rules
- Money stored as `bigint` paise. Never floats. Display via `formatINR()`.
- All dates `date` (no time) except `sent_at`/`created_at`. Timezone Asia/Kolkata.
- `dedupe_hash` is unique per company. Re-import is safe.
- Deletions are soft (`deleted_at`). Financial rows are never hard-deleted.
- Every derived value stores its inputs (json). If an owner asks "why is runway 9 days?", the answer is in the row.

---

## 6. Layer 6 · The Stack

Five organs. Boring, popular, managed.

| Organ | Choice | Why |
|---|---|---|
| **Screens** | Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, Recharts | Phone-first; AI knows it best |
| **Brain** | Next.js server actions + Supabase Edge Functions (Deno) for nightly compute and webhooks; `pg_cron` for schedules | Managed, no servers |
| **Memory** | Supabase Postgres with Row-Level Security; Supabase Storage for statement files (encrypted at rest, 90-day retention default) | Multi-tenant by RLS |
| **Judgment** | Claude API (`claude-sonnet-4-6` default; `claude-haiku-4-5` for bulk categorisation) via `packages/finance-core/ai` | Categorise, explain, narrate, recommend |
| **Bridges** | WhatsApp Cloud API (Meta) — or Interakt/Gupshup/AiSensy as BSP; Razorpay webhooks + Payment Links API; CSV/XLSX/PDF parsers (`papaparse`, `xlsx`, `pdf-parse`); Resend for email fallback; Google Sheets export (optional) | What Indian SMBs already use |
| **Hosting** | Vercel (web), Supabase (db/functions), Sentry (errors) | Managed |

**Pure core rule:** `packages/finance-core` has zero I/O. Formulas, classifiers' prompt builders, formatters, and template loaders are pure functions with unit tests. Screens and functions import from it. This is what lets one core serve many clients.

**Estimated running cost per company (v1):** Supabase Pro share + Vercel share ≈ ₹300–600/mo; Claude API ≈ ₹150–400/mo (≈ 500 transactions categorised + 5 narratives); WhatsApp ≈ ₹0.15–0.80 per message → ₹100–300/mo. **Target ≤ ₹1,500/company/month all-in.**

---

## 7. Layer 7 · The Scale

Three numbers, today and in twelve months.

| | Today (pilot) | 12 months |
|---|---|---|
| **Companies** | 2–5 | 300–1,000 |
| **Users** | ≤ 10 | ≤ 3,000 |
| **Transactions / company / month** | 200–2,000 | up to 20,000 (retail) |
| **AI calls / day (all tenants)** | < 200 | 20,000–50,000 |
| **WhatsApp messages / day** | < 50 | 5,000–15,000 |

**Design implications now:**
- `company_id` on every table; RLS from Slice 1.
- Categorisation is batched (50 transactions per Claude call) and rule-first (rules resolve ~80% after month 2; AI handles the rest).
- Nightly compute is per-company, queued, idempotent; can re-run any date.
- Templates and targets are data, not code — a new industry is a JSON file.
- Statement parsers are plugins keyed by bank; adding a bank never touches core.

**Build for 10, design for 1,000.** One sentence in every Claude Code prompt: *"Assume up to 1,000 companies within a year; keep the data layer clean and the parts separate."*

---

## 8. The Seven Numbers (what the system exists to compute)

| # | Layer | Metric | Unit | Default target | Colour bands |
|---|---|---|---|---|---|
| 1 | Cash | **Runway** | days | ≥ 60 | green ≥ 60 · amber 30–59 · red < 30 |
| 1 | Cash | Core Capital fill | % | 100% | green ≥ 100 · amber 50–99 · red < 50 |
| 2 | Cycle | **Cash Conversion Cycle** | days | industry template | green ≤ target · amber ≤ target+15 · red beyond |
| 2 | Cycle | Overdue receivables | ₹, count | 0 | green 0 · amber < 10% of monthly revenue · red beyond |
| 3 | Profit | **True pretax profit %** | % | 10% yr-1, 15% yr-2 | green ≥ 15 · amber 10–14.9 · red < 10 (< 5 = "life support") |
| 3 | Profit | Gross margin (₹, MTD vs target) | ₹ | template | trend-based |
| 4 | Labour | **Direct LER** (+ Sales, Mgmt) | ratio | template | green ≥ last-15%-month value · amber −10% · red below |
| 5 | Levers | Power of One table + chosen lever progress | ₹ / % | quarter Rock | Rock on/off track |
| 5 | Levers | Return on Net Assets | % | ≥ 30% | green ≥ 30 · amber 20–29 · red < 20 |
| 6 | Forces | Tax parked vs tax due; OD/card balance | ₹ | parked ≥ due; OD = 0 | green/amber/red |
| 7 | Scoreboard | All of the above, 13-week trend, one message | — | — | — |

---

## 9. FORMULAS.md — exact definitions

See `FORMULAS.md` (extracted copy of this section — the file `packages/finance-core` implements against).

---

## 10. Screens (Vol. 02 hierarchy — job, primary action, scan order, four states)

Structure rule: one screen per HUMAN step in Section 3. The most frequent task is home. No sidebar over five items. Phone layout first (390px), laptop second.

### 10.1 Cash Today — **Owner's home** (phone)
- **Job:** in 5 seconds, know runway and whether anything is red.
- **Primary action:** none visible by default — this is a read screen; single secondary "Ask" button opens a Claude chat scoped to this company's numbers.
- **Scan order:** Runway (huge, coloured) → three balances (Operating · Tax · Reserve) → Overdue ₹ (tap → Collect) → today's in/out → "What moved" one AI sentence.
- **States:** Empty ("Upload your first statement to see runway") · Loading (grey blocks, no spinner) · Error ("Last import failed on row 42 — fix") · Success (numbers).

### 10.2 Collect — **Ops home** (laptop and phone)
- **Job:** clear today's overdue and about-to-be-due receivables in ten minutes.
- **Primary action:** **Send reminder** per row (only blue on the page). Secondary: Record payment · Escalate.
- **Scan order:** party name + amount overdue → days overdue (MSME 45-day badge if applicable) → drafted message preview → last contact.
- **Sort:** MSME-clock breaches first, then ₹ descending.
- **States:** Empty ("Nothing overdue · go for a walk") · Loading · Error (row turns amber "Not sent · retry") · Success (row slides out, overdue total drops).

### 10.3 Inbox (categorise) — Ops
- **Job:** clear low-confidence transactions; every approval writes a rule.
- **Primary action:** **Approve** (accept AI category) — keyboard `Enter`; `Tab` cycles alternative categories.
- **Scan order:** description → amount → AI suggestion + confidence → party.
- **States:** Empty ("All categorised") etc.

### 10.4 Scoreboard — Owner (weekly)
- **Job:** the seven numbers with 13-week lines and colours; the quarter's Rock at the top.
- **Primary action:** **Set this quarter's lever** (only when none chosen); otherwise read-only.
- **Scan order:** Rock progress → Runway → Overdue → CCC → True profit % → LER → Core capital % → Four Forces "move this" list.
- Also renders the exact Monday message text below (what the owner received).

### 10.5 Levers — Owner (quarterly)
- **Job:** see Power of One in ₹, choose a lever, set a target and an owner.
- **Primary action:** **Make this the quarter's Rock.**
- **Scan order:** levers sorted by cash impact → combination sliders → resulting cash/profit → RONA and growing-broke flag.

### 10.6 Setup — Ops / Owner (once, then quarterly)
Company → Accounts (three buckets) → Industry template → Owner market salary + bucket → Labour by bucket (monthly) → Parties (import CSV) → Targets (pre-filled by template, editable) → WhatsApp numbers → Statement upload.

### 10.7 Cut from v1 (explicitly)
Dashboard with charts nobody opens · settings sprawl · reports section · team roles UI · profile page · dark mode toggle · anything beginning with "and users might also want to".

---

## 11. Messages (WhatsApp templates; approved via BSP)

**Daily · 6:00 pm IST · to Owner (and Ops if enabled)**
```
{{company}} · {{date}}
In ₹{{cash_in}} · Out ₹{{cash_out}}
Operating ₹{{op_bal}} · Tax ₹{{tax_bal}} · Reserve ₹{{res_bal}}
Runway {{runway_days}} days {{runway_arrow}}
{{one_line_what_moved}}
```

**Weekly · Monday 9:00 am IST · to Owner**
```
{{company}} · Week {{week_no}} · {{quarter_label}}
🟢🟡🔴 legend implicit via emoji per line
{{c1}} Runway {{runway}} d (target {{t1}})
{{c2}} Overdue ₹{{overdue}} · {{overdue_count}} invoices{{msme_flag}}
{{c3}} CCC {{ccc}} d (target {{t3}})
{{c4}} True profit {{profit_pct}}% last month (target {{t4}})
{{c5}} Direct LER {{ler}} (hold-hire line {{t5}})
{{c6}} Reserve {{fill_pct}}% of ₹{{core_target}}
{{c7}} Rock: {{lever}} — {{rock_status}}
Move: Tax ₹{{park}} · Card ₹{{pay}} · Reserve ₹{{move}} · Harvest: {{harvest}}
{{ai_narrative_3_lines}}
```

**Customer reminder sequence (per invoice; Ops taps Send)**
- **T−5:** "Namaste {{name}} ji, gentle reminder: invoice {{no}} for ₹{{amt}} is due on {{due}}. Pay in one tap: {{link}}. Thank you — {{company}}"
- **T+1:** "Invoice {{no}} (₹{{amt}}) was due {{due}}. Could you share the expected date? {{link}}"
- **T+7:** "...We are a registered MSME (Udyam {{udyam}}); under the MSMED Act payment is due within 45 days of delivery ({{msme_date}})..." (only if is_msme)
- **T+15:** Escalation draft to Owner, not to customer.
Tone rules: nouns for labels, verbs for buttons, no exclamation marks, no "Oops", Hindi-English register acceptable per template variant (`hi_en` | `en`).

---

## 12. AI layer (Claude API) — jobs, prompts, guardrails

All prompts built in `finance-core/ai/*`; all outputs validated with zod before use; every call logged with tokens and cost per company.

| Job | Model | Input | Output (JSON) | Guardrail |
|---|---|---|---|---|
| **Categorise** | haiku-4-5 | 50 transactions + company's category list + top 200 party names + last 100 rules | `[{txn_id, category_id, party_name?, confidence, reason}]` | Rules first; AI only for unmatched; confidence < 0.8 → Inbox |
| **Parse PDF statement** | sonnet-4-6 | extracted text pages | rows `[{date, description, debit, credit, balance}]` | Show table for confirmation before commit; cross-check running balance |
| **Explain a number** | sonnet-4-6 | kpi_snapshot.inputs | 2–4 plain sentences | Must cite the inputs it used; no invented figures |
| **Weekly narrative** | sonnet-4-6 | seven numbers, deltas, top 5 movements, Rock status | 3 lines: what moved · why · one action | Never recommends a loan or an OD; never exceeds 3 lines |
| **Anomaly** | haiku-4-5 | this week vs 13-week distribution | `[{metric, z_score, note}]` | Only surfaces \|z\| ≥ 2 |
| **Ask** (chat) | sonnet-4-6 | question + read-only tool over this company's snapshots/transactions | prose | Read-only tools; cannot send messages or move money |
| **Onboarding baseline** | sonnet-4-6 | 12 months statements + P&L + salary list | first seven numbers + Power of One + suggested targets | Owner confirms every target before it is saved |

**Hard rules:** the AI never initiates a payment, never sends a customer message without a human tap in v1, never stores a bank credential, and never changes a formula — formulas are code.

---

## 13. Templates & customisation (how one core serves every client)

A **template** is a JSON file in `/config/templates/{slug}.json`. Choosing one at Setup seeds categories, rules, targets, labour buckets and revenue streams. Everything it seeds is editable per company afterwards; the template is a starting point, not a cage.

```json
{
  "slug": "coaching-services",
  "label": "Coaching / Consulting / Training",
  "has_inventory": false,
  "revenue_streams": [
    {"name": "Individual (prepaid)", "expected_payment_days": 0},
    {"name": "Corporate (invoiced)", "expected_payment_days": 45}
  ],
  "owner_default_bucket": "direct",
  "gross_margin_pct_typical": 90,
  "targets": {
    "runway_days": 60, "ccc_days": 20, "true_profit_pct": 10,
    "direct_ler": 1.8, "mgmt_ler": 6, "rona_pct": 30
  },
  "category_seed": [
    {"name": "Client fees", "group": "revenue"},
    {"name": "Payment gateway fees", "group": "direct_nonlabour"},
    {"name": "Meta Ads", "group": "opex"},
    {"name": "Coach salaries", "group": "direct_labour"},
    {"name": "Admin salaries", "group": "mgmt_labour"},
    {"name": "GST payment", "group": "tax_gst"},
    {"name": "Owner draw", "group": "owner_draw"}
  ],
  "rule_seed": [
    {"match_type": "contains", "pattern": "RAZORPAY", "category": "Client fees"},
    {"match_type": "contains", "pattern": "FACEBK", "category": "Meta Ads"},
    {"match_type": "contains", "pattern": "GST", "category": "GST payment"}
  ],
  "reminder_register": "en"
}
```

**Ship v1 with six templates:** `coaching-services` · `agency-marketing` · `photography-studio` (project deposits, long delivery cycle, editing WIP) · `retail-inventory` (UPI/POS, inventory days on) · `d2c-ecommerce` (COD receivable days, marketplace settlement lags, returns) · `manufacturing-trading` (AR/AP/inventory all on, MSME clock critical).

**Per-company customisation surface (no code):** template choice → categories & rules → targets & bands → labour buckets → revenue streams → message register → notification times → which of the seven appear first. Anything beyond this is a new template file, reviewed by the BuildOur operator.

**White-label (LATER):** company logo on exports; custom sender name on WhatsApp BSP.

---

## 14. Security, privacy, compliance

- **No bank credentials, ever.** v1 ingests uploaded statements and payment webhooks only. Account Aggregator (Sahamati) integration is a SHOULD and only via a licensed FIU partner.
- **RLS on every table** by `company_id`; service role used only in edge functions with explicit company scope.
- Statement files encrypted at rest (Supabase Storage), auto-deleted after 90 days once parsed (configurable).
- Mask account numbers to last 4. Never store card numbers, PAN images, or Aadhaar.
- Audit log on category changes, target changes, and every message sent.
- WhatsApp numbers are PII: opt-in recorded; STOP handled.
- Owner can export everything (CSV) and delete the company (soft, then purge after 30 days).
- DPDP Act 2023 posture: purpose limitation, consent record, deletion path.

---

## 15. DESIGN.md — the look (from *Think Like a Creative Director*)

See `DESIGN.md` (extracted copy of this section).

---

## 16. Build plan — slices, in order (each ends with its test passing)

| Slice | Build | Acceptance test (Section 17) |
|---|---|---|
| **0** | Repo scaffold; Supabase project; migrations for Section 5; RLS; `finance-core` package with `formatINR`, FY/quarter helpers, unit tests | T0 |
| **1** | Setup wizard (company, 3 accounts, template, owner salary, targets) + CSV/XLSX import for 3 banks + dedupe + rule-engine categorisation (no AI yet) + **Cash Today** with runway + **daily 6pm WhatsApp** | T1, T2, T3 |
| **2** | AI categorisation + **Inbox** + rule learning; PDF statement parse with confirmation | T4 |
| **3** | Parties, Invoices, Bills; ageing; MSME clock; auto-match bank credits to invoices; **Collect** screen + reminder sequence + Razorpay payment links | T5, T6 |
| **4** | True profit engine (owner salary, gross margin, profit basis); labour buckets; LER; `kpi_snapshot` nightly; **Scoreboard** with 13-week trends + **Monday message** + AI narrative | T7, T8 |
| **5** | CCC by segment and by stream; Power of One; RONA; growing-broke flag; **Levers** screen; quarterly Rock | T9 |
| **6** | Four Forces allocation lines; GST liability & TDS ledger; **CA exports** (transactions, GST, TDS, decision↔compliance bridge) | T10 |
| **7** | Polish pass: DESIGN.md audit (list every deviation, fix all), 390px screenshots of every screen, stranger test; remaining templates; multi-tenant operator view | T11 |

Rules of the build: ugly is acceptable until Slice 7; **working is mandatory** from Slice 1. After every slice, use the app on a mid-range Android exactly as Ops would. Only then start the next slice.

---

## 17. Acceptance tests (definition of done)

- **T0** `formatINR(123456789)` → `₹12,34,567.89`; `fyLabel(2026-07-15)` → `FY26-27`; `quarterLabel` → `Q2 FY27`. All formula unit tests green using the **Meera fixture** (Section 18).
- **T1** Re-uploading the same HDFC CSV twice creates zero new rows; `rows_duplicate` equals `rows_total` on the second run.
- **T2** With Meera fixture loaded, Cash Today shows **Runway 9 days**, Operating ₹1,10,000, and colour red.
- **T3** At 18:00 IST a message is logged for the owner; contents match template; a second cron run the same day sends nothing.
- **T4** ≥ 90% of fixture transactions categorised without Inbox after rules; every Inbox approval creates exactly one rule; AI output validates against schema or is rejected.
- **T5** Invoice with delivery 1 Jul, invoice 8 Jul → `billing_days = 7`; MSME deadline 15 Aug; on 16 Aug it appears at the top of Collect with the 43B(h) badge.
- **T6** Sending a reminder is impossible without a human tap (no API path sends customer messages from cron in v1).
- **T7** Meera fixture: Gross margin ₹4,10,000; true pretax profit ₹50,000 = **12%**; compliance-book profit ₹2,30,000; owner distortion ₹1,80,000 shown.
- **T8** Direct LER **1.71**, Mgmt LER **6.8**; `revenue_needed_for_15pct` ≈ ₹4,36,000; Monday message renders all seven lines with colours.
- **T9** Power of One (annual): price 1% = ₹50,400; AR 1 day = ₹5,000 (corporate stream) / ₹13,800 (blended); table sorted by cash impact; choosing a lever creates a `cash_initiative` for `Q2 FY27`.
- **T10** GST liability for the invoice month = ₹27,000 shown separately from cash; TDS expected on ₹1,50,000 @10% = ₹15,000; exports open cleanly in Excel with ₹ formatting preserved as numbers.
- **T11** DESIGN.md audit returns zero deviations; every screen has a 390px screenshot; a stranger shown Cash Today for five seconds says "a finance/bank tool", not "an app".

---

## 18. Meera fixture (seed data for tests and demos)

Monthly, INR:
- Revenue ₹4,20,000: ₹2,70,000 individual (prepaid via Razorpay, 0-day terms), ₹1,50,000 corporate (2 clients, invoiced, paid ~day 67; TDS 194J @10%).
- Non-labour direct costs ₹10,000 (gateway 2%, Zoom, materials).
- Direct labour: Priya ₹60,000; owner (Meera) market salary ₹1,80,000, bucket direct.
- Management labour: Ritu ₹25,000.
- Opex ₹95,000: Meta Ads ₹50,000; rent/tools/software ₹30,000; misc ₹15,000.
- Bank: Operating ₹1,10,000 on the 1st; Tax ₹0; Reserve ₹0; credit card drawn ₹50,000.
- Receivables outstanding ₹3,00,000 (two invoices, 40 and 61 days old). GST on corporate invoices ₹27,000 unpaid.
- Expected outputs: runway 9 d; core capital target ₹7,40,000; corporate CCC ≈ 67 d; true profit 12%; direct LER 1.71; mgmt LER 6.8; Power of One as in T9.

---

## 19. Glossary (one line each, for the Setup tooltips)

**Runway** days you can operate with zero inflow · **CCC** days from spending a rupee to getting it back · **Gross margin** revenue minus non-labour direct costs; the real top line · **True profit** profit after paying the owner a market salary · **LER** rupees of margin per rupee of wages · **Power of One** rupee value of a 1% or 1-day change in each of seven levers · **Core capital** two months of operating cost held in cash · **Four Forces** the fixed order profit flows: tax → debt → reserve → harvest · **RONA** operating profit ÷ money tied up in the business · **Growing broke** when each sale needs more working capital than it earns in gross margin · **Udyam / 45-day rule** MSME registration that makes buyers legally due within 45 days (MSMED Act s.15; IT Act s.43B(h)).

---

## 20. Sources the framework rests on

Verne Harnish, *Scaling Up* (2014) and *Mastering the Rockefeller Habits* (2024 ed.) — Cash Conversion Cycle, CASh tool, daily cash report, one initiative per quarter. Greg Crabtree, *Simple Numbers, Straight Talk, Big Profits!* — owner-salary distortion, gross margin as top line, 5/10/15 profit bands, Labour Efficiency Ratio, Four Forces of Cash Flow, Core Capital Target. Alan Miltz, *The Power of One* / cashflowstory.com — seven levers, four drivers, RONA, growing broke. Jim Collins & Morten Hansen, *Great by Choice* (2011) — 10X companies held 3–10× the cash reserves of comparisons. Indian layer: MSMED Act 2006 s.15; Income-tax Act s.43B(h) (Finance Act 2023); CGST Act time-of-supply rules; advance tax schedule u/s 211. Verify statutory details with the client's CA before relying on them in messages.

---

*End of blueprint. Fill the Money System Canvas for the client first; this file turns the canvas into software.*
