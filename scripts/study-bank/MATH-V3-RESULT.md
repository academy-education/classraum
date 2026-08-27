# math-v3 — results (in progress, 2026-08-28)

Pre-registration: MATH-V3-PREREGISTERED.md.

## Pilot — 12 items (M1-M6 Advanced Math, A1-A6 Algebra)

Gate 1, sandbox recompute: 12/12 — every `solve` body reproduces its
key (numeric 1e-6). Local hub check over the four option values
(transform set from check-math-hub): clean, no item's key reaches 2+
other options.

Gate 2, anchored grader: 6 hard / 6 medium, distractor_quality
"strong" on all 12 — zero grader-easy, zero drops.

Gate 3, options-only nosource attack (stems stripped entirely), run
`math-v3-pilot-attack`, 3 Haiku solvers, distinct pick-strings:

    solver-a   5/12 41.7%   DAACDCCACAAB
    solver-b   2/12 16.7%   ACCCCDCCAADC
    solver-c   3/12 25.0%   ACCADCCCACAA

    mean 27.8%   control 50.0% (best fixed letter)   margin -22.2
    PASS (<= +15; live AdvM cohort sits at +16.6 — beaten)

Note the control: the seeded re-lettering happened to stack 6/12 keys
on one letter, so the best-fixed-letter control is high and the margin
generous. The absolute read is the honest one: mean 27.8% is
essentially uniform chance (25%) — the four numbers carry nothing.
Solver heuristics (their own words): perfect-square preference,
"precise decimal beats round number", relational clustering. Each
landed on distractors as often as keys, which is what the
no-orbiting-the-key doctrine was designed to produce.

## Disposition

Pilot PASS on all three gates → Stage 2 per pre-registration: 48 more
items (M7-M30, A7-A30) under the same frozen doctrine with settings
disjoint from the pilot's, then sandbox + grader on all 60, fresh
12-item options-only attack, insert under BANK_COHORT=math-v3,
DB-backed cohort-scoped checkers (check-math-hub,
check-distractor-derivability, check-duplicate-items), archive on any
failure.

## Stage 2 — SHIPPED as cohort math-v3 (2026-08-28)

48 items authored by 12 independent authors under the frozen doctrine
(pilot settings explicitly banned; anti-tells from the pilot solvers'
own heuristics — no lone perfect square, no lone precise decimal —
written into the brief). Gates:

- sandbox recompute 48/48, local hub check clean, shapes valid.
- Fresh 12-item options-only attack (run `math-v3-s2-attack`, 3 Haiku
  solvers, distinct pick-strings): mean 36.1%, control 33.3%,
  **margin +2.8 PASS** (≤ +15).
- Grader over all 48: 0 easy, 0 weak distractors (batch totals with
  the pilot: 24 hard / 36 medium).

**59 banked** (not 60): M22's key was authored as "52,500" and the
insert gate's text-compare rejects the thousands separator against the
computed "52500". The math is correct — but the pre-registration says
a sandbox reject is a dead item, never an edited one, so M22 stays
out. Lesson for the next math brief: numeric options must never carry
thousands separators.

Post-insert, whole-population checkers (the arithmetic-checker
standard — and note the helper's closing "Math verified now: 1000" is
the PostgREST 1000-row truncation, NOT a real count; exact counts came
from count queries):

- check-math-hub: bank-wide conditional margin −6.7, population −1.4
  (both below control), zero full hubs.
- check-distractor-derivability: leak 14.9% vs 25% control (−10.1).
- check-duplicate-items: 12 near-dup pairs bank-wide, **zero touch
  math-v3**.
- Stored key slots 30/13/10/6 (write-key-first artifact). Left as-is
  per the helper's recorded decision: choice order randomizes at DRAW
  time on every serve path, and content_sha binds the attack
  measurements — a reorder would invalidate them to buy a property the
  draw already guarantees.

Advanced Math 191 → 220, Algebra 199 → 229. Also fixed in the same
session: math-bank-helper.mjs omitted the NOT NULL `task` column
(migration 068 — the identical trap already found in bank-helper.mjs
and toefl-bank-helper.mjs), and its toItem() now carries the authored
distractor mis-steps into distractor_rationales instead of empty
strings.
