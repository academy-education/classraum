# The option-balance check does not work. 2026-08-06

**Refuted against three batches whose blind margins were already
measured. Two independent reasons, either of which is fatal.**

I proposed this check at the end of the crv3 writeup as "the next move",
and it was the wrong move. Recording it so nobody rebuilds it.

---

## The idea

crv3's blind score split sharply by the speech act of the key
(conditional acceptance 100%, question-back 25%), and exactly one option
family in 32 items was balanced between key and distractor — "go ask
Priya/Marco/Nadia", key 3 times and distractor 3 times, which both
with-source readers independently called the only unlearnable shape in
the batch.

So: label every option by family, blind to the key, and measure whether
knowing the family tells you the answer. `check-option-balance.mjs`
reports the accuracy of the cheapest possible attacker — "always pick
family F, guess if this item has none" — which is directly comparable
to a blind solver's score against the 25% control.

## Reason 1: it does not track the thing it is supposed to predict

Run against three batches with known measured margins:

    batch       measured    predicted floor    TVD
    repair-v1     +40.4          +5.9         0.151
    crv2          +14.6          +6.3         0.219
    crv3          +39.6          +8.6         0.234

A 26-point spread in reality; a 2.7-point spread in the prediction. And
TVD — the imbalance statistic itself — is INVERSELY ordered against the
measured margin at the top end: repair-v1 is the most balanced batch by
this measure and among the most guessable in fact.

The pre-registered standard for this check was stated before running it:
*if it does not separate crv2 from the other two, it is measuring
nothing and should not be used.* It does not.

## Why the mechanism is real but too small

The act tell is genuine — crv3's `hedged-acceptance` has lift 2.67, four
of its six options are keys, and those items scored 100% blind. But
there are only six such options in 128. **A rule that covers 4 of 32
items cannot move the aggregate more than a few points however perfect
it is.**

This corrects the crv3 writeup, which attributed that batch's failure
largely to act-uniqueness. That mechanism accounts for something like 8
of the 39.6 points, not most of them. The rest comes from the option
TEXT, not from its kind — solver B's rules were about recognisable
phrasings within a family, not the families themselves.

## Reason 2: the input is not reproducible

repair-v1 was labelled by two agents, 36 items and 35 items, same
taxonomy, same instructions. That accidental control is the most useful
thing to come out of this:

    family                 labeller 1    labeller 2
    concrete-fix              39.6%         27.9%
    bare-acceptance            6.9%         14.3%
    clarifying-question        9.7%         17.9%
    hedged-acceptance          6.9%          0.0%
    refusal                    0.7%          0.0%

Labeller 1 resolved "Of course — I'll do X" to `concrete-fix` whenever a
specific action was named; labeller 2 kept the acceptance as the main
move. Both flagged the tie-break unprompted. One found ten hedged
acceptances in 144 options, the other found zero in 140.

So the families are not operationalised enough to be measured. Any
cross-batch comparison of them is comparing labellers as much as items.

## Could a calibrated labeller rescue it?

Probably not, and it is not worth finding out. Even granting perfect
labelling, reason 1 stands on its own: the predicted floor sits at 6-9
points for batches spanning +14.6 to +40.4. Tightening the labels
sharpens an instrument that is pointed in roughly the right direction
with a fraction of the necessary range.

The redesign that might work — replace subjective families with binary,
operationalised features (contains an acceptance token; names a specific
action; asks a question; names a third party; declines) — is a better
instrument, but it measures the same narrow slice. It would be the
fourth structural proxy in this project, after letter, length rank and
punctuation, and the pattern is now clear enough to state:

> **Every structural proxy has been too coarse.** Letter spread, length
> rank, punctuation asymmetry, lexical pivot and now family balance each
> caught the specific tell they were built for and none caught the next
> one. The tells that decide these batches are semantic and
> item-specific.

## What this leaves

The blind attack itself ranked all three batches correctly, because it
is the only instrument that reads the option text. Three solvers over
32 items is a few agents and one cycle — cheap next to the bank-wide
rewrite that acting on a bad proxy would cost.

So the gate is the attack. The structural checks stay as PRE-FLIGHT —
they are worth keeping because each one catches its own defect for
almost nothing, and `render-crv3.mjs` did catch a typographic tell an
author had spotted by hand — but none of them is a substitute, and no
combination of them has ever predicted a margin.

The human sitting remains the only instrument that separates a real
defect from a model artefact, and it is still one reviewer.

## Files

`check-option-balance.mjs` and `make-label-input.mjs` are kept, with
this document, because the negative is worth more than the code: the
next person to notice the act-uniqueness pattern will want to know it
was measured and how far it got.
