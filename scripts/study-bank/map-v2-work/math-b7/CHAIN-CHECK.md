# map-v2 Math batch 7 (Number Systems): independent chain check, 2026-10-29

**What was read:** all 294 entries of `earlier-N-chains.json`, read in full (chain, prompt and key) and grouped by
grade: **g5 70, g6 77, g7 75, g8 72**. Both batch-5 rounds (`../math-b5/CHAIN-CHECK.md`, `CHAIN-CHECK-R2.md`) were read
and their verdicts are treated as binding. The eight batch-5 slots are in the earlier list as MB5-N5-01 (R30),
MB5-N6-01 (C06), MB5-N6-02 (R06), MB5-N6-03 (C25), MB5-N7-01 (C11), MB5-N7-02 (R08), MB5-N7-03 (R22) and MB5-N8-01 (R18).
MECHANISMS.md was used only for each candidate's **Ask / Chain / Twist**. The author's ratings, "closest" picks, probes
and notes were not used.

**Live and prior search:** **193 `mf30-kw.mjs` queries** over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517
prior MAP and maths rows). Every candidate got at least two queries built from its operations, and every hit was read.
The prior rows also surfaced MAP **Geometry** and **Measurement/Data** items. Those are cited where they share a chain,
but they were only searched by keyword, not read in full.

**Rule applied:** two items have the same chain when they use the same operations in the same order, on the same kind
of givens, to get the same kind of answer. Story, numbers and number type are ignored. **Changed asks:** a changed ask
is the same chain when answering it needs no new operation. Following batch-5's R29 ruling, a candidate whose whole
chain is a **prefix or sub-chain** of an earlier item, with no step of its own, is a REPEAT. BORDERLINE means most
steps are shared; each such row names the shared step and the step that differs.

## Counts

**NEW 7, BORDERLINE 18, REPEAT 15.**

**NEW:** D03, D05, D06, D08, D15, D16, D19. D08 and D15 are one family, so these are **6 distinct mechanisms**. None is
grade 7 or grade 8.

## Verdicts

