# ssat-math-s17 — pre-registration (written 2026-10-09, BEFORE any item exists)

## Why, and what it can buy

Measured 2026-10-09 before this batch (`bank-state.mjs counts`: ssat/math 520
drawable; a 13-form replay of `admission-form-depth.ts`, scratch copy with
FORMS = 13, importing the real `drawByPassage`):

    SSAT math   520 drawable, ONE block of 50/test     10 clean
                form 11 = 20/50 fresh, form 12 = 0/50, form 13 = 0/50
    form 11 needs 550 (+30)      form 12 needs 600 (+80)

The SSAT math draw has no band, level or subtopic quota: the pool total binds,
and a form's mix is the pool's mix. Whole-test SSAT stays at 3 clean (Reading
binds at 3). Quoted so a section result is never reported as more than it is.

Pool difficulty now: 127 easy / 294 medium / 99 hard = 24.4 / 56.5 / **19.0 %**
(target about 22.5%, the pre-s15 share).

## What s16 left behind, and what this batch changes

s16 (REGISTER §5, 2026-10-09) inserted 115 of 125. Four findings drive s17:

1. **Hard banks by topic, not evenly.** Authored-hard items kept and banked
   hard (graders' consensus, easier label on a split), by s16 author:
   geometry B 10/25 (40%), counting C 6/19 (32%), number theory E 6/12 (50%),
   ratio A 4/18 (22%), algebra D 1/17 (6%). Authored-medium banked hard: 0/24
   (14 of them banked EASY). So s17 is weighted to geometry, counting and
   number theory, nearly all hard, with few medium items.
2. **The forced-form battery missed one form.** S16D-08 (sum of 20
   consecutive integers = 10 x an odd number; 4200, 3800, 4020 are 10 x even)
   was not flagged, because "multiple of 10" was shared 4/4.
   `check-forced-form.mjs` now also checks the PARITY OF THE QUOTIENT:
   "odd multiple of d" (d = 2..12, key/d odd) and "even multiple of d"
   (d = 7..12; for d <= 6 that is already "multiple of 2d"), on the value or
   on a pi/sqrt coefficient. **Break-test, run before this file was
   committed:** `--selftest` asserts that S16D-08 in the frozen s16 file is
   flagged "odd multiple of 10" (shared 1/4), that plain "multiple of 10" is
   shared 4/4 there (the old blind spot), that a copy with four odd multiples
   of 10 goes quiet, and that a key of 4200 among odd multiples flags "even
   multiple of 10". With the one line that sets "odd multiple of d" replaced
   by a no-op, the self-test FAILS 3 times. With it restored, the self-test is
   clean, and the six s15 forced-structure drops are still flagged. Cost: on the s16
   file the flags rise from 255 to 421 (items flagged 95 -> 101 of 119); on
   s15 from 288 to 452. It remains a reading list, never a clearance.
3. **math-mechanism-dup missed all four of s16's method duplicates** (C-06,
   D-12, D-22, E-16); a HAND search found them. So the hand search is now
   a required pre-freeze stage, done by me, not a backstop.
4. **Ratio/rate/work lost 6 of 30 to free inequalities** (the faster or
   slower member alone bounds the answer, a part is under the whole share,
   a value sits ON the equal-split bound), after its own return round.

Changes, fixed now:

- **Topic weighting and level** (below): 92 hard / 12 medium / 0 easy.
- **Forced form:** the extended `check-forced-form.mjs` must show 0 OPEN on
  every author file; every DECLARED note is read by me against the stem
  before the freeze; a note I reject is returned once; still rejected, the
  item is cut before the freeze.
- **Hand method-duplicate search before the freeze** (required, by me): for
  every item, (i) read its `method` and the top 8 live SSAT rows by a
  prompt+method word-overlap ranking over all 520 live SSAT math rows, and
  (ii) one or more targeted keyword greps of the live SSAT prompts for the
  item's mechanism (e.g. "consecutive", "remainder", "inscribed"),
  reading every hit. Plus, as before, `math-mechanism-dup.mjs` (every live
  maths row, every family) and the cross-author `template`/`method` compare
  (pairs >= 0.35 read), and within-author pairs. A same-method pair with a
  live SSAT row, or within or across authors, is returned once; still a
  duplicate, cut before the freeze. Counts of items searched and of pairs
  read are reported, so a quiet search is not mistaken for a clearance.
