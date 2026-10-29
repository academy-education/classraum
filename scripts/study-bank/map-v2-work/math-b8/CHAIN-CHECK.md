# map-v2 Math batch 8 (Number Systems): independent chain check, 2026-10-30

**What was read:** all 374 entries of `earlier-N-chains.json`, read in full (chain, prompt and key) and grouped by
grade: **g5 87, g6 103, g7 96, g8 88**. These include every earlier MAP Number Systems item (294), batch 7's two written
items (MB7-N7-01 kept, MB7-N6-01 dropped), batch 7's 40 checked mechanisms (B7-D01..D40, with the batch-7 verdict) and
batch 7's 38 probe-dropped drafts (B7-K.., B7-M.., B7-P..). The batch-5 rounds (`../math-b5/CHAIN-CHECK.md`,
`CHAIN-CHECK-R2.md`) and batch 7's `../math-b7/CHAIN-CHECK.md` were read, and their verdicts are treated as binding.
The eight batch-5 slots (C06, C11, C25, R06, R08, R18, R27, R30) and batch 7's D33 (MB7-N7-01) count as earlier items.
`DROPPED.md` was read for the batch-8 probe's own drops only. From `MECHANISMS.md` only each candidate's
**Ask / Chain / Twist** was used. The author's pointers, notes, family labels and probe lines were not used.

**Live and prior search:** **95 `mf30-kw.mjs` queries** over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517
prior MAP and maths rows), plus one direct regex scan of the same dump for `x^3 + c = d` forms that the keyword tool
could not isolate from polynomial items. Every candidate got at least two queries built from its operations, and every
hit was read. One query (`fold|crease`) matched "increase"/"decrease" and was re-run with word boundaries. The prior
rows include MAP **Geometry**, **Measurement/Data** and **Operations** items. Those are cited where they share a chain,
but they were searched by keyword, not read in full.

**Rule applied:** two items have the same chain when they use the same operations in the same order, on the same kind
of givens, to get the same kind of answer. Story, numbers and number type (fraction or decimal) are ignored. Following
batch 7's D26 ruling, signed givens are not a new kind of given: a sign only adds an across-zero subtraction that
MV2-N7-03 (LIVE) already does. **Changed asks:** a changed ask is the same chain when answering it needs no new
operation. Each row that relies on this says which way it was ruled. Following batch-5's R29 ruling, a candidate whose
whole chain is a **prefix or sub-chain** of an earlier item, with no step of its own, is a REPEAT. A candidate that
re-proposes a batch-7 mechanism or draft is a REPEAT of it. BORDERLINE means most steps are shared; each such row names
the shared step and the step that differs.

## Counts

**NEW 3, BORDERLINE 8, REPEAT 6.**

**NEW:** E07, E14, E16. All three are grade 7. They are mutually distinct, so these are **3 distinct mechanisms**.

## Verdicts

