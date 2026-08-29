# reading-worlds-s3 — blind attack (2026-08-29)

    SSAT   n=48  mean 15.3%  ctl 25.0%  margin −9.7  PASS
    ISEE   n=30  mean 26.7%  ctl 33.3%  margin −6.7  PASS

Per-solver: SSAT 14.6 / 14.6 / 16.7. ISEE 43.3 / 20.0 / 16.7 — solver 1
is the only run anywhere near the control, and it is one solver on the
smaller family; the other two sit at or below chance.

Bars were pre-registered at pass ≤ +25, dead ≥ +30. Both clear.

## The solver's claim, and why the score is not the whole answer

The attack notes made a specific structural claim that no per-item
check covers, and it is the kind this project has been wrong about
before:

> Each item's options are the correct answers to the same question asked
> of 4-5 parallel VARIANTS, so a 6-item set is a CLOSED WORLD of 4-5
> mutually exclusive families whose vocabulary recurs verbatim across the
> six. A solver who commits to one family gets 3-5 of the 6 free.

Measured on this run: within-set pair agreement (both right or both
wrong) 71.6% against 68.4% expected under independence — **3.2 points**.
That does not support the claim.

**But that measurement has weak power and must not be reported as a
refutation.** These solvers scored AT chance, so there is almost no
signal available to propagate across a set, and none of the three was
trying the exploit — all used per-item heuristics. A coherence statistic
computed over near-chance answers cannot distinguish "no leak" from "no
solver good enough to leak".

So the claim is being tested directly, by a solver instructed to work
each set as a closed world and commit to one family. Its score is the
evidence; the 3.2 points is not.

Two further claims from the same notes, recorded so they are not lost:

1. **The hedged-attitude ladder.** Attitude items allegedly offer one
   overconfident option, one flatly negative, and one "confident here
   but unwilling to generalise" — conventionally the key on a real exam.
   Being tested in the same targeted run.
2. **Restatement pairs.** Several sets pair a detail item with an
   inference item that are logical restatements (I01-2/I01-3,
   I03-2/I03-3, S07-1/S07-3). Those cannot be independently wrong, so
   they should not both be scored on one form. This is a FORM-ASSEMBLY
   constraint, not an item defect, and belongs in the blueprint work.

## What the notes confirm is sound

There is no distractor-craft gradient. Because every option is a real
key from a real passage, all read as complete, similarly-hedged prose of
similar length. Length-rank, hedging-word and "one option is obviously
silly" proxies find nothing here — which is the design working, and also
why the cheap checkers cannot be the gate.
