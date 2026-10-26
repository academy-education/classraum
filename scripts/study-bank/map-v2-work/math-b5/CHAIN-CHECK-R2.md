# map-v2 Math batch 5 (Number Systems): independent chain check, ROUND 2 (R01-R30), 2026-10-26

**Method:** the same as round 1 (`CHAIN-CHECK.md`). Every candidate was compared with all 285 entries of
`earlier-N-chains.json`, which I read in full in round 1, by sequence of operations. About 40 more `mf30-kw.mjs`
queries were run over `dump-b4` (3,986 live + 2,480 prior rows), built from operations, and every ISEE/SSAT/MAP hit was
read. The author's ratings and printed hits were ignored. Two hits the author's search did not report matter here:
**SSAT f542281b** (sum 30, difference 8), which contains all of R29, and **MM4-N25 stage0** ("Monday's change was how
many times Tuesday's change"), which bears on the C26 fix.

**Counts:** NEW 9, BORDERLINE 13, REPEAT 8. **NEW:** R06, R08, R12, R16, R18, R19, R22, R27, R30. Several of these
share one chain with each other (questions a and b below), so the NEW ids are not nine distinct mechanisms.

| id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
|---|---|---|---|---|
| R01 | BORDERLINE | MM4-N24 (v4 stage0), MM3-N05, MM5P-N01 | MM4-N24 stage0 already finds a missing addend by subtraction ("-2 5/6 added to n is 1 3/8"). R01 only adds one decimal sum on the known side first. The "two equal sums" framing is the only new part. | missing operand (M) |
| R02 | BORDERLINE | MM3-N02 (v3), MV2-N56-17 (LIVE), MV2-N56-15 (LIVE), MM4-N04 | Each step exists: division as a mixed number is MM3-N02, two quotients then subtract is MV2-N56-15/-17, and unlike-denominator mixed subtraction is MM4-N04. Only whole ÷ whole as the quotient type is new. Same family as round-1 C26. | two quotients, then compare (Q) |
| R03 | BORDERLINE | MM3-N01 (v3 stage0), MM5-N07 (LIVE), MM2-N02 | Multiplying the whole part and the fraction part separately is MM3-N01 stage0 and MM5-N07 (with a whole-number multiplier). R03 uses a fraction multiplier and asks for the second partial product. | partial products (P), with R21 |
| R04 | REPEAT | MM4-N05 (v4 stage0), MMG-N01, MV2-N56-06 (LIVE) | The insight path (×5/4 adds 1/4 of the amount) is a fraction of a mixed number: MM4-N05 / MMG-N01. The long path (multiply, then subtract the original) is MV2-N56-06's multiply-and-compare. Both routes are covered. | |
| R05 | BORDERLINE | MM4-N19 (v4 stage0), MM4-N15 | MM4-N19 stage0 converts mixed numbers to decimals, orders a four-number list that includes negatives, and combines two ranked values. R05 differs only in which ranks it picks and in adding them instead of taking their distance. | rank and combine (K), with C06, R17 |
| R06 | NEW | MM4-N11, MM5-N16 (LIVE), MM4-N14, ISEE 1f4b0427 | Earlier items go from coordinates to distances. R06 goes from distances to the axes to signed coordinates: distance from the x-axis gives \|y\|, not x, and quadrant III fixes both signs. Only the final combination of coordinates (MM4-N14) is shared. | axis distances (A), with R15 |
| R07 | BORDERLINE | MMG-N07 (v1), SSAT d9090ca9 (live), MM4-N34 | The front end (first integer above a negative mixed number, last integer below a decimal) is MMG-N07. The back end (sum of the integers in an interval with ends of opposite sign, by cancellation) is SSAT d9090ca9. Both halves exist; only the combination is new. | |
| R08 | NEW | MV2-N56-21, MV2-N56-23, MV2-N56-24 | Earlier items take the opposite of a given number. None uses x - (-x) = 2x to recover an unknown. No ISEE/SSAT hit. It is thin (one halving), and the author's HUB note stands. | |
| R09 | BORDERLINE | MV2-N56-22 (LIVE), MM4-N36 (stage0), MM4-N24 | Nesting three operators on one number moves it away from MV2-N56-22, where each term gets one operator. But MV2-N56-22 already nests (-(-5), \|2 - 9\|), the reciprocal step is MM4-N36, and it ends with the saturated "convert and add a decimal" (MM4-N24). | |
| R10 | REPEAT | ISEE 3b775d60 (live), ISEE f1e21e9b (live), SSAT bde1402b | ISEE 3b775d60 (which of k/60 terminate) already makes the student simplify first and then apply the 2s-and-5s rule, so R10's "extra" step is in it. | |
| R11 | BORDERLINE | SSAT a175b647 (live), ISEE 24fbd00c (live), MV2-N8-14 (LIVE), MM2-N19 (first-written), MM5-N02 | Four earlier items convert a repeating decimal to a fraction and then do one more operation (divide, read the numerator, add a + b, subtract). R11 changes that last operation to "fraction of a whole" (MM5-N02). | convert, then one more step (R), with R25 |
| R12 | NEW | MM4-N12, MM2-N06, MM3-N09 | Decimal × decimal, then ÷ decimal, to find a missing factor: each operation is standard, but no earlier item has this order. It shares one chain with R30 (equal products, missing factor). | M |
| R13 | BORDERLINE | MM4-N38 (v4), MM5-N40, ISEE 691faf19 | The intended route ((ab)^n = (0.5 × 8)^4) is new to MAP. But the natural alternative (0.5 = 2^-1, 8 = 2^3, power of a power, add exponents) is MM4-N38 / MM5-N40, which rewrite bases as powers of 2 and combine exponents. | |
| R14 | BORDERLINE | SSAT 35b0d52b (live), MM4-N03 | Renaming bounds and choosing a value strictly between them is SSAT 35b0d52b / MM4-N03. The lowest-terms filter (16/24 drops out, 17/24 stays) is the only new step. | |
| R15 | BORDERLINE | ISEE 1f4b0427 (live), MM4-N14 (v4), R06 | The last two steps (quadrant signs, add the coordinates) are ISEE 1f4b0427 / MM4-N14. The backward step (reflection distance = 2\|y\|) is new. It shares the distances-to-signed-coordinates step with R06. | A |
| R16 | NEW | MMG-N05, MM2-N07 | No earlier item solves for a missing denominator. Solved by "missing divisor = dividend ÷ quotient" (3/n = 3/4 ÷ k), it is the same chain as R22 after R22's evaluation step. | M |
| R17 | BORDERLINE | MM4-N19 (v4 stage0), MM4-N03 | Order a list, take the greatest and least, combine: MM4-N19 stage0's chain, on positive decimals ordered by place value, with a sum instead of a distance. | K |
| R18 | NEW | MM3-N27 (v3), MMG-N15, MM4-N36 | MM3-N27 goes cube root, then square, then reciprocal. R18 goes reciprocal, then the NEGATIVE square root (sign condition), then cube. The operations are different and come in a different order. No ISEE/SSAT hit. | |
| R19 | NEW | MMG-N05, MM4-N12 | No earlier item has "÷ n gives the same result as × 0.4". But the answer is 1 ÷ 0.4, a single quotient (a barred cluster), and computing 7.2 × 0.4 and then 7.2 ÷ 2.88 is the M chain. | M |
| R20 | REPEAT | MV2-N56-23 (dropped), MV2-N56-24 (LIVE) | Take the opposite of a negative, then the distance to a positive on the same side by subtraction: MV2-N56-23 ("Q is the opposite of P; how far is Q from 9"). | |
| R21 | BORDERLINE | MM2-N02 (v2), MM4-N10 (v4 assembled, "all four partial products") | This is the four-part area model stopped after two of its partial products. Same family as R03. | P |
| R22 | NEW | MM4-N24 (v4 assembled), MM4-N25 (stage0), MM4-N23 | Evaluating a signed decimal quotient is MM4-N24. Then solving -24/n = value for the divisor with the sign rule has no earlier match. It is the same missing-divisor chain as R16. | M |
| R23 | BORDERLINE | MM4-N34 (v4), MMG-N12, MM3-N26 | The only real operation is bracketing a root between consecutive integers (MM4-N34, MMG-N12), done four times. Asking for the sum of the lower ends is a new ask over the same step. Same family as round-1 C19. | |
| R24 | REPEAT | MM4-N24 (stage0), MV2-N7-13 (LIVE), MM4-N25 | A signed sum, then its additive inverse: the saturated signed-sum family plus the missing-addend step of MM4-N24 stage0 (n + x = 0). | |
| R25 | REPEAT | MM2-N19 (v2 first-written), MV2-N8-14 (LIVE), ISEE 24fbd00c | Repeating decimal to a fraction, then subtract: MM2-N19 as first written (2/3 - 0.6). Same family as R11. | R |
| R26 | REPEAT | MV2-N56-06 (LIVE), MB4-N5-05, MM4-N06 | Two fraction-times-mixed-number products, then subtract: MV2-N56-06's chain exactly. | |
| R27 | NEW | MM4-N17, MMG-N06, MM3-N14 (all whole-number LCM) | Rename two fractional periods over 12, take the LCM of the numerators, convert back to minutes. No earlier item has an LCM of fractions. It shares only the LCM step with the whole-number items and with C25. | LCM (L), with C25 |
| R28 | REPEAT | MV2-N8-07 (withdrawn), MV2-N8-12 | Quotient rule with a negative exponent, then evaluate: MV2-N8-07's chain. | |
| R29 | REPEAT | SSAT f542281b (live), MV2-O78-16 (LIVE, Operations) | SSAT f542281b ("two numbers have a sum of 30 and a difference of 8") is (sum - difference) / 2, then one more step. R29 is that prefix with decimals and no new step. It is also an Operations item, not Number Systems. | |
| R30 | NEW | MM2-N01, MMG-N02 | Halving one factor and doubling the other (or 840 / 12) for a missing factor: no earlier item. It is the same equal-products chain as R12. | M |

## (a) The seven "missing number" candidates: one chain or several?

**Two chains, not seven.** Six of the seven are one chain: *find the missing operand by undoing the operation*. You
evaluate the known side if there is one, then apply the inverse operation. Only the operation that hides the operand
changes:

- missing addend: **R01**. It already has a MAP precedent, MM4-N24 stage0, hence BORDERLINE.
- missing factor in equal products: **R12, R30**. These two are identical apart from decimals versus whole numbers.
- missing divisor or denominator: **R16, R22**. 3/n = 3/4 ÷ k and n = -24 ÷ (-6) are the same step; R22 adds a
  signed evaluation in front.
- **R19** reads as reciprocal reasoning, but it is solved either as 1 ÷ 0.4 (a barred single quotient) or by the
  equal-results route (compute 7.2 × 0.4, then 7.2 ÷ 2.88), which is this chain again.

**R03 is a different chain:** n is the second partial product of the distributive property. It belongs with R21, not
with the missing-number family.

**Recommendation:** at most **one** from the missing-operand chain; R30 fills the grade-5 gap. If the coordinator
accepts the operation as the distinction, the only defensible second pick is a divisor item (R22, signed, grade 7).
Never take two from the same row above (R12 + R30, or R16 + R22). R08 is also a missing number, but its unknown
appears twice (x - (-x)), so the step that solves it is "opposites sum to twice", not an inverse operation. It is
distinct.

## (b) R05 and C06: one chain?

**Yes, one family.** Both take a list of signed rationals, rank it by a criterion, pick two ranks, and add them as signed
numbers. They differ only in the ranking key: absolute value for C06, signed value for R05. R05's key is exactly
MM4-N19 stage0's (it converts mixed numbers to decimals and orders a list that includes negatives), so R05 is BORDERLINE
on its own. C06's key, absolute value, is the step that is not in MAP. **Keep C06 and drop R05.** R17 (positive decimals
by place value, greatest + least) is the same family and also gives way to C06.

