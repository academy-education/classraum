# ssat-math-s15 — pre-registration (written 2026-10-08, BEFORE any item exists)

## Why, and what it can buy

`admission-form-depth.ts` run 2026-10-08 before this batch:

    SSAT math   302 items, ONE block of 50/test     6 clean (all six forms 50/50)
    --target 8: math needs 400 items                -> +98 to buy forms 7 AND 8
                form 7 alone needs 350              -> +48

The SSAT math draw (`assembleAdmissionSection`, `drawByPassage(ranked, 50, 1,
fresh)`, re-read 2026-10-08) has NO band, level or subtopic quota: every live
SSAT math row is domain `Math`, five-choice, ungrouped, and the pool TOTAL
binds. So "the assembler's topic and level mix" is the mix of the pool it draws
uniformly from — the live bank's own mix — and the batch is commissioned to
reproduce it rather than shift it.

Whole-test SSAT stays at 3 clean tests (Reading binds at 3). Stated here so a
section result is not reported as more than it is.

## The mix this batch targets (measured 2026-10-08 on the 302 live rows)

Level (row `difficulty`, `bank-state.mjs counts`):

    easy 69 (22.8%)   medium 165 (54.6%)   hard 68 (22.5%)

Topic (a keyword classifier over prompt + subskill, scratchpad `classify2.py`;
107 of 302 rows carry no subskill, so this is approximate to a few points and
is quoted as a commissioning target, never as a measurement of the batch):

    ratio / rate / percent / proportion word problems   75  24.8%
    geometry incl. coordinate                           73  24.2%
    counting / probability / statistics / sets          59  19.5%
    algebra / functions / sequences / operations        54  17.9%
    number theory                                       28   9.3%
    arithmetic / fractions / decimals                   13   4.3%

## Batch

- Cohort `ssat-math-s15` (no file or live cohort of that name exists).
- **120 authored, not 110.** 110 was asked for. The last three comparable gates
  kept 46/56 (82%, s14), 43/50 (86%, q9) and 22/28 (79%, isee-math-s13). Two
  forms need 98 survivors: 110 at 82% is 90 (form 7 only); 120 at 82% is 98.
  The extra ten are margin against the drop rate, not a lowered bar.
- **Five Claude authors, disjoint topics, no shared templates** (topic shares of
  120 in brackets, live share after the slash):

      A  30  ratio, rate, percent, proportion, work, mixture, unit conversion   25.0 / 24.8
      B  25  plane and solid geometry, NO coordinates                         } 24.2 / 24.2
      D   4    coordinate geometry (slope, distance, midpoint, area on a grid) }
      C  23  counting, probability, statistics (mean/median/mode/range,
             weighted average, described tables), sets / Venn               19.2 / 19.5
      D  22  algebra: expressions, equations, inequalities, systems,
             exponents/radicals, functions, defined operations, sequences,
             word-problem setup (ages, coins, digits-as-unknowns excluded)   18.3 / 17.9
      E  11  number theory: factors, primes, divisibility, remainders,
             GCD/LCM, units digit, parity                                   9.2 / 9.3
      E   5  arithmetic: fractions, decimals, order of operations, number
             line, place value, scientific notation                         4.2 / 4.3

  So author D writes 26 and author E writes 16. A word problem whose
  mechanism is a percent belongs to A even if it mentions money; a counting
  problem over integers belongs to C, a divisibility property to E.
- **Level, authored:** about 10% easy / 35% medium / 55% hard per author.
  Banked difficulty is the graders' consensus (or the easier label where they
  split), and graders demote: s14 authored 7 easy / 17 medium / 22 hard among
  its kept 46 and banked 18 / 26 / 2 (AUTHORING-BRIEF §13d, 17+ consecutive
  demotions). The authored mix is skewed hard to land near the live 23/55/22.
  **Prediction, stated now: banked hard will come in well under 22%.** The
  banked mix is REPORTED against the live mix with its effect on the pool; it
  is not a gate, because nothing after the freeze may change a label.
- FIVE choices, no figures, no calculator, SSAT Upper Level (grades 8-11)
  scope: no trigonometry, logarithms, matrices, complex numbers or calculus.
- Item ids `S15A-01` .. `S15E-16`. Each author writes its own file
  `ssat-math-s15{a..e}.batch.json`; nobody writes anyone else's.
- Authors read all 302 live SSAT math rows, all 348 live ISEE math rows and the
  1,383 live SAT math rows (dumped 2026-10-08) for their topic before writing,
  and list the live mechanisms in their topic in one line each (§13l). A
  mechanism duplicate of a live SSAT row is a drop at B5.
- **Cross-author template check before the freeze** (SEC v16's lesson:
  disjoint lists did not stop two authors converging). Every item declares a
  `template` triple (setup / asked quantity / mechanism) in its AUTHOR file; I
  compare all 120 across authors before merging. A collision is re-authored by
  the later author before the freeze. The frozen file drops the field.
- Frozen (sha256 recorded, committed) before any solver or grader sees it. No
  item is repaired after the freeze: a failing item is dropped.

## Authoring rules carried from s14 (all ten s14 drops were with-source free eliminations)

Each author's brief names these as the classes that cost s14 its items, and
asks for the INTERVAL each item's stem forces and the KINDS of bound checked
(§8a, §8b) — not a survivor count:

1. **A probability stem forces the denominator** (s14 A-17 conditional on 15
   odd numbers -> m/15; A-28 five tosses -> k/32). Every distractor must be
   expressible over a denominator the stem permits.
