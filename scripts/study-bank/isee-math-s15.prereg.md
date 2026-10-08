# isee-math-s15 — pre-registration (written 2026-10-08, BEFORE any item exists)

## What it can buy

`admission-form-depth.ts` (shared-pool replay), run 2026-10-08 before this
batch:

    ISEE quant    348 items (pool shared with mathach)  37/form   4 clean  form 5: 12/37 fresh
    ISEE mathach  348 items (pool shared with quant)    47/form   4 clean  form 5:  0/47 fresh
    one ISEE test consumes 37 + 47 = 84 math items from one pool

    form 5 needs 5 x 84 = 420  -> +72
    form 6 needs 6 x 84 = 504  -> +156

(`--target 6` prints quant 222 and mathach 282 separately and does not add
them; the shared pool needs their sum, 504. Stated so nobody reads 282.)

Whole-test ISEE stays at 2 clean tests (Reading binds at 2). Students sit
sections separately, so the section depth is the number this batch moves.

## What the assembler draws — read, not assumed

`assembleAdmissionSection` (src/lib/study/assemble.ts) draws both ISEE maths
blocks with `drawByPassage(ranked, block.questions, 1, fresh)` over every
verified, unarchived `isee/math` row: **no difficulty, level, subtopic or
type quota** (ISEE publishes section counts and timings, not domain weights,
and the code refuses to invent them). Quant and mathach differ only in count
(37 vs 47) and clock; they draw from the same rows. So "the mix quant and
mathach draw" is the mix of the live pool, sampled at random. Measured
2026-10-08 over all 348 rows (paged, ordered):

    task       multiple_choice 348      choices  4 on 348     graphic none
    domain     Math 348                 grouped  0
    difficulty easy 49 (14.1%) / medium 197 (56.6%) / hard 102 (29.3%)
    quantitative-comparison items: 0

This batch matches that: four-choice, ungrouped, no figure, domain `Math`,
spread over the five ISEE content strands (numbers and operations; algebra;
geometry; measurement; data analysis and probability) in both the
word-problem register quant uses and the direct-computation register
mathach uses, with a difficulty mix that lands near 14/57/29 after the
graders' usual demotion. **Quantitative comparison is out of scope**: the
real ISEE Upper Level quant section carries it, but no live ISEE row is that
type, and introducing a new type to the form is an owner call, not a batch.

## Batch

- Cohort `isee-math-s15` (no file or live cohort of that name exists;
  `isee-math-s14` is skipped deliberately so this cannot collide with an
  unrecorded draft of that name).
- **198 authored, not ~170**: six Claude authors x 33. Form 6 needs 156
  survivors. The last two comparable gates kept 79% (isee-math-s13, 22/28)
  and 82% (ssat-math-s14, 46/56). At those rates 170 authored yields
  134-139 and buys form 5 only; 198 yields 156-162. The extra 28 are
  margin against the drop rate, not a lowered bar. If fewer than 156 pass,
  the passers are still inserted and form 6 is reported NOT bought, with the
  shortfall.
- Authors on disjoint ground (one strand each), FOUR choices, no figures,
  no calculator, ISEE Upper Level (grades 8-12 applicants): no trigonometry,
  logarithms, matrices, complex numbers, calculus.

      A  numbers and operations: integer/fraction/decimal arithmetic, order of
         operations, number theory (factors, multiples, primes, divisibility,
         remainders, GCF/LCM, digits, units digits), exponents and scientific
         notation, estimation and number sense, defined operations
      B  ratio, rate, proportion and percent in context: unit rates, scaling,
         mixtures, work, distance-rate-time, percent change, money, interest
      C  algebra: expressions, exponent rules, radicals, linear equations and
         inequalities, absolute value, systems, word-problem translation,
         functions and function notation, factoring and simple quadratics
      D  geometry: angles and parallel lines, triangles, polygons, circles,
         area and perimeter, Pythagorean theorem, similarity, volume and
         surface area — described in words, no figure
      E  measurement, coordinate geometry and patterns: unit and rate
         conversions, coordinate plane (slope, midpoint, distance,
         intercepts, reflections, translations, area on the grid),
         sequences and patterns, time/clock/calendar arithmetic
      F  data analysis and probability: mean/median/mode/range, weighted
         averages, data described in a sentence or small inline table,
         counting principles, probability, overlapping sets

