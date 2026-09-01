# TOEFL Reading difficulty is a DEFAULT, not a measurement

**2026-09-01.** Asked to author more questions, I measured first. The
question that fell out is better than the authoring would have been.

## What the bank says

    toefl/reading   821 live   0 easy / 23 medium / 798 hard

97% hard, and no easy item at all. Per cohort:

    harvest-v1        0 / 3 / 581
    orphan-v1         0 / 20 / 54
    dl-siblings-v1    0 / 0 / 69
    dl-fresh-v3       0 / 0 / 60
    dl-fresh-v1       0 / 0 / 34

Three cohorts are 100% hard with no variation at n = 69, 60 and 34. No
grader produces that. A default does.

## And there it is

`toefl-bank-helper.mjs`, three separate insert paths:

    difficulty: it.difficulty || 'hard'

Every item whose authoring batch omitted a difficulty was banked HARD.
`verify_meta.grader_difficulty` is absent on all 821 rows, so no
difficulty grader has ever run on this section. The label was never a
claim about the item.

## Why it matters

TOEFL Module 2 routes on this label. A student who does badly in Module
1 is routed to the easier module — and `difficultiesForToeflModule2`
asks the bank for easy/medium items that, by this label, do not exist.

The draw already survives it: difficulty is applied as a PREFERENCE, not
a filter, after a real incident on 2026-07-27 where a routed student
received 19 items instead of 32. So nothing is broken and nobody gets a
malformed test.

What is broken is the ADAPTIVITY. A struggling student routes to "easy"
and is served the same items as everyone else, because the bank believes
it has nothing easier. That is the same failure as the reading format
fixed this morning: a mock harder than the exam tells a student they are
less ready than they are.

## The thing NOT to do

Author easy items. That was my first instinct and it is wrong: it would
add items to a bank that most likely already holds easy and medium ones,
mislabelled. The population has never been measured, and CLAUDE.md
already records what happens when you act on an unmeasured backlog — the
SAT maths hub was "bank-wide 64.4%" and was really 98.3% of one cohort
against 8.0% of the rest, where acting on the backlog would have
rewritten ~690 sound items.

## What is being done instead

A blind grade of 48 items currently labelled `hard`, drawn across all
five cohorts, with the stored label withheld from the grader (asserted:
the file contains no difficulty field). If a large share grade easy or
medium, the label is confirmed meaningless and the fix is to GRADE the
existing 821 rather than author against a phantom gap.

If instead they really are hard, the gap is real and authoring is
justified — and this document is the record that it was checked first.

## Whatever the result

`difficulty: it.difficulty || 'hard'` should not survive. A default that
silently asserts the strongest band is how a whole section came to claim
something nobody measured. It should refuse the item, or record the
default in verify_meta so it is visibly a default rather than a finding.
