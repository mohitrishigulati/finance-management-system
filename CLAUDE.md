Read BLUEPRINT.md before any task. Formulas live in FORMULAS.md and packages/finance-core;
never re-implement a formula in a screen. Visual rules live in DESIGN.md; never invent a
colour, radius or spacing outside it. Build in the slice order of BLUEPRINT.md Section 16.
Every slice ends with its acceptance test passing and one screenshot on a 390px viewport.
Report deviations from DESIGN.md before adding any new screen. Indian formatting everywhere:
₹12,34,567 · 23 Aug 2026 · FY26-27 / Q2 FY27. Never store bank credentials.

Open decisions and their resolutions live in docs/DECISIONS.md — read it alongside
BLUEPRINT.md; it overrides the blueprint's defaults where the two disagree, since it
records what the owner actually decided for this build.

Assume up to 1,000 companies within a year; keep the data layer clean and the parts
separate (Section 7). v1 external services (Supabase, WhatsApp BSP, Razorpay, Anthropic)
are stubbed/mocked in local dev per docs/DECISIONS.md until real credentials are supplied —
never hardcode a real key, and gate every live call behind an env var check with a mock
fallback so `pnpm dev` works with zero external accounts.
