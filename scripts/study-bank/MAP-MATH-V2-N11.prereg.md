# map-v2 Math gate n11, 2026-10-30: pre-registration (NUMBER SYSTEMS ONLY, 7 items from the b11 stage-A selection)

n789's prereg (`MAP-MATH-V2-N789.prereg.md`) governs everything not changed here. Through it, batch 6's and batch
5's preregs govern too. That covers fixed key rank per slot, RANK/HUB/FORM/SLIP/BOUND-SCREEN and the construction
checks in `math-check.mjs`, the screen and its one return, the options-only bar, the with-source graders (R1-R11,
EXT-1, F 2-of-3), C and C-prime. Every change is listed under **Changes from n789**. **No bar changes.**

**Written after the items, not before them (deviation, as n789 and batch 6).** The seven items were written, checked
(`math-check.mjs` 21 of 21 PART OK in stage A) and screened in the authoring loop before this file existed. That
in-loop screen is described under **Stage A**, and its consequence for reading this gate is stated there. The bars
below are copied from n789 unchanged. No bar was chosen after seeing any output of this gate: no screener, solver or
grader of this gate has seen these items. This file exists before any screen packet is rendered.

## Stage A: how the seven were chosen (the in-loop method)

This is the method the REGISTER adopted after n789 and b10 (entries of 2026-10-30): key ranks dealt across 1-4 at
authoring, generator refusals for the central-key tell (CENT a-e in `scratchpad/map-v2-math-b11-work/README.md`), and
a cold screen of the CANDIDATE option sets inside the authoring loop, so that only screen-clean candidates are written
up.

- 21 candidates: 7 mechanisms x 3 alternatives (`scratchpad/map-v2-math-b11-work/candidates.json`, sha256
  `ca181e2fdca88c05…`). 21 of 21 PART OK against dump-b6.
- In-loop instrument: 1 cold screener (`candidates-screen.json`, `b8a50149c468230f…`) and 3 options-only samples
  (`candidates-oo.solver-{a,b,c}.json`: `63b6acdc1632e1f3…`, `1554f3eddffdbbe5…`, `d05766be210cd676…`). No live
  control was run with the stage-A options-only.
