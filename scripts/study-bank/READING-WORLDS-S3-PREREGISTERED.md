# reading-worlds-s3 — pre-registered 2026-08-29

Third run of symmetric-worlds reading. Purpose: fix the ONE defect s2
measured, and raise the QC yield enough that the reading bank can fill a
form.

## Why another run at all — the population, measured

    SSAT   verbal   60 needed / 101 have    ok
           math     50 needed /  77 have    ok
           reading  40 needed /  19 have    SHORT BY 21

    ISEE   verbal   40 needed /  96 have    ok
           math     84 needed /  85 have    exactly one form
           reading  36 needed /  38 have    exactly one form

SSAT cannot assemble a single complete form. ISEE can assemble exactly
one, which a student taking it twice would see twice. Reading is the
binding constraint on both, and it is the only section where it binds.
This was measured before authoring rather than assumed, per CLAUDE.md's
rule about believing a backlog entry.

## The defect being fixed

s2 shipped 38 of 106. The attack margins were the best measured on this
project (−15.7 SSAT, −5.2 ISEE) and the with-passage QC vote was the
worst (60 of 106 below 2/3). Both follow from one property: distractors
are sibling variants' answers, so a tight skeleton defeats the blind
solver AND converges the options.

The mechanism, from RW-S11 q3 — five sibling answers to one question:

    W1  keeps the original buzzing reed
    W2  replaces the sweet reed with a plainer one
    W3  keeps the replacement reed and tunes the row to it
    W4  replaces the sweet reed with a heavier one
    W5  cuts a replacement reed of her own

Every one turns on the same axis: what Vesna does with the reed. Shown
W1's passage, a reader rejects W3 only by tracking exactly which reed
ends up in the instrument. W1's text does not CONTRADICT W3 — it simply
does not assert it. Absence of support is not refutation, and three
graders reading carefully split on exactly this kind of pair.

My first statement of the cure was "make each variant's answer turn on a
different named quantity". That is too weak and partly wrong: several s2
pairs DID differ in axis (weights-across-slopes vs weights-across-years)
and still split the vote. The property that actually distinguishes a
sound item is decisiveness, not axis-diversity.

## The change: every sibling answer must be KILLED IN TEXT

For each variant V, and each of the N−1 sibling answers to each
question, the author must supply a `kills` entry: a VERBATIM span from
V's own passage that makes that sibling answer FALSE — not merely
unsupported.

This is the same discipline the `why` field already applies to an item's
own answer, extended to its distractors. It is what cr-v7 did with
1,584 machine-verified kill quotes, and that cohort holds at +1.4.

Two gates enforce it, one free and one not:

  1. MECHANICAL (render-reading-worlds.mjs): every kill span must appear
     verbatim in that variant's passage. An author who invents a quote
     is refused, loudly, per topic.
  2. SEMANTIC (agent): does the span actually refute the sibling, or
     merely fail to support it? "The passage doesn't mention X" is a
     REJECT. This is the judgement the mechanical check cannot make and
     is where s2's items would have died.

## Pre-registered bars — set before any item exists

    blind attack       pass ≤ +25, dead ≥ +30, control = best fixed letter
    with-passage QC    3 voters; ship only ≥2/3 agreement with the key
    cross-variant      each answer fits its own variant and no other
    kill-span verbatim 100% or the topic drops
    pattern hunter     exploitable = false

    YIELD, the number this run exists to move: s2 shipped 36%.
    This run predicts ≥60%. Below 50% the kill-span brief has FAILED
    and symmetric worlds is capped where s2 left it — record that and
    stop iterating the brief, exactly as the cr-v1..v6 sequence should
    have been stopped earlier.

Predicting the yield in advance is the point. s2's 36% was reported
after the fact and could be rationalised either way.

## Batch

    SSAT   8 topics x 5 variants x 6 questions = 48 raw
    ISEE   5 topics x 4 variants x 6 questions = 30 raw

Deliberately NOT the full amount needed. If the brief works, the second
half is authored against a measured yield rather than a hoped-for one.
If it does not, 78 questions is the cost of finding out instead of ~300.

Peterson's SSAT/ISEE PDFs remain calibration reference ONLY — no item,
passage or phrasing is ingested from them.
