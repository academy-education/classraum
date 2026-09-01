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

## The result: the label is right for 4% of items

48 items, every one stored as `hard`, graded blind with the label
withheld:

    graded easy    34
    graded medium  12
    graded hard     2      <- 4%

Per cohort, all stored 100% hard:

    harvest-v1        5 easy /  6 med / 1 hard    8% actually hard
    orphan-v1         7 easy /  4 med / 1 hard    8%
    dl-siblings-v1   12 easy /  0 med / 0 hard    0%
    dl-fresh-v1      10 easy /  2 med / 0 hard    0%

**The bank's easiest items were labelled its hardest.** The adaptivity is
not merely broken, it is inverted: a struggling student routes to the
easier module and the bank believes its easiest material is the hardest
it has.

The grader also reported the sample is BIMODAL and said so unprompted.
The Daily Life half (24 items) is 22 easy and near-identical in shape —
a short notice, a question asking for one literal detail, and distractors
that are simply other times or room numbers absent from the text. The
reader matches a string. That is defensible for a practical-reading task
type and it is not what the bank claims about them.

Its own caveat, recorded because it bounds the finding: it expects
another grader to agree closely on the Daily Life block, to move 4-6
items across the easy/medium line in the academic half, and to disagree
most on `hard`, where nothing in the sample was unmistakably hard.
Direction is solid, exact counts are not.

## Whatever the result

`difficulty: it.difficulty || 'hard'` should not survive. A default that
silently asserts the strongest band is how a whole section came to claim
something nobody measured. It should refuse the item, or record the
default in verify_meta so it is visibly a default rather than a finding.


## Blast radius, measured across the whole bank

    section              n     easy/med/hard    %hard   graded
    sat/math           935     52/682/201        21%     100%
    sat/reading_writing 918    111/616/191       21%     100%
    toefl/reading      821       0/23/798        97%       0%   <-- broken
    toefl/listening    802     118/356/328       41%       0%
    toefl/writing      347      24/80/243        70%       0%
    toefl/speaking     216      57/56/103        48%       0%

**SAT is the only family with a real difficulty grade** — 100% of its
1,853 items carry `grader_difficulty`. Every one of TOEFL's 2,186 items
is ungraded, and reading is the section where the default did the most
damage because its authoring batches most often omitted a difficulty.

Ten cohorts with n >= 20 sit in a SINGLE band, which is the default's
fingerprint: toefl/cr-v7 (132, all hard), dl-siblings-v1 (69),
dl-fresh-v3 (60), a null-cohort of 48, cr-v8 (46), cr-v9 (36),
dl-fresh-v1 (34), interview-v2 (32), ssat-verbal-s5 (23, all medium) and
sat/rsw2 (22).

## And one I introduced the same day

The three maths cohorts inserted on 2026-09-01 carried
`verify_meta.grader_difficulty` holding the AUTHOR'S OWN label. I built
their qc.json as `{ difficulty: it.difficulty }`, copying the authoring
agent's self-report into a field whose name claims a second opinion. All
125 rows agreed with themselves, which is the tell — a real grader
disagrees sometimes.

That is the same defect as `it.difficulty || 'hard'`: a stored value
asserting a measurement nobody made. I introduced it while fixing the
other one.

Repaired, not deleted — the author's label is a real if weak signal and
the items are sandbox-verified. It is renamed `author_reported_difficulty`
and flagged `difficulty_ungraded`, so a future audit does not count these
as already graded and skip them. Verified after the write: 0 rows still
claim a grade, 125 flagged ungraded.


## The full regrade: 821 items, four independent graders

Applied 2026-09-01. Every item graded blind, stored label withheld and
asserted absent from each batch file.

    411  hard -> easy
    347  hard -> medium
     40  hard -> hard      <- the label was right for 5% of them
     12  medium -> easy
     11  medium -> medium

    before   0 easy / 23 medium / 798 hard
    after  423 easy / 358 medium /  40 hard

