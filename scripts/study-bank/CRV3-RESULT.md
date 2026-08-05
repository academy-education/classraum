# crv3 — 32 items, 8 authors, more rules, WORSE. 2026-08-06

**Blind margin +39.6 against a +29.5 ceiling. FAIL. Round 2, with half
the items and half the rules, scored +14.6.**

**Answerability also fails: 12 of 32 flagged by both readers, against a
pre-registered bar of 15%.**

Nothing was inserted. The held-out panel was NOT spent — it is reserved
for a batch that passes iteration, and burning it on a failed one would
destroy the only uncontaminated instrument left. Bars were fixed in
CRV3-PREREGISTERED.md before authoring, and they are not being moved.

---

## The numbers

    solver A  23/32 = 71.9%   spread 6/6/12/8
    solver B  18/32 = 56.3%   spread 9/7/7/9
    solver C  21/32 = 65.6%   spread 7/5/13/7
    MEAN 64.6%   control 25.0%   margin +39.6

    live cohort                       +55.9
    repair-v1 (distractors only)      +40.4
    crv2 (16 items, 4 authors)        +14.6
    crv3 (32 items, 8 authors)        +39.6   <- this
    official ETS reply items          +25.5

Solvers scored ABOVE their guesses (A: 16/22 confident vs 7/10 guessed).
In crv2 they scored below. Their rules worked this time.

## Cause 1: I banned the duplicate act, and installed its inverse

crv2's blind solvers beat it partly with "two options performing the
same speech act cancel each other — in a single-key item neither can be
the answer". So crv3's brief banned duplicate acts outright.

That ban makes the key's act UNIQUE in its option set. Score by the
speech act of the key:

    conditional acceptance   100%     (12/12 trials)
    fix offered               92%
    polite refusal            92%
    premise correction        67%
    redirection               58%
    counter-proposal          42%
    plain agreement           42%
    question asked back       25%     <- chance

Reader Y, working with the stimulus and never seeing these numbers,
stated the matching rule independently:

> Never pick the bare enthusiastic acceptance... appears at ten items
> and my pick is one of them zero times. Conditional acceptance is the
> key and almost never a distractor. "Reject bare yes, take hedged yes"
> is a strong no-audio strategy.

Two instruments, one conclusion. The acts that appear ONLY as keys are
free; the acts that also appear as distractors sit at chance. That is
the brief's own "let the key sometimes BE the shape you use for
distractors" rule, now quantified — and the duplicate-act ban made it
impossible to obey.

**Eighth instance of the pattern, and the first one I caused directly.**
The fix for a named tell was the next tell, and it was in the brief I
wrote between the two rounds.

## Cause 2: widening the batch fed the corpus attacker

32 items from 8 authors to one brief gave solver B enough material to
recover the distractor INVENTORY:

    the referent-clarification slot is never the key   ~22 of 32
    the generalising editorial is never the key        ~16
    the punt to a named third party is rarely the key  ~12

I chose 32 over 16 to halve the noise. It also doubled the evidence
available to an attacker reading the set as a corpus. That tradeoff was
not in the pre-registration and should have been: **batch size cuts
both ways, and for a defect that is cross-item, wider is worse.**

## Cause 3 — and this one inverts crv2's headline finding

Splitting the blind trials by what the readers said about each item:

                                   crv2      crv3
    both readers call it sound     25.0%    85.4%
    flagged by at least one        44.4%    44.4%

In crv2 the sound items were the UNGUESSABLE ones, and I reported that
as evidence the two defects were separable. In crv3 they are the
guessable ones, and by a wide margin. By kill type it is starker still:

    contradiction        4 items   blind 91.7%
    norm                 5 items   blind 73.3%
    inference            6 items   blind 61.1%
    none (2-defensible)  9 items   blind 40.7%

