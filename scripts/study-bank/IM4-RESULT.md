# isee-math-s4 — RESULT (2026-08-31)

45 ISEE mathematics items shipped. ISEE math 85 → 130 against an 84-item
form requirement, so a SECOND ISEE maths section is now servable.

## Gates

    solve re-execution   45/45 recompute to their own key
    shape                4 distinct choices, key present, 3 named
                         distractor mis-steps, 45 unique subskills
    options-only attack  mean 34.1%  ctl 35.6%  margin −1.5  PASS

The attack file was asserted STEM-FREE before launch: 0 of 45 entries
contain any prompt text. For a maths item the prompt IS the stem, and
including it is the instrument failure that produced two bogus +43/+47
"kills" earlier in this project.

## Two hypotheses the attacker raised, both measured

It did not just report a score; it named the mechanisms that could
explain one. Both were tested against the key rather than accepted:

**Sum relation — REFUTED.** 10 sets contain an option equal to the sum of
two others. The key is that value in only 2 of them. It does not isolate
the key.

**Magnitude rank — REAL, and currently harmless.** The options are
printed in ascending order (39 of 42 numeric sets), so the LETTER is a
magnitude rank rather than an arbitrary label. Measured key rank:

    rank 0 (smallest)  12
    rank 1             17   ← 40.5%, against 25% expected
    rank 2              7
    rank 3 (largest)    6

That is a genuine skew toward the second-smallest value.

## The trade-off this exposes, recorded because it is load-bearing

The skew is invisible to a student ONLY because `shuffleDrawnChoices`
re-orders options at serve time. That is an accident, not a decision:
real SSAT and ISEE print numeric options in ascending order, so our
shuffle costs fidelity, and the obvious "improvement" is to stop
shuffling maths options.

**Do not do that first.** Preserving ascending order would expose the
rank skew directly — "pick the second-smallest" would score 40.5%
against a 25% control. The order of operations is:

  1. rebalance the key's magnitude rank in the bank, then
  2. consider preserving ascending order for fidelity.

Doing 2 before 1 converts a latent property into a live tell.

## What the checks cannot see

The attacker said so itself, and it is right: these are cheap pre-flight
guards over option SHAPE. They cannot see a semantic cross-item tell —
whether, say, the intermediate-value distractor always sits adjacent to
the key. Only the blind attack speaks to that, and it passed.
