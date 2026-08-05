# Figure-blind attack — 24 maths items, 2026-08-05

**Question:** `bank-targets.ts` moved all 848 maths items to
NOT_APPLICABLE because the standard attack keeps the stem, and a maths
stem is the whole problem. But 132 of them carry a FIGURE, and for
those there IS a withheld source. `MATHS_WITH_GRAPHIC` has said since
2026-08-04 that the gate "does not exist yet". This is it.

**Answer: 80.6% solved with the figure removed. The figures are
decoration.**

---

## Read this the other way round

For every other gate here, a high blind score means the item leaks its
answer through the options. **Here a high score means the FIGURE IS
DECORATIVE** — the item is solvable without it, so it is not testing
figure reading. A score at control would have been the healthy result.

    solver A  19/24 = 79.2%
    solver B  19/24 = 79.2%
    solver C  20/24 = 83.3%
    MEAN 80.6%   control 25.0%   margin +55.6

## The breakdown is the whole finding

| figure type | items | solved blind |
|---|---|---|
| **rawsvg** (geometry diagrams) | 14 | **100%** |
| twowaytable | 3 | 67% |
| line | 1 | 67% |
| table | 4 | 58% |
| bar | 2 | 17% |

**Every single SVG-diagram item was solved without its diagram.**
`rawsvg` is 86 of the 132, so the majority of graphic maths items are
likely in this state.

Solver C classified each item independently and found the split is by
TOPIC, not difficulty:

- **LOAD-BEARING: 10** — every one a data item (bar chart, two-way
  table, rate table). Genuinely unanswerable without the figure.
- **REDUNDANT: 8** — the stem already states everything the figure
  shows.
- **DECORATIVE: 6** — pure algebra that never needed a figure.

> There is no middle.

## What the authoring failure looks like

Quoted from the solvers, all three of whom named the same items:

- *"In the xy-plane shown, what is the distance between the points
  (2, -3) and (10, 12)?"* — both coordinates are printed. "shown" is
  scenery. 8-15-17.
- *"In right triangle ABC shown, the right angle is at B, AB = 6,
  BC = 8, and AC = 10. What is cos(C)?"* — all three sides and the
  right-angle vertex are in the sentence. The figure redraws the stem.
- *"PT is tangent to the circle at T, and the secant from P passes
  through A and then B (so PA < PB)."* Solver C on the parenthetical:
  *"the author noticing the diagram was load-bearing and then writing
  the diagram into the stem — which makes it redundant instead."*

## A second defect, found by the solvers rather than by the gate

All three flagged near-duplicates: items 13 and 18 are the same chord
problem with reshuffled options; 22/24 and 12/19 are clone pairs with
one number changed. Solver A: *"the 15 solvable items are really about
9 distinct problems."*

Checked bank-wide in SQL rather than taken on trust:

    848 maths items, 803 distinct normalised stems
    => 45 duplicate stems (5.3%)

A student can meet the same question twice in one bank.

## What this licenses

- The 132 figure-bearing maths items are now MEASURED, not merely
  "not applicable". They fail.
- The repair is cheap and specific: for geometry items, delete from the
  stem whatever the figure already shows. An item that states all three
  side lengths does not need a triangle drawn.
- The data items (bar, table, two-way table) are the healthy ones and
  should be the model for the rest.
- `MATHS_WITH_GRAPHIC` in bank-targets.ts undercounts: it lists 132
  maths items, but 164 live items carry a figure — the other 32 are
  `Information and Ideas`, a verbal cohort, and were never in that
  constant.
