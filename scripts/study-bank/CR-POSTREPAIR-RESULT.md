# Choose a Response, after the register repair — the repair did not work

Run `cr-postrepair-2026-08-06`. 65 items (all live Choose a Response
except the 7 whose prior attack was still fresh), 3 independent solvers,
source withheld. Scored through `attack-cohort.mjs ingest`, persisted to
`study_item_attacks`.

    blind score        74.4%
    control            29.2%   (best fixed letter)
    margin            +45.1pts
    all three solvers  40/65 items

## The prediction, and how wrong it was

Before running it I wrote down 28.4%, reasoning that the register slot
removed one option of four on 43% of items and nothing else had changed.
The result was 74.4%. **The prediction was wrong by 46 points**, and it
was wrong in the direction that flatters the work: I predicted the
repair would leave a defect, and in fact it left very nearly all of it.

## The repair bought ~3 points

    group        items   blind    accuracy on COMMITTED picks   all-3
    repaired        24   72.2%              86.7%               13/24
    untouched       41   75.6%              95.9%               27/41

Splitting by cohort:

    cr-v1           53   76.7%              92.4%               34/53
    cr-v2           12   63.9%              92.0%                6/12

The number that matters is the third column. **When a solver commits to
an answer, it is right about 92% of the time, with no audio.** That is
true of the items I repaired, the items I did not, and both authoring
cohorts. cr-v2 looks better on the blind column only because solvers
abstained more often — its committed accuracy is identical. It is not a
safe template.

These are not listening questions. They are readable from the options.

## Why the repair could not have worked

All three solvers independently described the same structure, unprompted
— an item's four options are one accept-and-act reply plus three
recognisable archetypes:

  * a parodic over-formal register
  * a rude or escalating one
  * a dismissive minimiser
  * a topic-shifting question

That is the four-slot distractor brief. Removing ONE slot leaves three,
and the key is still identifiable as the option that is none of them.
The fix treated a symptom of the brief as if it were the defect.

## The detector under-counted, again

The explanation-based detector found 24 register distractors in cr-v1.
Solver C quoted three more that it had missed — 25eca95b ("I hereby
consent to any further diagnostic procedures you deem appropriate"),
17d5acca ("I should like to lodge a formal complaint"), 012fc0d9 ("I
accept responsibility for your luggage"). All three are cr-v1, all three
are the same designed slot. They were missed because their authors
described it in words the regex did not carry: "consent-form language no
patient would speak aloud", "absurdly formal for a moment's favour", and
in one case not as register at all ("escalates against someone who is
trying to help").

This is the fourth time in two days a measure has found the instances it
was written for and missed the adjacent ones — after Email 4-grams,
Build-a-Sentence first-3-chips, and the SAT Math hub. The detector was
reading the author's PROSE as a proxy for the author's ITEM, and prose
varies.

A blind solver found them in one pass. That is the standing lesson from
CLAUDE.md restated with a fresh example: the attack is the gate, and the
cheap structural checks are pre-flight only.

## Two further tells the solvers found for free

  * **Typographic.** Several options carry a stray em dash in a position
    natural prose would not put one ("...notified — of the theft",
    "...mine's been acting up — for a couple of weeks now"). Solver B
    reports these were never the plausible reply. Exactly checkable and
    not yet measured.
  * **Internally decidable items.** Item 2 turns on arithmetic, item 42
    on a self-contradiction (a sealed paper copy arriving by email —
    which is an option this repair introduced). Some items can be solved
    without any prompt at all, by eliminating the incoherent option.

The second is a caution about the repair itself: writing a
"cooperative but wrong" distractor risks making it wrong in a way that
is visible without the prompt. At least one of the 24 did exactly that.

## What this means for A3

The narrowed A3 — repair rather than rebuild — is **refuted by
measurement**, not by argument. It was the right thing to try, it was
cheap, and it is now decided: cr-v1 needs re-authoring, and cr-v2 is not
the template to author toward.

The rebuild carries a known risk recorded in this directory: re-authoring
this task type produced a 95%-blind batch in July. So the brief has to
change, not just the items. The property the current brief lacks:

> **Every option must be a natural reply to SOME plausible prompt.**
> The question is which one fits the line that was actually spoken —
> not which one is a well-behaved reply at all.

Under the current brief three of four options are replies no competent
speaker would give to anything, which is why the key is findable without
listening. A brief that fixes this cannot also specify a fixed roster of
distractor types, because a fixed roster is what produced the tell.

And the attack has to run DURING authoring, on a held-out slice, not
after the batch is complete.
