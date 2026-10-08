# ssat-math-s16 — pre-registration (written 2026-10-08, BEFORE any item exists)

## Why, and what it can buy

Measured 2026-10-08 before this batch (`bank-state.mjs counts`, and a 10-form
replay of `admission-form-depth.ts` with `FORMS = 10`, importing the real
`drawByPassage`):

    SSAT math   405 drawable, ONE block of 50/test     8 clean
                form 9 = 5/50 fresh, form 10 = 0/50
    form 9 needs 450 (+45)      form 10 needs 500 (+95)

The SSAT math draw (`drawByPassage(ranked, 50, 1, fresh)`) has no band, level
or subtopic quota: the pool total binds, and a form's mix is the pool's mix.
Whole-test SSAT stays at 3 clean (Reading binds at 3). Quoted so a section
result is never reported as more than it is.

## What s15 left behind, and what this batch changes

s15 (REGISTER §5, 2026-10-08) inserted 103 of 120 and bought forms 7-8. Two
findings drive this batch:

1. **Difficulty drift.** s15 authored 60 hard among its kept 103 and banked
   38 easy / 61 medium / 4 hard (graders' consensus, easier label on a split).
   The pool moved from 22.8 / 54.6 / 22.5 to **26.4 / 55.8 / 17.8 %**
   (107 / 226 / 72 of 405). Of s15's 60 authored-hard items scored by both
   graders, 4 were called hard by both, 7 split hard/medium, 44 medium/medium.
2. **Forced-structure free eliminations.** 16 of 17 s15 drops were
   with-source free eliminations; the class that dominated was a divisibility
   or form the STEM forces that the option set did not respect (a total that
   must be a multiple of the per-unit count: A-14, A-27, C-01, E-07; an
   equilateral area that must carry sqrt(3): B-14; a pi-coefficient that must
   carry the printed height: B-06). The authors' own `interval` fields missed
   every one.

Changes, fixed now:

- **Mostly hard.** Authored level 0 easy / ~20% medium / ~80% hard. The live
  pool already holds 107 easy (26.4%); none are needed. Authors are given
  s15's graded evidence — the 11 items at least one grader called hard, with
  the graders' notes, against a sample of the 44 authored-hard items both
  graders demoted — and told that "hard" is decided by the graders, not the
  author's label.
- **Forced-form check, mechanical, by option VALUE.** A new script,
  `check-forced-form.mjs`, reads only the options: for every property in a
  fixed battery the KEY has (integer; multiple of d for d = 2..12, on the value
  or on a pi / sqrt(r) coefficient; odd; reduced denominator q; sign; perfect
  square / cube; carries pi; carries sqrt(r); percent / dollar / unit form), it
  counts the distractors sharing it, and flags fewer than three. It cannot see
  whether the stem forces a property, so each flag is either FIXED (>= 3
  distractors share it) or carries a per-item `forced_form_notes` entry saying
  why the stem does not force it. **Every declared note is read by me against
  the stem before the freeze**; a note I reject is a return, and an item still
  carrying a rejected note after its author's one return is cut before the
  freeze. Break-test (self-test, run before this file was committed): on the
  frozen s15 file with no notes it flags all six forced-structure drops above,
  and goes quiet on A-27 once four distractors are multiples of 6. It flags 101
  of 117 scorable s15 items (15 of 16 numeric drops, 86 of 101 numeric keeps),
  so it is a reading list, not a detector, and it is never reported as a
  clearance.
- **Solution-method duplicate search before the freeze**, against live SSAT
  math (405 rows, s15 included) and across authors, by three instruments:
  (i) `math-mechanism-dup.mjs` over every live maths row in every family and
  within the batch, with each item's author-declared `mechanism` phrases;
  (ii) the cross-author `template` triple compare (s15's instrument); (iii) a
  per-item `method` line (the solution path in one sentence, no numbers)
  compared across all 125 by word-overlap, every pair >= 0.35 read by hand. A
  same-method pair with a live SSAT row, or across authors, is returned to the
  later author once; still a duplicate after it, the item is cut before the
  freeze. The authored-only fields (`template`, `method`, `mechanism`,
  `interval`, `bounds_checked`, `forced_form_notes`) are stripped from the
  frozen file.

## Batch

- Cohort `ssat-math-s16` (no file or live cohort of that name exists).
- **125 authored.** About 120 was asked. Form 10 needs 95 survivors; s15 kept
  103/120 (85.8%), s14 46/56 (82.1%). 120 at 82% is 98.4 — three items of
  margin, on a batch that is now mostly hard and has no history at this level.
  125 at 82% is 102.5; at 76% it is 95.
- **Five Claude authors, disjoint topics** at the live topic mix (keyword
  classifier over prompt + subskill on the 405 live rows, approximate to a few
  points; a commissioning target, never a measurement of the batch):

      A  30  ratio, rate, percent, proportion, work, mixture, unit conversion   24.0 / 24.4
      B  26  plane and solid geometry, no coordinates                        } 24.8 / 25.2
      B   5  coordinate geometry                                              }
      C  25  counting, probability, statistics, sets / Venn                   20.0 / 20.0
      D  22  algebra: expressions, equations, inequalities, systems,
             exponents/radicals, functions, defined operations, sequences      17.6 / 17.8
      E  11  number theory                                                    } 13.6 / 12.5
      E   6  arithmetic, fractions, decimals, place value, notation          }

  Authored level per author: A 6 medium / 24 hard, B 6 / 25, C 5 / 20,
  D 4 / 18, E 4 / 13 = **25 medium / 100 hard**, 0 easy.
