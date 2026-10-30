# map-v2 Math batch 10, 2026-10-30: pre-registration (OPERATIONS + GEOMETRY + STATISTICS, 15 items)

Batch 6's prereg (`MAP-MATH-V2-B6.prereg.md`, inheriting batches 1-5) governs everything not changed here: fixed key
rank per slot, RANK/HUB/FORM/SLIP and the construction checks in `math-check.mjs`, the screen and its one return, the
options-only bar, the with-source graders (R1-R11, EXT-1, F 2-of-3), C and C-prime. Changes are listed below.

**Written after the items, not before them (deviation, as in batch 6).** All 15 items were authored in one session by
a single Claude author (a coordinator's subagent) and checked with `math-check.mjs` before this file was written. The
bars below are copied from batch 6 unchanged, and none was chosen after seeing a screen, solver or grader output: no
reviewer has seen these items. This file is written before the screen pass-1 packet is rendered.

## Why this batch

MAP maths form 6 (map-form-depth f6) needs Operations 5, Geometry 3 and Statistics 5 more live items (live 5/10, 7/10,
5/10). Batch 6 (2 Operations + 4 Statistics) was graded and kept 0 of 5: R11 against EARLIER MAP items killed three
(markup-then-discount = MB2-O7R-06; "one or both" via complement = withdrawn MB4-D-08; product of two independent
probabilities = MV2-D7-10) and the IQR item was non-exclusive (quartile convention not stated). So this batch does not
count on batch 6 and was built to the coordinator's binding note for batch 10:

1. **Every idea's chain was checked against every earlier MAP maths item in all areas** (live, staged, withdrawn,
   dropped, first-written; batches g58 v1-v5 and v2 b1-b8) BEFORE writing, with
   `scratchpad/map-v2-math-b10-work/tools/mapgrep.mjs` over `dump-b10` (1,162 MAP rows, 708 ids). Ideas dropped on
   that check before any item was written: percent-then-fraction-of-the-rest (= MMG-N04), two rates' time difference
   (= MMG-O14, MV2-N56-17), least weeks under a savings target (~ MV2-O78-07), balance scale ax + m = bx + n
   (= MV2-O78-17/21, story ignored), triangle angles in a ratio (~ MB6-G8-03, MV2-G78-03), ratio transfer to equalize
   (~ MM2-O10), missing value from a median (= MV2-D6-06), expected count of a two-cube sum (~ MV2-D7-15 + MMG-D10),
   cube from surface area (reverse of MB3-G6-02), unit-conversion division (= MV2 board cut into 8-inch pieces),
   subgroup percents to a count (~ MMG-D15), residual (= MB2-D8-03), mean minus mode (= MB4-D-05). Live ISEE/SSAT/ACT
   exact chains also dropped on the keyword probe (`mf30-kw.mjs`): left-to-right order of operations, third-side
   count, painted walls, cut-corner box, ages, removed-value mean, same-percent growth.
2. **Conventions are stated in the stem** wherever a statistic has competing ones. No item in this batch uses
   quartiles, a median of an even count or rounding of a statistic; the one rounding item (G7-01) states "least number
   of bags", and D6-02 asks only for a mean.

## Inputs (15 items; all `PART OK`)

| slot | grade | tier | key rank | chain | nearest earlier MAP item (why it is not the same chain) |
|---|---|---|---|---|---|
| MB10-O6-01 | 6 | mid | 2 | change in F = (9/5)C + 32 over a C change | MMG-O05 evaluates a formula at one input |
| MB10-O6-02 | 6 | high | 2 | limiting ingredient under a 2 : 4 recipe | MM2-O10 adds one part until two parts are equal |
| MB10-O6-03 | 6 | mid | 3 | buy-2-get-1-free cost with leftovers | none (no deal-grouping item) |
| MB10-O7-01 | 7 | high | 2 | time saved when a rate rises 80% | MMG-O14 compares two GIVEN rates |
| MB10-O7-02 | 7 | high | 3 | original mixture amount, 30% -> 40% after adding 30 L | MM3-O13 percent of a part with a fixed total |
| MB10-O8-01 | 8 | high | 3 | when one linear account is twice another | MV2-O56-06 doubles once; MM2-O13 fixed time |
| MB10-O8-02 | 8 | mid | 2 | average rate of change of A = s^2 | MM2-O16/O20 linear rates of change |
| MB10-G6-01 | 6 | mid | 2 | parallelogram (height, not slant) minus a square | MM2-G06 rectangle minus triangles; MM3-G11 area alone |
| MB10-G7-01 | 7 | high | 3 | volume with inch-to-foot depth / bag size, round up | MM2-G01 one converted volume; MMG-G09 laps round up |
| MB10-G8-02 | 8 | mid | 3 | fifth pentagon angle from the 540-degree sum | MB6-G8-01 (dropped) triangle 180 minus two angles |
| MB10-D6-01 | 6 | mid | 3 | weighted mean, test counted twice | no weighted mean in MAP |
| MB10-D6-02 | 6 | high | 2 | new mean after the greatest value rises 18 | MV2-D6-03 removal changes the MEDIAN |
| MB10-D7-01 | 7 | mid | 3 | outfits minus one forbidden shirt-pants pair | none (MAP counts no outcomes) |
| MB10-D7-02 | 7 | high | 2 | exactly 2 of 4 correct by guessing (6/16) | MB4-D-08 / MB6-D7-02 complement items |
| MB10-D7-03 | 7 | mid | 3 | multiple of 7 among tickets 10-99 (13/90) | MV2-D7-08 letters on cards |

