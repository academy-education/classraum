# reading-worlds-s5 — blind attack (2026-08-31)

    AGGREGATE   mean 13.6%   ctl 33.3%   margin −19.8   PASS

    per item position, which is the breakdown that mattered:
      1  world/main-idea      11.1%   ctl 33.3   −22.2
      2  world/detail         11.1%   ctl 55.6   −44.4
      3  world/inference      11.1%   ctl 44.4   −33.3
      4  VOCABULARY           14.8%   ctl 33.3   −18.5
      5  attitude             22.2%   ctl 44.4   −22.2
      6  purpose/document     11.1%   ctl 33.3   −22.2

Three distinct pick-strings. Every position below chance.

## The attacker's main hypothesis was refuted

It predicted, before scoring, that the batch would land ABOVE chance
"driven almost entirely by item 4", on the reasoning that a set's topic
is recoverable from its five siblings and only one sense of the tested
word survives that topic — "a set of twenty" is not a live reading in a
passage about string quartets. It reported all three solvers converging
on eight of the nine vocabulary items and called them free marks.

Measured: item 4 scored 14.8%, the second-WEAKEST position. The
convergence was real and the conclusion was wrong — three solvers agreed
with each other and disagreed with the key.

This is worth keeping because it is the same shape as the s3 solvers who
reported TENSION "discriminated most reliably" and then scored 15.9%:
**agreement among solvers is not evidence about the key.** Confident
convergence is what a shared wrong prior looks like from the inside.

It also asked the right thing of me — a per-position breakdown rather
than a pooled number, because "a pooled 54-item accuracy would hide a
9-item leak inside 45 items of noise". That instinct was right in
general and was what caught the SSAT math ladder on the same day; here
it simply found nothing.

## Its two structural findings, both real and both LATENT

    I01-5 / I02-5   carry a word-for-word identical option set, differing
                    only in the noun ("case" vs "finding"). NOT
                    exploitable: the two shown variants differ and so do
                    the keys, so solving one does not hand you the other.
                    It is a near-clone pair, and the two should never sit
                    on the same form.

    I07-3           one option names a proper noun ("the Rochefort
                    sheets") where its three siblings use common-noun
                    descriptions ("the kite and camera"). On the shipped
                    form that option is a DISTRACTOR, so the register
                    slip points away from the key — but it would be a
                    live tell if W3 were ever the drawn variant.

Both are repairs to make before the variant rotation reaches them, not
reasons to drop an item from this form.

## The author's own two worries, answered

    "does the assert-then-deny paragraph shape leak into the options?"
        No. Items 1/2/3 are a flat four-way world menu with no negation,
        hedge or 'though' in any option, and the option order is
        genuinely re-permuted across items (I01: M,U,T,F / T,M,F,U /
        U,F,M,T — no fixed slot for any world).

    "is the recurring 'right but of small consequence' stance learnable?"
        The position exists in all seven judgement items, not the three
        the author flagged — but it is a TEMPLATE, present in every set
        alongside one unqualified endorsement and two specific
        criticisms. Membership identifies nothing: every set offers all
        four positions. The solver that rode it scored 22.2% on stance
        items, below chance.