- Overall stage-A options-only: 23/63 = 36.5% (n789's frozen set: 61.9%; letter chance 25%).
- **The seven selected scored 2 of 21 picks = 9.5% on that same instrument** (F04 2, every other 0).

The selection rule and its named bias, quoted from `SELECTION.md` (sha256 `cbbd3165755a0593…`):

> Rule applied: per mechanism, take the candidate with the fewest options-only hits, then the fewest free strikes;
> ties go to the rank that spreads the batch's key ranks.

| mechanism | picked | oo hits /3 | struck | key rank |
|---|---|---|---|---|
| F11 | MB11C-F11-c | 0 | 1 | 3 |
| D33 | MB11C-D33-a | 0 | 0 | 2 |
| F08 | MB11C-F08-b | 0 | 0 | 3 |
| F04 | MB11C-F04-c | 2 | 0 | 2 (all three F04 candidates scored 2-3; weakest pick, named risk) |
| E12 | MB11C-E12-a | 0 | 0 | 1 |
| E16 | MB11C-E16-b | 0 | 1 | 2 |
| E06 | MB11C-E06-a | 0 | 1 | 1 |

> **Named bias:** selecting on the same instrument that the formal gate re-runs favours candidates that scored low by
> chance (3 correlated samples of one model). The formal gate's options-only must use FRESH solvers and its matched
> live control, and a margin near the bar should be read with this regression in mind. This is the method the owner
> approved: screen in the loop, then gate. It is not a re-decision of a finished batch.

What this means for reading the gate:

- **The formal options-only (stage 1) must use fresh solvers.** None of the three stage-A options-only samples, and
  not the stage-A screener, may solve, screen or grade here.
- The candidates were selected for a LOW stage-A hit rate (9.5%). On a re-measure they should regress upward toward
  the 21-candidate rate (36.5%) or above, because the three stage-A samples are one model sampled three times
  (CLAUDE.md, "The three blind solvers are one solver sampled three times"). A stage-1 rate under 9.5% is not
  expected, and a stage-1 rate near the stage-A one is not evidence that stage A measured anything.
- A pass by a small margin (within one item, 14.3 points, of +10.0) is read as within the regression the selection
  built in. It is still a pass: the bar is unchanged.
- The in-loop screener and the formal screen are the same kind of instrument. Stage A screened each candidate once.
  The formal screen pass 1 is a fresh cold screener on the seven, and its return round runs as n789's did.

## Tool

`map-math-v2.mjs --batch n11` reads:

- one area, N.
- 7 slots in `map-v2-work/math-n11/slots.json` (sha256 `608f6bdae074c053…`), in four grade cells N5, N6, N7 and N8.
  Each row is copied from the stage-A `slots.json` with only `id` re-issued and `selected_from` added.
- ids MB11-N<g>-NN (`idPrefix: 'MB11'`).
- WORK = `scratchpad/map-math-v2-n11-work`.
- authored = `scratchpad/map-v2-math-n11-work/<cell>/items.json`. These are real files, not symlinks, because the id
  changes. Each item is the candidate verbatim, with `id` re-issued and `selected_from` = the candidate id.
- results in `scripts/study-bank/map-math-v2-n11/num/`.
- cohort `map-math-v2-n11-num`, with C-prime on and one options-only part.

| id | selected_from | frozen_from (held n789 predecessor) | grade | tier | key (rank) | mechanism |
|---|---|---|---|---|---|---|
| MB11-N5-01 | MB11C-F04-c | MB9-N5-01 | 5 | mid | 33.33 (2) | least running balance, decimal deposits and withdrawals |
| MB11-N6-01 | MB11C-F08-b | MB9-N6-01 | 6 | high | -3.85 (3) | clockwise walk around a coordinate rectangle: y after d units |
| MB11-N6-02 | MB11C-E06-a | MB8-N6-01 | 6 | mid | 6.5 (1) | number line folded so a lands on b: where c lands |
| MB11-N7-01 | MB11C-D33-a | MB7-N7-01 | 7 | mid | -5.25 (2) | calculator key "x(-3), then -3" pressed twice from -1.25 |
| MB11-N7-02 | MB11C-E12-a | MB8-N7-05 | 7 | mid | -2 3/7 (1) | signed magic square, two chained missing entries |
| MB11-N7-03 | MB11C-E16-b | MB8-N7-03 | 7 | high | 5/7 (2) | choose + or - before mixed numbers to land nearest 0 |
| MB11-N8-01 | MB11C-F11-c | MB9-N8-01 | 8 | mid | 17/18 (3) | classify rational/irrational, then sum the rationals |

Author files (sha256 at the time of writing): N5 `5cb6a5a3306fb5cb…`, N6 `53f45be4bbe02dcc…`, N7 `a15bc45ab58b52dc…`,
N8 `274aef5d3717d686…`.

All inputs are built by `map-v2-work/math-n11/build.mjs` from files already on disk, with no DB access and no model:

- **R11 corpus `dump-n11`** = `dump-b10/prior-math.json` (2,537 rows) plus every n789 and b10 item: as screened in
  pass 1, as revised, as frozen, and the withdrawn ones. That gives 2,568 rows (sha256 `cf7b82dcbddd41c0…`) and
  **726 distinct earlier MAP maths ids** = n789's 702 + **all 9 n789 items (7 frozen and held, 2 withdrawn:
  MB8-N7-01, MB8-N7-02)** + all 15 b10 items (10 frozen and held, 5 withdrawn). The b7/b8 first-written rows that
  n789 had to remove are back in. Graders get `map-v2-work/math-n11/EXCLUSIONS-map-n11.txt` (975 lines, every id in
  parentheses with its source, prompt and key; sha256 `36b6772bbfabae15…`).
- **math-check prior `dump-n11-check`** = dump-n11 minus every version of each candidate's own predecessor (its
  `frozen_from`; 12 rows of 7 ids, map in `map-v2-work/math-n11/predecessors.json`). That leaves 2,556 rows (sha256
  `4884ed98f4644d92…`). See deviation 2.