## (c) The author's proposed fixes

| round-1 id | proposed fix | verdict on the fix |
|---|---|---|
| C10 | Print the expansion; ask for the digit sum of the first n digits | **Does not help.** The fix removes long division (shared with SSAT c45ca0fb) and keeps the block-position step, and ISEE 7209630d also prints its expansion. Only the summing step is new, before and after the fix. Stays **BORDERLINE**. |
| C13 → R09 | Nest reciprocal, opposite and absolute value on one number | **Partial.** It moves away from the "one operator per term" template, but MV2-N56-22 already nests operators and the tail is the saturated convert-and-add. Stays **BORDERLINE**. |
| C17 → R11 | One repeating decimal used as a multiplier of a whole quantity | **Does not escape.** "Convert a repeating decimal, then one more operation" already exists with four different last steps (SSAT a175b647, ISEE 24fbd00c, MV2-N8-14, MM2-N19 first-written). A fifth last step is still that chain. **BORDERLINE**. |
| C21 → R18 | Replace the cube-root condition with x^-2 = 1/49, x negative, then x^3 | **Works, but it is a replacement, not a fix:** the substitution step that was C21's new part is gone. R18 is **NEW** in its own right (reciprocal → negative square root → cube, against MM3-N27's cube root → square → reciprocal). |
| C26 | Compare the two unit-fraction quotients by division ("how many times as large") | **Makes it worse.** Two computed values and then their ratio is MM4-N25 stage0 ("Monday's change was how many times Tuesday's"), and the "how many times" quotient is MV2-N56-12. The answer becomes a single quotient, which is a barred cluster. Stays **BORDERLINE**, and the fix adds a block. |