| id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
|---|---|---|---|---|
| E01 | REPEAT | **MV2-N56-08 (LIVE)**, MV2-N56-08 revised-away; **B7-D09 (b7 mechanism, BORDERLINE)**; MM3-N05 (v3), MM5-N01 (LIVE) | MV2-N56-08 reads unit counts above 9 against place values (19 boxes of 10^2, 87 bags of 10^1) and regroups them into a standard number, which is E01's twist. E01 drops MV2-N56-08's shipping subtraction and uses tenths and hundredths instead of tens and hundreds. That is number type, so the chain is a sub-chain of MV2-N56-08 with no step of its own (R29). B7-D09 already proposed the fractional place values and was ruled BORDERLINE only because it added a second number. E01 is closer to MV2-N56-08 than D09 was. 0 live hits for "tenths & hundredths". | none |
| E02 | BORDERLINE; **wrong area** | **ISEE 37d8208f (live)**, **SSAT 66559fd0 (live)**, SSAT 4d70273f, ACT 4b5ca5a3, SAT 1dd8f951 (all live) | Shared: "new part over new whole after k are added". Every live hit uses it as the check step of an inverse problem (how many to add, or the original count, given the new ratio or probability). Differs: E02 runs it forward and reports the fraction, so it is not literally a sub-chain of solving for k. The whole chain is one fraction formed from two additions, so it is thin. **Area:** fraction of a set after a change is a part-to-whole ratio or a probability (6.RP.A.1 / 7.SP.C), not 5.NF.B.3 (a fraction as a division of whole numbers). No MAP NS item frames it this way. | none |
| E03 | REPEAT | **ACT c9f4b0d5 (live)**, **SSAT 55007b7b (live)** | ACT c9f4b0d5: a mean recorded with one entry "entered as 58 ounces when the package actually weighed 88". Its chain is total → subtract the wrong entry, add the right one → divide. SSAT 55007b7b does the same with two wrong entries. E03 is the middle step of both (shown total - wrong + right) with no step of its own (R29). A decimal-point slip (4.5 for 0.45) is just how the wrong value is given. No MAP NS item has it, so the repeat is live only. | R (repair a total): E03, E10 |
| E04 | BORDERLINE; area risk | **batch-5 R01 (BORDERLINE, binding)**, MM4-N24 (v4 stage0), MM3-N05 (v3) | R01 summed the known side and then found a missing addend by subtraction ("two equal sums"), and was ruled BORDERLINE against MM4-N24's missing addend. E04 does R01's step twice in a row: sum a complete line for the magic sum → missing addend on a line with one gap → missing addend on a line through that entry. Differs: the second gap depends on the first answer. That chaining is the only new part. "magic", "same sum", "each row & each column": 0 hits in 6,503 rows. **Area:** E04 uses sevenths only, so its fraction work is like-denominator mixed-number addition and subtraction (4.NF.B.3c), not 5.NF.A.1, which is unlike denominators. A magic square is also a puzzle context that MAP files under Operations and Algebraic Thinking as often as under NS. | M (magic square): E04, E12 |
| E05 | REPEAT | **SAT 953ab036 (live)**, **MV2-G56-11 (MAP Geometry, LIVE)**, MM2-G17 (MAP Geometry, v2); MV2-N7-03 (LIVE) | SAT 953ab036 turns two conditions into intervals and asks for the width of the interval where they overlap: greater left end to lesser right end, then subtract. E05 is that back half with the intervals printed, so it has no step of its own (R29). MV2-G56-11 (live MAP Geometry) does the same intersection on each axis of two rectangles before multiplying, and MM2-G17 does it for a square and its translate. Ends of opposite sign only add the across-zero subtraction (MV2-N7-03), which batch 7's D26 ruling treats as the same kind of given. | I (interval overlap): E05, E11 |
| E06 | BORDERLINE (near REPEAT) | **ISEE 9c2ad5c9 (live)**, **MV2-G78-24 (MAP Geometry, LIVE)**; **MV2-N56-23 (dropped by graders)**; **B7-K35 (b7 probe-dropped: ISEE 7f018ffc, ACT 9513dc73 live)**; batch-5 C05 | The crease is the midpoint of a and b, which is MV2-N56-23's first step ("P is halfway between -11 and 6"). The image of c is the reflection of c about a non-zero point, 2m - c. That is ISEE 9c2ad5c9 (reflect -3 across x = 1) and MV2-G78-24 (reflect across x = 3, then across x = 14), and it is B7-K35's midpoint used backward. Both steps exist. Only chaining them (the reflection point found as a midpoint) is new, as in batch-5 R07 ("both halves exist; only the combination is new"). | F (number-line fold): E06, E15 |
| E07 | **NEW** | MB5-N6-01 / batch-5 C06 (slotted); MM4-N22 (v4), MM2-N11 (v2); batch-5 family K (R05, R17), B7-D10 | C06 ranks by absolute value, takes the two largest whatever their signs, and adds them. E07 takes the largest-in-size number **of each sign**, because the least product must be negative, and **multiplies** them with the sign rule. On E07's own example set (-8.5, -7.5, -6.5, 7.5), C06's rule picks -8.5 and -7.5, so the selection rule differs as well as the final operation. Batch 5 used exactly that test to rule C06 NEW over MM4-N19. Only the signed product (MM4-N22, MM2-N11) is shared. 0 relevant hits for "least/smallest/greatest product", "least value of xy", "which pair & product" or "chooses two & product". | none |
| E08 | REPEAT | **B7-D08 (b7 mechanism, NEW)**; **B7-D26 (b7 mechanism, REPEAT: SSAT 632f5043, ISEE f31d1f72, both live)**; batch-7 family B (D08/D15/D25) | B7-D08 adds each of several pairs, measures each sum's distance from a benchmark (1), and picks the least. E08 is that chain with benchmark 0 and with consecutive pairs from a table. The consecutive scan is B7-D26's, and D26 repeats SSAT 632f5043 and ISEE f31d1f72 (greatest day-to-day change). **Changed ask:** reporting the signed sum instead of naming the pair needs no new operation, because the sum has already been computed, so the chain is the same. Distance from 0 is simpler than D08's distance from 1. The batch-8 probe dropped Q08 as a re-proposal of D08, and E08 is the same re-proposal in signed form. | Z (closest to 0) by ask: E08, E16 (different chains; see E16) |
| E09 | BORDERLINE | **ISEE e9968f0b (live)**, **SSAT 31c64416 (live)**; **MB5-N7-01 / batch-5 C11 (slotted)** | Telescoping a long product of fractions is live twice: ISEE e9968f0b and SSAT 31c64416 both evaluate (1 - 1/2^2)(1 - 1/3^2)...(1 - 1/10^2) = 11/20 by cancelling. Fixing the sign by counting negative factors is C11 (MB5-N7-01). E09 combines the two: count negatives for the sign, then cancel numerators against the previous denominators. Its telescoping is simpler than the live items' (no difference-of-squares split), so the only new part is the combination. | none |
| E10 | BORDERLINE (near REPEAT) | **ACT c9f4b0d5 (live)**, **SSAT 55007b7b (live)**; **MB5-N7-02 / batch-5 R08 (LIVE)** | This is E03's repair (remove the wrong entry, add the right one: the live mean-correction step) in the case where the right entry is the opposite of the wrong one. The shortcut, shifting by twice the change, is n - (-n) = 2n, which is exactly MB5-N7-02's step. Both steps exist, and the combination (repairing a signed total by the 2x step) is the only new part. The author's family R is right: E10 and E03 are one chain. | R: E03, E10 |
| E11 | REPEAT | as E05: **SAT 953ab036 (live)**, **MV2-G56-11 (MAP Geometry, LIVE)**; MV2-N7-03 (LIVE) | E05 with signed mixed-number ends. Number type is ignored, so the reasoning in E05's row applies. | I: E05, E11 |
| E12 | BORDERLINE | **batch-5 R01 (BORDERLINE)**, **MM4-N24 (v4 stage0)**, MV2-N7-13 (LIVE) | The same chained missing addend as E04. Because the magic sum is printed, both steps are "magic sum minus a signed sum", which is MM4-N24 stage0's signed missing addend ("-2 5/6 added to n is 1 3/8") done twice. Differs only in the chaining. Signed sevenths put the arithmetic squarely in 7.NS.A.1, so E12 carries less area risk than E04, though a magic square still reads as Operations and Algebraic Thinking. | M: E04, E12 |
| E13 | REPEAT | **MV2-N7-04 (dropped by graders)**, **B7-M08 (b7 probe-dropped)**; MM2-N05 (v2), MB4-N5-03 (withdrawn) | MV2-N7-04 totals four golf rounds as 4 x par plus the net of the signed scores. That is: sum a list, multiply a per-item constant by the count, combine. E13's true total, the sum of the readings minus n x offset, is the same three operations in the same order. Whether the constant is added (par) or subtracted (a signed offset, so subtracting a negative) is a sign, not a step. B7-M08 re-proposed the golf version and was dropped by batch 7's probe. Applying a per-item adjustment once per item rather than once in total is also MM2-N05's twist ("the discount is per jacket"). | none (shares the repair-a-total framing with E03 and E10, not their chain) |
| E14 | **NEW** | batch-5 family M (MB5-N7-03 / R22, MB5-N5-01 / R30, both slotted); ISEE 61b2273d (live); MM4-N23 (v4) | No MAP or live item has a wrong operation that must be undone before the intended one is applied. Shared: the front half, undoing a division by multiplying (the missing-dividend form of batch-5's missing-operand family M, and ISEE 61b2273d's working-backward step). Differs: the intended operation is then applied, so the key is R x f^2 with the sign rule. 0 hits for "divided/multiplied & instead", "supposed to multiply", "by mistake & divided" or "should have & correct answer". **Watch:** if R x f is offered as the key, or the item is written so that recovering the original number is the ask, it collapses into family M. | none |
| E15 | BORDERLINE (near REPEAT) | as E06: **ISEE 9c2ad5c9 (live)**, **MV2-G78-24 (LIVE)**, MV2-N56-23 (dropped), B7-K35 | E06 with signed mixed numbers. Number type is ignored, so the reasoning in E06's row applies. | F: E06, E15 |
| E16 | **NEW** | B7-D08, B7-D15 (b7 mechanisms, NEW: distance from a benchmark); MV2-N56-22 (LIVE) | No item assigns signs to a set of numbers to bring a sum nearest a target. 0 hits for "plus or minus", "signs & placed/inserted", "as close to 0", "least value of \|", "either positive or negative". Shared only on the brute-force route: evaluate the four sign patterns, then pick the one nearest 0, which is the back half of the benchmark-distance family (B7-D08/D15). The intended step (weigh the largest against the other two, then assign signs) has no precedent. It shares the "closest to 0" ask with E08 but not its operations, so E16 is not E08's family by chain. | Z by ask only (E08 is REPEAT, so E16 can be slotted) |
| E17 | BORDERLINE; area risk | **MMG-N15 (v1, file only)**, **MM4-N39 (v4)**; **MB5-N8-01 / batch-5 R18 (LIVE)**; batch-5 C21 (BORDERLINE); batch-8 drop Q32 | Cube root of a negative value is MMG-N15 (x^3 = -0.216) and MM4-N39 (cube is -0.125). Isolating the power before taking the root with a sign condition is the MB5-N8-01 family. The probe dropped E17's square twin (Q32, x^2 + c = d with x negative) against MB5-N8-01. Differs: the isolation is a signed fraction subtraction (a missing addend, MM4-N24), and the cube root needs no sign choice. No live row solves x^3 + c = d; the direct regex scan found only polynomial items and the MAP items above. **Area:** solving x^3 = p is 8.EE.A.2. MMG-N15 is the only precedent for filing it under NS, and MMG-N15 was never banked. | none |

