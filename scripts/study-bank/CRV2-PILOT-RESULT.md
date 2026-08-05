# Choose a Response, rebuilt — pilot of 16, 2026-08-06

**Blind margin +55.9 → +14.6, inside the +29.5 published ceiling. The
first repair on this cohort to clear the blind gate.**

**And it is NOT ready to roll out to the other 72.** Two independent
with-source readers put 6 of 16 items outside single-defensible, and
both found the same new cross-item tell. Read to the end.

---

## Why a rebuild and not another repair

`choose-response-repair-v1` rewrote all 213 distractors of the live
cohort and failed every gate. Its own QC file records the reason: the
residual signal is RELATIONAL — three distractors form a matched set
and the key stands outside it — so per-option repair cannot reach it.
The margin fell 55.9 → 40.4 and stopped.

The human sitting of 2026-08-06 says the same thing in a reviewer's own
words. Seven of his eight correct blind answers describe one mechanism:

> "the other three seem like a category and erosion is the only thing
>  that stands out from that category"

So this pilot changed the stimuli too, and the acts and settings were
DEALT to four authors who could not see each other's work. `nearmiss-v1`
— 16 items, one agent, one brief — came back 16 concessions out of 16.
Uniformity is the failure mode; assigning the axis is the only mechanism
that does not depend on an author remembering to vary it.

## The blind result

Three independent solvers, options only, stimulus withheld. Key letters
dealt flat, so the control is exactly 25.0% and not an artefact.

    solver A   6/16 = 37.5%   spread 4/1/3/8
    solver B   8/16 = 50.0%   spread 6/4/2/4
    solver C   5/16 = 31.3%   spread 5/3/3/5
    MEAN 39.6%   control 25.0%   margin +14.6

    live cohort                    +55.9
    repair-v1 (distractors only)   +40.4
    crv2 (rebuilt)                 +14.6
    official ETS reply items       +25.5    <- the bar
    ceiling used                    29.5

Spreads all differ, so no deterministic tell. And every solver did WORSE
on its confident picks than on its guesses — A scored 3/11 confident
against 3/5 guessed. The rules they built actively misled them. On the
live cohort the confident picks were near-perfect. That inversion is
better evidence than the mean.

## The check that mattered most, and it contradicted my first reading

I published a caution before running it: that a +14.6 might be bought
with AMBIGUITY rather than repair, since an item with two good answers
is both hard to guess and unanswerable. That is a real failure mode —
the `repair-v1` QC file calls it the narrow corridor it did not clear.

It is not what happened here. Splitting the blind trials by what the
with-source readers said about each item:

    items BOTH readers call single-defensible (1,4,10,14)   25.0%   (3/12)
    items flagged by at least one reader                     44.4%   (16/36)

The four sound items score EXACTLY at chance blind. The guessable items
are the flawed ones. So the construction works when it is executed; the
batch's problem is answerability, not guessability, and those are
separable defects rather than one dial.

n=4 items, 12 trials. The direction is clear, the magnitude is not.

## The answerability failure

    reader X   5/16 single-defensible   8 two-defensible   3 construct-invalid
    reader Y   9/16 single-defensible   7 two-defensible   0
    agree on the verdict: 10/16

Six items are flagged by BOTH — 3, 6, 8, 9, 12, 13 — and that is the
number to act on, not either reader's total. Reader Y, whose brief was
to argue FOR the runner-up, names the shape:

> the stimulus is a request or offer with a detail attached, and the
> authors treated "engages the detail" as the discriminator. But
> engaging the detail makes an option BETTER, not the alternative
> WRONG.

Item 3 is the clean example and is indefensible as authored: "Want me to
wait while you eat?" is a bare offer, accepting and declining are both
canonical, and nothing in the utterance prefers either. That is the
brief's own banned stem — a yes/no question with a natural yes and a
natural no — and it got past four authors and a structural render gate.

## The seventh cross-item tell, found by both readers independently

Items 7, 11 and 16 are one template: the speaker states numbers that do
not add up and the key is the correction. X calls all three
construct-invalid ("arithmetic with the pragmatic frame as decoration");
Y passes them individually but flags the set:

> a candidate who learns "if there are digits, check the arithmetic and
> pick the option that disputes it" gets 7, 11, 16 without listening.

Both reached it from different instructions. That is 19% of the batch
measuring the same non-target skill.

Its origin is the brief, not the authors. The brief says the six best
items of an earlier wave "planted a defect in the speaker's OWN turn: a
contradiction, bad arithmetic, a wrong inference" — so three of four
authors reached for arithmetic, because it is the most mechanical way to
satisfy the rule. **The more rigid the spec, the more the answer is
predictable from the spec rather than the content.** Same lesson as the
identical-key-prose finding, seventh instance.

## Two new tells, both installed BY the repair

The blind solvers named these unprompted, and each is a direct
consequence of an instruction given to fix the previous tell:

1. **Functional duplicates cancel.** Authors B and C deliberately
   doubled an act — "a second redirect among the distractors so the key
   isn't the only one" — to defeat odd-one-out. Solver C called that its
   single most powerful attack: if two options do the same act, neither
   can be the key in a single-key MC, so a solver eliminates TWO at once
   with no content knowledge. Fired on items 9 and 15.

2. **The corrupted twin.** A distractor built from the key's own
   scenario with the polarity inverted or the logic broken. The coherent
   member of the pair is the key. Solver B answered 1, 3, 7 and 12 on
   this alone.

Both are the shape this repo keeps producing: the fix for a named tell
is the next tell. Neither is visible to any script here — the render
gate checks letters, lengths, pivots and reuse, and passed this batch.

## What this licenses

- **Do NOT insert these 16.** Nothing was written to the database.
- **Do NOT roll the method out to the other 72 yet.** The blind gate is
  cleared; the answerability gate is not, and at 6/16 it is worse than
  the live cohort's 16/71.
- Round 2 is: repair items 3, 6, 8, 9, 12, 13; cap the
  numbers-don't-add-up template at 1 per 16 and require the other
  planted defects to be non-numeric; and add "no two options may perform
  the same speech act" plus "no distractor may be the key's scenario
  with a flipped polarity" to the brief. Then re-measure both gates.
- The four items that passed both gates (1, 4, 10, 14) are the worked
  examples for that round. They score at chance blind and both readers
  call them sound.

## Method note

Nine agents, zero database writes, and the blind and with-source runs
share ids and letters so the two compare per item. The decisive number
here — 25.0% on the sound items against 44.4% on the flawed ones —
exists only because both gates ran on the same render.