2. **Sign or direction read off a printed line or rate** (B-18, B-20).
3. **Parity / factor structure of the options** (A-08: 675 = 3^3 5^2 is not
   a product of two primes).
4. **The limiting case ON the bound** (A-14, §13b).
5. **Monotonicity in the asked parameter** (A-15).
6. **Digit rearrangements and impossible digit counts** (A-25).
7. **A coefficient printed in the stem** (B-19).
8. **One plug-back at a convenient value** (B-21) — for an expression or
   identity item, a substitution at x = 1 or 0 must not single out the key.
9. §13a no key/-key pairs; §13j on a greatest/least ask the key is not the
   extreme option; §8c no complete monotone ladder with the key interior;
   §13q no shared filler pool across the cohort.
10. No stem may announce its trap, and no single cheap bound may decide an
    extreme key (act-math-v25 rules 10, 11).

When finished, an author reports and stops (§13g): no sub-auditor, no edits
after handing in.

## Bars (fixed now)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it (120 x 4 = 480). Fixed
by the author BEFORE the freeze; none may exist after it.

**B2 Pre-flight (before the freeze, never reported as clearance).**
Key-extremity gate PASS (five-choice derived line 2/5 x 0.8 = 32%); numeric and
symbolic hub at or below control +10; `check-run-middle`,
`check-option-pair-constant`, `check-key-is-sum`, `check-plurality-key`: an item
whose key sits inside a named shape is re-authored before the freeze.
`check-sign-pair` is four-option only and prints NOT MEASURED; key/-key pairs
are checked by hand. `stem-duplicates.mjs --family ssat` and the within-batch
cross-author template check also run here. **One fix round per author.** An
item still failing after it is cut before the freeze (reported as authored,
not frozen). If the merged file still fails the key-extremity gate after the
fix round, the batch STOPS at B2.

**B3 Options-only attack.** `make-oo-render.mjs --control 40`, stem withheld,
keys dealt round-robin over FIVE slots, control DERIVED from the deal (whatever
the script prints is the line used, never a literal 20). Matched live control:
**40** verified, unarchived SSAT math rows (s14 used 30 and its control read
28.0% on 2026-09-21 and 42.2% on 2026-10-07 with the same instrument; 40 is
taken to narrow that), interleaved into the same blind file; three Claude
samples attack all 160. `score-oo.mjs` splits by arm; the decision number is
CANDIDATE minus LIVE CONTROL, each against its own best-fixed-letter line. The
samples are correlated (one model sampled three times), so the margin is the
statistic, not per-item unanimity.

- Control ceiling: if the live control comes in at or above 80%, the reject
  bar cannot fire and the attack is VOID (held, not passed).
- PASS if candidate pooled mean <= control pooled mean + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0 points.
- Between: pass only if the candidate's unanimous-correct RATE is at most the
  control's + 10 points; otherwise HOLD.
- **Per-author subset (new, because five independent briefs can fail
  independently):** each author's subset is scored against the same control.
  An author subset at >= +20.0 points over the control is held whole (its
  items are not inserted) even if the pooled batch passes. Below that, the
  per-author numbers are information.
- Unanimity never drops an item on its own; an item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld; per-item shuffled order). The frozen
file is split into two halves of 60 by alternating position (so each half
carries all five authors) and each half is rendered separately; **two Claude
graders per half** (four graders, each solving 60 rather than 120). Each
grader solves every item and returns: pick, exclusive, second_defensible,
free_elimination (what, and which distractors it kills WITHOUT the item's
method — range bounds, parity, units digit, divisibility, closure under the
asked operation, adjacency, monotonicity, limiting cases, magnitude, a forced
denominator, a sign read off the stem, a coefficient printed in the stem, one
plug-back), difficulty (easy/medium/hard for an SSAT Upper Level candidate),
in_band, duplicate_of_live.

Drop an item if ANY of:
1. a grader's pick differs from the key and my hand recomputation agrees with
   the grader;
2. any grader names a second defensible answer I can confirm;
3. any grader names a free elimination that kills **>= 2 of the 4
   distractors** without the method, confirmed by hand (plug-back on a
   one-step equation is the method, not a bound);
4. either grader marks it out of band for SSAT Upper Level with a curriculum
   reason I confirm;
5. a grader names a live duplicate I confirm.

HOLD the whole batch if more than **34 of 120** are dropped at B4 (s14's 16 of
56, scaled: the brief is broken; do not cherry-pick survivors). HOLD an
author's whole subset if more than **half** of that author's items drop at B4.

**B5 Duplicate scan.** `stem-duplicates.mjs <batch> --family ssat` (the
insert-time gate) plus my own paged word-3-shingle scan of every live SSAT math
row (stem Jaccard >= 0.35 reviewed by hand for same mechanism; break-tested by
planting a live stem), and the same scan against live ISEE and SAT math
reported as information. A confirmed same-problem pair with a live SSAT row
drops the candidate.

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=ssat
BANK_COHORT=ssat-math-s15 BANK_BAND=mixed math-bank-helper insert`, then
`verify-admission-forms.mjs` and `admission-form-depth.ts`.

**Prediction.** SSAT math 6 -> 8 clean forms if >= 98 insert (302 + 98 = 400);
6 -> 7 if 48-97 insert. If fewer than 98 pass, the passers are still inserted
(each is a sound item) and form 8 is reported as NOT bought, with the
shortfall; any top-up is a fresh cohort with its own pre-registration, never a
repair of this one. Whole SSAT test stays at 3 (Reading).