- Commissioned mix per author: 4 easy / 16 medium / 13 hard, about half in
  the word-problem register and half direct computation. Authored "hard" is
  routinely demoted (AUTHORING-BRIEF §13d; s13 banked 5/12/5 from 4/11/7);
  the commission is set so the banked mix lands near the live 14/57/29.
  Inserted at `BANK_BAND=mixed`; banked difficulty = graders' consensus, or
  the easier label where they split.
- Every item carries `family: "isee"`, `section: "math"`, `domain: "Math"`,
  `subskill`, `difficulty`, `prompt`, `choices[4]`, `correct_answer`,
  `explanation`, `solve`, `distractor_solve` (one per distractor). Ids
  `IM15A-01 .. IM15F-33`.
- Authors read all 348 live ISEE math rows (dumped for them) before
  writing. A mechanism duplicate of a live ISEE row is a drop at B5.
- Authors write to their own file `isee-math-s15{a..f}.batch.json`, run
  B1/B2 on it, report and STOP. They do not spawn auditors or touch the file
  after reporting (§13g). Completion is judged by the file on disk and its
  hash, never by a notice.
- I merge the six files, run B1/B2 on the merge, and freeze (sha256
  recorded) before any solver or grader sees it. A merged pre-flight
  failure goes back to the owning author BEFORE the freeze. **No item is
  repaired after the freeze: a failing item is dropped.**

## Bars (fixed now)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it (198 x 3 = 594). Fixed
by the author BEFORE the freeze; none may exist after it. Any B1 failure on
the frozen file STOPS the run.

**B2 Pre-flight (before the freeze, never reported as clearance).**
Key-extremity gate PASS (four-choice derived line 2/4 x 0.8 = 40%) on each
author file AND the merged file; numeric and symbolic hub lines at or below
control +10; `check-run-middle`, `check-option-pair-constant`,
`check-key-is-sum`, `check-sign-pair`, `check-plurality-key`: an item whose
key sits inside a named shape is re-authored before the freeze.
Within-batch: `stem-duplicates` on the merged file must report 0 internal
pairs, and my own within-batch shingle scan (stem Jaccard >= 0.35) is read by
hand; a same-problem pair across two authors is re-authored before the
freeze.

**B3 Options-only attack.** `make-oo-render.mjs --control 100`, stem
withheld, keys dealt round-robin, control DERIVED from the deal (best fixed
letter per arm; whatever the script prints is the number used, never a
literal 25). Matched live control: 100 verified, unarchived ISEE math rows
(same family, section, domain, width) drawn by the script's own seeded
generator and INTERLEAVED into the same blind file. Three Claude samples
attack all 298 (a sample may be split into parts by item range if one agent
cannot hold the file; every item still gets exactly three picks).
`score-oo.mjs` splits by arm; the decision number is CANDIDATE minus LIVE
CONTROL, each against its own best-fixed-letter line. The samples are
correlated (one model sampled three times): the margin is the statistic,
not per-item unanimity.

- Control ceiling: the s13 live ISEE control read 38.9%. If the control
  comes in at or above 80%, the reject bar cannot fire and the attack is
  VOID (held, not passed).
- PASS if candidate pooled mean <= control pooled mean + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0 points.
- Between: pass only if the candidate's unanimous-correct RATE is at most
  the control's + 10 points; otherwise HOLD.