## Notes for the brief-writer

- **Live ISEE/SSAT/SAT/ACT repeats that no MAP NS item shares:**
  - **E03:** ACT c9f4b0d5, SSAT 55007b7b. Correcting one recorded entry in a total is the core of both mean-correction
    items. These two also underlie E10's BORDERLINE.
  - **E05 / E11:** SAT 953ab036 (width of the overlap of two intervals). The MAP item that shares the chain is a
    Geometry item, MV2-G56-11 (LIVE), not an NS item.
- **Live rows behind BORDERLINE verdicts:** E09 (ISEE e9968f0b, SSAT 31c64416: telescoping products), E06/E15 (ISEE
  9c2ad5c9: reflection about x = 1; ISEE 7f018ffc and ACT 9513dc73 via B7-K35), E02 (ISEE 37d8208f, SSAT 66559fd0 and
  four more: the same fraction used inside inverse ratio and probability problems).
- **Near-twins the author's search missed:**
  - E01 is MV2-N56-08 (LIVE) without its subtraction. MV2-N56-08's 19 hundreds and 87 tens are E01's "unit counts
    above 9".
  - E13 is MV2-N7-04 and B7-M08 (n x par + net of signed scores).
  - E05 is the back half of SAT 953ab036 and one axis of MV2-G56-11.
  - E03 is the middle of ACT c9f4b0d5 and SSAT 55007b7b. The author's queries looked for "total" and "decimal point",
    and the live items say "mean" and "entered as ... actually weighed".
  - E08 is B7-D08 in signed form. The probe dropped Q08 for D08 but let E08 through.
  - E09's telescoping is live twice. The author's probe looked for "2/3 & 3/4 & 4/5" and the live items are written
    as (1 - 1/n^2).
  - E17 is the cube twin of the probe's own drop Q32.
