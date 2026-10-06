# isee-math-s13 — pre-registration (written 2026-10-07, BEFORE any item exists)

## Why ISEE Math and not SSAT Math

`admission-form-depth.ts` replayed every ISEE block with its own exposure map.
`assemble.ts` reads exposures per STUDENT (`loadExposures`), and ISEE serves
two blocks from bank section `math` — quant (37) and mathach (47). One ISEE
test therefore consumes 84 math items from one pool. Fixed in the same commit
as this batch (`SHARED_POOL=0` reproduces the old replay; break-tested: ISEE
mathach reads 6 under it and 3 with the fix).

Real per-student depth on 2026-10-07, before this batch:

    SSAT math   256 items, 50/test      5 clean   6th needs +44 items
    ISEE math   327 items, 84/test      3 clean   4th needs +9 items (336)
                                                  5th needs +93 (420)

The admission draw has NO difficulty, level or subtopic quota for maths
(`drawByPassage(ranked, questions, 1, fresh)` over the whole section; every
ISEE math row is ungrouped, four-choice, no graphic). So the binding
constraint is the TOTAL count of the shared pool, nothing narrower. Forms per
item: ISEE +1 per 9, SSAT +1 per 44. ISEE Math is the batch.

Neither moves the whole-test number: ISEE is bound by Reading at 2 clean
tests, SSAT by Reading at 3. That is stated here so the result is not
reported as more than it is.

## Batch

- Cohort `isee-math-s13` (`isee-math-s12.batch.json` exists in the directory,
  was never ledgered or inserted, and is left alone).
- 28 authored by two Claude authors on disjoint ground (14 each), FOUR
  choices, no figures, no calculator, ISEE Upper Level. Target authored mix
  4 easy / 14 medium / 10 hard; inserted at `BANK_BAND=mixed` because the
  ISEE form is mixed by design and the draw has no band.
- Frozen (sha256 recorded) before any solver or grader sees it. No item is
  repaired after the freeze: a failing item is dropped.

## Bars (fixed now)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it. Any failure is fixed
by the author BEFORE the freeze; none may exist after it.

**B2 Pre-flight (before the freeze, not a verdict).** Key-extremity gate PASS
(>= 40% of numeric items keyed at the largest or smallest value, four-choice
derived line 2/4 x 0.8); numeric and symbolic hub lines at or below control
+10; `check-run-middle`, `check-option-pair-constant`, `check-key-is-sum`,
`check-sign-pair`: an item whose key sits inside a named shape is re-authored
before the freeze. These are pre-flight only and never reported as clearance.

**B3 Options-only attack.** `make-oo-render.mjs`, stem withheld, keys dealt
flat, control DERIVED from the deal (best fixed letter; 25.0% expected for a
flat four-way deal — whatever the script prints is the number used).
Matched live control: 24 verified, unarchived ISEE math rows (same family,
section, domain, width) drawn by the script's own `--control 24` (shared
seeded generator) and INTERLEAVED into the same blind file, so the same three
Claude samples attack both arms and nothing marks which is which.
[Amended before any item existed: the first draft said separate files per
arm; the committed renderer's interleaved control is the stronger design and
is the house standard.] `score-oo.mjs` splits by arm; the decision number is
its CANDIDATE minus LIVE CONTROL line, each arm against its own best-fixed-
letter line. Correlated samples: the margin is the statistic, not any
per-item unanimity.

- Control ceiling check: the live control is expected near 25-35%. If it
  comes in at or above 80%, the reject bar below cannot fire and the attack
  is VOID for this batch (held, not passed).
- PASS if candidate pooled mean <= control pooled mean + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0 points.
- Between: pass only if the candidate's unanimous-correct RATE is at most the
  control's unanimous-correct rate + 10 points; otherwise HOLD.
- Unanimity never drops an item on its own. An item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve withheld), per-item choice order as rendered. Two Claude
graders, each solves every item and returns: pick, exclusive (y/n),
second_defensible, free_elimination (what, and how many distractors it kills
WITHOUT doing the item's method — range bounds, parity, units digit, closure
under the asked operation, adjacency, limiting cases), difficulty
(easy/medium/hard for an ISEE Upper Level candidate), in_band (y/n + reason).

Drop an item if ANY of:
1. a grader's pick differs from the key and my hand recomputation agrees with
   the grader (if the grader made an arithmetic slip, the sandbox stands and
   the slip is recorded);
2. any grader names a second defensible answer I can confirm;
3. any grader names a free elimination that kills >= 2 of the 3 distractors
   without the method;
4. either grader marks it out of band for ISEE Upper Level with a curriculum
   reason I confirm (trig, logarithms, calculus, matrices, complex numbers,
   anything needing a calculator).

HOLD the whole batch if more than 8 of 28 are dropped at B4 (the brief is
broken; do not cherry-pick survivors).

**B5 Duplicate scan.** `stem-duplicates.mjs <batch> --family isee` (live,
paged, the insert-time gate) plus my own paged scan of every live ISEE row:
word-3-shingle Jaccard on stem+choices >= 0.5, and same-mechanism review of
every pair >= 0.35 on stem alone. A confirmed same-problem pair drops the
candidate.

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=isee
BANK_COHORT=isee-math-s13 BANK_BAND=mixed math-bank-helper insert`, then
`bank-state.mjs counts` and `admission-form-depth.ts`. Prediction: ISEE math
3 -> 4 clean tests if >= 9 items insert (327 + 9 = 336 = 4 x 84). ISEE whole
test stays at 2 (Reading).
