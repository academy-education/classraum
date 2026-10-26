# map-v2 Math batch 5, 2026-10-26: pre-registration (NUMBER SYSTEMS ONLY)

Written **before any item exists**. Batch 4's prereg (`MAP-MATH-V2-B4.prereg.md`, inheriting batches 1-3) governs
everything not changed here, **including fixed key rank per slot, RANK/HUB in math-check, and C-prime**. Every change
is listed under **Changes from batch 4**. Nothing here changes after an item is seen.

**Not final until its tool exists.** `map-math-v2.mjs` needs a `--batch b5` entry: one area (N), authors N5 N6 N7 N8,
slots `map-v2-work/math-b5/slots.json`, ids `MB5-`, WORK = `scratchpad/map-math-v2-b5-work`, authored =
`scratchpad/map-v2-math-b5-work`, results `scripts/study-bank/map-math-v2-b5/num/`, math-check args `--slots
.../math-b5/slots.json --prior scratchpad/map-v2-math-work/dump-b5/prior-math.json --families isee,ssat,map`,
earlier-items file `map-v2-work/math-b5/EXCLUSIONS-map-num-b5.txt` plus `earlier-N-chains.json` (R11), the seeds below,
cohort `map-math-v2-b5-num`, C-prime on, one oo part; `--selftest` re-run with b1-b4 reproducing byte for byte.
Committed with that tool and its selftest output, before any reviewer output.

## Inputs

| slot | author | grade | tier | key rank | class | mechanism (checker id) |
|---|---|---|---|---|---|---|
| MB5-N5-01 | N5 | 5 | mid | 4 | DIVISOR | missing factor by halving one factor and doubling the other (R30) |
| MB5-N6-01 | N6 | 6 | mid | 3 | - | sum of the two numbers with the greatest absolute values (C06) |
| MB5-N6-02 | N6 | 6 | mid | 2 | - | distances to the axes + quadrant -> x +/- y (R06) |
| MB5-N6-03 | N6 | 6 | high | 3 | - | GCF + LCM from prime factorizations (C25) |
| MB5-N7-01 | N7 | 7 | high | 1 | SIGNED | product of four signed factors, sign by counting negatives (C11) |
| MB5-N7-02 | N7 | 7 | low | 3 | - | a number minus its opposite, then + a printed decimal (R08) |
| MB5-N7-03 | N7 | 7 | mid | 3 | - | missing divisor after a signed decimal quotient (R22) |
| MB5-N8-01 | N8 | 8 | high | 2 | - | x^-2 = 1/n^2 with x negative, then x^3 + kx (R18) |

**8 slots, one per mechanism**: the independent checker's final set (`CHAIN-CHECK.md`, `CHAIN-CHECK-R2.md`) was C06,
C11, R06, R08, R18, R27, R30 plus R22 and C25. **R27 (an LCM of two fractional lap times) is dropped**: a search over
its natural errors (product of the times, LCM of the numerators, the renamed numerators' LCM not divided back, the sum,
LCM(numerators)/LCM(denominators), GCF/GCF) found no option set that meets FORM at any rank, because the errors come
out in different denominators and decimal places from the key. With R27 gone, C25 no longer shares an LCM step with
another slot, so it is kept.

math-check refuses RANK and HUB on these rows (tested 2026-10-26: a copy of live MV2-N7-19 in MB5-N7-01, whose rank and
tier match, fails only the near-duplicate checks; in MB5-N7-03 it also fails tier and RANK).

## Rank choice, stated before any item exists

The ranks are **1 / 2 / 4 / 1**, not equal. A search over each mechanism's natural error sets, against FORM, LONE, HUB,
RUN, PAIR (and a K4 proxy for R08), found:

| mechanism | ranks with a passing option set | why not the others |
|---|---|---|
| C11 | 1, 2, 3, 4 | - |
| R30 | 2, 3, 4 | rank 1: FORM |
| C06 | 1-4, but ranks 1 and 4 are one-sided by construction | the key is then the most extreme pair sum, so every other pair lands on one side |
| R06 | 1, 2, 3 | ends: the four answers are +/-a +/-b, so an end key leaves every sign error on one side |
| C25 | 2, 3 (rank 1 only on a degenerate pair) | FORM |
| R08 | 2, 3 | ends: FORM/HUB |
| R18 | 1, 2 (rank 1 one-sided) | FORM |
| R22 | 3 | the rest: FORM |

So two end keys are possible without a one-sided set (C11 at rank 1, R30 at rank 4), and R22 must sit at rank 3. The
remaining interior slots were split to keep the second-smallest rank, which the solvers favour, at 2 of 8.

