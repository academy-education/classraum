# map-v2 Math batch 9 (Number Systems): independent chain check, 2026-10-30

**What was read:** all 431 entries of `earlier-N-chains.json`, read in full (chain, prompt and key) and grouped by
grade: **g5 100, g6 116, g7 118, g8 97**. These include every earlier MAP Number Systems item, batch 7's two written
items, 40 checked mechanisms (B7-D01..D40) and 38 probe-dropped drafts, and batch 8's 7 written items
(MB8-N7-01/02/03/05 and MB8-N6-01 kept; MB8-N7-04 and MB8-N8-01 dropped), 17 checked mechanisms (B8-E01..E17, with the
batch-8 verdict) and 33 other drafts (B8-Q..). The batch-5 rounds (`../math-b5/CHAIN-CHECK.md`, `CHAIN-CHECK-R2.md`),
`../math-b7/CHAIN-CHECK.md` and `../math-b8/CHAIN-CHECK.md` were read, and their verdicts bind. The batch-5 slots, B7-D33
(MB7-N7-01) and batch 8's five kept items count as earlier items. From `MECHANISMS.md`, only each candidate's
**Ask / Chain / Twist** was used. The author's pointers, notes, family labels and probe lines were not used.

**Live and prior search:** **48 `mf30-kw.mjs` queries** over `dump-b6` (3,986 live ISEE/SSAT/SAT/ACT rows + 2,517 prior
MAP and maths rows). Every candidate got at least two queries built from its operations, and every hit was read. Family
queries count for each member (F04/F05/F10 share their running-total queries, F08/F09 their walk queries). One wide
query (`exactly one|only one of`, 129 hits, mostly "intersect at exactly one point") was narrowed and re-run. The prior
rows include MAP **Geometry** and **Measurement/Data** items. Those are cited where they share a chain; they were
searched by keyword, not read in full.

**Rule applied:** two items have the same chain when they use the same operations in the same order, on the same kind
of givens, to get the same kind of answer. Story, numbers and number type (fraction, decimal or **percent**) are
ignored. Following batch 7's D26 ruling, signed givens are not a new kind of given. **Changed asks** are the same chain
only when answering needs no new operation; each row that relies on this says which way it was ruled. Following
batch-5's R29 ruling, a candidate whose whole chain is a **prefix or sub-chain** of an earlier item, with no step of its
own, is a REPEAT. Following batch 8's E06 ruling (and batch 5's R07), a chain whose every step exists in earlier items,
so that only the combination is new, is BORDERLINE.

## Counts

**NEW 5, BORDERLINE 3, REPEAT 5.**

**NEW:** F04, F05, F08, F09, F10. F04, F05 and F10 are one family (R) and F08 and F09 are another (P), so these are
**2 distinct mechanisms**.

## Verdicts

