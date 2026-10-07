# act-math-v18 — pre-registered bars (written 2026-10-07, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-07, after act-math-v17): ACT Math **15 forms** by
domain (670 items), binding on Number and Quantity **75 / 5 per form**.
`next-form.mjs act/math`:

    domain                        live   /form   for form 16   deficit   authored
    Number and Quantity             75       5         80         5          7
    Integrating Essential Skills   135       9        144         9         12
    Algebra                        121       8        128         7          9
    Functions                      121       8        128         7          9
    Statistics and Probability      93       6         96         3          4
    Geometry                       125       8        128         3          5
    total                                                        34         46   (+35.3%)

    CHEAPEST NEXT FORM: 34 items -> N&Q +5, IES +9, Algebra +7, Functions +7, S&P +3, Geometry +3

Format read from code: `src/lib/study/act-test.ts` math block
`questions: 45, choiceCount: 4` — FOUR choices.

Geometry gets +2 rather than +1 because its last two batches kept 7/10 and
6/10; S&P kept 9/9 in v16. Every domain must meet its deficit or form 16 is
not bought — a short domain buys NOTHING.

Three Claude authors: **A** = N&Q 7 + Algebra 9 (16), **B** = Functions 9 +
Geometry 5 (14), **C** = IES 12 + S&P 4 (16). Files
`act-math-v18-{a,b,c}.batch.json`; ids `AM18{N,A,F,G,I,S}-NN`. Cohort
`act-math-v18`. No repairs after the attack.

**Difficulty commission: weighted to medium/hard.** v16's graders banked
easy 28 / medium 15 / hard 2 against authors' 11 / 24 / 10, and AUTHORING-BRIEF
§13d records the same compression. Authors are asked for **no easy items by
their own label, roughly 55% medium and 45% hard** — "hard" meaning a genuine
two-step interaction with a decision, not bigger numbers. `BANK_BAND=mixed` is
declared HERE at commission; the banked label is always the graders'.

## The two lessons this batch is built against

1. **v16 — limiting-case distractors** (§8c / §13b): the value at a
   parameter's extreme (additive percent, no-last-climb count, equal-tangent
   midpoint, un-halved count, full perimeter) sits ON a bound the stem forces.
   Three of v16's four bound kills.
2. **v17 — neighbouring-setup distractors**: an option that is the exact
   answer to an ADJACENT problem — rotate about the other axis, the other
   median, the other averaging rule, the other height — is usually also an
   extreme of the feasible interval, so it sits on a free bound. All four v17
   drops. A self-check that searches for endpoint values does not see it.

Authors are required, per distractor, to say which kind of wrong path it is
and to check BOTH: (a) is it a parameter-at-an-extreme value, (b) is it the
exact answer to a neighbouring configuration, and if either, does the stem
force the key strictly on one side of it. Such an option is rewritten before
delivery or the item is not written. **Author declarations are not a check**
(CLAUDE.md, 2026-09-24: twenty declared bounds killed zero options); the
graders and I decide.

## Stage 0 — structural pre-flight (authors run it; I re-run it on delivery)

`act-math-v18-preflight.sh <file>` (break-tested 2026-10-07: it FAILS on the
already-live `act-math-v17.kept.batch.json` through `stem-duplicates`).
Per file: sandbox N/N, distractor_solve 3N/3N with 0 mismatches, numeric and
symbolic hub margin <= +10, `key-extremity-gate` PASS (>= 40% at k=4),
`check-key-magnitude` consistent with live, `check-key-is-composition` 0
unique-composite keys, `check-sign-pair` / `check-dead-options` /
`check-stem-echo` / `check-key-singleton` exit 0, `stem-duplicates --family
act` and `check-duplicate-option-sets act/math` clean. `check-plurality-key`
exit 2 = NOT MEASURED, reported, not a pass. A file that fails goes back to
its author ONCE before any attack; after the attack nothing is edited.

## Stage 1 — options-only attack (screen)

Every candidate interleaved with a live ACT Math control matched 1:1 BY DOMAIN
(46 live), width 4, keys dealt flat WITHIN each arm, no act-math-v16/v17/v18
row in the control (`act-math-v18-attack-draw.mjs`, the v17 renderer with
output names, exclusions and seed changed). Three blind Claude samples,
recorded as **three samples of one solver**. Scored with `score-oo.mjs`
(arm-split by `kind`).

- **Batch HOLD** if candidate margin (rate − its within-arm best-fixed-letter
  line) exceeds the live arm's margin by **more than +10 points**. Ceiling
  check: live arms have measured 27.2–34.7% on this instrument (v11, v15, v16,
  v17), so the candidate would need ~40–45% against a 100% ceiling — the bar
  can fire. One item is ~0.7 points at n = 46 × 3.
- **Batch HOLD** if candidate unanimous-correct rate exceeds the live arm's by
  **more than 15 points** (rate comparison; no n·p³ expectation).
- **Instrument-invalid clause**: if the live arm's margin is itself >= +25, the
  with-source half decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration
  (a named free elimination/shortcut, a second defensible answer, or a
  disputed key on that item). Per-domain rates are reported and decide nothing.

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld). **The authors' `bounds` and any other
author-reasoning field (`distractor_kind`, `limiting_check`, notes) are
stripped from the grade input before rendering** (v17 lesson: make-grade-render
keeps unrecognised fields). Per item: pick, second defensible answer, every
stem-forced bound and survivors, free elimination/shortcut, distractor quality
(strong/plausible/weak/dead), difficulty, duplicate note, and two dedicated
fields: `limiting_case` (any option that is a parameter-at-extreme value) and
`neighbouring_setup` (any option that is the exact answer to an adjacent
problem), each with whether the stem bounds the key strictly away from it.

Kept only if all of:

1. Both picks equal the key (a pure grader arithmetic slip with the stem read
   the same way is forgiven after my re-derivation; a stem-reading split drops).
2. No second defensible answer named by either grader.
3. **>= 3 options survive every stem-forced bound** (§8a), named by either
   grader and confirmed by me. An option ON a bound is dead. A limiting-case
   or neighbouring-setup option named by either grader is a drop **if I
   confirm it sits on or beyond a bound the stem forces**; a neighbouring-setup
   value that a student can reject only by doing the item's own work is a
   good distractor (§8a "where the rule stops") and is kept.
4. Not graded "weak" distractor quality by both graders; two weak distractors
   in one item, named by either grader and confirmed by me, also drops.
5. No mechanism duplicate of a live maths row (any family) or of an earlier
   item in this batch (later item drops).
6. Unanimous blind solve + a grader-named shortcut/free elimination -> drop.

**Difficulty banked** = graders' label: agree -> that; one band apart -> the
easier; easy vs hard -> medium. Never the author's.

## Stage 3 — duplicate scan

All candidates against ALL live maths rows across every family, paged with
ORDER BY and a distinct-id assertion (`act-math-v16-dupscan.mjs`, unchanged):
stem Jaccard >= 0.60 or identical option values read by hand; same mechanism
-> drop.

## Stage 4 — kept-set gates, then insert

Kept set re-runs stage 0 as a set. If the key-extremity gate (>= 10 numeric
kept) or the magnitude check fails, the batch is held — no dropping or editing
items to pass. Insert with `BANK_FAMILY=act BANK_COHORT=act-math-v18
BANK_BAND=mixed`, then `verify-act-draw.ts` and `form-capacity.mjs`.

## Success

**ACT Math 15 -> 16 forms**: every one of the six deficits met by kept items.
Anything less is partial, inserted anyway if it passes, and recorded at its
true value with denominators and the remaining deficit.