- **Ratio/rate/work self-check (author A).** For every ratio, rate,
  percent, mixture or work item the author writes in `interval` each
  OBVIOUS SHARE the stem offers (equal split, each member alone, the whole,
  the faster/slower member, the before and after values, a simple average)
  and answers "is the answer above or below it?". **At least three of the
  four distractors must sit on the key's side of every such share, strictly
  — never ON it.** I read these lines for every A item before the freeze.

## Batch

- Cohort `ssat-math-s17` (no file or live cohort of that name exists).
- **104 authored.** About 100 was asked. Form 12 needs 80 survivors. s16
  kept 115/125 (92.0%), s15 103/120 (85.8%). The s16 drops were 6 of 30 in
  ratio but only 2 of 73 in geometry, counting and number theory. 104 at 85.8% is 89.2. At 80% it
  is 83.2. Pre-freeze cuts come out of the same margin.
- **Five Claude authors, disjoint topics, weighted to where hard banks:**

      A  10  ratio, rate, percent, proportion, work, mixture     8 hard / 2 medium
      B  31  plane, solid and coordinate geometry               27 hard / 4 medium
      C  29  counting, probability, statistics, sets            26 hard / 3 medium
      D   9  algebra (expressions, equations, functions,
             sequences, defined operations)                      8 hard / 1 medium
      E  25  number theory (divisibility, primes, remainders,
             digits, gcd/lcm, valuations)                       23 hard / 2 medium

  Total 92 hard / 12 medium / 0 easy. Against the live keyword mix (ratio ~24%,
  geometry ~25%, counting ~20%, algebra ~18%, number ~13%) this tilts the pool
  a few points toward B/C/E. The draw has no subtopic quota, so that is a
  pool-mix change, stated here, not hidden.
- FIVE choices, no figures, no calculator, SSAT Upper Level scope (grades
  8-11): no trigonometry, logarithms, matrices, complex numbers or calculus.
- Ids `S17A-01` .. `S17E-25`. **One file per item** in the scratch folder
  `ssat-math-s17-work/items/<id>.json`; each author run writes 5-7 items (A
  5+5, B 6+6+6+6+7, C 6+6+6+6+5, D 5+4, E 6+6+6+7 = 18 runs) and reads every
  earlier item of its letter first. The key slot for every id is dealt by me
  in advance, cycling A-E, so each author's keys are even by construction.
  A merge step builds `ssat-math-s17{a..e}.batch.json`, and the frozen file is
  the five concatenated in id order with the authored-only fields stripped.
- **Concurrency:** at most two subagents at once; completion is judged by the
  item files on disk; a subagent idle 6+ minutes is relaunched from its disk
  state. Claude agents only, no GPT.
- Frozen (sha256 recorded, committed) before any solver or grader sees it. No
  item is repaired after the freeze: a failing item is dropped. **The batch
  stops at the first failed gate.**

## Authoring rules

All of s16's rules (s15 rules 1-10; forced form as a check; `mechanism` +
`method` declared; live mechanisms in the topic listed first), plus the three
changes above. Authors are shown s16's graded evidence (27 items both graders
called hard, 10 splits, and a seeded sample of 16 of the 55 authored-hard items
both demoted), with each item's declared idea-to-see. "Hard" is decided by the
graders, not the author's label.

## Bars (fixed now; s16's pipeline and bars, scaled to 104)

**B1 Sandbox.** `math-bank-helper verify`: every key recomputes and every
distractor has a `distractor_solve` that reproduces it (104 x 4 = 416). Fixed
before the freeze; none may exist after it.

