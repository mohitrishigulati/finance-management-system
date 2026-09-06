# Build decisions log

Records what the owner actually decided where BLUEPRINT.md leaves something open, underspecified, or in tension with itself. `CLAUDE.md` says this file overrides the blueprint's defaults where the two disagree. Newest entries at the top.

---

## 2026-09-06 · Slice 0/1 built and verified

Built per BLUEPRINT.md §16 Slices 0-1, against local Postgres (see the infra decision below): pnpm monorepo (`apps/web` Next.js 15, `packages/finance-core`), the full §5 schema with RLS, the Setup wizard, generic CSV/XLSX statement import with dedupe + rule-engine categorisation, the Cash Today screen, and the daily 6pm cash message job (mocked WhatsApp channel).

All acceptance tests for this slice pass:
- **T0** — 36 unit tests green in `packages/finance-core` (`pnpm test:core`), including the Meera fixture's runway, true profit, LER, and Power of One figures.
- **T1** — re-uploading the same statement file inserts zero new rows (verified via `tests/acceptance.mjs`).
- **T2** — Cash Today shows Runway **9 days** (red), Operating **₹1,10,000** on the Meera fixture — screenshot at `tests/screenshots/cash-today-390px.png`.
- **T3** — the daily message sends once per company per day and a same-day re-run sends nothing; message content logged to console (mock WhatsApp) and `message_log`.

Two implementation notes worth keeping visible:
- `bank_account.opening_balance` is a ledger starting point, not "the balance BLUEPRINT.md's prose describes" — the Meera fixture's stated ₹1,10,000 operating balance already reflects that month's revenue/expense transactions, so `scripts/seed-meera.ts` backs the opening balance out by the net effect of the transactions it seeds, rather than setting it to ₹1,10,000 directly (which would double-count them).
- A `pg` client processes queries one at a time per connection; `lib/queries/aggregates.ts` originally fired several independent reads via `Promise.all` on the same client, which only queues them and trips a deprecation warning (removed in pg@9) with no real concurrency gained. Fixed to sequential awaits.

Not done in this slice (tracked, not forgotten): real Supabase Auth phone-OTP, real WhatsApp Cloud API sending, per-bank CSV parsers (HDFC/ICICI/etc. beyond the generic column-mapper), AI categorisation (Slice 2), Parties/Invoices/Bills UI beyond the schema and the two seeded fixture invoices (Slice 3).

---

## 2026-09-06 · Slice 0/1 infra: local Postgres stands in for Supabase; auth is stubbed

**Decided (per the earlier "mocks/stubs for now" answer):** No Supabase project exists yet, so Slice 0/1 run against a **local Postgres 16** instance (`finance_os_dev`) with the exact schema and RLS approach Supabase will use, so moving to a real Supabase project later is a connection-string change, not a rewrite:

- Migrations live in `supabase/migrations/*.sql` — plain SQL, no Supabase-CLI-specific syntax, so `supabase db push` will apply them unchanged once a project exists.
- RLS policies reference a function `app_current_user_id()` that reads a session-local Postgres setting (`app.current_user_id`), which the app sets via `SET LOCAL` at the start of each request's transaction. On real Supabase this same function name can simply delegate to `auth.uid()` — the policies themselves don't change.
- The app connects as a **non-superuser role** (`app_user`) with `FORCE ROW LEVEL SECURITY` on every tenant table, so RLS is actually enforced in dev (a superuser bypasses RLS silently, which would hide bugs). A separate `migrator` superuser role applies migrations.
- **Auth is stubbed**, not built: Slice 1 does not implement real phone-OTP yet (that needs a Supabase project + SMS provider). The dev app sets `app.current_user_id` from a fixed dev-session cookie created by the Setup wizard. Real Supabase Auth phone-OTP (per the earlier decision) is Slice-1-and-a-half work once a Supabase project exists — flagged here so it isn't mistaken for already done.
- WhatsApp sends are logged to `message_log` and printed to the server console (`console.log`) instead of calling Meta's API — per the earlier WhatsApp-lead-time decision (item 6 below).

---

## 2026-09-06 · Kickoff

