# DESIGN.md — the look

Extracted from `BLUEPRINT.md` Section 15 (from *Think Like a Creative Director*). This is the source of truth for LOOK — never invent a colour, radius, spacing value, or interaction pattern outside this file. Any new screen must be checked against it before it is built, and deviations reported before adding another screen.

**Feel (three words / three anti-words):** *Calm like a good bank statement. Quick like UPI. Serious like a CA who actually replies.* Never startup-purple, never dashboard-busy, never playful with money.

**References (thread):** white, one navy-blue for action, dense tables, generous spacing, almost no icons, numbers set large and tabular. Reject: gradient dashboards, eight-chart home screens, pastel KPI cards.

## Tokens
```
COLOUR  primary #1D5FD1 (action only) · ink #1C2230 · greys slate-50…900
        semantic: green #1D7A3A (good) · amber #A56A00 (watch) · red #B42318 (act)
        money never in colour except semantic state; negative numbers with a leading −, never red by default
TYPE    Inter (Noto Sans fallback for Devanagari) · 28 / 20 / 15 / 13 / 11 · numbers tabular-nums
SPACE   4 · 8 · 12 · 16 · 24 · 32 · 48
SHAPE   8px radius everywhere
DEPTH   one shadow, menus and dialogs only; cards have a 1px border
MOTION  150ms ease-out; a row leaving the Collect queue slides out; nothing bounces
```

**One-line rule:** *If two colours compete on a money screen, the second one is wrong.*

**Hierarchy:** bold is for hierarchy, colour is for action, size is for importance — never all three on one element. Every screen passes the squint test: one dark shape (primary action), one bright area (the number that matters), calm elsewhere.

**India layer:** ₹12,34,567; 23 Aug 2026; +91 with tap-to-WhatsApp; phone-first 390px; Devanagari-safe font.

**Copy:** labels are nouns, buttons are verbs ("Send reminder", never "Submit"); errors say what to do next; no exclamation marks.
