# reading-worlds-s3 — targeted set-as-puzzle attack (2026-08-29)

A solver was told the exploit and instructed to try it: enumerate each
topic's 4-5 mutually exclusive worlds from option text, commit to one,
and answer all six items consistently.

    per-item   16/78 = 20.5%
    SSAT        7/48 = 14.6%   control 20.0   margin −5.4
    ISEE        9/30 = 30.0%   control 25.0   margin +5.0

At chance. The exploit does not work.

## Why it fails, which is the interesting part

The solver was right that the closed-world structure is real and legible
— it enumerated the variant families correctly in 11 of 13 sets, often
almost verbatim. What it could not do is tell WHICH world was shown.

Its own confidence ratings are anti-correlated with being right:

    RW3-S03  confidence HIGH    0/6
    RW3-I01  confidence HIGH    1/6
    RW3-S06  confidence medium  4/6
    RW3-I03  confidence LOW     5/6

It flagged four "leaks" where a stem or vocabulary item seemed to name
world-specific nouns — S03's cores cutting through snow, I05's buoy and
tide tables, I02's "reserve" logbook column, I01's keeper's logbook. It
scored 0/6 and 1/6 on the two it was most sure of. **The leaks pointed at
the wrong world.** A signal that confidently misleads is not a tell.

## The real limitation, which is psychometric rather than security

Two topics of 13 came out at 4/6 or better, against roughly 0.7 expected
if the six items were independent. Aggregate accuracy is still at chance
because the other eleven came out at 0-2/6. That is the shape the solver
predicted: **get the family right and score ~5/6, wrong and score ~0/6.**

So the design is not GUESSABLE — expected score is chance — but it is
HIGH VARIANCE at the topic level. Combined with the hunter's finding
that all six keys in a topic come from one variant, the consequence for
assembly is concrete:

  * effective n is TOPICS, not items
  * a reading section built from few topics is far less reliable than
    its item count suggests
  * spread a form across as many topics as possible; do not lean on 6
    items from one passage

This belongs in the blueprint work, not in the item gate.

## One structural redundancy worth fixing

In RW3-S07 the stance item (5) and the paragraph-function item (6) both
restate the same hedge — "confident about this pond but unwilling to
speak for others" and "confine the finding to the single pond". A
candidate answering both by convention gets a matched pair. Same shape as
the restatement pairs noted in the blind attack (I01-2/I01-3,
I03-2/I03-3, S07-1/S07-3): these cannot be independently wrong and
should not both be scored on one form.

Again an ASSEMBLY constraint, not an item defect — the items are sound
individually.