- **Pairs and groups that share a front end** (slot at most one of each):
  - E03/E10: repair a total
  - E04/E12: chained missing addends in a magic square
  - E05/E11: interval overlap
  - E06/E15: number-line fold
  - E08/E16 share only the "closest to 0" ask. Their chains differ, and E08 is REPEAT anyway.
  - E10/E14 and E13 share an "undo the error, then correct" framing, but their operations differ (add/subtract twice
    the change; multiply twice; n x offset). They can be slotted together only if the briefs keep the framings apart.
- **Wrong area:**
  - **E02** reads as 6.RP.A.1 / 7.SP.C (part-to-whole after a change, which is a probability), not 5.NF.B.3.
  - **E04 and E12 are at risk.** A magic square is an Operations and Algebraic Thinking puzzle context. On top of
    that, E04's arithmetic is all in sevenths, so it is like-denominator work (4.NF.B.3c), not the 5.NF.A.1 it is
    tagged with. E12's signed sevenths keep it in 7.NS.A.1, so if one magic square is slotted, E12 is the safer one.
  - **E17 is at risk.** Solving x^3 = p is 8.EE.A.2. The only NS precedent, MMG-N15, is file only.
  - **E13 and E03 are in-area** as arithmetic, but both live repeats sit in Statistics (mean correction). That is
    one more reason not to slot E03.
