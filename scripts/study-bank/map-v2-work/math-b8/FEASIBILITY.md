# map-v2 Math batch 8 (Number Systems): feasibility of the probe survivors, 2026-10-30

Done BEFORE any chain check, as `../math-b7/FEASIBILITY.md` recommended, so the checker only vets chains that can be
written. 50 drafted (`candidates.json`), 14 dropped by the probe (`DROPPED.md`), 36 run through `gen8.mjs` (one generator
per mechanism, the natural error set listed in code; core `search8.mjs` -> `../math-b6/feas-lib.mjs`). A mechanism is
**writable** when at least one parameter set gives a key plus three NATURAL errors that pass FORM, LONE, HUB, RUN, PAIR,
KEYPRINT, DPAIR and DSUM. Output: `feas-out.json` (ranks and two examples per rank), `gen8-stdout.txt`.

**How the result was checked.** (1) Break-test of the checks (`scratchpad/.../break.mjs`, not kept): a found set passes;
the same set with one option's last digit changed (FORM), an arithmetic run through the key (RUN), a x2 link (HUB), a
key-minus-option equal to a printed number (PAIR), a sign-isolated option (LONE), a printed key (KEYPRINT) and a
fraction with another denominator (FORM) are each refused. (2) `node gen8.mjs --diag` (`diag8.mjs`) tallies WHICH rule
refuses each triple, and compares its own all-pass verdict with `feas-lib` on every parameter set; it exits 2 on any
disagreement, and it did not. (3) `search8.run` throws when a generator yields zero parameter sets, so no mechanism can
be reported on an empty search; every row below states its set count. (4) Weak errors were removed before the verdict:
a first pass found Q01, Q10, Q21, Q42 and Q45 "writable" only through errors no student makes (e.g. "carries the tenths
twice", "multiplies a by the reciprocal", "signed sum minus its size"); with those removed Q10, Q21 and Q45 fail.

## Writable: 17 (probe-clean, natural errors only)

| draft | g | mechanism | sets | ranks | example (key first) and the three errors |
|---|---|---|---|---|---|
| Q01 | 5 | non-standard place-value units -> standard decimal | 19,683 | **4 only** | 1 one, 11 tenths, 11 hundredths, 1 thousandth: **2.211**; 1.111 (no regrouping), 2.111 (regroups tenths only), 1.211 (regroups hundredths only) |
| Q04 | 5 | fraction red after k red marbles are added | 9,108 | 3, 4 | n 12, r 2, k 5: **7/17**; 5/17 (added over new total), 2/17 (old red over new total), 10/17 (not red) |
| Q07 | 5 | total with one entry typed one place off | 28,998 | **2 only** | shown 15, typed 1.5, meant 0.15: **13.65**; 14.85 (subtracts the intended entry), 16.35 (adds the wrong entry again), 13.35 (subtracts both) |
| Q50 | 5 | magic square in sevenths, sum from a full line, target needs two steps | 2,320 | 1, 2 | target **6/7**; 2 1/7 (first-step entry), 5 1/7 (adds the first-step entry), 1 4/7 (column with its gap as 0) |
| Q14 | 6 | overlap length of two intervals across 0 (decimals) | 175,743 | 1, 2, 3 | [-5.9, 3.75] and [-5.8, 4.75]: **9.55**; 10.65 (union), 9.65 (first length), 10.55 (second length) |
| Q47 | 6 | number-line fold: image of c when a lands on b (decimals) | 49,000 | 1-4 | a -5, b 1, c 0.4: **-4.4**; -0.4 (reflects about 0), 6.4 (translates by b - a), 2.4 (distance from the crease) |
| Q16 | 7 | least product of two from a signed set | 3,540 (x.5 decimals) | 1 (by definition) | {-8.5, -7.5, -6.5, 9.5}: **-80.75**; 63.75 (two least), 48.75 (two smallest in size), -61.75 (greatest positive x negative nearest 0). Write with x.5 decimals: the sevenths version passes only on mirrored sets with /49 mixed numbers |
| Q17 | 7 | consecutive-month pair whose combined change is closest to 0 | 28,371 | 2, 3 | 6.67, -1.02, 9.87, -4.02, 2.87, -7.62: **-1.15**; -4.75 (second closest), 1.15 (drops the sign), 8.85 (greatest pair). Positives end in 7, negatives in 2, so every pair sum ends in 5 |
| Q18 | 7 | telescoping signed product (-a/(a+1))...(-(n-1)/n) | 70 | 2, 3 | (-4/5)...(-10/11), 7 factors: **-4/11**; 4/11 (wrong sign), -10/11 (last factor only), 8/11 (first x last) |
| Q20 | 7 | signed total with one change entered with the wrong sign | 1,352 | 1, 2 | shown -4 2/7, +2 3/7 should be -2 3/7: **-9 1/7**; 4/7 (moves the wrong way by twice), -1 6/7 (adds the change once), 4 2/7 (flips the shown total) |
| Q22 | 7 | overlap length of two intervals (signed sevenths) | 27,032 | 1, 2, 3 | [-4 6/7, 3/7] and [-4 5/7, 1 3/7]: **5 1/7**; 6 2/7 (union), 5 2/7 (first length), 6 1/7 (second length) |
| Q23 | 7 | magic square of signed sevenths, sum printed, target needs two steps | 2,240 | 1-4 | sum -2 4/7, target **-2 3/7**; -2/7 (first-step entry), -2 1/7 (sign slip on the last step), -5/7 (column with its gap as 0) |
| Q24 | 7 | scale zero offset corrected once per reading, true total | 31,500 | 1, 4 | offset +0.3, readings 6.18, 3.55, 1.71, 1.34: **11.58**; 12.78 (ignores the offset), 12.48 (corrects once), 13.08 (corrects the wrong way once). The offset has no hundredths, so every error keeps the last digit |
| Q25 | 7 | divided by f instead of multiplying: correct = R x f^2 | 16,100 | 1-4 | f -3/2, R -3 3/7: **-7 5/7**; 5 1/7 (multiplies once, the original number), -3 3/7 (reports R), 7 5/7 (sign slip on f^2) |
| Q26 | 7 | number-line fold (signed sevenths) | 10,440 | 1-4 | a -4 6/7, b 2/7, c -1 2/7: **-3 2/7**; 1 2/7 (reflects about 0), 3 6/7 (translates), -2 2/7 (the crease) |
| Q27 | 7 | + or - before three mixed numbers (first +), value closest to 0 | 1,961 | 2, 3 | 1 1/7, 1 2/7, 3 1/7: **-5/7**; 5 4/7 (all plus), -3 2/7 (plus then minuses), 5/7 (drops the sign) |
| Q31 | 8 | x^3 + c = d: isolate the cube, then a negative cube root | 120 | 1, 2 | x^3 + 62/27 = -63/27: **-1 2/3**; -1/3 (adds c instead of subtracting), 1 2/3 (drops the sign), 1/3 (both) |

**Rank notes.** Q01 reaches rank 4 only (every no-regroup error is smaller than the key) and Q07 rank 2 only: a slot
needing another rank cannot take them, and each needs the key-position spread checked across the batch. Q16 is rank 1
by definition (the least product). Q31 has exactly three natural errors, one of them a double error.

## Not writable: 19

| draft | g | mechanism | sets | refused by (diag tallies) |
|---|---|---|---|---|
| Q02 | 5 | digit cards, least positive 0.ab - 0.cd | 126 | FORM: at most 1 natural error shares the key's hundredths digit |
| Q03 | 5 | closest pair of four mixed-length decimals | 397 | FORM: at most 2 (pair gaps end in different digits) |
| Q05 | 5 | nested zoom on a number line | 8,019 | FORM: at most 2. Reading a zoom at the wrong scale changes the number of places |
| Q06 | 5 | decimals given in words, summed | 295,245 | FORM: at most 2. The misread name moves the thousandths digit |
| Q37 | 5 | k pieces cut with a kerf per cut, leftover | 3,617 | errors differ from the key by the printed kerf (PAIR), by k - 1 or k + 1 kerfs (RUN), and small leftovers link x2 (HUB); FORM where the piece length ends in 5 |
| Q48 | 5 | telescoping product (1 - 1/a)...(1 - 1/n) | 65 | FORM: at most 2. Stopping early or late changes the denominator |
| Q10 | 6 | continued fraction a + 1/(b + 1/c) | 336 | FORM: at most 2. Left-to-right and forgotten-reciprocal errors have denominators b·c or c, not bc + 1 |
| Q45 | 7 | signed continued fraction | 336 | FORM: at most 2 (as Q10) |
| Q51 | 6 | a/(b + c/d) | 1,215 | FORM in 1,192 sets; the few with 3 same-form errors fail KEYPRINT or HUB |
| Q11 | 6 | balance with debt > D and balance > -E | 34,016 | LONE in every set: the only natural positive option (ignores the sign) stands alone in sign |
| Q13 | 6 | digit cards, greatest a.b x c.d | 126 | FORM: products end in different hundredths digits |
| Q46 | 6 | cut until no full piece is left, kerf per cut | 2,990 | FORM, KEYPRINT, LONE (as Q37) |
| Q40 | 7 | greatest quotient of two from a signed set | 15,804 | FORM: quotients of different pairs have different denominators |
| Q21 | 7 | total distance minus distance from the start | 52,182 | LONE and RUN: key, total distance and total + displacement form an arithmetic run, and the one negative error (the signed sum) stands alone in sign |
| Q44 | 7 | thermometer offset cancels in a change | 16,224 | LONE, HUB, FORM, PAIR (errors differ from the key by the printed offset) |
| Q29 | 7 | choose a, b, c to maximise a - b x c | 830 | FORM (products end in different digits), LONE |
| Q34 | 8 | circumference with 22/7 minus with 3.14 | 100 | FORM; for 34 diameters the key is not a 3-place decimal or a usable fraction; the radius error is x2 |
| Q35 | 8 | one averaging (Babylonian) step for a square root | 176 | FORM: n/g, (g + n)/2 and the correction have denominators g, 2 and 2g |
| Q42 | 8 | side of a square whose area is the sum of two squares | 50 | passes only with "adds the sides and halves" as the third error, which is not a natural error; and the chain is the Pythagorean theorem (8.G.B.7, Geometry). Classed not writable |

## What this means

**17 writable, probe-clean mechanisms against a target of 15** (g5 4, g6 2, g7 10, g8 1). They are not 17 distinct
families: three pairs share a chain by design and at most one of each should be slotted (Q14/Q22 interval overlap,
Q47/Q26 fold, Q50/Q23 magic square), Q07/Q20 share "repair a total after an entry error" (decimal-point slip vs. sign
slip), and Q17/Q27 share a closest-to-0 ask over different operations. Counting one per family that leaves **12 to
13**. Novelty is NOT judged here beyond the probe; that is the independent checker's job (`CHECKER-PROMPT.md`).

**What blocked the rest.** As in batch 7, construction rules, not novelty: 13 of 19 failures are FORM (natural errors
land on another denominator or another final digit). That hits digit-card optimisations, word-name and zoom
place-value items, continued fractions, and every "pick the best pair" item over quotients. Three are LONE (an error
that alone flips the sign), and the two kerf items fail because their errors differ from the key by a printed number.
The patterns that survived are the ones `../math-b7/FEASIBILITY.md` predicted: fixed prime denominators (sevenths)
under signed addition, decimals whose errors differ by a quantity with no hundredths (the scale offset, the alternating
7/2 endings), and x.5 decimals whose products all end in 5.

**Grade 6 and grade 8 are thin.** Only Q14 and Q47 at grade 6 (each with a grade-7 twin), and only Q31 at grade 8. The
grade-8 fence (exponent laws, scientific notation, root bracketing, repeating decimals, plus the batch-5 slots) leaves
little, and two of the eight grade-8 drafts collided with live SAT/MAP rows (Q43, Q33).