**B2 Pre-flight (before the freeze, never reported as clearance).**
Key-extremity gate PASS (five-choice derived line 32%); numeric and symbolic
hub at or below control +10; `check-run-middle`, `check-option-pair-constant`,
`check-key-is-sum`, `check-plurality-key`: a key inside a named shape is
re-authored; key/-key pairs by script; `stem-duplicates.mjs --family ssat`;
extended `check-forced-form` (0 OPEN, every DECLARED note read); the
duplicate search above; the ratio share lines read. **One fix round per
author.** An item still failing after it is cut before the freeze. If the
merged file fails the key-extremity gate after the fix round, the batch STOPS
at B2.

**B3 Options-only attack.** `make-oo-render.mjs --control 40`, stem withheld,
keys dealt round-robin, control derived from the deal. Matched live control:
40 verified, unarchived SSAT math rows interleaved; three Claude samples
attack all 144. `score-oo.mjs` splits by arm; the decision number is
CANDIDATE minus LIVE CONTROL.

- Control ceiling: live control >= 80% -> VOID (held, not passed).
- PASS if candidate <= control + 5.0 points.
- HOLD the whole batch if candidate - control >= +12.0.
- Between: pass only if the candidate's unanimous-correct rate is at most the
  control's + 10 points; otherwise HOLD.
- Per-author subset at >= +20.0 over the control: that author's items are
  held whole even if the pooled batch passes. (A and D are 10 and 9 items;
  their subset numbers are reported with their n and are noise-sized.)
- Unanimity never drops an item on its own; an item solved by all three is
  dropped only if B4 independently names a free elimination or defect on it.

**B4 With-source grade.** `make-grade-render.mjs` (key, difficulty,
explanation, solve, subskill withheld), the frozen file split into two halves
by alternating position (52 / 52, each carrying all five authors), two Claude
graders per half, s15/s16's grader brief unchanged (so difficulty labels stay
comparable; graders may save partial output as they go). Drop an item if ANY
of:
1. a grader's pick differs from the key and my hand recomputation agrees;
2. a grader names a second defensible answer I confirm;
3. a grader names a free elimination killing >= 2 of the 4 distractors
   without the method, confirmed by hand (plug-back on a one-step equation is
   the method, not a bound);
4. either grader marks it out of band with a curriculum reason I confirm;
5. a grader names a live duplicate I confirm.

HOLD the whole batch if more than **29 of 104** drop at B4 (s15's 34/120,
scaled). HOLD an author's subset if more than half of its items drop at B4.

**B5 Duplicate scan.** `stem-duplicates.mjs --family ssat` (insert-time gate)
plus a word-3-shingle scan against every live SSAT math row (Jaccard >= 0.35
read by hand; break-tested with a planted live stem). A confirmed same-problem
pair with a live SSAT row drops the candidate.

**B6 Insert and re-measure.** Ledger entry, `BANK_FAMILY=ssat
BANK_COHORT=ssat-math-s17 BANK_BAND=mixed math-bank-helper insert`;
difficulty = the two graders' consensus, or the easier label on a split.
Then `verify-admission-forms.mjs` and a 12-form replay with the real
`drawByPassage` (13 columns printed, so form 13 shows what is next).

## Predictions (stated now)

- **Forms.** >= 80 insert -> 12 clean (600); 30-79 -> 11 clean; fewer -> 10.
  Passers are inserted whatever the count; any top-up is a fresh cohort, never
  a repair of this one. Expected keep 85-95 (s16's per-topic drop rates
  applied to this mix give about 98; s15's pooled rate gives 89).
- **Difficulty, reported against the pool, not as a gate.** With k kept and h
  banked hard, pool hard share = (99 + h) / (520 + k). Applying s16's
  per-author authored-hard -> banked-hard rates to 8/27/26/8/23 hard gives
  about 32 before drops, about 29 after. **Prediction: the share rises but is not
  restored: h between 20 and 37, share between 19.5% and 22.3% at k = 90.**
  Restored to 22.5% needs h >= 39 at k = 90. Falling would be h <= 17
  (share below 19.0%).
