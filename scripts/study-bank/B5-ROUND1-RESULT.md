# B5 round 1 — 39 items, one flag, and the flag was worth the sitting

**Sat 2026-09-01, 14:23–14:33 KST. support@classraum.com.**
39 items across 30 of 31 authoring cohorts. **38 keep, 1 flag.**

Against the pre-registered rule — 0–1 problems means the defect rate is
likely under 5% and the bank ships; 5+ means drill — this is a **pass**.

## The one flag

    "As it is used in the third paragraph, the word 'keep' most nearly
     means"                                    key: storing wool

His note: the stem points at a paragraph without saying which occurrence,
unlike sibling items in the same set that specify ("in the paragraph
describing the second season"). Verified — that paragraph uses "keep"
FOUR times in FOUR senses:

    "would keep its wool in the undercroft, storing the fleeces"  storing
    "No keep or stronghold stood above the meadow"                fortress
    "the carters were given no keep, since board and lodging"     provisions
    "did not keep the feast of Michael"                           observing

All four options are defensible depending on which one the student
reads. He is right, and his note names the fix.

## Why no machine gate could have caught it

The key is correct for one occurrence. Every option is a real sense of
the word. The blind attack cannot fire — the stem gives nothing away, so
an options-only solver is at chance whether the item is sound or not.
Key-position, length-rank, option-duplication and answer-spread checks
all pass. The defect lives in the relationship between a stem and a
paragraph, and only a reader holds both at once.

This is the first defect in this bank found by a human, and it is a
class the machine gates are structurally blind to.

## From one instance to the population

The defect is DECIDABLE, so `check-vocab-ambiguity.mjs` measures the
whole bank rather than sampling it:

    isee/reading    10 of 14 pointed vocab items ambiguous   71%
    toefl/reading    3 of 54                                  5.6%
    sat/r&w          0 of  9
    ssat/reading     0 of 23
    TOTAL           13 of 100                                13.0%

Concentrated, as every defect here has been. The strong cases are all
`isee-reading-worlds-s5`: "line" x4, "drop" x4, "fix" x4, "return" x4 in
the named paragraph — the same polysemy device as "keep", with stems
that never disambiguate. `isee-reading-worlds-s3` has two at x2.

The three TOEFL cases are weaker: x2 across a whole passage under "as
used in the passage", where both uses may share one sense. They are
listed, not condemned.

## The shape of the result

A human read 39 items in ten minutes and found one defect. The machine
then turned that one instance into thirteen, in a cohort nobody had
suspected, in about a minute. Neither half works alone: the checker
could not have been written without the flag, and the flag would have
stayed a single item without the checker.