**Expected position-only hit rate**, from batch 1's Number Systems solver picks by rank (3 / 61 / 42 / 8 of 114 =
0.03 / 0.54 / 0.37 / 0.07): with ranks 1 / 2 / 4 / 1 a solver who only follows its position prior hits **33%**
(uniform ranks would give 25%). The live controls measured 30-36% in Number Systems (batch 1 31.6%, batch 4 36.4%), so
position alone should not carry the candidates past the control by much. **This is the named risk of this batch**:
it is the first since batch 2 with unequal ranks, forced by FORM.

**C and C-prime with 8 slots.** Below 10 scorable items the extremity bar is no measurement, recorded, not a hold
(batch 1 prereg, unchanged), so with at most 8 items C cannot hold the area and C-prime cannot fire. Both are computed
and recorded.

## Sizing, stated before any item exists

Need **+3** live for form 5 (47 live, 50 needed). Batch 4's Number Systems funnel was 24 slots -> 15 authored -> 11
frozen -> 1 kept; 6 of its 10 drops were R11. If the checker's vetting removes R11 and nothing else changes: authored
~90% of 8 (the EMPTY slots in batch 4 were decimal roots, removed here, and every slot was checked for a feasible
option set), frozen 73% (batch 4), kept 64% of frozen (batch 4's non-R11 rate, 4 of 11) -> **about 3.4 live**. At
batch 1's Number Systems rate (51%) -> about 4.1. **This batch may miss +3**; if it does, the next Number Systems batch
starts from a new checker round, and no bar here is changed afterwards.

## Stages and seeds

As batch 4, one area, one screen packet, one grade part, one options-only part.

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20261701, deal 20261702 |
| 0d screen pass 2 | order 20261703, deal 20261704 |
| 0e freeze | 20261712 |
| 1 options-only | 20261722 |
| 2 with-source (+ part number) | 20261740 |
| C-prime deferral draw | 20261772 |

Fresh subagents only (no reviewer from batches 1-4). Claude only.

## Bars (unchanged from batch 4)

**A. Options-only:** 1:1 live ISEE Number Systems control matched by tier (low -> `easy`, mid/high -> `medium`); hold
if candidate - control > +10.0; unanimity hold if > +15.0; not measured (held) above a 90.0% control hit rate or 85.0%
control unanimity. Pool (2026-10-24 read): num/easy 25, num/medium 66 against a maximum need of 1 low and 7 mid/high.
**With n <= 8 the margin moves 12.5 points per item and 4.2 points per pick**: +10.0 is exceeded by 3 more correct picks
than the control out of 24. Stated so that a hold or a pass on 8 items is read as what it is.
**B. With-source graders:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, grade fit recorded; R11 against every earlier
MAP Number Systems item (the 285 entries of `earlier-N-chains.json` plus batch 4's items in `dump-b5`).
**C and C-prime:** unchanged (no measurement below 10, above). **Verdict:** PASS iff A passes and >= 1 item is inserted.

## Changes from batch 4

1. **One area, 8 slots, one per mechanism**, each mechanism judged NEW and mutually distinct by an independent checker
   before any slot was written. Reason: batch 4 lost 6 of 10 Number Systems drops to R11 after the brief-writer's own
   chain check missed exact repeats.
2. **No MECHANISM SWAP**: an author who cannot write the slot's mechanism leaves it EMPTY. Reason: a swap would bring
   an unchecked chain back in.
3. **Ranks 1 / 2 / 4 / 1** chosen from a feasibility search (above), not equal ranks.
4. **R08 carries a follow-up "+ c"** in its ask: without it every natural error is an exact multiple of the key
   (HUB). Recorded so a grader who sees the extra step knows why it is there.
5. **Duplicate corpus `dump-b5`** = dump-b4 + all 26 batch-4 items (7 live, 12 dropped, 7 withdrawn) and 2 first-written
   versions; exclusions file per slot from the checker's tables.

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, R11.** Prediction: 0 R11 drops (batch 4: 6 of 11 frozen).
- **H2, EMPTY.** Prediction: <= 1 EMPTY slot (batch 4: 9 of 24), since every slot was checked for a feasible option set.
- **H3, position.** The candidates' hit rate and the share of solver picks at rank 2, against the 33% position-only
  expectation above.

## What can't be learned here

With 8 items, no rate here is more than an anecdote; the options-only margin in particular moves 12.5 points per item.
The feasibility search modelled the errors I could name; an author may find others, and a screener may find a free
elimination the search could not see. Three samples of one model are not three solvers.