- No MB11C row is in either corpus, selected or not. The 14 unselected stage-A siblings are near-duplicates of the
  seven by construction (j up to 1.0), and math-check's prior scan does not skip them.

`--selftest` passes for n11 at 95/95, and 36/36 reverted rules each fail at least one case. b1-b6, n789 and b10
reproduce their pre-change selftest output byte for byte. The selftest adds six n11 checks, each break-tested (each
broken input makes its check FAIL):

| check | break-test |
|---|---|
| ids take MB11 and nothing else | idPrefix loosened to `MB11\d*` |
| no candidate, and no MB11/MB11C row, in the R11 set or the prior | an MB11C sibling row added to the prior |
| the R11 set and prior hold all 9 n789 items and all 15 b10 items | prior pointed at dump-n789; withdrawn MB8-N7-02 removed |
| all 4 author files present | authored pointed at an empty dir |
| every item and slot row carries `selected_from`, one per SELECTION.md pick | `selected_from` deleted from one item |
| the math-check prior = the R11 dump minus exactly each candidate's own `frozen_from` rows | prior pointed at the full dump-n11; one extra row (MB8-N7-01) removed |

Assemble (`--batch n11 assemble`): **7 of 7 PART OK** against dump-n11-check. Live near-dup denominators: 709 ISEE,
615 SSAT and 218 MAP rows (cached read), 0 flagged. Within-batch near-duplicates 0. No key value repeats. Advisory
read lines:

- MB11-N6-01's closest earlier MAP item is MB6-G6-01 at j = 0.47 (n789's MB9-N6-01 carried the same line at 0.50).
- MB11-N6-02 and MB11-N7-02 carry FAR, BOUND and STRUCT read lines (their keys are at rank 1).
- PAIR lines on MB11-N6-01, MB11-N6-02 and MB11-N7-01 (all three named in stage A).

## Deviations from n789

1. **The predecessors are re-authorings, not templates.** All seven items are re-authorings of the seven frozen and
   held n789 items (`frozen_from`), same slot mechanism, new numbers and new option sets. Against the full dump-n11,
   math-check prints PART FAIL on **all seven**: near-duplicate of the item's own predecessor at j = 0.86 (N5),
   0.81 (N6-01), 0.88 (N6-02), 0.84 (N7-01), 1.00 (N7-02), 1.00 (N7-03) and 0.88 (N8). Against dump-b10 alone, four
   still fail (N6-02, N7-01, N7-02, N7-03, on the b7/b8 first-written rows). Stage A used dump-b6, which holds
   neither, so stage A never saw this.
