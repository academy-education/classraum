# The three "small data defects" — investigated, 2026-08-06

All three came from the co-founder's review notes. Investigating each
changed it. **Nothing has been written to the bank.**

---

## 1. "space permitting" — real, and 12× bigger than reported

He flagged it on three items. It is in **36 live items across 25
distinct passages — 27% of the whole Daily Life cohort.**

He was right that it is misused. It is being applied as a generic hedge
where the sense is not spatial at all:

    "Applicants should be available at least three days a week,
     space permitting."                                        nonsense
    "please send your part of the report by Friday evening,
     space permitting."                                        nonsense
    "I could see you briefly after class on Thursday,
     space permitting."                              should be TIME
    "later is possible space permitting"      should be SCHEDULE
    "The Outdoor Adventure Club is accepting new members,
     space permitting."                                        correct

The distribution is the giveaway:

    space permitting      36
    schedule permitting    3
    weather permitting     2
    time permitting        0
    if space allows        0

One phrase does the work of five. This is the eighth instance of the
pattern this repo keeps recording — **a batch authored to one brief
develops a uniformity no per-item check can see** — and the first where
the uniformity is a stock PHRASE rather than a structure.

**It is not a QC defect.** The phrase is in the passage, not the
options, and Daily Life is the cohort a human CLEARED (25.0% blind
against a 25.0% control). Nothing here leaks an answer. It is an
English-quality defect in a product that teaches English, which is a
different and slower kind of problem.

Repairing it means 25 separate judgements about the right replacement —
time / schedule / weather / space / delete the hedge entirely. That is
an authoring job, not a mechanical substitution, and it is well beyond
"a small data defect". 6 of the 36 are already reviewed and would go
stale (visibly, now that 076 is applied).

## 2. The mis-keyed item — I do not think it is mis-keyed

His note:

> "The answer should be not talk to their roommate about switching
>  because it's not that the roommate is the one switching. It's Jamie
>  switching with Alex. So the answer is wrong."

The item (9c6944db):

> Hi Jamie ... I wanted to ask if you'd be open to switching rooms with
> me for the next semester ... **If you're comfortable with it and your
> roommate agrees**, I'd really appreciate it.
>
> Q: What is Alex most likely hoping Jamie will do NEXT?
> key: "Talk to their roommate about switching"

Alex's request is explicitly conditional on Jamie's roommate agreeing.
The question asks what Jamie should do NEXT, and checking with the
roommate is the step the email actually asks for. The runner-up,
"Switch rooms with Alex before the term ends", is the eventual outcome
rather than the next step, and "before the term ends" contradicts "for
the next semester".

**So the key is defensible and I would not change it.** What is wrong
is the OPTION WORDING: "their roommate" can be read as Alex's roommate
rather than Jamie's, and that ambiguity is almost certainly what he
tripped over — his objection is about who is switching, which is
exactly what the pronoun leaves open.

The fix is to disambiguate the option ("Check with their own roommate
first"), not to re-key the item. Changing a key on a single reader's
objection, when the objection turns on a pronoun, would be the wrong
correction made confidently.

## 3. The near-duplicate pair — inherited, and not in the live bank

Items 38 and 48 of `choose-response-repair-v1` (noise through a shared
wall, hedged complaint). That file is the REJECTED distractor-only
repair; it was never inserted. The duplication was inherited from the
live cohort, so the real question is whether the live Choose a Response
items duplicate each other — and that cohort is the one already slated
for a rebuild, where dedup is part of the job rather than a patch.

## What I would do

- **Fix nothing today.** All three are either not what they were
  reported to be (2), or larger than the "small fix" framing supports
  (1), or already inside other planned work (3).
- **"space permitting" is worth doing** and should be scoped as its own
  batch: 25 passages, one authoring pass, measured only for English
  quality since the QC gate is already clean on this cohort.
- The mis-key needs one line changed, not a re-key, and it is worth
  pairing with the phrase repair so Daily Life is edited once rather
  than twice — every edit invalidates a review, and 6 of these items
  carry one.

## Method note

The instruction was to fix three defects. Checking each before touching
it turned one into a 36-item finding, one into a disagreement with the
reviewer, and one into a non-issue. That ratio is the argument for
looking first: the version of this task that "just applied the three
fixes" would have re-keyed a sound item on a pronoun misreading.
