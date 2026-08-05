# Distractor repair — pilot of 12, 2026-08-06

**Hypothesis:** the stem repair failed because the OPTIONS leak — each
distractor is the key's own computation gone wrong, so three of them
form a system of equations that discloses the inputs. Rewrite the
distractors as plausible values with no error structure and the items
should become figure-dependent.

**Result: 87.5% -> 75.0%. Real movement, not the fix. And the rewrite
introduced a new tell while removing the old one.**

---

## Three conditions, same 12 items, same key slots

Key LETTERS were reused across all three renders, so the fixed-slot
control is exactly 25.0% in every condition and the only variable is
the text. Nothing was written to the bank.

| condition | reasoner | eliminator | mean | margin |
|---|---|---|---|---|
| before (original stem + options) | 100.0% | — | 100.0% | +75.0 |
| stem repaired | 83.3% | 91.7% | 87.5% | +62.5 |
| stem + distractors repaired | 83.3% | 66.7% | **75.0%** | **+50.0** |

Each repair bought 12.5 points. Together they moved 100% -> 75%, against
an official ETS margin of +25.5 and a control of 25%.

## The rewrite worked on the defect it targeted

The eliminator dropped 91.7% -> 66.7%, and its solvable count fell from
8 to 5. The computational disclosure is largely gone: it could no longer
recover the operands from sums, differences, unrooted squares or
arithmetic-vs-geometric mean pairs on most items.

Three items still disclose, all the same family:
- **#6** distractors 9 and 12 are the raw |dx| and |dy|; the key is
  sqrt(9^2+12^2). The inputs are literally in the option list.
- **#9** 6 and 10 are the geometric and arithmetic mean of the same
  hidden pair, and a "mean" question always keys the geometric one.
- **#12** 9 and 12 are the half-chord and the distance for r=15.

## The new tell the rewrite created

The REASONER did not move at all: 83.3% before and after. It had marked
zero items solvable both times, and explained itself:

> My guesses lean on Pythagorean-triple plausibility — 13 for a
> hypotenuse, 5 where a 3-4-5 fits, 10 for 6-8-10, 50 for 30-40-50.

The eliminator independently confirmed it: **all five of its solvable
items rested on an integrality constraint, not on the figure.**

Neutral, evenly spaced distractors leave the key as the only
CANONICAL-looking value in the set. 13 among 11/15/18 is identifiable
without a diagram. The rewrite removed computational disclosure and
replaced it with recognisability contrast.

This is the same failure shape for the fifth time — the load-bearing
property was uniform across the batch:

    1. key in slot A, 73% of a cohort              (letters)
    2. every 4-set a complete ABCD permutation      (structure)
    3. identical key PROSE across 8 lectures        (wording)
    4. one rhetorical shape across 16 items         (form)
    5. the key is always the canonical value        (recognisability)

The authoring brief guarded position — key rank came out 3/4/3/2, and
the eliminator confirmed "no positional tell". It did not guard
recognisability, because nobody had named that axis yet.

## The recipe, from the one item that resisted

Solver 2 on item #4, which it could not crack:

> 45, 50, 55 are ALL 3-4-5 scalings (27-36-45, 30-40-50, 33-44-55).
> Only 42 is excluded... which NEUTRALIZES the integrality attack
> rather than exposing the key — the best-built item in the set.

**Distractors must be equally canonical, not neutral.** Drawn from the
same family as the key, so "pick the recognisable one" returns four
candidates instead of one. That is the opposite of the instruction this
pilot was given, and item #4 satisfied it by accident.

Two routes, and they can combine:
- **(a) Same-family distractors.** For a 5-12-13 hypotenuse, offer other
  triple hypotenuses: 13 / 15 / 17 / 25.
- **(b) Non-canonical figures.** If the triangle is 6-11-12.53, there is
  no recognisable answer to prefer. This changes the ITEMS, not their
  packaging, and it is the only route that also defeats a student who
  has memorised the triples.

## What this licenses

- Do NOT roll either repair out to the other 74 items. Between them they
  buy 25 points and leave +50.
- The next pilot is same-family distractors on the same 12, measured the
  same way. If item #4's property generalises, the margin should fall
  hard; if it does not, route (b) is the answer and the figures have to
  change.
- Method note, again: three conditions were measured on proposed text
  with zero database writes. Every negative result here cost one agent
  batch instead of a bank-wide rewrite.