**Killing the runner-up by contradiction produced the most guessable
items in the batch.** The mechanism is visible once stated: a
contradiction that decisively kills an option usually shows in the
option text, so the surviving option is recognisable as the one that
fits a coherent scenario — with the utterance still withheld.

So crv2's separability claim does not generalise. It held on 4 items
and 12 trials, which I flagged at the time as direction-clear and
magnitude-unknown. The direction did not survive either.

## Why the new quote gate did not help

Every one of the 32 passed it — the runner-up's kill was quoted
verbatim from the stimulus, and that gate was break-tested three ways.
Reader X explains what it missed:

> Where the cohort does contain a clean contradiction it is spent on
> the WEAKEST option in the set, not on the option a good candidate
> would be torn between. The contradictions are decorating options
> nobody picks.

The gate verified a quote existed and pointed at real words. It could
not verify the quote was aimed at the RUNNER-UP rather than at an
option already dead. Only 2 of 32 (reader X) or 4 of 32 (reader Y)
runner-ups die by contradiction at all.

The authors saw this before any grader did: seven of eight reported,
unprompted, that their own weakest item was killed by an omission, a
norm, an inference or an off-target objection rather than a
contradiction. They were right, and they understated it.

## Two option-level tells a script CAN catch, found here

- **"Sure, …" / "Of course, …" / "No problem, …" opens a distractor.**
  Ten items; the key zero times (Y) or at most once (X). Delete every
  unhedged acceptance and you remove the only serious competitor on
  several items with the audio muted.
- **An option that requests information the stimulus already gave** is
  always wrong — 7 items.

Both are lexical and belong in the render gate. Neither existed as a
concept before this round.

## The one thing that IS balanced, and is the model

The name-deflection shape ("go ask Priya / Marco / Nadia") is the key at
items 9, 16, 29 and a distractor at 5, 24, 32. Both readers checked it
and both call it NOT learnable. That is what every other option family
has to look like: **present as key and as distractor at similar rates.**
It is the only family in 32 items that manages it, and it happened by
accident across independent authors rather than by instruction.

## What this licenses

- crv3 does not go in the bank. 32 items, zero database writes.
- The held-out panel is unspent and stays that way.
- Do NOT author round 4 against this panel. Three rounds have now each
  produced a tell that the next round's fix installed; a fourth
  iteration against the same graders is the overfitting loop the
  pre-registration exists to stop.

The next move is not another authoring round. It is a **balance
constraint**, which is a property of the whole batch and can be checked
before any solver runs: for every option family — bare acceptance,
hedged acceptance, clarifying question, third-party deflection,
generalising remark, premise correction — the family must appear as the
key at roughly its share of the option pool. The name-deflection family
already satisfies it. Nothing else does.

That is checkable mechanically from a per-option labelling pass, which
is one cheap agent over 128 options, blind to the key. Solver C proposed
exactly this test unprompted, for the same reason.

## Also settled here: the elimination gate is not a substitute

A pending proposal was to replace the expensive blind attack with a
cheap "does any option have a confidently-rejectable member" gate.
Solver C, held to a strict standard, fired it on **3 of 32** items —
29 have no eliminable option at all.

> it can't separate broken items from sound ones when only 9% of items
> have any eliminable option at all

The repair worked on eliminability: nearly every distractor is now a
well-formed reply to a NEIGHBOURING utterance rather than a broken
sentence. That is exactly why the gate has stopped measuring anything.
It is a filter for unrepaired batches, not a verdict for repaired ones.

One eliminable case it found is worth keeping as a mechanical check:
a distractor that contradicts a fact another OPTION in the same item
presupposes (item 20). That needs no stimulus and no model.

## Method note

19 agents, zero database writes, one measurement cycle, bars fixed in
advance. The cycle cost roughly what a bank-wide rewrite would have
cost to get wrong, and it produced three findings — the act-uniqueness
tell, the contradiction/guessability correlation, and the elimination
gate's ceiling — that no amount of reading the items would have given.