2. **The rule applied (n789's precedent, extended).** n789 removed its candidates' own first-written rows from the
   math-check prior, because the prior scan cannot tell "the same item" from "a template of an earlier item". This
   gate removes each candidate's own predecessor (all versions) from the **math-check prior only**. Nothing else is
   removed. The two withdrawn n789 items (E07 and E14, different mechanisms), every other n789 item and every b10
   item stay in the prior.
3. **R11 keeps all 726 ids, predecessors included.** In the EXCLUSIONS file each predecessor line is marked
   `[held predecessor of MB11-…]`. **R11 rule for graders:** a candidate repeating the chain of its OWN marked
   predecessor is not an R11 finding. The predecessor was never inserted or shown to a student, and it is replaced,
   not joined. A candidate repeating the chain of ANY other listed item, including another candidate's predecessor
   and the withdrawn n789 items, is an R11 template as before.

   **This is the one rule decision in this file, and it is open to the coordinator's veto before the grade stage.**
   It does not touch the screen or options-only bars. If it is vetoed, R11 against the predecessors drops every
   item, and this gate cannot insert anything.

## Inputs, batch level

- **Key ranks (dealt at authoring, slot-fixed): 1/2/3/4 = 2/3/2/0.** The two rank-1 keys are E06 and E12, and no key
  is at rank 4. The REGISTER asked for about 25% at each rank. Rank 4 was not reachable on any of the seven picks
  (README: F04's "least" stem bans extremes, F08's natural errors all move the walker down, D33 has no far
  distractor at rank 4, and E06's rank 4 died once the fold bounds were added).
  - Stage-A key-rank histogram over all 21 candidates: 2/10/8/1.
  - The selection moved it to 2/3/2/0. Rank-2 share 42.9%, interior share 71.4%.
- **Position-only expectation** (batch 1's Number Systems solver picks by rank, 0.03 / 0.54 / 0.37 / 0.07, as b5 and
  n789): (2 x 0.03 + 3 x 0.54 + 2 x 0.37 + 0 x 0.07) / 7 = **34.6%**. n789 was at 37.4% by the same formula.
- **Named way to fail bar A:** the solvers' n789 heuristic ("central value among the options; the distractors spread
  around the key") still picks the five interior keys if CENT did not actually move the key off the centre. Stage A
  solver a reported "central value" as its heuristic on about 9 of 21 candidates.
- **Key extremity (C).** 7 scorable of 7 (0 non-numeric). Two end keys (rank 1), so 2/7 = 28.6%. Below 10 scorable
  items this is **no measurement**: not a pass, not a fail, recorded, not a hold. C-prime cannot fire. The
  inserter's own gate (`key-extremity-gate.mjs`, MIN_N 10) also returns no measurement for any survivors-only set
  from this batch.
- **Options-only control availability (oo-pool, read-only):** live ISEE maths 709 rows; num/medium eligible 66,
  need 7. Every n11 tier (mid x5, high x2) maps to `medium`. No shortfall, no substitution.

## Math-check mixed-number bug: manual check of all seven (recorded)

`math-check.mjs` reads printed numbers with a regex that splits a mixed number. It reads "2 4/7" as 2, 4 and 7, so
its KEYPRINT check (an option equal to a number printed in the stem) can miss an option whose value equals a printed
mixed number. Stage A found it: a key equal to a printed magic sum went through. The stage-A generator refuses that
case, but math-check itself is not fixed. So a PART OK says nothing about it, and every item was checked by hand.

The check parsed each stem's numbers as values (a mixed number as one value, fractions as fractions), then compared
the absolute value of every option against the absolute value of every printed number. It was break-tested: a
synthetic option "-2 4/7" against the stem "that sum is -2 4/7" is caught, and so is "18/7" against the same.

| item | numbers printed in the stem (as values) | option equal to one |
|---|---|---|
| MB11-N5-01 | 46.33, 8.80, 9.60, 13.80, 11.20, 7.40 | none |
| MB11-N6-01 | -2.25, 1.5, 1.25, -8.5, 8.85 | none |
| MB11-N6-02 | -1.5, 10.5, 2.5 | none |
| MB11-N7-01 | -3, 3, -1.25 | none |
| MB11-N7-02 | 3 (3-by-3), **-2 4/7**, 1/7, -6/7, **-3 3/7**, **-1 6/7**, **-1 3/7** | none |
| MB11-N7-03 | **4 1/7**, **1 4/7**, **1 6/7**, 0 | none |
| MB11-N8-01 | 4/9, -1/216, 6, 0.444... (= 4/9) | none |

**Result: 0 of 7.** Only MB11-N7-02 and MB11-N7-03 print mixed numbers, and on neither does any option equal one.

One adjacent observation, which is not a KEYPRINT hit: on MB11-N7-02 the key -2 3/7 is exactly 1/7 above the printed
sum -2 4/7, and 1/7 is printed (the top-right entry). math-check's PAIR compares the key with the OPTIONS, not with
the stem, and its regex would not read -2 4/7 anyway. So nothing checks this relation. A screener should look at it.

## Only seven items: the sixth form needs nine

MAP Math form 6 is short **+9 Number Systems** (REGISTER: "f6 is short ... N 1/10"). This gate holds 7 items. Even
if all seven pass every stage, form 6 is still 2 Number Systems items short, and OA 5, Geo 3 and Stats 5 short as
well. A pass here does not open form 6.

## Stages and seeds

As n789: one area, one screen packet, one grade part and one options-only part.

| stage | seed |
|---|---|
| 0b screen pass 1 | order 20262201, deal 20262202 |
| 0d screen pass 2 | order 20262203, deal 20262204 |
| 0e freeze | 20262212 |
| 1 options-only | 20262222 |
| 2 with-source (+ part number) | 20262240 |
| C-prime deferral draw | 20262272 |

Use fresh subagents only. Excluded:

- any reviewer from batches 1-10 or n789;
- the stage-A author session;
- the stage-A screener and the three stage-A options-only samples.

Claude only.

## Bars (unchanged from n789, batches 5 and 6)

**A. Options-only.**
- The control is a 1:1 live ISEE Number Systems control matched by tier (low -> `easy`, mid/high -> `medium`).
- Hold if candidate - control > +10.0. Unanimity hold if > +15.0 (batch-level unanimity rate against the control's,
  never per item).
- Not measured (held) above a 90.0% control hit rate or an 85.0% control unanimity. The attainable control range for
  the margin bar is 0-90.0%, and 0-85.0% for the unanimity bar. Both bars sit inside it at every control value seen
  so far in this area (19.0-66.7%).
- **With n = 7 the margin moves 14.3 points per item and 4.8 points per pick** (21 picks per arm). +10.0 is exceeded
  by 3 more correct picks than the control. A hold or a pass on 7 items is read as what it is.

**B. With-source graders (d and e).**
- Rules R1-R11 and EXT-1 apply, plus the off-blueprint hold. F 2-of-3 decides one-grader flags. Grade fit is
  recorded.
- R11 runs against the 726 earlier MAP maths ids in dump-n11 (`EXCLUSIONS-map-n11.txt`), with the own-predecessor
  rule in deviation 3.

**C and C-prime:** no measurement below 10 items (unchanged; see the pre-check above).

**Verdict:** PASS iff A passes and >= 1 item is inserted.

## Changes from n789

1. One area (Number Systems). The items come from one stage-A authoring session, screened in the loop and selected
   by the rule quoted above (the post-n789 method).
2. One id prefix (MB11). Four grade cells. Real author files with `selected_from`.
3. The R11 corpus is dump-n11 (726 ids: every n789 and b10 item added). The math-check prior is dump-n11 minus the
   seven own predecessors (deviation 2). The R11 own-predecessor rule is deviation 3.
4. Items were written and pre-screened before this file (deviation above).

No threshold changes.

## Pre-registered measurements (recorded; none gates)

- **H1, R11.** Prediction: 0 R11 drops under deviation 3. Every mechanism is its predecessor's, and the
  predecessors drew no R11 drop in n789.
- **H2, screen.** Prediction: <= 3 of 7 fail screen pass 1. Stage A's in-loop screener struck one option on F11, E16
  and E06, and none on the other four. n789 predicted <= 3 of 9 and got 7 of 9, so this prediction is weakly held.
- **H3, position and regression.** Recorded:
  - the candidates' options-only hit rate against the 34.6% position-only expectation;
  - the stage-A rate of the same seven (9.5%);
  - the stage-A rate of all 21 (36.5%);
  - the share of solver picks at the interior ranks.

  The regression the selection built in is the gap between stage 1 and 9.5%.

## What can't be learned here

With 7 items, no rate here is more than an anecdote: the options-only margin moves 14.3 points per item, and C is not
measured. The seven were selected on the instrument that stage 1 re-runs, so a stage-1 pass is weaker evidence than
the same number from unselected items. Three samples of one model are not three solvers.

## Coordinator decision on deviation 3 (2026-10-30, before any screener)

ACCEPTED. The 7 n789 predecessors are HELD and have never been inserted, so no student can be served both an item and
its re-authoring. R11 exists to stop a second drawable item on the same chain, and here only one of each pair can ever
be drawable. Condition: the n789 frozen batch (`map-math-v2-n789/num/batch.json`) must never be inserted. If any
n11 item ships, its predecessor stays held permanently. Every other R11 entry (b6, b10, n789 withdrawn, all earlier
MAP items) still applies.
