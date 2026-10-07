# ssat-math-s14 — pre-registration (written 2026-10-07, BEFORE any item exists)

## Why SSAT Math, and what it can buy

`admission-form-depth.ts` (shared-pool replay, fixed in c4ae7a13), run
2026-10-07 before this batch:

    SSAT math   256 items, ONE block of 50/test     5 clean   form 6: 6/50 fresh
    --target 6: math needs 300 items                -> +44 to buy form 6

SSAT serves ONE math block (`ADMISSION_BLUEPRINT.ssat`: the two real
25-question Quantitative sections served as a single 50-question block,
co-founder 2026-09-02), so there is no second block sharing the seen-list the
way ISEE quant/mathach do. The replay's one-map-per-bank-section logic gives
the same answer as a per-block replay here, and that is checked, not assumed
(the depth table prints no "pool shared" note on SSAT math). The draw is
`drawByPassage(ranked, 50, 1, fresh)` over the whole section: no band, level
or subtopic quota (every live SSAT math row is domain `Math`, five-choice,
ungrouped), so the pool TOTAL binds and 300 is the number.

Whole-test SSAT stays at 3 clean tests (Reading binds at 3). Stated here so
the result is not reported as more than it is. Students take sections
separately, so the section's own depth is the number this batch moves.

## Batch

- Cohort `ssat-math-s14` (no file or live cohort of that name exists).
- **56 authored, not 50**: two Claude authors x 28 on disjoint mechanism
  ground. Form 6 needs 44 survivors. The last two comparable gates kept
  43/50 (86%, ssat-math-q9) and 22/28 (79%, isee-math-s13); at 79%, 50
  authored yields ~39 and misses the form, 56 yields ~44. The extra six are
  margin against the drop rate, not a lowered bar.
  - Author A: arithmetic and number sense, fractions/decimals/percents,
    ratio/rate/proportion, number theory (factors, primes, divisibility,
    remainders, digits), counting and probability, statistics.
  - Author B: algebra (expressions, exponents, radicals, linear equations,
    inequalities, systems, word-problem setup, functions, defined
    operations), geometry (angles, triangles, polygons, circles,
    area/perimeter/volume, coordinate geometry), sequences and patterns.
- FIVE choices, no figures, no calculator, SSAT Upper Level (grades 8-11)
  scope: no trigonometry, logarithms, matrices, complex numbers or calculus.
- Target authored mix per author 4 easy / 12 medium / 12 hard (authored
  "hard" is routinely demoted, AUTHORING-BRIEF §13d). Inserted at
  `BANK_BAND=mixed`; difficulty = graders' consensus, or the easier label
  where they split.
- Authors read all 256 live SSAT math rows, all 348 live ISEE math rows and
  the 1,364 live SAT math rows before writing; a mechanism duplicate of a
  live SSAT row is a drop at B5.
- Frozen (sha256 recorded) before any solver or grader sees it. No item is
  repaired after the freeze: a failing item is dropped.

## Bars (fixed now)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it (56 x 4 = 224).
Fixed by the author BEFORE the freeze; none may exist after it.

**B2 Pre-flight (before the freeze, never reported as clearance).**
Key-extremity gate PASS (five-choice derived line 2/5 x 0.8 = 32%); numeric
and symbolic hub at or below control +10; `check-run-middle`,
`check-option-pair-constant`, `check-key-is-sum`, `check-sign-pair`,
`check-plurality-key`: an item whose key sits inside a named shape is
re-authored before the freeze.

**B3 Options-only attack.** `make-oo-render.mjs --control 30`, stem withheld,
keys dealt round-robin over FIVE slots, control DERIVED from the deal (best
fixed letter per arm; ~21% for a flat five-way deal of 56, 20.0% for 30 —
whatever the script prints is the number used, never a literal 20 or 25).
Matched live control: 30 verified, unarchived SSAT math rows (same family,
section, domain, width), interleaved into the same blind file, three Claude
samples attack both arms. `score-oo.mjs` splits by arm; the decision number
is CANDIDATE minus LIVE CONTROL, each against its own best-fixed-letter line.
The samples are correlated (one model sampled three times), so the margin is
the statistic, not per-item unanimity.

- Control ceiling: the 2026-09-21 SSAT math control read 28.0%. If the live
  control comes in at or above 80%, the reject bar cannot fire and the attack
  is VOID (held, not passed).
- PASS if candidate pooled mean <= control pooled mean + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0 points.
- Between: pass only if the candidate's unanimous-correct RATE is at most the
  control's + 10 points; otherwise HOLD.
- Unanimity never drops an item on its own; an item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld; per-item shuffled order). Two Claude
graders, each solves every item and returns: pick, exclusive,
second_defensible, free_elimination (what, and which distractors it kills
WITHOUT the item's method — range bounds, parity, units digit, divisibility,
closure under the asked operation, adjacency, monotonicity, limiting cases,
magnitude), difficulty (easy/medium/hard for an SSAT Upper Level candidate),
in_band, duplicate_of_live.

Drop an item if ANY of:
1. a grader's pick differs from the key and my hand recomputation agrees
   with the grader;
2. any grader names a second defensible answer I can confirm;
3. any grader names a free elimination that kills **>= 2 of the 4
   distractors** without the method, confirmed by hand (plug-back on a
   one-step equation is the method, not a bound);
4. either grader marks it out of band for SSAT Upper Level with a
   curriculum reason I confirm;
5. a grader names a live duplicate I confirm.

HOLD the whole batch if more than 16 of 56 are dropped at B4 (the brief is
broken; do not cherry-pick survivors).

**B5 Duplicate scan.** `stem-duplicates.mjs <batch> --family ssat` (the
insert-time gate) plus my own paged word-3-shingle scan of every live SSAT
math row (stem Jaccard >= 0.35 reviewed by hand for same mechanism;
break-tested by planting a live stem), and the same scan against live ISEE
and SAT math reported as information. A confirmed same-problem pair with a
live SSAT row drops the candidate.

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=ssat
BANK_COHORT=ssat-math-s14 BANK_BAND=mixed math-bank-helper insert`, then
`admission-form-depth.ts`.

**Prediction.** SSAT math 5 -> 6 clean forms if >= 44 insert (256 + 44 =
300). If fewer than 44 pass, the passers are still inserted (each is a sound
item) and the form is reported as NOT bought, with the shortfall; any top-up
is a fresh cohort with its own pre-registration, never a repair of this one.
Whole SSAT test stays at 3 (Reading).