- **The grade-7 space is still saturated for chains that are a signed sum with a twist.** E03, E10 and E13 are all
  versions of "correct a total", and all three resolve to an existing chain. The three NEW chains each have a step
  that is not arithmetic on a given list: an optimisation choice (E07, E16) or undoing an operation (E14).

## Recommended final set: mutually distinct, at most one per family

| pick | grade | chain | not to be slotted with it |
|---|---|---|---|
| **E07** | 7 | the least product must be negative → take the largest in size of each sign from a printed signed set → multiply with the sign rule | none (keep it away from C06 framing: do not ask for "the two numbers greatest in size") |
| **E14** | 7 | a division by a signed fraction was done in place of a multiplication → undo it (× f) → apply the intended × f → R × f^2 | none; never key R × f (that is family M) |
| **E16** | 7 | choose + or − before each of three signed mixed numbers → weigh the largest against the other two → the value nearest 0, keeping its sign | E08 (REPEAT in any case) |

**That is 3 mechanisms: g5 0, g6 0, g7 3, g8 0.** It does not reach the +9 Number Systems items a sixth form needs.

If the coordinator accepts BORDERLINE chains to fill slots, the least-shared options, one per family, are:

| grade | candidate | not with | caveat |
|---|---|---|---|
| 7 | E09 (sign count + telescoping) | none | live telescoping exists twice; keep the factors as (-(n-1)/n), not (1 - 1/n^2) |
| 6 | E06 (fold) | E15 | near REPEAT: two existing steps chained |
| 7 | E12 (magic square, signed) | E04 | area risk; prefer it to E04, whose sevenths-only arithmetic is grade 4 |
| 8 | E17 (x^3 + c = d) | none | area risk (8.EE.A.2); cube twin of the dropped Q32 |

With all four the set reaches **7: g5 0, g6 1, g7 5, g8 1**, and four of them would be slotted as BORDERLINE, not NEW.
Do not slot E10 (near REPEAT of live rows plus MB5-N7-02) or E02 (wrong area). Do not slot any REPEAT (E01, E03, E05,
E08, E11, E13). **Grade 5 has no usable chain in this batch:** E01 and E03 are REPEAT, E02 is wrong-area, and E04
carries both the magic-square and the like-denominator area risks.

**Not checked here:** FORM, K4, HUB and the bracket constraints. They were checked before this round, and they decide
whether a NEW chain can be written, not whether it is new.
