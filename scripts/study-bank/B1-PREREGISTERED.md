# B1 — decision rule, written BEFORE the second sitting

Committed ahead of the run so the bar cannot move after the numbers
land. 2026-08-06.

## What B1 measures, stated once

One reviewer read 20 Choose a Response items blind and scored **55.0%
against a 25.0% control** (+30.0, p<0.001). A second reviewer now reads
**the same 20 items, in the same presented order**, on a different
account.

The question is not "are these items bad". It is narrower and it is the
only thing this design can answer:

> Is that 55% a property of the ITEMS, or a habit of that READER?

## Why the rule is written first

Everything in this directory that went wrong went wrong the same way: a
number arrived, and the interpretation was chosen to fit it. Three
rebuild rounds "improved" against graders they were being fitted to.
The option-balance proxy was believed until it was measured against
known batches. A 79.2% repetition figure nearly justified an authoring
programme before anyone asked whether it modelled the real draw.

With n=20 and a single pair of readers, there is enormous freedom to
tell a story afterwards. So the branches are fixed now, and I will
report whichever one fires — including the one that says the work I
have been planning is cancelled.

## The three outcomes

Read from `reviewerAgreement()` on the mirrored run. `shared` is the
count of items both answered; `pickAgreement` is raw same-slot
agreement; `kappa` corrects for chance.

### 1. CONFIRMED — the items leak

**Reviewer 2 scores ≥ 45% (i.e. ≥ 9 of 20)**, and `kappa ≥ 0.4`.

Two independent readers both beating a 25% control by a wide margin,
agreeing above chance on WHICH items give themselves away, is the
items. A3 proceeds: rebuild the 72 Choose a Response items, starting
from the four crv2 items that passed both gates, measured with the
held-out panel that has never been spent.

### 2. REFUTED — it was one reader

**Reviewer 2 scores ≤ 35% (i.e. ≤ 7 of 20).**

The first reviewer was reading something idiosyncratic. **A3 is
CANCELLED, not deferred** — rebuilding 72 items on one reader's habit
is exactly the expensive version of being wrong that this whole
register exists to prevent. The cohort returns to "unconfirmed, model
only", and the 55% is recorded as a property of that reader, which is
itself worth knowing before any future sitting.

### 3. INCONCLUSIVE — anything else

Reviewer 2 lands between 36% and 44%, **or** scores high while `kappa <
0.4` (both read well but disagree about which items are easy — that is
two different tells, not one shared one).

A3 stays blocked. The next step is a THIRD reader or a larger sample,
**not** a judgement call about which of the two readers to believe.

## What will NOT be treated as evidence

- **`bothCorrect` on its own.** Two readers agreeing on the key is
  expected when the key is findable; it is `sameWrongOption` that shows
  a shared tell, and it is reported separately for that reason.
- **A verdict split.** Phase 2 judgements ("another is also
  defensible") are useful and will be read, but they are a different
  measurement from the blind score and cannot rescue an inconclusive
  blind result.
- **My own reading of the items.** I have seen these items. I am not a
  third reviewer and will not act as one.

## Known limits, stated before rather than after

- **n=20 is small.** It separates 55% from 25% comfortably; it does not
  separate 45% from 40%. That is why band 3 exists and is wide.
- **Identical presentation.** Both readers see the same option order,
  deliberately — `reviewerAgreement` compares slot letters, so
  re-dealing would make "both picked B" meaningless. The cost is that a
  shared POSITIONAL habit would look like agreement. Accepted, because
  the alternative measures nothing at all.
- **Two readers who work together.** They are not independent in the
  way two strangers would be. This is the sample available; it is not a
  reason to skip the measurement, and it is a reason not to over-read a
  narrow result.
