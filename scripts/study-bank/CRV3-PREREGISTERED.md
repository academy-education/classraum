# crv3 — decision rule, written BEFORE the batch was authored

Committed ahead of the run so the bar cannot move after the numbers
land. 2026-08-06.

## Why this is written down at all

The obvious way to finish this cohort fast is to loop: author, measure,
fix what the graders flagged, measure again, repeat until the numbers
are good. That loop converges on satisfying THESE GRADERS, not on
producing good items — the same failure CLAUDE.md records for tuning
prompts against the two public ETS samples. It is invisible from inside
because every round genuinely improves the measured number.

Two structural defences, both of which cost nothing if the batch is
fine and everything if it is not:

1. **A held-out panel.** Five graders (3 blind, 2 with-source) iterate.
   A SECOND panel of five, freshly spawned with different framings,
   runs exactly ONCE, at the end, on the final file. Its number is the
   verdict. If the two panels disagree by more than 10pts, the
   iteration panel was fit to and the held-out number wins.

2. **One repair pass, not many.** Only items flagged by BOTH
   with-source readers are touched. A single targeted pass, then the
   held-out run. No second look at the iteration panel afterwards —
   that would make it a third round with extra steps.

## Sample size, stated up front

32 items, not 16. At 16 items x 3 solvers = 48 trials, a 10pt swing
between rounds is noise; the geometry pilot hit "exactly 25.0%" and
recorded it as a coincidence of averaging. 32 x 3 = 96 trials roughly
halves that. Widening the batch is the cheap way to buy resolution;
running more rounds is the expensive way to buy noise.

## The bars

A batch SHIPS to the bank only if the HELD-OUT panel returns all four:

    1. blind margin <= 29.5pts over the batch's own fixed-letter
       control. (ETS published reply items: +25.5, plus 4pt tolerance.)

    2. no two blind solvers produce an identical pick spread.

    3. at most 15% of items flagged by BOTH with-source readers as
       two-defensible, broken or construct-invalid. At 32 items that
       is 4. The crv2 pilot scored 6/16 = 37.5% and failed.

    4. no cross-item template covering more than 2 items in 32, where
       a template means a shape a candidate could learn and apply
       without the audio. Judged by an explicit question to both
       readers, not by regex — every tell that has mattered in this
       project was semantic and the scripts caught none of them.

Anything short of all four: the batch does not go in the bank, and the
result is written up as a negative. Three of the four distractor-repair
rounds on the geometry cohort were negatives, and each cost one agent
batch instead of a bank-wide rewrite.

## What a pass licenses, and what it does not

A pass licenses inserting THESE 32 items and authoring the rest of the
cohort by the same brief. It does NOT license believing the live 72
are fixed — those are separate items and must be measured separately.

And it does not settle the question the model instrument cannot answer.
Choose a Response is the one cohort where the model attack and the
human sitting agree (model 92-100%, human 55.0% against a 25.0%
control, p<0.001), which is why a model panel is admissible here at
all. A human sitting on the new items is still the confirming
instrument and should follow before the cohort is called done.