Borderline R11 cases, named now so the graders' verdicts can be compared with them: **MB10-G8-02** (angle sum minus
known angles, as in the dropped MB6-G8-01, here with the polygon-sum step added), **MB10-G7-01** (unit-converted
volume, as in MM2-G01, plus division and round-up), **MB10-G6-01** (area minus a cut-out, as in MM2-G06, on a
parallelogram with a slant-side distractor).

All 15 print `PART OK` in `math-check.mjs` with `--slots map-v2-work/math-b10/slots.json --prior
dump-b10/prior-math.json --families isee,ssat,map` (sandbox key and every distractor recomputed; near-duplicate
against live ISEE, SSAT, MAP and every earlier MAP item). Assembled sha `49fabf837fbe2f2b`.

**Dropped after writing (recorded, not reworded):** MB10-G8-01 (side from DE parallel to BC) - math-check near-dup
FLAG j = 0.786 against live ISEE 4929c153 (isee-math-s3), the same chain; MB10-G8-03 (two sides minus the diagonal) -
options 20 and 53 sum to the printed 28 + 45 (pair tell) and "saving < shorter side" strikes 53 and 126 together.
Not written after a failed search: a green-marbles-from-a-probability item ( every natural set either struck two
by the 1/2 bound or tripped PAIR/DSUM), a drain-to-empty item (key - natural error = printed time, PAIR), a dilution
item (no 4-option set), a capture-recapture item (no natural above-key error without PAIR).

**Shortfall against the brief, stated now:** asked for 8 / 5 / 6 written, delivered 7 Operations, 3 Geometry,
5 Statistics. Geometry 3 meets its form-6 gap (3) only if all three survive; Operations 7 against a gap of 5 and
Statistics 5 against a gap of 5 leave 2 and 0 items of margin.

## Named risks

- **Position.** Key ranks: Operations 2,2,3,2,3,3,2; Geometry 2,3,3; Statistics 3,2,3,2,3. With batch 1 Number
  Systems' solver picks by rank (0.03 / 0.54 / 0.37 / 0.07), a position-only solver hits about **46.7%** (O), **42.7%**
  (G) and **43.8%** (D).
- **Screen bounds the author declared but could not rule out** (each recorded in the item's cheap_bound_check):
  D6-01 (doubling the top score lifts the grade above the plain mean: strikes 79.2 and 81.5 once the plain mean is
  known), D6-02 (mean rises, by less than 18: strikes 23 and 41 for a strong student), O8-02 (average rate lies
  between the end slopes 18 and 32: strikes 49 and 175 if known), O6-02 (whole batches give multiples of 6).
- **Form.** G7-01 has adjacent options 28 / 29 (round-down vs round-up); O6-01 and D6-01 mix whole and one-decimal
  options; FORM is advisory outside Number Systems.

## Stages and seeds

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20261901, deal 20261902 |
| 0d screen pass 2 | order 20261903, deal 20261904 |
| 0e freeze | O 20261911, G 20261913, D 20261914 |
| 1 options-only | O 20261921, G 20261923, D 20261924 |
| 2 with-source (+ part number) | O 20261930, G 20261945, D 20261960 |
| C-prime deferral draw | O 20261971, G 20261973, D 20261974 |

Fresh subagents only (no reviewer from batches 1-9, and not the author's session). Claude only.

## Bars (unchanged from batch 6)

**A. Options-only:** 1:1 live ISEE control matched by area and tier; hold if candidate - control > +10.0; unanimity
hold if > +15.0; not measured (held) above a 90.0% control hit rate or 85.0% control unanimity. With n = 7 / 3 / 5 the
margin moves about 14, 33 and 20 points per item: each area's A result is recorded as what it is.
**B. With-source graders:** R1-R11, EXT-1, off-blueprint hold, F 2-of-3, grade fit recorded; R11 against every earlier
MAP maths item listed in `map-v2-work/math-b10/EXCLUSIONS-map-b10.txt` (708 ids from dump-b10, all areas).
**C and C-prime:** no measurement below 10 items (unchanged). **Verdict per area:** PASS iff A passes and >= 1 item is
inserted.

## Changes from batch 6

1. Areas Operations, Geometry and Statistics.
2. Single in-session author; items written before this file (deviation above).
3. R11 corpus = every earlier MAP maths item in dump-b10 (`earlier: 'dump-b10'` in `map-math-v2.mjs`): dump-b6 plus
   batch 6 (assembled and dropped pre-assembly), batch 7 and batch 8 items.
4. Duplicate corpus `dump-b10` (built 2026-10-30 by `scratchpad/map-math-v2-b10-work/tools/build-dump-b10.mjs`:
   live-maths re-pulled read-only with `mf30-dump.mjs`, 4,204 rows incl. 218 live MAP; prior 2,537).

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, R11.** Prediction: <= 2 R11 drops, from the three borderline items named above.
- **H2, screen.** Prediction: <= 4 of 15 fail screen pass 1 (the four declared-bound items above).
- **H3, position.** Options-only hit rates near the position-only expectations above.