| id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
|---|---|---|---|---|
| D01 | REPEAT | **MM4-N19 (v4, file only)**; **ACT d802c785 (live)**; MM4-N08 (v4) | MM4-N19 is this chain exactly: "$0.37 markers, Leo has $11.75, buys as many as he can, money left". That is decimal total ÷ decimal portion → whole count → total - count × portion. ACT d802c785 does the same with fractions (5/6-cup batches from 4 cups, leftover cups). MM4-N08 stops at the count. | R (leftover / mixed quotient): D01, D13 |
| D02 | BORDERLINE | MM3-N06 (v3), MM3-N12 (v3 stage0), MMG-N03 (v1); MM5-N18 (LIVE), MB4-N5-09 (LIVE) | Shared: whole ÷ unit fraction as a count (MM3-N06 counts 1/2-m tiles along 3 1/2 m; MMG-N03 ends with ÷ 1/4). Also shared: a fraction-or-decimal division feeding one more whole-number operation (MM5-N18 divides by 0.75, then subtracts). Differs: the second operation is a whole-number share of the count. | A: D02, D11 |
| D03 | **NEW** | none; MM4-N02 (v4) only for common denominators | No MAP, ISEE, SSAT, SAT or ACT item splits a fraction into unit fractions. The queries "unit fraction", "= 1/a + 1/b" and "numerator(s) 1" got 0 hits in 6,503 rows. The splitting step (numerator into divisors of the denominator) appears nowhere. | none |
| D04 | BORDERLINE | MM5-N03 (LIVE), MM4-N03 (v4), MM4-N15 (v4); ISEE 769c01b9 (live) | Shared: test each of a list against a criterion and count the ones that pass (MM5-N03 counts numbers that round to 4.7). Also shared: comparing decimals by place value against a bound (MM4-N03, MM4-N15) and comparing fractions with decimals (ISEE 769c01b9). Differs: the bound is a fraction that has to be converted first. | none (count answer, like D05 and D19, but the operations differ) |
| D05 | **NEW** | MM4-N05 (v4), MMG-N01 (v1), MV2-N56-06 (LIVE): all multiply | Every earlier fraction-scaling item computes the product. None decides whether a product is greater or less than the number by comparing the factor with 1, and none counts the results. The query "product (is\|will be) greater/less than" got 0 relevant hits. | none |
| D06 | **NEW** | MM4-N02 (v4), MM4-N04 (v4); MV2-N56-06 (LIVE) for "two values, subtract" | Computing the add-across value (a+c)/(b+d) appears in no item and no live row (the "mistake/error/incorrect & fraction" queries found only SAT statistics). The true sum and the final subtraction are saturated, so **the misconception step is the item's only new operation.** If that step is dropped or made optional, it becomes C26/R02's "two values, then subtract". | none |
| D07 | BORDERLINE | MM3-N02 (v3 and stage0), MM4-N09 (v4); batch-5 C26 | Shared: a whole shared among a group, written as a fraction (MM3-N02), then fraction ÷ whole number (MM4-N09's first step; C26's unit fraction ÷ whole). Differs: the two sharing stages are chained, so a ÷ (t × p). Every step exists. | none (it shares "two divisions in a row" with D02, but the operations differ: fraction ÷ whole here, whole ÷ fraction in D02) |
| D08 | **NEW** | MM4-N33 (v4 stage0), MM4-N31 (v4) | MM4-N33 adds two values and then matches the sum to the nearest option. D08 adds four pairs and ranks each sum by its distance from a fixed benchmark (1). The query "closest to 1" got 0 hits. The fraction additions themselves are saturated. | **B (benchmark distance): D08, D15, D25** |
| D09 | BORDERLINE | MV2-N56-08 (LIVE), MV2-N56-04 (withdrawn), MM3-N05 (v3) | MV2-N56-08 already reads place-value multipliers (10^3, 10^2, 10^1) and assembles a standard number. D09 does the same with 1/10, 1/100 and 1/1000, skipping a place, and then adds two numbers (MM3-N05). The only new part is that the place values are fractions. The "expanded form" query got 0 hits. The author's HUB note (x10 siblings) stands. | none |
| D10 | BORDERLINE | MM4-N19 (v4 stage0); batch-5 R17, R05 (family K); ISEE fdf985f5 (live) | "Compute several values → order them → combine the greatest and least" is MM4-N19 stage0's chain (and R17's, which batch 5 ruled BORDERLINE). Differs: the values are the four operations on the same pair of decimals. ISEE fdf985f5 mixes × and ÷ on decimals but does not rank. | K (rank then combine extremes): D10, D34 |
| D11 | BORDERLINE | MMG-N03 (v1), MM3-N12 (v3 stage0), MM3-N03 (v3), MM3-N13 (v3) | This is D02 followed by a remainder. Whole ÷ unit fraction is in MMG-N03 and MM3-N12; the remainder of a whole-number division is MM3-N03; leftovers after whole groups are MM3-N13. Only the combination is new. | A: D02, D11 |
| D12 | BORDERLINE (area risk) | **MMG-D01 (MAP Measurement/Data, v1 file only)**, MV2-D5-17 (MAP D, withdrawn); MM4-N13 (v4), MM2-N06 (v2) | MMG-D01 converts ounces to a decimal part of a pound (1 lb 4 oz → 1.25 lb) and then multiplies. That is this chain with a whole-number multiplier in place of a price. Weight × price per pound is MM4-N13 and MM2-N06. No NS item has the conversion, but the whole chain already exists as a MAP Measurement item, and 5.MD.A.1 owns the conversion. | none |
| D13 | REPEAT | **MB2-N56-16 (withdrawn)**, MM2-N07 (v2), MM5P-N06 (v5p), MM3-N12 (v3 stage0); ACT d802c785 (live) | MB2-N56-16 is 3 1/2 ÷ 1 1/4 = **2 4/5 batches**: its key already says "2 full batches and 4/5 of a batch". **Ruling on the changed ask:** "the leftover as a fraction of a batch" is the fractional part of the mixed-number quotient, so it needs no operation that MB2-N56-16, MM2-N07 (1 4/5 servings) and MM5P-N06 (17 1/12 laps) do not already perform. Same chain. ACT d802c785 asks for the leftover cups, which is D01. | R: D01, D13 |
| D14 | BORDERLINE | MB5-N6-03 (LIVE); SSAT 870c9e39 (live), SSAT 76f0c5df (live), MV2-N8-13 (withdrawn) | Shared: prime factorization into prime powers (MB5-N6-03's first step). Reading the exponents off a factorization is the front end of the divisor-count chain (SSAT 76f0c5df) and of SSAT 870c9e39; MV2-N8-13 and MV2-N8-19 halve or third the exponents. Differs: the answer is the sum of the exponents. | P (prime-power read-off): D14, D35, D40 |
| D15 | **NEW** | MM4-N31 (v4), ISEE 769c01b9 (live), SSAT 35b0d52b (live) | MM4-N31 squares each option and compares with a target. ISEE 769c01b9 picks the greatest. SSAT 35b0d52b finds a value between two bounds. None measures \|f - 1/2\| across fractions on both sides of the benchmark. The queries "closest to 1/2" and "closest & fraction" got 0 relevant hits. | **B: D08, D15, D25** |
| D16 | **NEW** | MM4-N10 (v4), MM2-N02 (v2), MM5P-N02 (v5p); ISEE 49ab2017 (live) | Earlier MAP items multiply sides to get an area. ISEE 49ab2017 goes perimeter + side → side → area, using subtraction and multiplication. No item divides a fractional area by a fractional side, which is the CCSS 6.NS.A.1 strip-of-land model, and then builds a perimeter. The final unlike-denominator addition (MM4-N02) is the only shared step. | none |
| D17 | REPEAT | **ISEE 754d8fec (live)**; SSAT 88303912 (live), ISEE a7a5db44 (live) | ISEE 754d8fec ("7A4B divisible by 36": the last-two-digits rule for 4, then the digit-sum rule for 9, on missing digits) contains both of D17's versions. D17 finds one digit where the live item counts the choices, so it is a sub-chain with no step of its own (R29 precedent). SSAT 88303912 and ISEE a7a5db44 also run the digit-sum rule. | D (missing digit): D17, D22 |
| D18 | BORDERLINE (area risk) | **ISEE bc53a3b5 (live)** "How many prime numbers are between 30 and 60?" | Shared: the whole primality sweep over an interval. Differs: the primes are added, not counted. That is a new (trivial) operation, so this is not a strict repeat. Primality of whole numbers to 100 is CCSS 4.OA.B.4 (Operations). | G (primality / shared-prime tests): D18, D21 |
| D19 | **NEW** | MV2-N56-22 (LIVE), MM4-N15 (v4), MM4-N19 (v4 stage0) | The individual skills (reading signed points, absolute value, comparison) exist. No item evaluates a set of inequality and absolute-value statements about labelled points and counts the true ones. "how many of the statements & true" got 0 hits; SSAT 7f79547f ("must be true", x² > x) is a different chain. FORM decides whether a 0-4 count can work. | none |
| D20 | REPEAT; **wrong area** | **SAT 804a4f50 (live)**, **ISEE 716954bb (live)** | SAT 804a4f50 is "the product of two consecutive positive even integers is 168; what is their sum?": estimate near √168, test the pair, add. ISEE 716954bb does the same with three consecutive numbers (product 2,730, sum). This is factor pairs / Algebra (4.OA.B.4, A-SSE), **not Number Systems.** | none |
| D21 | BORDERLINE | MM4-N20 (v4), MV2-N56-10 (LIVE), MB5-N6-03 (LIVE), MV2-N56-13 (withdrawn); SSAT 135cd5d7 (live) | Shared: finding the common factors or GCF of a pair, the saturated GCF step that the batch-4 and batch-5 briefs fenced off under HUB. Differs: the test is GCF = 1, applied to four pairs, and the coprime ones are counted. SSAT 135cd5d7 uses pairwise coprimality, but to maximize a chosen set. | G: D18, D21 |
| D22 | REPEAT | **MMG-N02 (v1, file only)**; ISEE 70a644d6 (live) | MMG-N02 computes the dividend as divisor × quotient + remainder. ISEE 70a644d6 does the same (13 × 25 + 9) and then one more step. Once the dividend is computed, the missing digit is read straight off it with no further operation, so the changed ask is the same chain. | D: D17, D22 |
| D23 | REPEAT | **MB2-N78-08 (dropped)**, MM3-N18 (v3 and stage0), MM4-N25 (v4 stage0) | MB2-N78-08 is this chain exactly: the total change from a positive start to a negative end (+14.80 to -43.20), the number of days, then a division keeping the sign. MM3-N18's first two steps are the same (1.1 to -3.8 over 5 hours, ÷ 5 for the rate). The author treated "rate from two readings" as the inverse of every earlier item, but these three already do it. | S (signed readings → differences): D23, D26 |
| D24 | REPEAT | **MM3-N16 (v3)**, MMG-N11 (v1), MV2-N7-16 (withdrawn) | MM3-N16: Monday -$4.35, Tuesday fell 2/5 as much, then the signed total. MMG-N11: week 2 = 2/3 of week 1's signed result, then a sum. A move defined as a fraction of an earlier signed move inside a net sum is both items' chain. | V (signed chain): D24, D28, D33 |
| D25 | BORDERLINE | MM4-N15 (v4), MB5-N6-01 / C06 (slotted), MV2-N7-03 (LIVE), MM4-N16 (v4) | Shared: ranking numbers by distance (MM4-N15 compares distances from 0; C06 ranks by absolute value) and the distance between signed values across zero (MV2-N7-03, MM4-N16). Differs: the reference point is a nonzero signed value, so values on both sides of it compete. | B: D08, D15, D25 (also next to batch-5's K / C06) |
| D26 | REPEAT | **SSAT 632f5043 (live)**, **ISEE f31d1f72 (live)**; MV2-N7-03 (LIVE) | SSAT 632f5043 ("greatest increase in loaves sold from one day to the next") and ISEE f31d1f72 (the same for population) are consecutive differences → compare → greatest. Signed readings only add the across-zero subtraction, which MV2-N7-03 already does. If a coordinator rules that the sign makes the givens a different kind, this is BORDERLINE at best. | S: D23, D26 |
| D27 | REPEAT | **MM5-N27 (LIVE)**, MB4-N7-01 (dropped), MM3-N17 (v3) | MM5-N27 is "four signed daily changes → mean change per day", and so is MB4-N7-01. Fractions instead of decimals is number type. **Area:** MM5-N27 is a live Number Systems item, so MAP precedent keeps a mean of signed rationals in NS. This is not a wrong-area candidate, just a repeat. | none |
| D28 | REPEAT | **MV2-N7-06 (withdrawn)**, MB2-N78-03 (withdrawn), MM4-N27 (v4 stage0), MB4-N7-05 (dropped) | MV2-N7-06 is (-3.5)(-1.5 - 0.6) + (-3.6): evaluate the difference inside the brackets, multiply by a signed factor, add a term. D28 is that chain with numbers chosen so the bracket is 0. Numbers are ignored, and spotting the zero still requires evaluating 3.5 - 7/2. | V: D24, D28, D33 |
| D29 | REPEAT | **batch-5 R24 (REPEAT, binding)**, MM4-N24 (v4 stage0) | R24 was "a signed sum, then the additive inverse (n + x = 0)", ruled REPEAT. D29 is a signed sum S, then S - x = 0, so x = S. Same steps. That the answer is a member of the list changes how it is read, not what is computed. ACT 215c331e (removing a value to keep the mean) is a Statistics chain, not this. | none |
| D30 | BORDERLINE (near REPEAT) | MV2-N56-05 (LIVE), MM3-N17 (v3), MM4-N28 (v4), MMG-N11 (v1) | MV2-N56-05 divides a decimal by a whole number and then subtracts from one share. MM3-N17 finds one share of a signed total. MM4-N28 and MMG-N11 take a fraction of a signed debt or result. Differs only in combining the signed share with a fraction-of step. | none |
| D31 | BORDERLINE | MV2-N7-18 (LIVE), MM5P-N08 (v5p), MM3-N19 (v3), MM4-N25 (v4 stage0), MM3-N13 (v3); SAT 1bbc1ced, 35c25711 (live, exponential) | Shared: stage-1 rate × time added to a start (MV2-N7-18, MM5P-N08); crossing below 0 (MM3-N19); a signed change ÷ a signed rate (MM4-N25's "how many times"); rounding a quotient up (MM3-N13). The "first whole period below a threshold" ask is the SAT exponential items' ask. Differs: these are combined to invert a linear signed running total for the time. | none (D23 also involves a signed rate, but D23 computes it and D31 uses it) |
| D32 | BORDERLINE | MM4-N23 (v4), MB5-N7-03 (R22, slotted); SSAT fe682145 (live) | The only operation is the sign rule for a quotient (MM4-N23 applies it to two negatives; R22 solves through it). Differs: several sign placements are compared to find the odd one. That is a new ask over an existing single step. Thin. | none |
| D33 | BORDERLINE (area risk) | MV2-N7-06 (withdrawn), MB4-N7-04 (dropped), MV2-O78-20 (Operations, withdrawn); **SAT prior SM27F-A05** (prior batch file; not found in live) | One round (multiply by a negative, then add) is MV2-N7-06, and MB4-N7-04 ("multiply score by -7/8"). SM27F-A05 uses **the identical rule**: "multiplies the number on the display by -2 and then adds 3", pressed two times. It runs backward (solve for the input); D33 runs forward three times. Differs: forward iteration, new to MAP. An input-output rule is also Operations-adjacent (MV2-O78-20). | V: D24, D28, D33 |
| D34 | BORDERLINE | SSAT f2276aab (live), MV2-N8-01 (LIVE), MM4-N36 (v4), MB4-N8-05 (withdrawn); MM4-N19 (v4 stage0) | Evaluating zero and negative exponents with fraction bases is batch-5 C16 (REPEAT: SSAT f2276aab, MM4-N36). Ordering and taking greatest - least is MM4-N19 stage0 / R17. Both halves exist. | K: D10, D34 |
| D35 | REPEAT | **ISEE 8878b914 (live)**, **SSAT e50cca74 (live)**; ACT 812ad5db (live), SSAT a7ed80da (live) | ISEE 8878b914 is "least positive integer n such that 180n is a perfect square", and SSAT e50cca74 is "least k for which 540k is a perfect square": factorize → odd exponents → product of the missing primes. ACT 812ad5db and SSAT a7ed80da are the perfect-cube versions. The author rated this "strong" and found none of the four. | P: D14, D35, D40 |
| D36 | REPEAT | **ISEE 31150eb4 (live)**, ACT 652bbfa4 (live); MMG-N13 (v1) | ISEE 31150eb4's first step is area ratio 4 → linear ratio 2. ACT 652bbfa4 takes the cube root of the volume ratio 27/8 to get 3/2, then squares it. D36 (√ of a perfect-square area ratio → side ratio) is a prefix of both, with no step of its own. MMG-N13 takes the square root of a decimal area. The scaling context is Geometry-adjacent; the root itself is 8.EE.A.2. | ratio power: D36, D38 |
| D37 | BORDERLINE (near REPEAT) | MM4-N38 (v4 and stage0), ISEE cf75bfb2 (live), **ISEE 30cfe11d (live)** | Shared: rewriting 4 and 8 as powers of 2 and applying power of a power (MM4-N38; ISEE cf75bfb2, which batch 5 used to rule C14 a REPEAT). Ordering powers by rewriting them is ISEE 30cfe11d ("which is least: 3^60, 2^100, 5^40, 10^30", by a common exponent). Differs only in using a common base instead of a common exponent. | E (rewrite, then exponent arithmetic): D37, D39 |
| D38 | REPEAT; **wrong area** | **MM2-G07 (MAP Geometry, v2 file only)**, MB3-G6-08 (MAP Geometry, LIVE); SSAT f2b8629f (live) | MM2-G07 fills a 2 1/2 × 2 × 1 1/2 box with 1/2-inch cubes: divide each edge by the cube edge, then multiply. For a cube that is (edge ratio)^3, which is D38. MB3-G6-08 (live) runs the 1/4-inch-cube packing backward. Packing a fractional-edge cube is CCSS 6.G.A.2 / 5.MD.C: **Geometry, not Number Systems.** | ratio power: D36, D38 |
| D39 | BORDERLINE | MV2-N8-12 (withdrawn), MB2-N78-19 (LIVE), MM5P-N10 (v5p), MM4-N36 (v4) | The intended route (pair each a/b with a b/a) is new. The natural route is b/a = (a/b)^-1, then add exponents n + (-(n-1)) = 1, which is the product rule with a negative exponent (MV2-N8-12, MB2-N78-19). That is the fenced exponent-law cluster. Batch 5 ruled R13 BORDERLINE for exactly this reason. | E: D37, D39 |
| D40 | REPEAT | **ISEE 691faf19 (live)**, **SSAT 9264dd12 (live)**; SSAT 444f0b51, ISEE 4745593b (live, factorial zeros) | ISEE 691faf19 is "how many zeros at the end of 25^6 × 12^5": factorize, count the 2s and 5s, take the smaller count. SSAT 9264dd12 pairs 2^10 with 5^6 to count digits. D40 gives the factorization ready-made, so it is a sub-chain of 691faf19 with no step of its own. | P: D14, D35, D40 |

## Notes for the brief-writer

- **Live ISEE/SSAT/SAT/ACT repeats that no MAP NS item shares:**
  - D20: SAT 804a4f50, ISEE 716954bb
  - D35: ISEE 8878b914, SSAT e50cca74 (cube versions: ACT 812ad5db, SSAT a7ed80da)
  - D40: ISEE 691faf19, SSAT 9264dd12 (factorial zeros: SSAT 444f0b51, ISEE 4745593b)
  - D26: SSAT 632f5043, ISEE f31d1f72
  - D36: ISEE 31150eb4, ACT 652bbfa4
  - D17: ISEE 754d8fec (plus SSAT 88303912, ISEE a7a5db44)
- **Live rows that repeat alongside a MAP item:**
  - D01: ACT d802c785 + MM4-N19
  - D22: ISEE 70a644d6 + MMG-N02
  - D13: ACT d802c785 is the cups version of the same quotient
- **Near-live, not repeats:** D18 (ISEE bc53a3b5 counts the same primes), D37 (ISEE 30cfe11d), D33 (SAT prior
  SM27F-A05 uses the identical ×(-2) then +3 rule; it is in a prior SAT batch file and was not found live).
- **Near-twins the author's search missed:** D01 = MM4-N19 verbatim. D23 = MB2-N78-08 / MM3-N18. D24 = MM3-N16.
  D27 = MM5-N27 (LIVE). D28 = MV2-N7-06. D29 = batch-5 R24. D13 = MB2-N56-16's mixed-number key. D09 next to MV2-N56-08
  (LIVE). D12 = MAP Measurement item MMG-D01. D38 = MAP Geometry MM2-G07 and MB3-G6-08 (LIVE). The two "strong"
  candidates split: D03 holds up; **D35 is a three-way live repeat.**
- **Pairs and groups that share a front end** (slot at most one of each):
  - D01/D13: whole portions out of a supply
  - D02/D11: whole ÷ unit fraction, then a whole-number division
  - D08/D15/D25: distance from a benchmark
  - D10/D34: rank, then combine the extremes (batch-5 family K)
  - D14/D35/D40: read the exponents off a prime-power factorization
  - D17/D22: missing digit
  - D18/D21: primality or shared-prime test
  - D23/D26: differences of signed readings
  - D24/D28/D33: chained signed multiply-and-add
  - D36/D38: raise a ratio to a power
  - D37/D39: rewrite, then exponent arithmetic
- **Wrong area:**
  - **D20** is factor pairs / Algebra, not NS.
  - **D38** is Geometry (6.G.A.2).
  - **D27 is in-area** by MAP precedent: MM5-N27 is a live NS item. It is a repeat anyway.
  - Possible: **D18** (primality is 4.OA.B.4), **D12** (unit conversion is 5.MD.A.1; MMG-D01 sits in MAP Measurement),
    **D33** (an input-output rule is Operations-adjacent, like MV2-O78-20), and **D17** (divisibility rules have no
    CCSS NS home).
- **What makes D06 new is one step.** Remove the add-across value and the item is C26/R02's "two values, then
  subtract". The brief must make that step the thing the item is about.
- **No grade-7 or grade-8 candidate is NEW.** The grade-7 signed-number space is saturated: every grade-7 candidate is
  a repeat or a near repeat of the MMG/MM3/MM4/MV2-N7 signed-change items. The grade-8 exponent and root candidates
  repeat live ISEE/SSAT/ACT rows or the fenced exponent-law cluster.

## Recommended final set: mutually distinct, at most one per family

| pick | grade | chain | not to be slotted with it |
|---|---|---|---|
| **D03** | 5 | rename over a common multiple → split the numerator into divisors of the denominator → two unit fractions → add the denominators | none |
| **D05** | 5 | compare each fraction factor with 1 (no multiplying) → count the products greater than the number | none |
| **D06** | 5 | correct sum of unlike fractions → add-across value (a+c)/(b+d) → difference | none |
| **D15** | 6 | \|f - 1/2\| for fractions above and below 1/2 → least distance | D08, D25 (D08 is the alternate if a grade-5 slot is wanted) |
| **D16** | 6 | fractional area ÷ fractional side (6.NS.A.1) → other side → perimeter with unlike denominators | none |
| **D19** | 6 | read signed points → test inequality and absolute-value statements → count the true ones | none |

**That is 6 mechanisms: g5 3, g6 3, g7 0, g8 0.** The 20-item goal cannot be reached from NEW chains. If the
coordinator accepts BORDERLINE chains to fill slots, the least-shared options, one per family, are:

| grade | candidates |
|---|---|
| 7 | D31 (inverting a linear signed running total), D33 (forward iteration; check the area) |
| 5 | D04, D07 |
| 6 | D21 (but GCF/HUB), D14 (not with D35 or D40) |
| 8 | D37 or D39 (one only) |

Even with all of them the set reaches about 14, and each would be slotted as BORDERLINE, not NEW. Do not slot any
REPEAT. Do not take two from one family in the table above.

**Not checked here:** FORM, K4, HUB and the bracket constraints. The author's HUB warnings on D09 (x10 siblings) and
D21 (GCF) matter only if those BORDERLINE chains are taken up.
