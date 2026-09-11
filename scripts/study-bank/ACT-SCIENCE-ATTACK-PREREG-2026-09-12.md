# ACT Science figure-blind attack — pre-registration, 2026-09-12

Written and saved BEFORE any solver ran and before any score existed.
Nothing below may be edited once a score exists.

## What is being attacked

All **120 live ACT Science items** (`study_item_bank`, `family='act'`,
`section='science'`, `verified=true`, `archived` not true). Read with
`.order('id')` + `.range()` paging: **120 rows, 120 distinct ids, 0
duplicates.** Cohorts `act-science-v1` (80) and `act-science-v2` (40),
21 passage groups, every item 4-option multiple choice.

These items are drawable but hidden from students. This measurement is
meant to decide the hidden flag.

## The instrument, and why it is the figure-blind one

`FIGURE-BLIND-RESULT.md` (2026-08-05) found **80.6% of figure-bearing
maths items solvable with the graphic removed** — the figures were
decoration. ACT Science is the section where the data IS the passage, so
that is the live risk here, not option shape.

Render: **stem + four options only.** The passage, the figure, and the
figure caption are all withheld. A stem that names "Figure 1" or "Table
1" keeps that phrase — the solver must know a source existed, or it
would read the stem as complete and the test would be about something
else — but gets nothing from it.

**This gate reads backwards from the options-only gate.** A high score
here does not only mean the options leak; it means the withheld source
was not load-bearing. A LOW score is the healthy result.

## Leakage-free split

`ACT-ATTACK-RESULT.md` recorded that interleaving items from one passage
inflates the attack badly (ACT English 90% -> 76% once split), because
one item's options describe the passage content another item asks about.
So each blind file holds **at most one item per passage group**, and each
file gets its **own** three solvers. No solver sees more than one file,
the batch identity, the keys, or another solver.

- Batch: 6 files, ~20 items each, all 120 items covered, 3 solvers per
  file = **360 picks**.
- Control: 6 files, 12 items each, 3 solvers per file = **216 picks**.

Keys are dealt **flat** (equal counts per letter per file, as near as the
file size allows) so a constant-letter solver scores exactly chance. The
realised key spread is printed in the result so that claim is checkable.

## The control, chosen before any score existed

**Live ACT Reading (`act-reading-v1`, 108 verified unarchived items, 12
passage groups of 9), 72 of them drawn 6-per-group into the 6 files.**

Why this one:

- It is the same family, the same 4-option shape, the same
  passage-withheld render, and the same one-item-per-passage split.
- It is **what ships**. ACT Reading is reachable by students today; ACT
  Science is the cohort asking to join it. The decision in front of us is
  not "is Science perfect" but "is Science worse than the ACT items
  students already receive".
- **25% is not the bar and cannot be.** `ACT-ATTACK-RESULT.md` measured
  ACT Reading at **78.7% leakage-free** and ACT English at 76.1%, and it
  shipped anyway after a human sitting. A model's floor on this render
  for ACT verbal is ~76-79%, not 25%. Scoring Science against 25% would
  condemn it for being an ACT item.

Known asymmetries, recorded now rather than discovered later:

- Reading groups hold 9 items, Science groups 5-6. Both files are
  leakage-free, so this does not change the leakage story, but the
  control is drawn from a slightly deeper pool.
- 36 of the 108 reading items are not drawn (beyond 6 per passage). The
  control is a sample; the batch is the whole population.
- The control is a READING cohort controlling a SCIENCE cohort. It
  matches on family, shape, render and shipped-ness, not on subject. If
  the two rates are close this is the weakest joint in the argument and
  will be said so.

## Decision rule, fixed now

Δ = pooled batch rate − pooled control rate, each over 3 solvers per file.

- **PASS — the measurement does not oppose unhiding:** Δ ≤ +5.0
- **SECOND READ:** +5.0 < Δ < +10.0
- **FAIL — keep hidden:** Δ ≥ +10.0

Overriding clauses, in order:

1. **NO VERDICT** if any two solvers on the same file return identical
   pick-strings — that is evidence they did not solve independently.
2. **NO VERDICT** if the control lands at or below the flat-deal control
   (within 3 points of 25%). A control at chance means the render gave
   the solvers no signal even on items recorded as 78.7% guessable, so
   the instrument did not fire and nothing has been discriminated. The
   batch's number would then be uninterpretable, not good.
3. The **confident subset** is scored separately for every file. A high
   overall rate whose confident subset sits at chance is a heuristic that
   feels decisive and is not, and is reported as such rather than folded
   into the headline.

## A second contrast that does not depend on the control

84 of the 120 items carry a figure; 36 (6 of the 21 passage groups) carry
none — those are prose/conflicting-viewpoints sets.

**If the figures are load-bearing, the 84 figure-bearing items should
score LOWER blind than the 36 figure-less ones**, because the
figure-blind render withholds strictly more from them. If they score the
same or higher, the figures are not carrying the items. This is internal
to the batch, so no control is needed for it, and it is the closest thing
here to a direct replication of the 2026-08-05 maths finding.

Pre-registered secondary, not a verdict on its own.

## Stated in advance so it cannot be produced afterwards

- No file is re-run, no solver is replaced, and no item is dropped from a
  denominator after a score exists.
- A batch landing in SECOND READ is not cleared by a favourable subset.
- No item is edited, archived or inserted by this run.
