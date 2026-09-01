# isee-verbal-s4 — blind attack, and why its number means nothing

    solver 1   6/32   18.8%
    solver 2   8/32   25.0%
    solver 3   8/32   25.0%
    MEAN            22.9%    control 28.1%    margin -5.2

By the standing bar (pass <= +25) this is a comfortable pass. **It is not
evidence, and the batch is not cleared by it.**

## The attack cannot fail on a bijective set

All three solvers reached this independently, before seeing any score,
and it is provable rather than merely likely:

- every set is four items sharing ONE option pool
- each option is the key of exactly one item in that set

So any strategy that reads only the option TEXT returns the same string
for all four items, and scores exactly 1 of 4. A solver who instead
guesses an assignment across the four still scores 1 in expectation.
**Every options-only strategy scores exactly 25%, by construction.**

The measured 22.9% is therefore a fact about the design, not about the
items. The attack measures "does an option property correlate with
correctness", and the bijective construction sets that quantity to zero
a priori. Running it asks a question whose answer was fixed before any
word was authored.

This is the SECOND instrument in this project found to be incapable of
returning a negative — after the with-passage QC vote, where three
independent agents returned 84/84 agreement every time. Both were being
read as gates.

## What the attack still rules out, and what it does not

RULES OUT: an option-property tell — length, register, specificity,
polarity, part of speech ACROSS options. That was never possible here.

DOES NOT TOUCH:
- **exclusivity** — whether two options both answer one stem. Only
  visible WITH the stem. The authoring agent found two such failures in
  this batch by reading all 128 cells; a blind attacker cannot see them.
- **stem-side leaks** — a sentence-completion stem that gives the answer
  away by grammar or collocation.
- **cross-item leakage** (below), which the attack scores as clean.

## The finding the attack scored as clean

Solver 1: four items sharing an option pool leak EACH OTHER. A candidate
who confidently answers three of a set can deduce the fourth by
elimination, because each option is used exactly once. The set is worth
less than four items of information, and a strong candidate gains most.

Nothing in the per-item checks sees this: every item is individually
sound. It is a FORM-ASSEMBLY property, and it is the same shape as the
I01-5 / I02-5 near-clone already recorded — two items that must not
share a form.

**Consequence: these batches are NOT inserted until assembly can hold at
most one item per bijective set per form.** Inserting first and
constraining later would put the leak in front of students in the
interval.

(The duplicate option ORDERINGS solver 1 also spotted — IV4-01/02,
09/11, 18/20, 26/28 — are an artefact of the weak per-item hash shuffle
I used to build the blind file, not a property of the bank. Serve-time
shuffleDrawnChoices reorders every item independently.)

## The gate this needs instead

1. **Exclusivity review WITH the stem**, by a reader who did not author
   the set — the two failures found here were found that way, and s5's
   seven drops came from an independent reviewer catching exactly this
   class in items their author believed clean.
2. **A form-shape check**: no two items from one set in a drawn form.
3. The options-only attack may still be run, but only to confirm the
   construction is intact — never reported as a clearance.
