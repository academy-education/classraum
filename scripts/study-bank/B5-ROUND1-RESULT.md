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


## Repaired — and two things I had wrong, both caught by the repairer

Nine ISEE items now quote the phrase carrying the key's sense:

    "keep"    -> As it is used in "would keep its wool in the undercroft,"
    "score"   -> As it is used in "A score of years went by before the revival,"
    "current" -> As it is used in "The current in the channel runs two knots,"
    ...and six more

Each was applied only after the applier checked the quote is VERBATIM in
the stored passage, appears EXACTLY ONCE, and contains the target word.
13 ambiguous -> 4, and the 4 remaining are the weak class (x2 across a
whole passage, where both uses may share a sense).

**MY "sibling items already do this" PREMISE WAS FALSE.** I told the
repairer — and Andy — that other items in this cohort already quote a
phrase, so the repair was matching an established house style. The
repairer searched all 6,674 rows and found ZERO stems of that shape. The
only quoting stems in the bank point at a region ("As it is used in the
passage"), not a phrase. I had read the reviewer's example — "in the
paragraph describing the second season" — as a quoted phrase when it
describes a paragraph. These nine are the FIRST items in this style, so
it becomes the house style by precedent rather than by matching one.
Fourth unverified claim I passed on today.

**THE CHECKER WOULD HAVE PASSED THE REPAIR FOR THE WRONG REASON.** Also
caught by the repairer, not by me. `check-vocab-ambiguity.mjs` keyed off
`/\b(first|second|third|...)\s+paragraph\b/`; the repaired stems no
longer contain that, so they fell out of the DENOMINATOR — 14 pointed
items became 5 — and would have read as fixed whether or not the quote
disambiguated anything. A repair that makes its own gate stop looking at
it is not gated.

The checker now has a branch for quoted stems that asserts the three
properties the applier checks, and it FAILS an item whose quote is not
verbatim, not unique, or does not contain the word. Break-tested: change
"A score of years" to "A score of summers" in the stem and it reports
`QUOTED STEM FAILS: quote is not verbatim in the passage`.