| id | verdict | closest earlier item(s) | what is the same / what differs | family within this batch |
|---|---|---|---|---|
| F01 | REPEAT; **wrong area** | **SAT 253a460b, SAT 4005a61b, SAT 636d2d68, SAT 677f066e (all live)**, **ACT 8c3283ad (live)**; as a prefix: SAT 4f67dbc8, SAT 4910171e, SAT d2788dd1, SAT ef612f1c (live); ISEE 075fd889 (live, ratio version); PSDA-H4-18 (prior SAT file) | SAT 636d2d68: "60% of the employees are engineers and the rest are non-engineers. Of the engineers, 25% ...; of the non-engineers, 10% ... What percent of all employees ...?" That is F01's chain step for step: the second part is the complement, each part is multiplied by its own rate, and the two products are added to give the share of the whole. Four more live rows ask exactly this, and four others use it as the first half of a conditional-probability or work-backward item. Percent versus fraction is number type. ISEE 075fd889 (1/4 of the boys and 1/3 of the girls, from a 5:3 ratio) is the same with a ratio front end. **Area:** this is total probability / a weighted share, which lives in SAT Problem-Solving and Data Analysis and in 7.SP.C.8, not in 5.NF.B.6. | W: F01, F02 |
| F02 | REPEAT; **wrong area** | as F01: **SAT 253a460b, SAT 636d2d68, ACT 8c3283ad (live)**; SAT 2471fe2c (live) | F01 with three parts. The third share is "1 minus the other two", which is the same complement step as F01's "the rest", and the third product-and-add repeats a step already in the chain. No new operation, so it is the same chain. The area problem is the same as F01's. | W: F01, F02 |
| F03 | REPEAT; **wrong area** | **ISEE 64bae15c (live)**, **SSAT c61cf662 (live)**, **SSAT a2555fc8 (live)**; ACT 2fb9b050 (live, counts); near: SSAT e3f3f363 (live) | ISEE 64bae15c: probabilities 0.7 and 0.6, independent, "the probability that exactly one of them makes the shot". SSAT c61cf662 does the same with rain on two days. Both compute the overlap as a product of two fractions and then a + b - 2ab (or a(1 - b) + b(1 - a)). That is F03's whole chain. The unit square with two strips is the standard area model of two independent events, so the story is the only difference. ACT 2fb9b050 asks "exactly one of the two sports" with the overlap printed as a count. SSAT e3f3f363 (lawn not covered by two crossing paths) is the complement ask. **Area:** inclusion-exclusion with a product overlap is 7.SP.C.8, and every live precedent is a probability item. | none |
| F04 | **NEW** | nearest: **B7-D31 (b7 mechanism, BORDERLINE)**, **B7-D26 (b7 mechanism, REPEAT of SSAT 632f5043 / ISEE f31d1f72, live)**; MB2-N78-02 (LIVE), MM3-N05 (v3), MV2-N7-18 (LIVE) | Every earlier running-total item reports the end state (MB2-N78-02, MM3-N05, MV2-N7-18). B7-D31 computes cumulative sums but stops at the first crossing of a printed threshold, after constant-rate stages. B7-D26 and its live twins scan consecutive differences, not running sums. No item computes every intermediate total and reports the least one. 0 hits for "lowest balance", "running/cumulative total", "lowest/highest + balance/level/elevation + then/after", "deposit/withdraw + lowest/least". **Watch:** if the item prints a threshold or asks when the balance first falls below a value, it becomes B7-D31. | R: F04, F05, F10 |
| F05 | **NEW** | as F04; MM3-N05 (v3 stage0: add and subtract eighths and twelfths in a line), MM5-N04 | F04 with mixed numbers in eighths. Number type is ignored, so this is F04's chain, and F04's reasoning applies. | R: F04, F05, F10 |
| F06 | REPEAT; area risk | **MV2-D5-01 (MAP Measurement/Data, LIVE)**, **MB2-D5-09 (MAP Measurement/Data, dropped by graders)**; MV2-D5-07 (MAP D, LIVE); B7-D04 (b7 mechanism, BORDERLINE) | MB2-D5-09: fish weights in fractions of a pound, "put back every fish that weighed less than 1/2 pound and kept the rest", then the total weight kept. That is compare each fraction with 1/2 → keep the ones that pass → add. MV2-D5-01 (live) does the same ("every piece that is half a yard long or longer") and then divides by 1/4, so F06 is its prefix (R29). Leaving out the fraction equal to 1/2 is the boundary choice both items already make (strict versus inclusive). Five fractions without counts is a line plot with every count 1. **Area:** this is 5.MD.B.2 (line-plot fractions, then operate), which is why both precedents are MAP Measurement items. | none (shares only the "select, then add" ask with F13) |
| F07 | REPEAT | **ISEE fdebedce (live)**; SAT 2517f8e8 (live); B8-Q21 (b8, not writable) is unrelated | ISEE fdebedce: five friends on a street grid meet where "the total distance ... is as small as possible". The solution takes each axis separately, meets at the median, and adds outer gap plus inner gap. That is F07's step (the least total is (greatest - least) + (third - second)) done once per axis and then added. F07 is one axis with an even count, so it is a sub-chain with no step of its own (R29). An even count makes the best place an interval, but the total is the same pairing sum. Signed points add only the across-zero subtraction (D26 ruling). SAT 2517f8e8 (minimum of \|x - 3\| + \|x + 2\|) is the two-point case. B8-Q21 contrasts the sum of sizes with the size of a sum, which is a different chain. | none |
| F08 | **NEW** | MM5-N16 (LIVE), MV2-N56-18 (LIVE), MV2-N56-24 (LIVE); MB2-G5-14 (MAP Geometry, held); B8-Q12, B8-Q52 (b8 probe-dropped) | Shared: a side length across an axis by adding sizes (MM5-N16, MV2-N56-18) and a move along a line from a point (MV2-N56-24). Differs: the distance walked is split at a corner (remaining = d - first side), and the answer is a coordinate on the second side. MV2-N56-18 adds two legs. MB2-G5-14 follows printed moves on a grid. B8-Q12 and Q52 are shortest grid paths. None splits a given distance at a vertex. 0 hits for "clockwise" (only rotations and bearings), "walks/travels along the sides/edges/perimeter" and "starts at the vertex/corner ... rectangle". **Area:** in-area: 6.NS.C.8 names coordinate distances explicitly, and MM5-N16 is a live NS rectangle item. The same skill is also written into 6.G.A.3, so do not make it a perimeter item. | P: F08, F09 |
| F09 | **NEW** | as F08 | F08 starting from another vertex, with x and y swapped. Same chain, and F08's reasoning applies. | P: F08, F09 |
| F10 | **NEW** | as F04; MV2-N7-03 (LIVE), MV2-N7-18 (LIVE), B7-D31 | F04 with signed decimals. Under the D26 ruling, signed givens are not a new kind of given, so this is F04's chain. It is NEW for the same reason F04 is: an intermediate maximum, not the end state. | R: F04, F05, F10 |
| F11 | BORDERLINE | **MM4-N35 (v4, file only, both versions)**, **B7-K08 (b7 probe-dropped)**; batch-5 C17 (BORDERLINE: SSAT a175b647, ISEE 24fbd00c, live), batch-5 R25 (REPEAT), MV2-N8-14 (LIVE) | Shared front: classify a list of roots, a repeating decimal, π and non-perfect roots as rational or irrational. That is MM4-N35's chain, which counts the irrational ones, and B7-K08 re-proposed it. Shared back: convert a repeating decimal to a fraction and add it to other fractions (C17 adds two converted repeating decimals; R25 subtracts). **Changed ask:** "the sum of the rationals" needs new operations (converting and adding), so it is not MM4-N35's chain. But both halves exist, so only the combination is new (E06/R07 ruling). | C: F11, F12 |
| F12 | BORDERLINE | **MM4-N35 (v4, file only)**, B7-K08; **B7-D34 (b7 mechanism, BORDERLINE)**, MM4-N19 (v4 stage0), batch-5 R17 / family K, B7-D10 | Same front as F11 (MM4-N35's classification). The back half (write the values in one form, order them, greatest minus least) is the family-K chain: MM4-N19 stage0, R17, B7-D10, and B7-D34, which does exactly this over evaluated powers. Both halves exist, and the back half is the most saturated pattern in the earlier rounds. | C: F11, F12 |
| F13 | BORDERLINE (near REPEAT); fenced cluster | **B7-D34 (b7 mechanism, BORDERLINE)**; **MM4-N40 (v4, file only, both versions)**; batch-5 C16 (REPEAT: **SSAT f2276aab, live**), MV2-N8-01 (LIVE), MB4-N8-05 (withdrawn); MM2-N19 (v2) | Evaluating zero and negative powers with whole and fraction bases is C16, ruled REPEAT against SSAT f2276aab, and it is in MV2-N8-01 (live) and MB4-N8-05. Keeping the powers whose values pass a bound is MM4-N40 ("keeps only the powers whose values lie between 0.01 and 100", then counts them). Adding fractional values of negative powers is MM2-N19 (2^-2 + 3^-2 in 36ths). B7-D34 runs the same evaluation and then ranks. Every step exists, and the selection-then-sum ask is F06's, which is itself a repeat. **Area:** 8.EE.A.1. MAP files it as NS (MV2-N8-01 is live NS), but the batch-4 to batch-8 briefs fenced it as exponent evaluation. | none (shares only the ask shape with F06) |

## Notes for the brief-writer

- **Live ISEE/SSAT/SAT/ACT repeats that no MAP NS item shares:**
  - **F01 / F02:** SAT 253a460b, SAT 4005a61b, SAT 636d2d68, SAT 677f066e and ACT 8c3283ad ask this chain exactly
    ("x% are A and the rest B; p% of A and q% of B; what percent of all"). SAT 4f67dbc8, 4910171e, d2788dd1, ef612f1c
    and 2471fe2c use it as a first step, and ISEE 075fd889 is the ratio version. The probe missed all of them because
    it searched "of the girls / of the boys", and the live wording is "Of the members, 25% ...; of the non-members,
    10% ...".
  - **F03:** ISEE 64bae15c, SSAT c61cf662, SSAT a2555fc8 ("exactly one of" two independent events). ACT 2fb9b050 is the
    count version. The probe searched strips and shading. The live items say "probability" and "exactly one of them".
  - **F07:** ISEE fdebedce (least total grid-walking distance to a meeting point). SAT 2517f8e8 is the two-point case.
- **Repeats inside MAP that are not Number Systems items:** **F06** is MV2-D5-01 (LIVE) and MB2-D5-09 (dropped by
  graders), both MAP Measurement/Data line-plot items. Keep "keep the fractions that pass a benchmark, then add" out of
  NS briefs; 5.MD.B.2 owns it.
- **Near-twins the author's search missed:** all of the above, plus MM4-N40 (selecting powers by value), which sits
  under F13, and MM4-N35, which is the front end of both F11 and F12.
- **Pairs that share a front end** (slot at most one of each):
  - F04 / F05 / F10: running total, then its extreme. This is one chain across three grades and three number types.
  - F08 / F09: walk around a coordinate rectangle, split at a corner.
  - F11 / F12: classify rational and irrational (MM4-N35), then operate on the rationals.
  - F01 / F02: complement, then a weighted sum. Both are REPEAT anyway.
  - F06 / F13 share only the "keep those that pass a test, then add" ask. Their operations differ, but F06 is a
    repeat, and slotting F13 would revive that ask shape.
- **Wrong area:**
  - **F01 and F02** are total probability / weighted share: SAT PSDA, 7.SP.C.8. Every live precedent is a percent
    item about subgroups.
  - **F03** is the probability of exactly one of two independent events (7.SP.C.8), drawn as an area model.
  - **F06** is 5.MD.B.2 (both MAP precedents are Measurement/Data items).
  - **F13** is 8.EE.A.1, a cluster earlier briefs fenced. MAP precedent (MV2-N8-01, live NS) keeps it formally in
    area.
  - **F08 / F09** are in-area (6.NS.C.8; MM5-N16 is a live NS item). Keep the ask a coordinate, never a perimeter or a
    side length, or it slides into 6.G.A.3.
- **Grade:** the tags match the operations. Notes:
  - **F05** renames only halves, fourths and eighths. That is still unlike-denominator work (5.NF.A.1), but it is at
    the easy end. Batch 8's E04 problem (like denominators, so grade 4) does not apply.
  - **F06** compares with 1/2 as a benchmark (4.NF.A.2) before a 5.NF.A.1 sum. It is a repeat anyway.
  - **F04** is 5.NBT.B.7 (decimals to hundredths). It is grade 5, not grade 4.
  - **F10** is 7.NS.A.1, but its only signed step is adding and subtracting signed decimals, which batch 7 called
    the saturated grade-7 space. Its novelty comes from the ask, not the arithmetic.
- **The new step in family R is the ask.** The arithmetic (start plus a list of changes) is as saturated as anything in
  the bank. The item is new only because the answer is an intermediate state. If the brief lets the key be the final
  total, or prints a threshold, it collapses into MB2-N78-02 / MV2-N7-18 or into B7-D31.

## Recommended final set: mutually distinct, at most one per family

| pick | grade | chain | not to be slotted with it |
|---|---|---|---|
| **F04** | 5 | start balance → running balance after each decimal deposit or withdrawal → compare the running balances → the least | F05, F10 (same chain; F10 is the alternate if a grade-7 slot is wanted instead) |
| **F08** | 6 | side length across the y-axis → distance left after the first side (d - side) → move that far down the next side → y-coordinate | F09 (same chain; either may be the one slotted) |

**That is 2 mechanisms: g5 1, g6 1, g7 0, g8 0.** With the pool's 6 (all grade 6-7), MAP Math would hold 8 Number
Systems items, 7 short of the 15 a sixth form needs, and grade 8 is still empty.

If the coordinator accepts BORDERLINE chains to fill slots, the least-shared option is:

| grade | candidate | not with | caveat |
|---|---|---|---|
| 8 | F11 (classify, then sum the rationals) | F12 | both halves exist (MM4-N35; C17/R25). Prefer it to F12, whose back half is the family-K rank-and-range chain (B7-D34, MM4-N19, R17). |

With F11 the set reaches **3: g5 1, g6 1, g8 1**, with F11 slotted as BORDERLINE, not NEW. Do not slot F13 (near
REPEAT, fenced exponent cluster, and the ask shape of the F06 repeat). Do not slot any REPEAT (F01, F02, F03, F06, F07);
three of them repeat live ISEE/SSAT/SAT/ACT rows exactly. **Grade 5 has one usable chain (F04, or F05 in its place).**
Every other grade-5 candidate is a live probability or PSDA item, or a MAP Measurement item.

**Not checked here:** FORM, K4, HUB, the sign rule and the bounds. They were checked before this round. They decide
whether a NEW chain can be written, not whether it is new.
