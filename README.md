# Finance OS

A finance management system for Indian small and mid-size businesses, built on the Seven-Layer Money Framework (Cash · Cycle · Profit · Labour · Levers · Forces · Scoreboard) from *Think Like a CFO*.

Start here:

- **`CLAUDE.md`** — operating instructions for Claude Code building this repo.
- **`BLUEPRINT.md`** — the system brief: problem, users, the seven-box loop, features, data model, stack, screens, messages, AI jobs, templates, security, build plan, acceptance tests.
- **`FORMULAS.md`** — exact formulas for the seven numbers (extracted from BLUEPRINT.md §9); implemented once in `packages/finance-core`.
- **`DESIGN.md`** — the visual language (extracted from BLUEPRINT.md §15).
- **`docs/DECISIONS.md`** — open questions raised while interrogating the blueprint, and what was decided; overrides the blueprint's defaults where the two disagree.
- **`config/templates/`** — industry templates (JSON) that seed categories, rules, targets and revenue streams per company.

Build proceeds slice by slice per `BLUEPRINT.md` Section 16, each ending with its acceptance test (Section 17) passing. **Slices 0-2 are done** — see the "Slice 0/1" and "Slice 2" entries in `docs/DECISIONS.md`. AI categorisation and PDF parsing (Slice 2) need `ANTHROPIC_API_KEY` set to actually call the model; without it they fall back to leaving transactions for the Inbox, which is what this build environment currently exercises (no key available here — see the "Known gap" note in `docs/DECISIONS.md`).

## Local development

No Supabase/WhatsApp/Razorpay account is required to run this (`docs/DECISIONS.md`) — everything runs against a local Postgres instance and mock adapters until real credentials exist.

```bash
pnpm install

# Postgres 16 running locally; then:
cp .env.example .env
cp .env.example apps/web/.env.local   # Next.js only reads env files from the app's own directory
pnpm db:migrate                       # applies supabase/migrations/*.sql + grants

pnpm dev                              # apps/web on http://localhost:3000
pnpm test:core                        # finance-core unit tests (T0)
pnpm --filter @finance-os/web test    # AI categorisation guardrail tests (T4)

pnpm db:seed:meera                    # seeds the Meera fixture (BLUEPRINT.md §18); prints a user_id
MEERA_USER_ID=<printed-id> node tests/acceptance.mjs   # T1-T3, against the running dev server
```

`packages/finance-core` has zero I/O — formulas, formatters, and the Meera fixture live there with unit tests. `apps/web` is the Next.js app; `supabase/migrations` is plain SQL (applies unchanged to a real Supabase project later).
