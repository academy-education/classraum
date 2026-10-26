# map-v2 Math batch 4, 2026-10-26: pre-registration (NUMBER SYSTEMS + STATISTICS)

Written **before any item exists**. Batch 3's prereg (`MAP-MATH-V2-B3.prereg.md`, inheriting batches 2 and 1)
governs everything not changed here, **including fixed key rank per slot, RANK/HUB in math-check, and C-prime**.
Every change is listed under **Changes from batch 3**. Nothing here changes after an item is seen.

**Not final until its tool exists.** `map-math-v2.mjs` needs a `--batch b4` entry: two areas (N, D) with the authors
below, slots `map-v2-work/math-b4/slots.json`, ids `MB4-`, WORK = `scratchpad/map-math-v2-b4-work`, authored =
`scratchpad/map-v2-math-b4-work`, results `scripts/study-bank/map-math-v2-b4/<num|data>/`, math-check args `--slots
.../math-b4/slots.json --prior scratchpad/map-v2-math-work/dump-b4/prior-math.json --families isee,ssat,map`,
earlier-items file `map-v2-work/math-b4/EXCLUSIONS-map-num-stat-b4.txt` (R11), the seeds below, cohorts
`map-math-v2-b4-num` and `map-math-v2-b4-data`, C-prime on, oo parts <= 60; `--selftest` re-run with b1-b3 still
reproducing byte for byte. Committed with that tool and its selftest output, before any reviewer output.

## Inputs

5 Claude authors, `scratchpad/map-v2-math-b4-work/<author>/items.json`, brief `map-v2-work/math-b4/BRIEF.md`, slots
`map-v2-math-b4-slots-2026-10-26`. Each area is its own batch.

| area | author | grade(s) | slots | key rank 1/2/3/4 | tiers low/mid/high |
|---|---|---|---|---|---|
| N | N5 | 5 | 9 | 2/2/2/3 | 2/4/3 |
| N | N6 | 6 | 5 | 2/1/1/1 | 1/2/2 |
| N | N7 | 7 | 5 | 1/1/2/1 | 0/3/2 |
| N | N8 | 8 | 5 | 1/2/1/1 | 1/2/2 |
| **N** | | | **24** | **6/6/6/6** (end 12 = 50%) | 4/11/9 |
| D | D | 5 x2, 6 x4, 7 x3, 8 x3 | **12** | **3/3/3/3** (end 6 = 50%) | 2/6/4 |

math-check (unchanged since batch 3) refuses RANK and HUB on rows with `rank`; it reads this slot table (tested
2026-10-26: a copy of live MV2-N7-19 in an MB4 rank-1 slot passes RANK and fails the near-duplicate checks; in a
rank-4 slot it also fails RANK).

## Sizing, stated before any item exists

Need: Number Systems **+4**, Statistics **+1** live for form 5; sized for about +8 and +4.

| area | yields used | kept | end share | live after C-prime |
|---|---|---|---|---|
| N (24) | batch 1 N: ends 45%, interior 63% | 13.0 | 42% | 13.0 |
| N | middle case: ends 30%, interior 45% | 9.0 | 40% | 9.0 |
| N | batch 2 N core: ends 1/8, interior 1/5 | 3.9 | 38% | **3.8 (short of +4)** |
| D (12) | batch 1 D: ends 44%, interior 74% | 7.1 | 37% | 6.6 |
| D | batch 2 D: 36% flat | 4.3 | 50% | 4.3 |

Number Systems is sized against its batch-1 rate, not its batch-2 rate, because batch 2's N slots sat mostly in the
clusters this brief removes (rounded asks, scientific notation, a single quotient, signed chains already live,
an averaged signed quotient: 8 of its 9 authored N items). If batch 2's rate recurs, this batch misses N's +4 and a fifth Number Systems batch is
needed; that is the risk named in advance, not a reason to change any bar afterwards.

## Stages and seeds

As batch 3, run per area.

| stage | seed |
|---|---|
| 0b screen pass 1 (both areas, one packet of <= 40) | order 20261601, deal 20261602 |
| 0d screen pass 2 | order 20261603, deal 20261604 |
| 0e freeze | N 20261612, D 20261614 |
| 1 options-only | N 20261622, D 20261624 |
| 2 with-source (+ part number) | N 20261640, D 20261660 |
| C-prime deferral draw | N 20261672, D 20261674 |

Fresh subagents only (no reviewer from batches 1-3). Claude only.

## Bars (unchanged from batch 3)

**A. Options-only** per area, 1:1 live ISEE control matched by area and tier (low -> `easy`, mid/high -> `medium`):
hold if candidate - control > +10.0; unanimity hold if > +15.0; not measured (held) above a 90.0% control hit rate or
85.0% control unanimity. Pool (2026-10-24 read): num/easy 25, num/medium 66, data/easy 14, data/medium 49 against a
maximum need of N 4 low / 20 mid-high and D 2 / 10: covered. Control drawn fresh by this batch's seed.
**B. With-source graders:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, grade fit recorded; R11 against every earlier
MAP item in the area (batches 1 and 2 including withdrawn, dropped, deferred items; batch 3 was Geometry).
**C and C-prime:** unchanged. **Verdict per area:** PASS iff A passes, C passes on the inserted set, >= 1 inserted.

## Changes from batch 3

1. **Two areas, five authors, 36 slots** (above). Reason: form 5 is short only in N and D (REGISTER 2026-10-26).
2. **Equal ranks in both areas** (N 6/6/6/6, D 3/3/3/3), decided from the batch-1/2 solver picks in these two areas
   before any batch-4 item exists: N b1 picks by rank 3/61/42/8; D b1 5/68/59/6; D b2 0/19/14/0, where three rank-2
   keys produced 7 of 9 candidate hits. Same pattern as Geometry; same design.
3. **Number Systems slots avoid five clusters** that could not meet FORM and K4 with real errors in batches 1-2 (a
   single quotient as the answer, rounded-value asks, scientific-notation operations, a single root or power as an
   end key, .5 x .5 decimal products) and the signed add/subtract chains already live. This is a slot-placement
   choice, recorded so H1 can test it. FORM and K4 are unchanged.
4. **Duplicate corpus `dump-b4`** = dump-b3 + all 30 batch-3 items (15 live, 1 deferred, 7 dropped, 7 withdrawn), and
   an N + D exclusions file (every earlier MAP item in the two areas, batch 2 with outcomes).

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, Number Systems design.** Batch 1 N kept 51%, batch 2 core N 2/13 slots. Prediction: N keeps >= 40% of slots;
  EMPTY + FORM/K4 withdrawals <= 4 of 24. Each withdrawal is tagged FORM, K4, K1, one-sided, template or other.
- **H2, rank.** Frozen key-rank histograms per area; prediction: rank-2 share <= 25% in each, and both areas at or
  below their control (as Geometry b3).
- **H3, templates.** Batch 2 lost 5 of 7 Statistics drops and 4 of 6 Operations drops to R11. Prediction: <= 1 R11
  drop per area.

## What can't be learned here

No grade or tier label is validated by response data. Three samples of one model are not three solvers. The rank
pattern is from one model's picks on earlier batches; the N cluster findings come from reading withdrawal reasons,
which are the authors' and screeners' accounts, not a controlled comparison. With N at n <= 24 and D at n <= 12, one
area's options-only margin moves several points per item.
