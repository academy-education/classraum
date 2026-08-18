# Many-to-one licensing detector — DOES NOT WORK (2026-08-19)

**Negative result, recorded so nobody builds it again.** This is the SIXTH
structural proxy for "the answer is guessable without the source" to be built
and the sixth to fail. The five before it are listed in CLAUDE.md
(key-letter spread, key length rank, punctuation asymmetry, concessive-pivot
rate, option-family balance); the fifth has its own writeup in
OPTION-BALANCE-RESULT.md. Add this one to the list.

## What it was meant to catch

ATV2 tranche 2 found that inference / "what will they do next" items are
59.0% solvable with the audio withheld (tranche 1: 16.7%, z = 4.90), while
the batch-level margin stayed inside the bar because function and
main_emphasis items score below chance and cancel it out.

The diagnosis was that the four next-step options are four candidate
follow-ups to ONE world, so three are generically sensible research
activities and one is downstream of the lecture's thesis — a MANY-TO-ONE
relationship. A pairwise/one-to-one leak sweep structurally cannot see this,
which is consistent with b5's round-3 reviewer certifying that no one-to-one
licensing survived anywhere in b5 and b5's inference rate then coming in at
67%, the worst of any batch.

The detector: for each next-step option, enumerate how many of the lecture's
12 sibling settings license it. Symmetric = comparable counts, near
bijection. Many-to-one = one option tied to one specific setting while the
others are licensed broadly.

## The break-test, and why it is the whole point

The detector was pointed at data whose answer was already known BEFORE being
pointed at anything new — the rule that saved the SAT Math hub checker.

- **known-BAD**: the 13 inference pivots of b4 and b5 (blind rate 59.0%)
- **known-GOOD**: the 16 inference pivots of b1, b2 and b3 (blind rate 16.7%)

All 29 were anonymised, shuffled under a fixed seed, and handed to the
detector with the batch of origin withheld and the source directory declared
off-limits. It never saw a key, a solver file, or a score.

## Result: it does not discriminate

                     flagged   not flagged
    known-BAD  (13)      6          7        recall 46%
    known-GOOD (16)      6         10        false-flag 38%

    precision 50%   accuracy 55%
    P(>= 6 of the 13 known-bad among 12 flags | random) = 0.46

    per-batch flag rate: b1 3/6, b2 2/6, b3 1/4, b4 4/7, b5 2/6

b5 — the batch with the WORST inference rate at 67% — got the joint-lowest
flag rate of any batch. b1, whose inference items solvers scored 0% on, got
the second-highest. The ordering is not merely weak, it is close to
inverted where it matters most.

P = 0.46 against random assignment. **This is not a detector.** Under the
standing rule it may not gate anything, and no redesigned batch may be
cleared by it.

## What follows — the diagnosis is now unconfirmed

The detector failing does not merely mean the instrument is blunt. It is
evidence against the HYPOTHESIS. If many-to-one licensing were what makes
b4/b5 inference items solvable, a careful reader enumerating licensors
should have separated a 59%-solvable set from a 16.7%-solvable one, and it
did not come close.

So the cause of the inference leak is NOT established. Candidates that
remain open, none of them tested:

1. The leak is not in the inference pivot's own structure but in its
   siblings — the thesis/attitude pivots became more readable in tranche 2
   (attitude also rose, 31.6% -> 41.0%), so the chaining that solvers all
   described may be inherited rather than local.
2. Concreteness: b4/b5 next-step options may name specific instruments,
   sites or documents at a higher rate, and "the option that names the
   lecture's own object" is findable without any licensing reasoning.
3. It is genuinely semantic and item-specific, like every other tell this
   project has found, and no cheap inspectable proxy for it exists.

(3) is the prior the record supports. Five proxies before this one each
caught the tell they were built for and none caught the next; this one did
not even catch the tell it was built for.

## The standing conclusion, unchanged and now reinforced

**The attack is the gate. Structural checks are pre-flight and may never
stand in for it.** The one amendment tranche 2 forces is that the attack
must be scored PER QUESTION TYPE, because a batch mean is arithmetic over a
mixture and will hide a catastrophic component behind two below-chance ones.
That amendment is a change to how the attack is read, not a new proxy.

The redesign of the inference pivot on the symmetry principle should still
proceed — making each of the four next-steps the natural follow-up to a
DIFFERENT world is the same construction every other pivot already uses, and
it is sound design whether or not it is what fixes this. But it must be
validated by a per-type blind attack on a pilot batch, not by this detector
and not by a reviewer's assurance that the structure now looks symmetric.
b5's round 3 gave exactly that assurance and the items scored 67%.

## Files

    scratchpad/detector-fixture-blind.json   29 anonymised shuffled cases
    scratchpad/detector-fixture-truth.json   withheld origin map
    scratchpad/detector-result.json          the detector's verdicts