## Recommended final set: mutually distinct, at most one per family

| pick | grade | chain | not to be slotted with it |
|---|---|---|---|
| **C06** | 6 | rank signed decimals by absolute value → two largest → signed sum | R05, R17 |
| **C11** | 7 | four signed factors: count negatives for the sign → pair into whole products | none |
| **R06** | 6 | distances to the axes → signed coordinates by quadrant → combine | R15 |
| **R08** | 7 | x - (-x) = 2x → halve a printed negative decimal | none |
| **R18** | 8 | x^-2 = 1/49 → reciprocal → negative square root → cube | none (replaces C21) |
| **R27** | 6 | fractional periods over a common denominator → LCM of numerators → back to minutes | C25 (shares the LCM step; C25 is the alternate) |
| **R30** | 5 | missing factor in equal products (halve/double, or product ÷ factor) | R01, R12, R16, R19, R22 (optional second: R22, only if the operation counts as the distinction) |

That is **7 mechanisms** (8 with R22). Grade spread: g5 1, g6 3, g7 2, g8 1. Only R30 covers grade 5, and every other
grade-5 candidate in both rounds is BORDERLINE or REPEAT. If more grade-5 slots are needed, the least-bad BORDERLINE
options are R14 (lowest-terms filter) and R02/C26 (pick one, by subtraction, not division).

**Not checked here:** the FORM, K4, HUB and bracket constraints. The author's notes flag HUB risk on C25, R08, R19 and
R27 and the bracket rule on R12 and R30. Those decide whether a NEW chain can be written, not whether it is new.
