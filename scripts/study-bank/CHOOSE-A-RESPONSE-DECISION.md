# Choose a Response: keep the 72 items, and say what they cost

Decision, 2026-08-06. Three authoring rounds have failed to fix this
cohort; this records what we do instead and why the obvious alternative
is not available.

---

## What is actually established

    instrument            score      control    margin
    three model solvers   91.7%      25.0%      +66.7
    one human reviewer    55.0%      25.0%      +30.0   3.1 sd, p<0.001
    official ETS items       —          —       +25.5

This is the ONE cohort where the model attack and the human sitting
agree, because its tell is structural rather than world knowledge. It is
also the worst cohort on item quality — 4 of 20 items reviewed had a
second defensible answer or a broken key, ten times the rate of the
other three cohorts.

Three rounds of repair:

    repair-v1  distractors rewritten, 71 items      +40.4   FAIL
    crv2       16 rebuilt, 4 authors                +14.6   pass blind,
                                                            fail answerability
    crv3       32 rebuilt, 8 authors, more rules    +39.6   FAIL both

crv2 is the only batch that has ever cleared the blind gate, and it
failed the answerability gate at 6 of 16. Nothing has been inserted.

## Why "retire the cohort" is not on the table

Choose a Response is **14 of 48 delivered and 8 of 20 scored** in TOEFL
Listening Stage 1, with 9 and 3 more on the two Stage 2 paths
(`BLUEPRINT`, src/lib/study/assemble.ts). Those counts are ETS Table 1
exactly, and the quotas are interlocking — conversation and announcement
counts are even because those audios exist only in sets of 2 and 4, so
they cannot absorb a reallocation.

Deleting the cohort therefore does not degrade the section. It makes the
section unassemblable to spec, and the fallback would be a Listening
test that silently stops matching the exam it claims to mirror. That is
strictly worse than a section built partly from items that are easier
than they should be.

## The decision

**Keep them, and stop calling the Listening score ETS-equivalent.**

1. `toefl-section-score.ts` said Reading and Listening "already match
   ETS exactly". That is true of the ARITHMETIC and no longer true of
   the items. The comment now states the measured gap and points here.
2. The finish bar already shows this cohort in red, "too guessable —
   confirmed by hand", which is the only cohort that has earned that
   colour.
3. **No correction factor.** The temptation is to subtract points from
   Listening to compensate. There is no student data to fit such a
   factor to, and inventing one replaces a known bias with an unknown
   one — the exact "silent wrong number" failure CLAUDE.md records for
   the band-vs-30 mismatch and the topic_relevance zero.

## What would change this

- **A second human reviewer.** Everything above rests on one person.
  `reviewerAgreement` (src/lib/study/item-review.ts) now measures
  whether a second reader reproduces the picks, and the review panel
  shows an explicit empty state until one does. If two readers scatter,
  the +30.0 was that reader's habit and this decision reopens.
- **A round that clears BOTH gates.** crv2 cleared one. The next attempt
  should start from crv2's four items that passed both (1, 4, 10, 14),
  not from the crv3 brief, and must be measured by the held-out panel
  that has never been spent.

## What this does NOT license

Saying the bank is fine. A student practising Listening here will score
higher than they will on test day by an amount nobody has measured, and
that is a real cost being accepted knowingly rather than a problem
solved.
