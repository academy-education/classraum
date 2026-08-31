# ssat-verbal-s4 — KILLED (2026-08-31)

25 items authored, 0 shipped.

    solver 1   20/25 = 80.0%    options only, no stem
    solver 2   16/25 = 64.0%
    solver 3    0/25 =  0.0%
    mean 48.0%   ctl 20.0%   margin +28.0

The mean sits in the inconclusive band (pass ≤ +25, dead ≥ +30) and the
batch is dead anyway. Averaging three solvers hid it: solver 1 alone is
+60, which is a bank that answers itself.

Solver 3's zero is the second tell. Under chance it should score ~5 of
25; scoring 0 (p ≈ 0.004) means its "odd one out" rule is PERFECTLY
ANTI-correlated with the key. The key is never the odd option — so a
candidate who eliminates the odd one out is strictly better off, without
reading the stem.

## The mechanism, and it is my fault

Every item contains a POLAR PAIR and the key is one of the two:

    synonyms   an explicit antonym pair among the five options
               plentiful/scarce, cautious/reckless, arrogant/humble,
               shorten/expand, replenish/exhaust, essential/unnecessary
               — 12 of 12
    analogies  an exact order-reversal built from the same two lemmas
               dog:puppy / puppy:dog, flood:dam / dam:flood
               — 13 of 13

100% prevalence. The remaining three options are filler that reuse one
lemma with an unrelated partner (puppy:leash, dam:river) or sit at a
visibly lower difficulty (simple, roomy, enormous). So a solver with no
stem eliminates three of five in every item, and the residual choice is
only over DIRECTION.

**The brief produced this.** I specified the distractor taxonomy — "a
word meaning the OPPOSITE", "the same two categories in REVERSED order".
An opposite-of-the-key distractor is recognisable ONLY by reference to
the key, so including one advertises where the key is. This is the
cr-v1 defect in a new costume: CLAUDE.md records that a fixed roster of
distractor types makes the key "the option that is none of them", and
the register's own table shows four rounds of brief-tweaking failing to
fix it before the METHOD was changed.

## What to do differently

Not another distractor roster. Two options that actually break the
symmetry:

1. **Two polar pairs per item, from different lemma sets.** If both the
   key and a distractor have an opposite present, the pair no longer
   points anywhere. Costs nothing but authoring care.
2. **Two options on the SAME side of the axis as the key.** The key
   stops being identifiable as "a pole" at all.

Either way the rule is the same one the reading work arrived at
independently: the load-bearing element must VARY across items, or the
answer becomes predictable from the spec rather than the content.

## Not re-run

Per the register's standing policy an attack-condemned cohort is not
patched and re-attacked on the same brief — cr-v1 through v6 spent six
rounds proving that iterating a brief does not fix a structural tell.
SSAT verbal stays at 101 live items and 1.68 forms until someone
authors against a different construction.
