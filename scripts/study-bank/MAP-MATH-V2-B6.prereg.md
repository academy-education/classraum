# map-v2 Math batch 6, 2026-10-29: pre-registration (OPERATIONS + STATISTICS, 6 items)

Batch 5's prereg (`MAP-MATH-V2-B5.prereg.md`, inheriting batches 1-4) governs everything not changed here: fixed key
rank per slot, RANK/HUB/FORM/SLIP and the construction checks in `math-check.mjs`, the screen and its one return, the
options-only bar, the with-source graders (R1-R11, EXT-1, F 2-of-3), C and C-prime. Changes are listed below.

**Written after the items, not before them (deviation).** Every earlier MAP maths prereg was committed before any item
existed. This batch was authored in one session by a single Claude author (the coordinator's fork) and checked with
`math-check.mjs` before this file was written. The bars below are copied from batch 5 unchanged and none was chosen
after seeing a screen, solver or grader output: no reviewer has seen these items. Committed with the tool and slots,
before any screen packet is handed to a screener.

## Why this batch, and why it is small

MAP maths is at 5 complete forms (218 live: Operations 55, Number Systems 51, Geometry 57, Statistics 55; 10 per area
per form). The owner asked for more questions, weighted to the thinnest area. Two findings shaped the batch:

1. **Number Systems (the binding area) was not attempted.** Batch 5's lesson is that a Number Systems batch needs its
   mechanisms vetted chain by chain by an independent checker BEFORE authors write (R11 took 6 of 10 drops in batch 4;
   the simple chain space is saturated across ~350 earlier items). A single in-session author cannot be that checker.
   The next Number Systems batch must start from a checker round, as batch 5 did.
2. **Geometry, and Operations systems, are saturated against the live ISEE/SSAT banks.** Five candidates were written
   and dropped before assembly by `math-check`'s near-duplicate refusal, each a method match to a live item, as the
   `isee-math-bank-saturated` lesson predicts: exterior angle (live ISEE s15), coordinate distance (live SSAT s13 and
   MAP pilot MM5P-N05), triangle angle expressions (MAP MV2-G78-03, ISEE s4, SSAT s15), all-quadrant rectangle
   perimeter (SSAT v1), ticket system (ISEE s4). Kept for the record in
   `scratchpad/map-v2-math-b6-work/_dropped-pre-assembly/`. Probability and percent-change items cleared the same check.

## Inputs

| slot | author | grade | tier | key rank | mechanism |
|---|---|---|---|---|---|
| MB6-O7-01 | O7 | 7 | high | 2 | 60% markup on a cost, then 25% off the marked-up price |
| MB6-O8-01 | O8 | 8 | mid | 3 | fixed fee of a linear cost from two (hours, cost) pairs |
| MB6-D6-01 | D6 | 6 | mid | 3 | interquartile range of an ordered list of 11 values |
| MB6-D7-01 | D7 | 7 | mid | 2 | probability both tiles are blue, two draws without replacement |
| MB6-D7-02 | D7 | 7 | high | 2 | probability of at least one of two independent events |
| MB6-D7-03 | D7 | 7 | mid | 2 | probability of a vowel letter and an even digit |

All six print `PART OK` in `math-check.mjs` with `--slots map-v2-work/math-b6/slots.json --prior
dump-b6/prior-math.json --families isee,ssat,map` (sandbox key and every distractor recomputed; near-duplicate against
live ISEE, SSAT and every earlier MAP item).

## Named risk: Statistics key ranks 2 / 2 / 2 / 3

Ranks follow from each mechanism's natural error set (FORM, LONE, HUB, RUN, PAIR and the screen), not from a free
choice, and three of the four Statistics keys sit at rank 2, the second-smallest value. Batch 2 Geometry was held on
options-only when solvers took rank 2 (39 of 54 picks). Expected position-only hit rate, using batch 1's Statistics
solver picks by rank if recorded, else batch 1 Number Systems' 0.03 / 0.54 / 0.37 / 0.07: with ranks 2, 2, 2, 3 a
position-only solver hits about **50%**. This is the most likely way this batch fails bar A, and it is stated now.

## Stages and seeds

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20261801, deal 20261802 |
| 0d screen pass 2 | order 20261803, deal 20261804 |
| 0e freeze | O 20261811, D 20261814 |
| 1 options-only | O 20261821, D 20261824 |
| 2 with-source (+ part number) | O 20261830, D 20261860 |
| C-prime deferral draw | O 20261871, D 20261874 |

Fresh subagents only (no reviewer from batches 1-5, and not the author's session). Claude only.

## Bars (unchanged from batch 5)

**A. Options-only:** 1:1 live ISEE control matched by area and tier; hold if candidate - control > +10.0; unanimity
hold if > +15.0; not measured (held) above a 90.0% control hit rate or 85.0% control unanimity. With n = 2 (Operations)
and n = 4 (Statistics) the margin moves 50 and 25 points per item: each area's A result is recorded as what it is.
**B. With-source graders:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, grade fit recorded; R11 against every earlier
MAP maths item listed in `map-v2-work/math-b6/EXCLUSIONS-map-b6.txt` (688 ids from dump-b6).
**C and C-prime:** no measurement below 10 items (unchanged). **Verdict per area:** PASS iff A passes and >= 1 item is
inserted.

## Changes from batch 5

1. Areas Operations and Statistics, not Number Systems (reason above).
2. Single in-session author; no independent mechanism checker; items written before this file (deviation above).
3. R11 corpus = every earlier MAP maths item in dump-b6 (`earlier: 'dump-b6'` in `map-math-v2.mjs`).
4. Duplicate corpus `dump-b6` (built 2026-10-26 23:47, already on disk).

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, R11.** Prediction: 0 R11 drops (each mechanism probed against prior-O / prior-D before writing).
- **H2, screen.** Prediction: <= 2 of 6 fail screen pass 1 (MB6-D7-03 declares a possible second magnitude strike).
- **H3, position.** Statistics options-only hit rate near the 50% position-only expectation above.
