# act-math-v17 — pre-registered bars (written 2026-10-07, BEFORE any item is authored)

## Why this batch, and its size

`form-capacity.mjs` (2026-10-07, after act-math-v16): ACT Math **14 forms**,
binding on Geometry **119 / 8 per form**. `next-form.mjs act/math`:

    CHEAPEST NEXT FORM: 1 items  ->  Geometry +1

Format read from code: `src/lib/study/act-test.ts` math block
`questions: 45, choiceCount: 4` — FOUR choices.

Form 16 (16 x per-form minimum vs live):

    domain                        live   /form   need@16   deficit
    Geometry                       119       8       128         9
    Number and Quantity             75       5        80         5
    Integrating Essential Skills   135       9       144         9
    Algebra                        121       8       128         7
    Functions                      121       8       128         7
    Statistics and Probability      93       6        96         3
    total                                                       40

Form 16 needs 40 items across all six domains — not cheap, and outside the
<= 12-item scope. **This batch buys form 15 only.** It is Geometry-only, so
every surplus Geometry passer is also progress toward form 16's Geometry +9,
but no outcome of this batch reaches form 16.

Authored: **10 Geometry items** (need 1; v16 Geometry kept 7 of 10, so 10
gives margin for a v16-sized drop rate several times over). One Claude author.
Commissioned **mixed band**: BANK_BAND=mixed declared HERE; the banked label is
always the graders'. Cohort `act-math-v17`. No repairs in this round.

**Success** = >= 1 Geometry item kept and inserted, ACT Math 14 -> 15 forms.

## Stage 0 — structural pre-flight (author runs it; I re-run it on delivery)

Identical to act-math-v16: sandbox N/N, distractor_solve 3N/3N with 0
mismatches, numeric and symbolic hub margin <= +10, `key-extremity-gate` PASS
(>= 40% at k=4; it applies at >= 10 numeric items, so it applies to the
authored 10 if all are numeric), `check-key-magnitude` consistent with live,
`check-key-is-composition` 0 unique-composite keys, `check-sign-pair` /
`check-plurality-key` / `check-dead-options` / `check-stem-echo` /
`check-key-singleton` exit 0, `stem-duplicates --family act` and
`check-duplicate-option-sets act/math` clean. A failing file goes back to the
author ONCE before any attack; after the attack nothing is edited.

## Stage 1 — options-only attack (screen)

Every candidate interleaved with a live ACT Math Geometry control matched 1:1
(10 live), width 4, keys dealt flat WITHIN each arm, no act-math-v16 or v17
row in the control. Three blind Claude samples, recorded as **three samples of
one solver**.

- **Batch HOLD** if candidate margin (pooled rate − its within-arm
  best-fixed-letter control) exceeds the live arm's margin by **more than +10
  points**. Ceiling check: live arms have measured 27.2–34.7% on this
  instrument (v11, v15, v16); candidate would need ~40–45%, ceiling 100% — the
  bar can fire. One item is 3.3 points at n = 10 x 3, so the bar is ~4 items'
  worth of excess solves; small-n, stated here so it is not discovered later.
- **Batch HOLD** if candidate unanimous-correct rate exceeds the live arm's
  by **more than 15 points** (rate comparison; no n·p³ expectation).
- **Instrument-invalid clause**: if the live arm's margin is itself >= +25, the
  with-source half decides alone.
- **Per item**: unanimous-correct drops ONLY with with-source corroboration
  (a named free elimination/shortcut, a second defensible answer, or a
  disputed key on that item).

## Stage 2 — with-source grade (decides)

Two independent Claude graders on `make-grade-render.mjs` (key, difficulty,
explanation, solve withheld). Per item: pick, second defensible answer, every
stem-forced bound and survivors, free elimination/shortcut, distractor quality
(strong/plausible/weak/dead), difficulty, duplicate note.

Kept only if all of:

1. Both picks equal the key (a pure grader arithmetic slip with the stem read
   the same way is forgiven after my re-derivation; a stem-reading split drops).
2. No second defensible answer named by either grader.
3. **>= 3 options survive every stem-forced bound** (§8a), named by either
   grader and confirmed by me. An option ON a bound is dead. **Limiting-case
   distractors get a dedicated check by me on every item** (§8c / §13b: the
   value at a parameter's extreme — the equal-split midpoint, the degenerate
   triangle, the un-halved/un-doubled count, the full perimeter/area, the
   no-overlap sum). Three of v16's four bound kills were this family.
4. Not graded "weak" distractor quality by both graders (two weak distractors
   in one item, named by either grader and confirmed by me, also drops).
5. No mechanism duplicate of a live maths row (any family) or of an earlier
   item in this batch.
6. Unanimous blind solve + a grader-named shortcut/free elimination -> drop.

**Difficulty banked** = graders' label: agree -> that; one band apart -> the
easier; easy vs hard -> medium.

## Stage 3 — duplicate scan

All candidates against ALL live maths rows across every family, paged with
ORDER BY and a distinct-id assertion (act-math-v16-dupscan.mjs, unchanged):
stem Jaccard >= 0.60 or identical option values read by hand; same mechanism
-> drop.

## Stage 4 — kept-set gates, then insert

Kept set re-runs stage 0 as a set. If the key-extremity gate applies (>= 10
numeric kept) and fails, or magnitude is inconsistent with live, the batch is
held — no dropping or editing items to pass. If fewer than 10 are kept the
gate does not apply; its value is reported anyway. Insert with
`BANK_FAMILY=act BANK_COHORT=act-math-v17 BANK_BAND=mixed`, then
`verify-act-draw.ts` and `form-capacity.mjs`.