- FIVE choices, no figures, no calculator, SSAT Upper Level scope (grades
  8-11): no trigonometry, logarithms, matrices, complex numbers or calculus.
- Ids `S16A-01` .. `S16E-17`; each author writes only its own file
  `ssat-math-s16{a..e}.batch.json`. Keys dealt evenly over the five slots by
  each author; the frozen file is the five files concatenated in id order.
- **Concurrency:** at most two authors run at once (waves A+B, C+D, E);
  completion is judged by files on disk; an author idle 6+ minutes is
  relaunched from its disk state. Authors save after every few items.
- Frozen (sha256 recorded, committed) before any solver or grader sees it. No
  item is repaired after the freeze: a failing item is dropped.

## Authoring rules (carried from s15, plus the two changes above)

All of s15's rules 1-10 (forced denominator, sign off a printed line, parity
and factor structure, limiting case on the bound, monotonicity, digit
rearrangements, printed coefficient, one plug-back, §13a/§13j/§8c/§13q, no
announced trap, no single cheap bound deciding an extreme key), and:

11. **Forced form, as a check:** for counting and ratio items in particular,
    at least three of the four distractors share every divisibility or form the
    stem forces; `check-forced-form.mjs` on the author's file shows no OPEN
    flag before the author reports.
12. Every item declares `mechanism` (2-4 short phrases) and `method` (one
    sentence, no numbers) for the duplicate search, and lists the live SSAT
    mechanisms in its topic before writing (§13l). The s15 rows are live and
    are in the dump.

## Bars (fixed now; s15's pipeline and bars, scaled to 125)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it (125 x 4 = 500). Fixed
by the author BEFORE the freeze; none may exist after it.

**B2 Pre-flight (before the freeze, never reported as clearance).**
Key-extremity gate PASS (five-choice derived line 32%); numeric and symbolic
hub at or below control +10; `check-run-middle`, `check-option-pair-constant`,
`check-key-is-sum`, `check-plurality-key`: an item whose key sits inside a
named shape is re-authored; key/-key pairs by script (`check-sign-pair` is
four-option only); `stem-duplicates.mjs --family ssat`; `check-forced-form`
(no OPEN flag; every DECLARED note read); the three duplicate instruments
above. **One fix round per author.** An item still failing after it is cut
before the freeze. If the merged file fails the key-extremity gate after the
fix round, the batch STOPS at B2.

**B3 Options-only attack.** `make-oo-render.mjs --control 40`, stem withheld,
keys dealt round-robin over five slots, control derived from the deal. Matched
live control: 40 verified, unarchived SSAT math rows interleaved into the same
blind file; three Claude samples attack all 165. `score-oo.mjs` splits by arm;
the decision number is CANDIDATE minus LIVE CONTROL.

- Control ceiling: live control >= 80% → VOID (held, not passed).
- PASS if candidate <= control + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0.
- Between: pass only if the candidate's unanimous-correct rate is at most the
  control's + 10 points; otherwise HOLD.
- Per-author subset at >= +20.0 over the control: that author's items are
  held whole even if the pooled batch passes.
- Unanimity never drops an item on its own; an item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld), the frozen file split into two halves
by alternating position (63 / 62, each carrying all five authors), two Claude
graders per half, s15's grader brief unchanged (so the difficulty labels are
comparable). Drop an item if ANY of:
1. a grader's pick differs from the key and my hand recomputation agrees;
2. a grader names a second defensible answer I confirm;
3. a grader names a free elimination killing >= 2 of the 4 distractors
   without the method, confirmed by hand (plug-back on a one-step equation is
   the method, not a bound);
4. either grader marks it out of band with a curriculum reason I confirm;
5. a grader names a live duplicate I confirm.

HOLD the whole batch if more than **35 of 125** drop at B4 (s15's 34 of 120,
scaled). HOLD an author's subset if more than half of its items drop at B4.

**B5 Duplicate scan.** `stem-duplicates.mjs --family ssat` (insert-time gate)
plus a word-3-shingle scan against every live SSAT math row (Jaccard >= 0.35
read by hand; break-tested with a planted live stem). A confirmed same-problem
pair with a live SSAT row drops the candidate.

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=ssat
BANK_COHORT=ssat-math-s16 BANK_BAND=mixed math-bank-helper insert`;
difficulty = the two graders' consensus, or the easier label on a split
(s15's rule, kept for comparability). Then `verify-admission-forms.mjs` and
the 10-form replay with the real `drawByPassage`.

## Predictions (stated now)

- **Forms.** >= 95 insert → 10 clean (500); 45-94 → 9 clean; fewer → 8. If
  fewer than 95 pass, the passers are still inserted and the shortfall is
  reported; any top-up is a fresh cohort, never a repair of this one.
- **Difficulty — reported against the pool, not a gate** (nothing after the
  freeze may change a label). With k kept, pool hard share = (72 + h) /
  (405 + k). Drift **stopped** if the share does not fall below 17.8%
  (h >= 18 at k = 100); drift **reversed to the pre-s15 22.5%** if h >= 42 at
  k = 100. Prediction: stopped, not reversed — banked hard between 15 and 35,
  because graders demote and the banking rule takes the easier label on a
  split.
