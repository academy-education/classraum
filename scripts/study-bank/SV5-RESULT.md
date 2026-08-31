# ssat-verbal-s5 — RESULT (2026-08-31)

**Shipped 23 of 30.** SSAT verbal 101 → 124 against a 60-item section:
2.07 forms, where it was 1.68 this morning.

The same section's previous batch was KILLED today. This is what the
method change bought.

## Against the pre-registered bars

                       s4 (killed)   s5      bar
    margin              +28.0        −5.6    ≤ +10   MET
    best single solver   80.0%       23.3%   ≤ 40%   MET

    synonyms   17.8%  (ctl 33.3%)
    analogies  24.4%  (ctl 26.7%)

Both numbers were fixed before any item existed. The single-solver bar
exists because s4's mean of +28.0 sat in the "inconclusive" band while
one solver was at 80% — averaging three heuristics nearly hid a dead
batch.

## Why it worked: no distractor role

s4 died because the BRIEF named distractor types ("a word meaning the
OPPOSITE", "the same two categories REVERSED"). A distractor defined by
its relation to the key points at the key.

s5 is bijective: five (stem, answer) rows where each answer is correct
for exactly one stem, and a seeded RNG picks the shown stem after text
freeze. Every option is the right answer to a different question, so
there is nothing written-to-be-wrong for a solver to detect.

The attacker confirmed this precisely, and was careful not to overclaim.
Polar pairs are STILL present in 14 of 15 synonym items — but they no
longer point anywhere:

> In the killed batch each item had EXACTLY ONE opposite, manufactured
> from the key, so the pair identified the key up to a coin flip. Here
> the opposites are a by-product of five glosses drawn from one semantic
> field, and they come in bunches.

Reversal pairs in the analogies: zero across all 15 sets.

## The 7 dropped, and they share ONE cause

Exclusivity, not guessability. The attack says nothing is recoverable
from the options; the exclusivity review says seven items have TWO
CORRECT ANSWERS — a failure the attack cannot see, which is why both
gates exist.

    synonyms   Y04 Y06 Y12 Y14 Y15   the EVALUATIVE TWIN
    analogies  A08 A13               relation families that nest

Both reviewers, working independently on different material, arrived at
the same rule:

**NARROWING ONE MEMBER PROTECTS ONLY THE DIRECTION YOU NARROWED.**

  - MAGNANIMOUS was pinned to "generous in forgiving a rival", which
    stops that gloss fitting BENEVOLENT — and does nothing to stop
    BENEVOLENT's gloss fitting the MAGNANIMOUS stem.
  - oyster:pearl was chosen so it cannot read as material-of, which
    protects timber:cabin — and does nothing to stop glass:window
    fitting the product-of stem sugarcane:sugar.

The analogy reviewer cited the synonym finding by name while diagnosing
its own. Two instruments, two task types, one rule. Written up in
EVALUATIVE-TWIN.md.

## Repairs, if this cohort is ever extended

Replace a MEMBER, never re-word a gloss. For A08 specifically: fix the
SOURCE, not the answer — an animal-yield product-of stem (hen:egg,
cow:milk) cannot be satisfied by any made-of pair.

Three near-misses judged clean but carrying no margin, recorded so an
edit does not silently flip them: dwelling-of vs container-of in A01 and
A12 (surviving on animate-inhabitant vs inanimate-contents), and
degree-of vs stage-of in A11.
