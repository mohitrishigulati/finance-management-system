# Finance OS

A finance management system for Indian small and mid-size businesses, built on the Seven-Layer Money Framework (Cash · Cycle · Profit · Labour · Levers · Forces · Scoreboard) from *Think Like a CFO*.

Start here:

- **`CLAUDE.md`** — operating instructions for Claude Code building this repo.
- **`BLUEPRINT.md`** — the system brief: problem, users, the seven-box loop, features, data model, stack, screens, messages, AI jobs, templates, security, build plan, acceptance tests.
- **`FORMULAS.md`** — exact formulas for the seven numbers (extracted from BLUEPRINT.md §9); implemented once in `packages/finance-core`.
- **`DESIGN.md`** — the visual language (extracted from BLUEPRINT.md §15).
- **`docs/DECISIONS.md`** — open questions raised while interrogating the blueprint, and what was decided; overrides the blueprint's defaults where the two disagree.
- **`config/templates/`** — industry templates (JSON) that seed categories, rules, targets and revenue streams per company.

Build proceeds slice by slice per `BLUEPRINT.md` Section 16, each ending with its acceptance test (Section 17) passing.
