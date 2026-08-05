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

---

# Addendum: Choose a Response — the cohort that was missing

**55.0% blind against a 25.0% control. +30.0, and 3.1 SD above chance
(11 of 20, expected 5, sd 1.94, p < 0.001).**

The first human result that clears the noise band decisively — and it
lands on precisely the cohort the model attack rated worst.

    cohort              human    control   margin   model
    Announcement        15.0%     25.0%    -10.0    100%
    Daily Life          25.0%     25.0%     +0.0    100%
    Academic Passage    41.7%     25.0%    +16.7    100%
    Choose a Response   55.0%     25.0%    +30.0    100%  (+40.4 margin)

## The instruments now agree, but only here

For the three passage/announcement cohorts the model said 100% and a
human scored at or below chance. That gap is world knowledge: a model
answers comprehension questions about coral reefs or campus notices
from what it already knows; a student cannot.

Choose a Response has no such passage. Its measured tells are
STRUCTURAL — options authored from the key, and 94.4% of stimuli
sharing one grant-then-qualify shape. Structure is available to a
person too. So this is the cohort where the two instruments should
agree, and they do.

## He could not say why

The notes here are a different KIND from every other cohort. Elsewhere
he named tells and got those items right:

> "everything else mentions kind of a street... but the answer doesn't"
> "Everything is negative except the answer"

Here, all five notes are ambiguity complaints:

> "C is also a good answer."
> "The responses are all sort of possible."
> "C is also a decent answer. There is nothing unique about B."
> "A could also be an answer."

He scored 55% while reporting he could not tell the options apart, and
left FEWER notes than on Daily Life. Whatever he was using, he could
not articulate it — which is what a shared rhetorical shape looks like
from the inside. "Answer the second clause" is a rule you can apply
without noticing you have one.

## It is also the worst cohort on quality

    Choose a Response   20 items   2 broken, 2 alternative   = 4 (20%)
    other three         52 items   1 broken, 1 alternative   = 2 (3.8%)

Ten times the rate. So this cohort is BOTH guessable and ambiguous,
confirmed by a human on both axes independently.

## What this settles

- **The +40.4 on Choose a Response is real.** Not an artefact of model
  world knowledge. A person reproduces it.
- **The 100% on the passage cohorts is not.** Same instrument, same
  claim, and a human lands at chance.
- **So the finish bar's "1,746 too guessable" is wrong as a single
  number.** It is built entirely from model solve rates, which are
  sound where the tell is structural and inflated where the item has a
  passage a model happens to know about. The cohorts need separating,
  not one bar.
- **The repair target is now specific**: Choose a Response first, on
  both defects, and the authoring brief's speech-act variety rule
  (added 2026-08-05) is aimed at exactly the shape that leaks.

## Caveat, unchanged

One reviewer, 72 items total. Enough to separate 55% from 15%. Not
enough to put an interval on any single cohort. And he is a founder,
not a TOEFL candidate — a coached student may exploit these tells more
readily, not less.