**Decided:** Scaffold the repo per BLUEPRINT.md Section 0 first (this commit), then interrogate the blueprint for holes/risks/simpler versions before writing any application code, per the blueprint's own kickoff prompt. Build proceeds slice by slice (Section 16) only after each round of open questions is resolved.

**Decided — credentials:** Build v1 against **mocks/stubs** for all external services (Supabase can still be a real free-tier project for Postgres/RLS/Storage since there's no paid mock alternative worth building, but WhatsApp, Razorpay, and the Anthropic API calls are stubbed behind an interface in dev/test). Real keys are added later via env vars without code changes. Every live-service call must be gated so `pnpm dev` and the test suite run with zero external accounts configured.

### Holes, risks, and simpler versions found while interrogating the blueprint

Status legend: 🟡 open (needs an answer before the slice that touches it) · ✅ resolved (default taken, override here if wrong) · 🔵 accepted limitation (documented, not blocking).

1. ✅ **Authentication mechanism: Supabase Auth, phone OTP.** Matches the WhatsApp-first, low-patience Owner persona. `user.phone_whatsapp` doubles as the login identity; no separate email/password flow in v1.
2. ✅ **Solo owner = both roles: allowed.** Setup lets one user hold both `owner` and `ops` roles (stored as a flag/array on `user`, not a forced second account) — matches the blueprint's own Meera example before she had Ritu.
3. ✅ **Which industry templates ship in Slice 1 vs later.** The blueprint's own Slice 7 line ("remaining templates") implies not all six are needed up front. Default: build `coaching-services` (already scaffolded, matches the Meera fixture used by every acceptance test) and treat the other five as Slice 7 work, added once the loop is proven on one template.
4. 🔵 **`avg_daily_outflow` owner-salary handling is binary, not prorated.** Documented in `FORMULAS.md` under "Known formula gaps." Default fix: use `max(0, market_salary − actual_draw_this_month)/30` instead of an all-or-nothing addition. Flagging here since it changes a number in every acceptance test if not applied consistently — will implement the corrected version in `finance-core` unless told to match the blueprint literally.
5. 🔵 **Accrual/cash mismatch in True Profit.** Revenue is accrual (invoice date); non-labour direct costs and opex are cash/bank-category based. A large one-off annual payment (e.g. yearly software licence) will spike one month's numbers. Accepted as a documented v1 limitation, not a blocker — CCC and profit are read as trends, not single months, which the Scoreboard already emphasises.
6. 🟡 **WhatsApp Cloud API approval lead time.** Meta business verification and template approval typically take days to weeks and isn't guaranteed on a first attempt. Slice 1's daily 6pm message and T3's acceptance test need a channel that works from day one. Default: build the message-composition/send interface against a provider-agnostic adapter, with an email (Resend) or console-log delivery channel for dev/test, and treat a real WhatsApp BSP account as a Slice-1 dependency to source in parallel, not a blocker for writing the code.
7. 🔵 **Reminder opt-out (STOP) handling** is named in Security (Section 14) but has no owning screen or table field. Default: add an `opted_out` boolean on `party`, checked before every reminder send; surfaced as a v1 must, not a SHOULD, since it's a compliance requirement, not a nice-to-have.
8. 🔵 **Nightly compute concurrency.** Section 7 implies per-company queued jobs but doesn't say how overlapping runs (e.g. a manual "recompute" while the nightly cron is still running for the same company) are prevented. Default: a `company_id`-scoped advisory lock or a `kpi_snapshot` job-status row checked before starting a run.
9. 🔵 **Labour costs are entered manually in v1** (no payroll import), so LER and true profit are only as fresh as the last manual update. Accepted per the blueprint's own SHOULD list; default: the Setup screen nudges Ops to confirm labour figures monthly rather than silently going stale.

All items are now resolved or accepted as documented limitations. Slice 1 can start.

---

## 2026-09-06 · Auth and roles resolved

**Decided:** Phone-OTP via Supabase Auth for all logins (`user.phone_whatsapp` is the identity — no email/password flow in v1). A single user account may hold both `owner` and `ops` roles simultaneously, so a solo founder does not need two accounts.
