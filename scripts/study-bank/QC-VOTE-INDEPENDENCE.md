# The with-passage QC vote was never three readings

Found 2026-08-31, on the s4 batch.

## What happened

The QC gate asks three "voters" to answer every item with the passage in
hand, and ships an item only if at least 2 of 3 agree with the key. It
has been run as ONE agent instructed to make three separate passes, each
with a different reading stance.

    s4   distinct voter answer-strings: 1 of 3   ("84 of 84 unanimous")
    s3   distinct voter answer-strings: 2 of 3   ("77 of 78 unanimous")

On s4 all three passes returned IDENTICAL picks. The agreement statistic
was one reading reported three times, and "84 of 84" carried no
information at all.

## Why the stances did not help

An agent asked to answer the same 84 items three times has its first
answers in context for passes two and three. Telling it to adopt a
different stance changes the justification, not the pick — it has
already decided, and the second pass reads as a re-derivation of the
first. The independence the gate needs is not stylistic; it is
*informational*, and one context cannot provide it.

s2 is the reason this went unnoticed for so long: it produced genuine
disagreement (17 unanimous, 29 at 2/3, 60 below), which looked like the
instrument working. It was not the instrument working — s2's items were
ambiguous enough to split a single reader against itself.

## The fix did not work, and that is the real finding

Re-run with THREE SEPARATE AGENTS, one vote each, fresh context, key and
explanation withheld by instruction, different reading stances:

    distinct answer-strings: 1 of 3
    agreement with key:      84/84, 84/84, 84/84

Identical. So the collapse was never about shared context — same-model
agents converge on reading comprehension whether or not they can see
each other's work.

**The with-passage VOTE therefore has no discriminating power.** "3 of 3
agree with the key" is close to a tautology: if the model can answer the
item at all, every voter answers it the same way. A gate that cannot
return a negative is not a gate.

This is the seventh instrument on this project to fail the same way — it
looked like it was working because the batch it was built on (s2) was
bad enough to split a single reader against itself.

## What replaces it

Two things, neither of them a vote:

1. **The FLAGGING task.** Voters asked to answer AND to flag broken items
   found real defects: two separate agents independently flagged
   RW4-S09-6 and RW4-S12-5. Flagging asks for a judgement the model can
   actually vary on; answering does not.
2. **A human sitting (register B5).** A person is the only reader in this
   pipeline that can disagree with the model at all. That is now the
   argument for B5, rather than thoroughness.

Report the vote's coverage if you like, but never its agreement rate as
evidence of item quality.

## What this does NOT invalidate

The blind attack has always used one agent for three solvers and reports
distinct pick-strings every time (s3 3/3, s4 3/3, isee-math-s4 3/3),
because those solvers are given genuinely different HEURISTICS to
execute rather than the same judgement to repeat. A heuristic is a
procedure; a reading stance is a mood.

The s4 vote's FLAGS remain valuable and were acted on — a careful single
reader found a wrong key and three stem defects. What it could not
provide was agreement.

## Consequence for already-shipped batches

s3 shipped on a 2-of-3 vote, so its 98.7% agreement figure should be
read as roughly two readings, not three. Its OTHER gates — blind attack
−15.7/−5.2, hunter exploitable=false, cross-variant over all 1320 spans
— are unaffected. Nothing is being un-shipped on this; the number is
being re-labelled.
