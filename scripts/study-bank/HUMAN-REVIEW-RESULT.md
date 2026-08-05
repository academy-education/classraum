# The human instrument, first results — 52 items, 2026-08-06

**A person scored 25.0% blind across 52 items in three cohorts the model
attack rated 100% guessable. But the aggregate hid the finding.**

---

## The headline number, and why it is misleading on its own

    cohort              n    correct   score    his control   margin
    Academic Passage    12       5     41.7%      25.0%       +16.7
    Announcement        20       3     15.0%      25.0%       -10.0
    Daily Life          20       5     25.0%      25.0%        +0.0
    COMBINED            52      13     25.0%      25.0%        +0.0

Exactly chance. Against a MODEL attack that scored 100% on every one of
these cohorts, with every solver getting every item.

The first reading — mine — was that the blind attack conflates "this
item leaks" with "a frontier model knows this subject", and that the
1,742-item problem was largely an artefact of the instrument.

That reading was published before the data was split, and it was wrong
in the direction of letting the bank off.

## Split by whether he left a note, it is bimodal

    items he left a note on      13     8 correct     61.5%
    items he said nothing about  39     5 correct     12.8%

Two populations cancelling out. Where he could see something he was
right nearly two thirds of the time; where he could not, he was well
below chance. An average of 25% describes neither.

## What he saw, in his own words

Seven of the eight he got blind describe ONE mechanism, unprompted:

> "the other three seem like a category and erosion is the only thing
>  that stands out from that category"
> "All the other answers had the name of a famous painter except for
>  the answer"
> "Everything else seems to be centered around the word critics whereas
>  the answer was based on the public"
> "everything else but the answer mentions the word 'personal growth'"
> "everything else mentions kind of a street or something regarding
>  buildings but the answer doesn't"
> "Everything is negative except the answer"
> "only answer with advanced notice"

That is the odd-one-out tell: distractors authored as a matched SET,
the key standing outside it. It is the same mechanism three model
solvers described independently — and it is now confirmed as
human-usable, by someone who had never been told what to look for.

## The corrected conclusion

Both of these are true and the earlier write-up said only the first:

1. **The model's 100% overstates the defect badly.** A model answers
   passage comprehension from world knowledge a student does not have.
   For passage-based cohorts that effect dominates the score.
2. **The defect is real in roughly a quarter of items.** 13 of 52 carry
   a tell a person finds without being primed, and finds reliably.

So the QC programme was measuring something, but not the thing it
claimed, and not at the magnitude it reported.

## Two item-level findings

**One genuinely mis-keyed item** (Daily Life), verdict `broken`:

> "The answer should be not talk to their roommate about switching
>  because it's not that the roommate is the one switching. It's Jamie
>  switching with Alex. So the answer is wrong."

**"Space permitting" recurs across three separate items**, and all three
notes say the key misuses it — "in this context 'space permitting'
doesn't sound right", "seems more like 'time' space not 'location'
space". One phrase, reused, wrong each time. Seventh instance of the
batch-level pattern this investigation keeps finding.

## Phase 2: the keys are sound

    50 of 52   the marked answer is the only defensible one
     1 of 52   another option also defensible
     1 of 52   broken (the mis-key above)
     1 of 52   read as written-to-a-template

The "ambiguous keys" hypothesis is dead. These are not badly written
questions; a person reading them with the source in front of them
thinks they are fine. The defect is in the option SET, not the key.

## What is still untested

**Choose a Response** — the cohort with the +40.4 margin and the 94.4%
concessive-shape tell, and the one where the model's tells were
structural rather than knowledge-based. Three sittings, three other
cohorts: the picker is sorted by item count and with 71 items that
cohort sits near the bottom of a long list. A UI problem, not a reviewer
problem. Next run is drawn server-side so the resume path lands him in
it directly.

## Method note

Every number here comes from one reviewer. n=52 is enough to separate
100% from chance; it is not enough to put a confidence interval on 61.5%
vs 12.8%. The direction is solid, the magnitudes are not.
