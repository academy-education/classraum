# ssat-verbal-s5 — pre-registered 2026-08-31

SSAT verbal is the last section short of a second form: 101 items, 1.68
forms against a 60-item section.

## Why the previous attempt died, and why this is not a retry

ssat-verbal-s4 was killed the same day: a blind solver scored 80% from
the OPTIONS ALONE. The mechanism was a POLAR PAIR in every item — an
antonym for synonyms, an order-reversal for analogies — with the key
always one of the two, so three of five options were eliminable without
the stem.

The brief caused it. It named the distractor types: "a word meaning the
OPPOSITE", "the same two categories in REVERSED order". A distractor
defined by its relation TO THE KEY is recognisable only by reference to
the key, and therefore points at it.

The register records four rounds of exactly this failure on Choose a
Response — cr-v1 through cr-v6, each removing one tell and introducing
another — and records that the fix was a change of METHOD, not another
brief. cr-v7 wrote N complete symmetric worlds and let a seeded RNG pick
the shown one after text freeze, so no author knew the key. It has held
at +1.4 ever since.

## The method transferred to verbal

BIJECTIVE SETS. A topic is five (stem, answer) rows where each answer is
correct for exactly one stem and wrong for the other four. The five
answers are the option set; a seeded RNG picks which stem is shown after
the text is frozen.

There is then no distractor ROLE at all. Every option is the right
answer to a different question, so nothing can be identified as "the one
put there to be wrong". The property that killed s4 cannot exist in a
set with no asymmetry between key and distractors.

    synonyms   five words in one loose domain (temperament, speech,
               motion), five synonyms, bijective
    analogies  five source pairs sharing a field, five answer pairs,
               each expressing exactly one source's relation

## Pre-registered bars, fixed before any item exists

    blind attack   pass <= +25, dead >= +30, control = best fixed letter
    exclusivity    every off-diagonal cell checkable: an answer must be
                   wrong for the four stems it does not belong to, with a
                   stated reason. A reason that cannot be written means
                   the set is not bijective.

    THE NUMBER THIS RUN IS ABOUT: s4 scored +28.0 and its best solver hit
    80%. This run predicts a margin AT OR BELOW +10, and NO SINGLE SOLVER
    ABOVE 40%.

    Above +25 the method has not transferred and SSAT verbal stays at one
    form until someone finds a third construction. Reporting a
    single-solver maximum as well as the mean is deliberate: s4's mean of
    +28.0 sat in the "inconclusive" band while one solver was at +60, and
    averaging nearly hid a dead batch.

## Batch

    15 synonym topics + 15 analogy topics = 30 items

Enough to take SSAT verbal to roughly 131 items and 2.18 forms if the
yield holds. Deliberately not more: if the method does not transfer,
30 items is the cost of finding out.
