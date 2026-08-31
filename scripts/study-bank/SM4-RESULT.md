# ssat-math-s4 — RESULT (2026-08-31)

Shipped 19 of 25. Six dropped for a defect the AGGREGATE MARGIN HID.

## The number that would have been wrong to report

    whole batch    mean 41.3%  ctl 32.0%  margin +9.3   PASS
    after 6 drops  mean 33.3%  ctl 26.3%  margin +7.0   PASS

Both pass. But the attacker named five items it believed were isolable
from the options alone, before scoring, and the split against the key is:

    the 5 it named        73.3%  against 20% chance
    the other 20          33.3%

A +53 subset inside a +9.3 batch. Averaging 25 items diluted five broken
ones into a passing number, which is CLAUDE.md's "check the count, not
just the colour" in its arithmetic form: a mean is not a gate when the
defect is concentrated.

## The mechanism

The distractor sets are built by ITERATING ONE OPERATION ON A SEED:

    SM4-15   18 / 36 / 72 / 144 / 288        a pure doubling ladder
    SM4-16   6pi / 12pi / 24pi / 36pi / 144pi radius-vs-diameter family
    SM4-05   35 / 70 / 105 / 140 + one intruder at 40
    SM4-08   3:5 with its inverse, its equivalent 6:10, its square, its cube
    SM4-09   80 / 96 / 100 / 120 / 144       percent-up-then-down family
    SM4-11   (3,-4) and (6,-8) — mutually incriminating

Because the ladder is visible without the stem, so is the seed; and in a
monotone ladder the key is the rung that is neither the raw seed nor the
fully over-applied end. That is the middle — which is ALSO why the rank
fact holds.

This is good distractor practice taken one step too far. Each rung IS a
named mis-step, which is what the brief asked for. The defect is that
all four mis-steps came from the SAME operation, so they line up.

**Authoring rule that follows:** the four distractors must come from
DIFFERENT operations, not from one operation applied repeatedly. A
doubling ladder is a giveaway; a doubling, a sign error, an intermediate
value and a no-setup sum are not.

## A finding about our own checks

The attacker observed that with options printed in ascending order and a
key that is never rank 5 and rarely rank 1, LETTER C is structurally
overloaded — and the key-letter spread script and the rank check are
therefore measuring the same thing, not two things. Solver 1 picked C on
15 of 25 purely from the rank rule.

So a clean key-letter spread on an ascending-order numeric bank is
weaker evidence than it looks. Worth remembering before quoting one.

## Gates

    solve re-execution   25/25 recompute to their own key
    shape                5 distinct choices, key present, 4 named
                         mis-steps; shape guards on the 19 all-numeric
                         sets (algebraic options excluded, since parsing
                         them invents false alarms)
    blind attack         +7.0 on the shipped 19
