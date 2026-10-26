# map-v2 Math batch 5 (Number Systems): independent chain check, 2026-10-26

**What was read:** all 285 entries of `earlier-N-chains.json`, split by grade (g5 69, g6 73, g7 72, g8 71) and read
in full: chain, prompt and key for every entry. MECHANISMS.md's "closest" picks were ignored. **Live ISEE/SSAT:**
about 45 `mf30-kw.mjs` queries over `dump-b4` (3,986 live + 2,480 prior rows), each built from a candidate's
operations rather than its story. Every ISEE/SSAT/MAP hit was read. The same search also turned up MAP **Geometry**
items, which are cited where they share a chain.

**Rule applied:** two items have the same chain when they use the same operations in the same order, on the same
kind of givens, to get the same kind of answer. Story, numbers and number type (fraction or decimal) are ignored.
BORDERLINE means most steps are shared; the row names which step is shared and which one differs.

**Counts:** NEW 3, BORDERLINE 13, REPEAT 14. **NEW:** C06, C11, C25.

| id | verdict | closest earlier item(s) | what is the same / what differs |
|---|---|---|---|
| C01 | REPEAT | MV2-N56-01 (LIVE), MV2-N56-06 (LIVE), MM4-N05 (v4 stage0) | Scaling an amount and then scaling the result is MV2-N56-01's chain. The mixed x fraction>1 and mixed x fraction<1 products are MV2-N56-06's two steps. If you multiply the two factors first, it becomes MM4-N05 (mixed number x fraction, written as a mixed number). |
| C02 | BORDERLINE | SSAT 1478005f (live), ISEE fffd6df7 (live), MM5P-N02 | Shared: find a perimeter, divide by 4 for the square's side, find the square's area. SSAT 1478005f does exactly this with whole numbers. The new parts are fractional sides and subtracting the rectangle's area. No MAP item has this chain. |
| C03 | BORDERLINE | MB4-N5-07 (dropped), MM3-N08, MM3-N05 | Shared: build two decimal totals, then subtract with regrouping (MB4-N5-07, MM3-N08). The only difference is that each total is a sum of three values instead of a product. Decimal column add/subtract is MM3-N05. |
| C04 | REPEAT | MM3-N05 (v3 stage0), MM5-N04, MM4-N04 | Rename everything to a common denominator, add one amount and subtract another in a line, then regroup. MM3-N05 stage0 does this with 3/4, 1/6 and 5/8 in twenty-fourths. Twelfths and one extra subtraction change nothing. |
| C05 | BORDERLINE | MV2-N7-03 (LIVE), MV2-N56-23, MM4-N11; MAP Geometry MV2-G78-24 (LIVE), ISEE 9c2ad5c9 | The arithmetic matches MV2-N7-03: two distances along one axis, one of them across zero, then subtract. Distance from a point to x = a is a number-line distance between x and a, and MV2-G78-24 and ISEE 9c2ad5c9 already use it for reflections. The only new step is reading the distance off a line instead of off two given values. |
| C06 | NEW | MM4-N19 (v4 stage0), MM4-N15, MV2-N56-22 | The nearest item, MM4-N19 stage0, orders a list by value, takes the least and greatest, and adds their distances from 0. C06 ranks by absolute value, takes the two largest, and adds them as signed numbers. Both the selection rule and the final operation differ. No ISEE/SSAT hit. |
| C07 | BORDERLINE | MV2-N56-12 (dropped), MM3-N09 (v3 stage0), MB2-N56-16; MM4-N29 | The first half (mixed ÷ mixed by the reciprocal) is MV2-N56-12 / MM3-N09. Dividing by a fraction and then multiplying the quotient is MM4-N29 (signed). The only new element is using the "times as long" quotient as a scale factor in a story. |
| C08 | REPEAT | MV2-N56-24 (LIVE), MV2-N56-21 (withdrawn) | Reflecting across the y-axis negates x, and y never changes, so this is a number line. Take the opposite, move by a decimal, measure a distance: that is MV2-N56-24. MV2-N56-21 measures back to the original point, as C08 does. |
| C09 | REPEAT | ISEE 7209630d (live), SSAT c45ca0fb (live) | Long division, find the block length, use the remainder to place the nth digit. SSAT c45ca0fb also makes the student divide. The non-repeating digit only subtracts 1 from n. |
| C10 | BORDERLINE | SSAT c45ca0fb, ISEE 7209630d | Shared: long division, find the block, count full blocks in n digits and the digits left over (the nth-digit chain). New: adding the digits (full blocks x block sum + partial block). No MAP item. Do not slot it with C09. |
| C11 | NEW | MM4-N22, MM2-N11, MB4-N7-04 | Earlier items are two-factor signed products. Four factors, counting negatives for the sign, and regrouping into pairs with whole-number products appear in no MAP or ISEE/SSAT item found. The two-negatives sign rule is the only shared step. |
| C12 | REPEAT | MM3-N21 (v3) | MM3-N21 is (-1/2 + 1 2/3) ÷ (-2 1/6 + 1/2): evaluate the signed numerator sum and the signed denominator sum, then divide with the sign rule. Decimals and a fraction bar instead of ÷ are surface changes. |
| C13 | BORDERLINE | MV2-N56-22 (LIVE), MM4-N36 (stage0), MM3-N21 | The template is MV2-N56-22: interpret two operator notations (opposite, absolute value), then combine the signed results. C13 swaps absolute value for a reciprocal (MM4-N36 takes reciprocals) and adds unlike-sign fractions (MM3-N21). New: a reciprocal of a negative mixed number next to an opposite. |
| C14 | REPEAT | ISEE cf75bfb2 (live), ISEE 331af042 (live), MB2-N78-19 (LIVE), MM3-N24 | ISEE cf75bfb2 is "2^(x+3) = 32^2": rewrite with a common base, power of a power, set exponents equal, solve a one-step linear equation. That is C14 exactly. ISEE 331af042 does it with 9^x and 27^y. |
| C15 | REPEAT | ISEE a3855a43 (live), ISEE 1b31caad, SSAT fe682145, MM3-N23 | ISEE a3855a43 is "(-3)^3 + (-2)^4". C15 only adds a third term. |
| C16 | REPEAT | SSAT f2276aab (live), MM2-N19, MM4-N36 (stage0) | SSAT f2276aab is "(1/2)^(-3) - 2^0". MM4-N36 stage0 is (5/2)^-2, a reciprocal then a square. MM2-N19 adds two negative powers. All of C16's steps are covered. |
| C17 | BORDERLINE | SSAT a175b647 (live), ISEE 24fbd00c (live), MV2-N8-14 (LIVE) | SSAT a175b647 turns 0.666... and 0.0606... into fractions over 9 and 99 and combines them (it divides). C17 does the same two conversions and then adds over 99. Only the combining operation differs. |
| C18 | BORDERLINE | MM2-N19 (v2 **first-written**, file only), MV2-N8-14 | MM2-N19 first-written asks "How much greater is 2/3 than 0.6?" and its chain is "2/3 = 0.666... -> subtract 0.6 keeping the repeat, or 2/3 - 3/5 = 1/15". That is a repeating value minus a terminating value as a fraction. C18 differs only in giving the repeating decimal (0.666... -> 2/3) and asking for a fraction instead of a rounded answer. The "strong" rating missed this item. |
| C19 | BORDERLINE | MM4-N33 (v4 stage0), MM4-N34, MM4-N39, MMG-N12 | MM4-N33 stage0 is √2 + √3: approximate each root, add, pick the closest value. MM4-N34 brackets each root between integers. C19 shares both and differs only in asking for the whole number below the sum instead of the nearest decimal. Very close to REPEAT. |
| C20 | REPEAT | MM4-N31 (v4 and stage0), MM4-N33 | Square each option, compare with the radicand, pick the closest: MM4-N31 verbatim. Fraction options instead of decimals change only the form. |
| C21 | BORDERLINE | MMG-N15, MM4-N39 (v4 stage0) | Shared: cube root of a negative number, then a signed combination with a second number. New: the second number comes from substituting x into ax + b, not from a square root. |
| C22 | REPEAT | SSAT a0aedc6c (live), SSAT e962c649 (live); MAP Geometry MB3-G6-01 (LIVE) | Volume -> edge by cube root -> 6 x edge^2 is SSAT a0aedc6c (64 -> 96) and e962c649 (125 -> 150) exactly. MB3-G6-01 already finds the surface area of a cube with a fractional edge. A fractional volume changes only the form. |
| C23 | BORDERLINE | MB2-N78-19 (LIVE), MM4-N38, ISEE cf75bfb2 | Shared with MB2-N78-19: apply an exponent law, set the result equal to the right-hand exponent, solve a one-step equation with negatives. The law is power-of-a-power (multiply) instead of product (add). The (2^3)^-2 step is in MM4-N38, and ISEE cf75bfb2 also solves through a power of a power. |
| C24 | REPEAT | MV2-N8-17, MV2-N8-16, MV2-N8-02/-09/-10/-15, MM5P-N10 | Six earlier items evaluate two power/root terms and combine them. MV2-N8-17 is "5^3 - √100", a power minus another term. Making both terms powers changes nothing in the chain. |
| C25 | NEW | MV2-N56-10 (LIVE), MMG-N06, MM4-N17, MM2-N09; ISEE f5c459b7, SSAT ed9a89f1 | Earlier MAP items each compute only a GCF or only an LCM and use it in a count. ISEE/SSAT use GCF x LCM = product to recover a number, which is a different chain. No item computes both from prime factorizations and adds them. HUB risk (multiples) is a separate question from repetition. |
| C26 | BORDERLINE | MV2-N56-17 (LIVE), MV2-N56-15 (LIVE), MM4-N09 | "Two quotients, then subtract" is MV2-N56-17 and MV2-N56-15. Each quotient (unit fraction ÷ whole number) is MM4-N09's first step. New: both quotients are grade-5 unit-fraction ÷ whole, and the answer is their difference. |
| C27 | REPEAT | MM2-N10 (v2) | Four-digit ÷ two-digit quotient used as a count, times a decimal price: MM2-N10 (3,276 / 24 -> x 9.65). |
| C28 | BORDERLINE | MMG-N09 (v1), MB4-N7-02 (dropped), MM4-N06 | MMG-N09 is "-3.6 ÷ (4/5) - (-1 1/4)(2.2)": divide by a fraction, multiply, subtract the product from the quotient. That is C28's sequence of operations. MB4-N7-02 combines a fraction product and a fraction quotient. New: the same two fractions in both operations, framed as "how much greater is ÷ than x". |
| C29 | REPEAT | MMG-N10 (v1) | Signed changes -> net change -> undo it from the final value is MMG-N10's chain, step for step. MM4-N21 is nearby. |
| C30 | REPEAT | MV2-N7-19 (LIVE), MMG-N08, MM2-N13, MM5P-N08 | Signed fractional rate x time, added to a start: MV2-N7-19 (5 x (-2 1/8) + 3.35), MMG-N08 (rate x time + negative start), MM2-N13 (negative mixed rate x mixed-number time). Converting decimal hours to a fraction is the only added step. |

## Notes for the brief-writer

- **Three candidates repeat live ISEE/SSAT items exactly, though no MAP item:** C14 (ISEE cf75bfb2), C15 (ISEE
  a3855a43), C22 (SSAT a0aedc6c / e962c649). C09 is also an ISEE/SSAT repeat.
- **The "strong" candidate, C18, has a near-twin** in MM2-N19 as first written (v2, file only). Keyword search on
  "repeating" misses it, because its prompt says "2/3" and "0.6", not "repeating".
- **Pairs that share a front end** and should not both be slotted: C09/C10 (long division to the block), C14/C23
  (exponent law then solve), C07/C28 (fraction division then multiplication).
- **Unread sources:** MAP Geometry and Statistics items outside `earlier-N-chains.json` were only searched by keyword,
  so the Geometry citations above (MV2-G78-24, MB3-G6-01) come from that search, not a full read.
