# Distractor derivability — NEGATIVE. The sixth structural proxy also fails.

Run 2026-08-14. `check-distractor-derivability.mjs` over all 820 live
SAT Math items. Last unstarted item in SAT-PLAN.md Phase 1.

## The question

A good SAT distractor is the answer you get from a specific plausible
slip on the given quantities. An arbitrary one is reachable from
nothing, and a student can eliminate it without doing the arithmetic.
The leak is the extreme case: **the key is the only option derivable
from the stem**, so the item is answerable by connectivity alone.

## Result

    items in scope        820
    scored                652    79.5% coverage
    abstained             168    non-numeric options, or <2 given numbers

    overall derivability  45.2% of all options   (in the discriminating band)

    items with exactly ONE derivable option   158
      of those, the derivable one IS the key    22

    LEAK RATE  13.9%   vs 25.0% control (by construction)
    margin     -11.1 points

| cohort | scored | signal | key-only | rate |
|---|---|---|---|---|
| Algebra | 174 | 48 | 12 | 25.0% |
| Advanced Math | 172 | 30 | 2 | 6.7% |
| Geometry and Trigonometry | 154 | 37 | 6 | 16.2% |
| Problem-Solving and Data Analysis | 152 | 43 | 2 | 4.7% |

**Below chance, in three cohorts out of four.** Nothing here says the
key is identifiable by connectivity to the stem.

## But do not read the sub-chance number as evidence of quality

It is partly an artefact of the design, and the direction is
predictable in hindsight. The key is the ANSWER, which usually takes
several steps; my operation set applies ONE. Distractors, by contrast,
are built from single slips on the givens — which is exactly what the
op set models. So distractors are systematically easier to reach in one
step than keys are, and the null is not really 25%.

That does not rescue the instrument in the other direction either: a
test whose null cannot be stated is not measuring what it claimed.

## The 22 flagged items are mostly my own op set, not a defect

    In right triangle ABC, AB = 20, BC = 21. Find the hypotenuse.
      options 20.5 | 6.4 | 841 | 29,  key 29

29 is flagged as "the only stem-derivable option" because I put
`sqrt(a² + b²)` in the slip set. But Pythagoras is not a slip here —
**it is the item's correct solution method.** A student cannot exploit
that without already knowing to apply it, at which point they have
solved the item rather than eliminated their way to it.

Same for the part-over-whole family I added to make a self-test fixture
pass: it is the real method for ratio items, so it marks their keys
derivable by construction.

**An operation set that contains an item type's solution method cannot
measure that item type.** Splitting slips from methods per item type is
possible in principle and is a much larger piece of work than the one
this was scoped as, with no reason to expect a different answer given
the three cohorts already sitting far below chance.

## Therefore

Recorded as a NEGATIVE, alongside the five in
`OPTION-BALANCE-RESULT.md`. The count of failed structural proxies is
now six:

    key letter spread          caught its own tell, generalised to nothing
    key length rank            same
    punctuation asymmetry      same
    concessive-pivot rate      same
    option-family balance      predicted 2.7 across a 25.8-point spread
    distractor derivability    below chance; null not statable

The script is kept because it is free to run and its self-test is
honest about abstaining, but **it should not be cited as evidence a
cohort is clean.** The blind attack remains the gate.

## What it did establish

Coverage of 79.5% is far better than the answer-computability checker's
5.1%, because it needs only numeric options and two given numbers
rather than a parseable equation. If a future check wants a cheap way
to select numeric Math items with their stem quantities, `classify()`
and `stemNumbers()` are reusable and self-tested.

One real bug caught by the self-test on the way: `(?![\w.])` in the
stem-number regex rejected sentence-final numbers, so "width 5." lost
the 5, a two-number stem looked like a one-number stem, and the item
silently abstained. Silent abstention is the worst failure mode for a
coverage-sensitive instrument — it shrinks the denominator without ever
appearing in the output.
