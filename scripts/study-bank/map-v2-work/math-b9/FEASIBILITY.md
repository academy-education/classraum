# map-v2 Math batch 9 (Number Systems): feasibility of the probe survivors, 2026-10-30

Done BEFORE any chain check, as in batch 8. 51 drafted (`candidates.json`), 15 dropped by the probe (`DROPPED.md`), 36
run through `gen9.mjs` (one generator per mechanism, its natural error set listed in code; core `search9.mjs` ->
`../math-b6/feas-lib.mjs`). A mechanism is **writable** when at least one parameter set gives a key plus three NATURAL
errors that pass FORM, LONE, HUB, RUN, PAIR, KEYPRINT, DPAIR and DSUM (as in b8) **and** the batch-9 refusals:

- **SIGN** (the b8 rule): every option shares the key's sign. Applied to every mechanism, not only where the key's sign
  follows from a count of negatives, a product/quotient sign or a comparison of printed numbers, because LONE already
  refuses 3-1 and a 2-2 split is what struck b8's E09 and E17.
- **KGAP**: the key is not n x (key - option), and (key - option) is not n x the key, for a printed whole n >= 2 (b8
  E16's first set: key 6/7 = 6 x the 1/7 slip, 6 printed).
- **DIR**: under a "least" or "greatest" stem the key is not the extreme option in that direction (b8 E07: rank 1 under
  "least" lets a student pick the smallest). Used by S13, S14, S15, S21, S22, S30, S41, S48.
- **NEAR**: under a "closest to T" stem the key is not the option nearest T and its mirror about T is not an option
  (b8 E16's coin flip). **No b9 generator has a closest-to stem, so NEAR never fired**; it is break-tested below.
- **RANGE** (new; the bound screen b8's FEASIBILITY did not model): when the stem lets a student read an interval the
  key must lie in, at most one distractor may lie outside it. Declared for S02 and S47 (a weighted fraction lies
  between the smallest and largest part-fraction), S08 (each rounding change is at most 0.05), S15/S48/S21 (between
  start-minus-all-drops and the final value, or the mirror), S16/S49 (on the side being walked), S25/S26/S42 (the
  estimate lies between a and a + 1) and S44 (less than one serving). The other math-check bound kinds (magnitude,
  parity, units digit) are not modelled; the item writer still owes a full bound screen.

Output: `feas-out.json` (ranks and up to two examples per rank), `gen9-stdout.txt`, `diag9-stdout.txt`.

**How the result was checked.**
1. **Break-test of the new rules** (`scratchpad/.../break9.mjs`, not kept), each against a control that passes: a found
   S15 set passes; with its low error replaced the key becomes rank 1 under "least" and DIR refuses it (the same set
   passes with no least stem); a declared range that two distractors fall outside is refused; a 2-2 sign split of a
   found S21 set is refused (SIGN); options with key 6/7 and gap 1/7 are refused when 6 is printed and pass when it is
   not (KGAP); a set holding the key's mirror about 0 and a set whose key is the option nearest 0 are both refused under
   a target-0 stem, and the second passes without one (NEAR). The b8 FORM/HUB/RUN/PAIR/LONE/KEYPRINT break-tests apply
   unchanged (same `feas-lib.mjs`).
2. `node gen9.mjs --diag` (`diag9.mjs`) tallies WHICH rule refuses each triple and compares its own all-pass verdict with
   `search9.feasible()` on every parameter set; it exits 2 on any disagreement. It exited 0 on all 36.
3. `search9.run` throws when a generator yields zero parameter sets, so no mechanism is reported on an empty search;
   every row states its set count.
4. **What the first pass got wrong, and what was changed before the verdict.** A first pass (all listed errors, no
   RANGE) called 15 mechanisms writable: S02, S07, S08, S10, S14, S15, S16, S18, S21, S23, S26, S31, S32, S33, S42.
   - Weak errors removed (no student makes them): S07 "multiplies the two rounding changes", S10 "difference of the
     strips", S18 "multiplies without flipping, then subtracts her value", S31 "x^2 times y", S32 "reports √m" and "adds
     one coefficient only". With those gone S07, S18, S31 and S32 fail; S10 survives on natural errors only.
   - S23's passing sets all had whole-number keys under 20 (8, 14, 22, 6), which batch 7 ruled out; re-searched with
     x.25 meeting points, it fails.
   - RANGE added: S08 (the 0.05-per-item bound strikes two), S26 and S42 (two options outside [a, a + 1]) fail. S25
     had become "writable" only through a double-slip error that puts two options above a + 1; RANGE refuses it too.
     **Every interpolation draft (S25, S26, S38, S42) is therefore not writable**: any natural error other than "uses
     the distance to the upper square" lands outside [a, a + 1].
   - A generator bug fixed: S33's "drops the cube root sign" flipped a POSITIVE cube root negative, which is not that
     error; it now takes the size of a negative cube root only (S33 stays writable, 63 -> 23 passing triples).
   - Grades corrected: S15 is decimal add/subtract only (5.NBT.B.7, now g5); S21 adds signed numbers (7.NS.A.1, now g7).
   - Because that left g8 at one mechanism, S43, S44, S47-S51, S54 and S55 were drafted, probed and searched afterwards;
     S43, S47, S48, S49, S51 and S55 are writable.

## Writable: 13 (probe-clean, natural errors only)

| draft | g | mechanism | sets | passing triples | ranks | example (key first) and the three errors |
|---|---|---|---|---|---|---|
| S02 | 5 | fraction of a class that walks (p/q of the girls, r/s of the boys) | 8,820 | 1,552 | 1-4 | girls 1/3, walk 2/3 and 1/5: **16/45**; 19/45 (r/s of the whole class for the boys), 29/45 (does NOT walk), 23/45 (swaps the two fractions) |
| S47 | 5 | fraction of all students who ride (three grades, the third found first) | 51,480 | 2,623 | 1-4 | grades 1/2, 1/4, rest; ride 3/5, 1/4, 2/5: **37/80**; 61/80 (third fraction of the whole school), 43/80 (does NOT ride), 41/80 (first grade's fraction used for the third) |
| S10 | 5 | two fraction strips across a unit square: area shaded by exactly one | 729 | 50 | 2, 3 | 1/3 and 4/9: **13/27**; 17/27 (at least once), 4/27 (both), 10/27 (not shaded) |
| S15 | 5 | lowest running balance during the week (decimals) | 35,519 | 19,894 | 2, 3 | start 58.49, -10.6, +16, -4.4, +16.2, -4.8: **47.89**; 70.89 (final), 38.69 (start minus all withdrawals), 59.49 (second lowest) |
| S48 | 5 | lowest running water level (mixed numbers in eighths) | 31,804 | 2,294 | 2, 3 | start 9, -3/8, +1 3/4, -2 1/4, +2 3/4, -3/4: **8.125**; 10.125 (final), 5.625 (start minus all drops), 8.625 (second lowest) |
| S43 | 5 | sum of the listed fractions greater than 1/2 (one equals 1/2) | 450 | 21 | 2, 3 | 2/4, 1/3, 2/3, 1/4, 11/12: **1 7/12**; 2 1/12 (includes 2/4), 11/12 (leaves out 2/3), 1 11/12 (keeps 1/3 too) |
| S14 | 6 | least total distance from one point to four signed points | 1,499 | 321 | **2 only** | -5 5/8, -4 7/8, -3/8, 5/8: **10.75**; 6.25 (outer span only), 12.25 (from the leftmost), 12.75 (from the rightmost) |
| S16 | 6 | clockwise walk from the top-left vertex: y after d units | 235,432 | 1,453 | **3 only** | x -3.25..2.25, y -6.5..6, d 5.65: **5.85**; 0.35 (ignores the corner), 1.35 (top side as \|xr\| - \|xl\|), 6.15 (goes up after the corner) |
| S49 | 6 | clockwise walk from the bottom-left vertex: x after d units | 235,432 | 1,453 | **2 only** | x -6.5..1.5, y -3.25..2.25, d 5.65: **-6.35**; -0.85 (ignores the corner), -1.85 (left side as \|yt\| - \|yb\|), -6.65 (goes left after the corner) |
| S21 | 7 | highest running elevation (signed) | 36,767 | 18,164 | 2, 3 | start -34.59, +3.4, -17, +8.2, -5.8, +10: **-31.19**; -35.79 (final), -12.99 (start plus all climbs), -24.59 (start plus the largest climb) |
| S33 | 8 | sum of the rational numbers in a list (roots of fractions, a cube root, a repeating decimal, two irrationals) | 2,952 | 23 | 3, 4 | √(1/81), ∛(8/27), 0.444...: **1 2/9**; 7/9 (leaves out the repeating decimal), 1 1/9 (leaves out the square root), 5/9 (leaves out the cube root). Rank 3: √(25/81), ∛(-1/8), 0.888...: **17/18**; 1/18, 7/18, 1 17/18 (drops the cube root's sign) |
| S51 | 8 | greatest rational minus least rational in such a list | 26,240 | 15 | **4 only** | √(4/9), ∛(-1/27), 0.888..., 7/9: **1 2/9**; 1 1/9 (leaves out the repeating decimal), 2/9 (leaves out the cube root), 5/9 (drops the cube root sign) |
| S55 | 8 | sum of the listed powers (zero and negative exponents) that are less than 1 | 14,999 | 71 (one list) | **2 only** | 2^-3, (1/4)^3, 2^0, (1/2)^-1, (1/2)^-2: **9/64**; 57/64 (does not flip a fraction base), 1 9/64 (includes the zero power), 1/64 (does not flip a whole-number base) |

**Rank notes.** S14 (2), S49 (2), S55 (2), S16 (3) and S51 (4) each reach one rank only; a slot needing another rank
cannot take them. Extreme ranks (1 or 4) are reachable by S02, S47, S33 and S51 only, so the batch's key-position spread
needs checking when slots are cut (b8's ranks were 2, 2, 4, 3, 3). S55 passes on a single list of five powers, so its
numbers are effectively fixed. S10 passes only with ninths or thirds-and-ninths strips.

## Not writable: 23

| draft | g | mechanism | sets | refused by (diag tallies) |
|---|---|---|---|---|
| S03 | 5 | rounded-first total minus exact total (nearest dollar) | 16,872 | FORM: at most 3 same-form errors, and those form RUNs with the key or sit alone in size |
| S04 | 5 | number pyramid: missing middle bottom brick | 27,370 | FORM: at most 2 (halving slips change the decimal places) |
| S39 | 5 | number pyramid: top from four bottom bricks | 196,560 | RUN (inner bricks counted 1x, 2x, 3x give arithmetic runs through the key) and PAIR (errors differ from the key by a printed brick) |
| S07 | 5 | exact product vs rounded-factor product | 2,556 | FORM: at most 2 natural errors once "multiplies the rounding changes" was removed |
| S08 | 5 | one price rounded to the nearest tenth, n items | 5,040 | FORM, HUB, and RANGE: the 0.05-per-item bound strikes "other tenth" and "nearest dollar" together |
| S09 | 5 | broken ruler, two objects | 15,840 | RUN and PAIR: every partial correction differs from the key by one printed start mark |
| S13 | 6 | least total distance to three signed points | 236,933 | FORM: at most 3, and those fail LONE or PAIR (decimals and eighths both tried) |
| S41 | 6 | the same, meeting at a house, twelfths | 3,879 | FORM: at most 2 |
| S22 | 6 | weighted two-house delivery total | 21,390 | FORM (weighted totals change the final digit), HUB (k x D multiples) |
| S23 | 6 | excess of a chosen meeting point over the least total | 94,462 | PAIR, LONE, HUB once whole-number keys were excluded |
| S18 | 6 | flip-the-dividend error: difference from the correct quotient | 2,184 | key not a usable fraction in 1,402 sets; FORM in the rest |
| S20 | 6 | quotient minus its reciprocal | 868 | FORM (q + 1/q and the multiply-instead value have other denominators) |
| S24 | 6 | recipe scaled through cups per dozen | 900 | FORM: at most 2 |
| S44 | 6 | flour needed for one more full serving | 2,846 | FORM, HUB, RUN once the unit-mixing error was removed |
| S25 | 8 | square-root estimate by interpolation between consecutive squares | 208 | LONE ("forgets the whole part") and RANGE (every other natural error lies outside [a, a + 1]) |
| S26 | 8 | cube-root estimate by interpolation between consecutive cubes | 336 | LONE and RANGE, as S25 |
| S38 | 8 | interpolation estimate vs the halfway estimate | 208 | FORM: at most 1 |
| S42 | 8 | interpolation estimate of the square root of a mixed number | 2,592 | RANGE in 2,296 sets, then PAIR |
| S30 | 8 | least x + y from x^2 = p/q and y^3 = -r/s | 644 | FORM: the root errors change the denominator |
| S31 | 8 | xy from x^3 = -p/q and y^2 = r/s, y < 0 | 644 | FORM: at most 2 natural errors |
| S32 | 8 | √(k1^2 m) + √(k2^2 m) from a printed approximation of √m | 80 | FORM: at most 2 natural errors (and simplifying radicals is high-school N-RN) |
| S50 | 8 | sum of the rational numbers in a decimal list | 6,912 | FORM: at most 2 (decimal and ninths parts give mixed denominators) |
| S54 | 8 | sum of the rational square roots in a list of fractions | 8,775 | FORM: at most 2 |

## What this means

**13 writable, probe-clean mechanisms against a target of 10** (g5 6, g6 3, g7 1, g8 3). They are **8 families**:
W (S02, S47), R (S15, S48, S21), P (S16, S49), C (S33, S51), and S10, S43, S14, S55 on their own. Counting one per
family: g5 4, g6 2, g8 2, with g7 reachable only through R. **Grade 8 meets the count (3) but not as 3 distinct chains:
S33 and S51 share the classification front end, so g8 is 2 families**, and S55 sits in a cluster b8 fenced (zero and
negative exponent evaluation) on a single passing list. Novelty is NOT judged here beyond the probe; that is the
independent checker's job (`CHECKER-PROMPT.md`).

**What blocked the rest.** FORM again, as in batches 7 and 8 (15 of 23). Two new blockers came from modelling the bound
screen: RANGE ended every interpolation draft (S25, S26, S38, S42), which the first pass had called writable, and it
ended S08. The scientific-notation and repeating-decimal drafts never reached feasibility: all seven collided with
MM2-N16 / MM2-N18 / MV2-N8-14 or re-proposed batch-5 C17 / R25. What survived is selection-shaped: the answer depends
on WHICH numbers are kept (the running extreme, the rationals in a list, the fractions above 1/2, the side being
walked), so the natural errors keep or drop whole same-form terms and the key's form survives them.