The four graders never saw each other's work and returned 51/45/3.8,
48/47/4.4, 56/39/5.3 and 51/43/6.0 percent. That agreement across
independent readers is what makes this safe to act on; a single grader
at 71% easy would not have been.

**Effect on the thing that was broken.** A student routed to the easier
module can now be served 781 items at their level. Before the regrade
the bank believed it had 23.

## Provenance is recorded, because two labels here have already lied

Every row now carries `grader_difficulty`, `difficulty_graded_at`,
`difficulty_graded_by`, `difficulty_before` and the grader's one-line
reason. The bank has already held one label that was an insert default
and another that was an author's self-report wearing a grader's name; a
third that did not say where it came from would not have been an
improvement.

## What the graders found that difficulty does not capture

Recorded because it is worth more than the regrade and none of it was
asked for:

- **~~Two items quote text the passage does not contain.~~ WITHDRAWN.**
  A grader reported that R0328 and R0330 ask about "subject to
  availability" and "time permitting" where their passages say "space
  permitting". Checked: BOTH phrases are present in their own passages.
  The claim is false, and the likely cause is the topic repetition every
  grader complained about — there are several near-identical Daily Life
  notices and one of them does say "space permitting".

  I relayed this to Andy as "two unambiguous bugs" before running the
  check, which took two seconds. A grader's finding is a hypothesis, and
  this file exists because unverified claims about the bank are exactly
  what it is for.
- **Several have two defensible answers** — R0240 (both options meet the
  passage's own definition of cognitive dissonance), R0494, R0225,
  R0433, R0100, R0016, R0022.
- **A large part of this section is not TOEFL Reading.** The
  multiple-choice half of batches 10-12 is Daily Life functional text —
  40-90 word notices with one located fact, closer to TOEIC Part 7 than
  to a 700-word academic passage. Not one MC item in those three files
  reached `hard`, and the top of the distribution is carried entirely by
  Complete-the-Words, which is a spelling/production task that does not
  appear on TOEFL Reading at all.
- **Heavy topic repetition** — cognitive dissonance in ~9 passages,
  Impressionism in ~8, coral reefs 5, plate tectonics 5. Every grader
  noted it independently and all three said the same thing: a candidate
  meeting the fourth Impressionism passage answers its EXCEPT item from
  the previous three.

The last two are about what this section IS, not how it is labelled, and
neither is fixed by regrading.


## Listening: 802 items regraded

    233 medium -> easy      109 medium -> medium
    148 hard -> medium      103 easy -> easy
    114 hard -> easy         66 hard -> hard
     14 medium -> hard       12 easy -> medium, 3 easy -> hard

    before  118 easy / 356 medium / 328 hard
    after   450 easy / 269 medium /  83 hard

Unlike reading, listening's stored labels were NOT a pure default: 278
of 802 already agreed (34.7%), against reading's 5%. So the listening
label carried real information and was simply too harsh — half the bank
sat a band above where three independent graders put it.

## The truncation, and what it cost

The batch builder sliced passages at 2,200 characters. Reading was
untouched (longest passage 1,384) but 82 listening transcripts — 10.2%,
longest 3,560 — lost their endings, and the re-grade against full text
found that **roughly a third of those items had their key supported ONLY
by post-cut material**. R0333's entire quoted stimulus was past the cut:
the item quoted text the grader could not see.

All three "defects" reported from the truncated pass — R0403, R0414,
R0469 — are in that list. Their keys are supported by the text I removed.
With full transcripts the same section returned ZERO defects.

Cost of the error: one wasted grading pass over 82 items, and three
false defect reports that I relayed to Andy before checking. Reading was
never at risk, which is the only reason this did not require redoing
1,623 items.

## Where TOEFL stands

    listening   450 / 269 /  83    graded 100%
    reading     423 / 358 /  40    graded 100%
    speaking     57 /  56 / 103    graded   0%
    writing      24 /  80 / 243    graded   0%

1,623 of 2,186 TOEFL items now carry a measured difficulty with full
provenance. Speaking and writing are free-response and route differently;
they are not blocked on this and are left ungraded rather than guessed.
