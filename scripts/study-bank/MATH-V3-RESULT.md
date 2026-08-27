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