- Unanimity never drops an item on its own; an item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve withheld; per-item shuffled order). Two independent
Claude graders per item (grader A and grader B; each may be run as three
agents over thirds of the render, so every item is still read by exactly two
graders who never see each other's output). Each solves every item and
returns: pick, exclusive, second_defensible, free_elimination (what, and
which distractors it kills WITHOUT the item's method — range bounds, parity,
units digit, divisibility, closure under the asked operation, adjacency,
monotonicity, limiting cases, magnitude, forced denominators, sign read off
the stem), difficulty (easy/medium/hard for an ISEE Upper Level candidate),
in_band, duplicate_of_live.

Drop an item if ANY of:
1. a grader's pick differs from the key and my hand recomputation agrees
   with the grader (a grader slip is recorded, the sandbox stands);
2. any grader names a second defensible answer I can confirm;
3. any grader names a free elimination that kills **>= 2 of the 3
   distractors** without the method, confirmed by hand (plug-back on a
   one-step equation is the method, not a bound);
4. either grader marks it out of band for ISEE Upper Level with a
   curriculum reason I confirm;
5. a grader or B5 names a live ISEE duplicate I confirm.

HOLD the whole batch if more than 56 of 198 are dropped at B4+B5 (28.3%, the
same proportion as s13's 8 of 28: the brief is broken; do not cherry-pick
survivors).

**B5 Duplicate scan.** Three instruments, because ACT v20 (REGISTER §5,
2026-10-08) showed a stem-Jaccard scan missed three of four mechanism
duplicates:
1. `stem-duplicates.mjs <batch> --family isee` (the insert-time gate);
2. my own paged word-3-shingle scan of every live ISEE math row (stem
   Jaccard >= 0.35 read by hand; break-tested by planting a live stem);
3. a per-mechanism keyword search: a Claude agent given each candidate's
   mechanism and the full live ISEE math dump names any live row that is the
   same computation on the same structure; I confirm each by hand.
A confirmed same-problem pair with a live ISEE row drops the candidate. Live
SSAT/SAT overlaps are reported as information only (a different pool).

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=isee
BANK_COHORT=isee-math-s15 BANK_BAND=mixed math-bank-helper insert` on the
frozen file with a qc.json naming the survivors (an unnamed item is a drop),
then `verify-admission-forms.mjs` and `admission-form-depth.ts`.

**Prediction.** ISEE math 4 -> 5 clean forms if >= 72 insert (420), 4 -> 6
if >= 156 insert (504). Whole ISEE test stays at 2 (Reading).

**Stop rule.** The run stops at the first failed gate (B1 after freeze, B3
HOLD or VOID, B4/B5 HOLD). Nothing is inserted from a stopped run and
nothing is repaired; any retry is a fresh cohort with its own
pre-registration.

## Author brief (every author gets this, plus their strand)

Read first: CLAUDE.md (repo root), `AUTHORING-BRIEF.md` §1, §2, §4, §5, §8,
§13 and §15, and every live ISEE math row in the dump you are given. Then:

1. **Every option must be a legal answer to the stem** (§1): sign, range,
   integrality, part-of-whole, units, totals the stem prints.
2. **Bound feasibility (§8a), the single largest cause of drops in s13 and
   s14.** For each item list every bound the stem forces — monotonicity, a
   part below its whole, an average between its extremes, parity,
   divisibility, units digit, a forced denominator (a probability over n
   equally likely outcomes is k/n), a perfect-square/cube requirement, a sign
   or direction readable off the stem, closure under the asked operation,
   adjacency on "greatest/least strictly below" questions, the limiting
   case. **At least three of four options must survive every one.** No
   option sits ON a bound. Report which KINDS of bound you checked (§8b), not
   a count.
3. **The s13/s14 drops by name — do not repeat them:** a round trip with a
   current/wind (always longer than still water); a LEAST question where
   plug-back of the smallest survivor ends the item; repeating-decimal
   options whose repetend length is checkable; an arithmetic-sequence term
   whose residue mod d is forced; "x + c must be a perfect square"; one
   plug-back skipping a quadratic; probability denominators forced by the
   stem; a rising/falling line that fixes a sign; a coefficient printed in
   the stem; a digit-rearrangement distractor.
4. **Distractors (§4, §15):** each from a DIFFERENT named wrong path, one per
   error family, at least one that overshoots or goes sideways; no hub (key
   one operation from every distractor), no three-term run that names its
   middle, no key/−key pair (§13a), no limiting-case distractor (§13b), no
   recall bypass (§13c).
5. **Keys:** on "greatest/least" items at least one distractor lies beyond
   the key in the asked direction (§13j). Across your file, the key is the
   largest or smallest option on 45-60% of numeric items (the gate refuses
   below 40%; a file far above 60% is its own tell). Deal key letters across
   A-D (§13f).
6. **Vary the load-bearing element** across your file (§3): no two items on
   the same setup triple; different numbers, contexts, and asked quantities;
   ask for an intermediate quantity as the key on three or four items.
7. **No live duplicate.** Write against the live mechanism list, not your
   memory of it; a reworded live mechanism is a duplicate (§13l).
8. **Required:** `solve` (JS function body recomputing the key from the
   givens) and `distractor_solve` keyed by each distractor string. Use ASCII
   minus. Plain text maths (x^2, sqrt(2), 3/4); no LaTeX, no figures.
9. **Before reporting:** run, in the repo root,
   `node scripts/study-bank/math-bank-helper.mjs verify <your file>` (must
   show 33/33 and 99/99 distractors, key extremity PASS) and the pre-flight
   checkers named in B2; fix anything they flag. Then write the completion
   marker named in your commission (outside the repo) containing the sha256
   of your batch file, report, and STOP. Do not touch the file again.
