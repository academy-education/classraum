# One sitting for the co-founder — ACT Reading

Run `actrd-recall-2026-09-14`, **24 items**, about 15–20 minutes.

Same format as the ACT sitting on 2 September. Sign in as
**support@classraum.com**, open **/admin/bank-qc**, and the open run
resumes by itself. Nothing to choose — do not touch the cohort dropdown
(it has misdirected three sittings).

## What you will see

The question and four options, **without the passage**. Twenty-four of
them, one after another.

- **Pick one on every item, even when you are unsure.** Being unsure is
  normal — the passage is hidden, so you are *meant* to be unsure.
- If three look wrong, or one looks longer or more test-like, pick it.
  **That hunch is exactly what we are measuring.**
- If nothing points anywhere, choose at random and move on.
- There is no abstain button. Don't look for one.

Please don't go back and revise, and please do it in one sitting if you
can. Roughly 30–90 seconds an item is the normal pace.

## What it decides

54 staged ACT Reading items are waiting on this, plus whether ACT Reading
goes from 3 complete forms to 4. It is also the only thing standing
between us and drawing the ACT Science sitting, which could open a whole
section that is currently hidden from students.

## The decision rule, fixed BEFORE the sitting

Keys are dealt flat 6/6/6/6, so **pure guessing scores 25.0%** — that is
the real control, not a round number.

| result | reading |
|---|---|
| at or below ~35% | **clean** — a person cannot shortcut these |
| ~35–50% | **inconclusive** at this n; needs more items, not more argument |
| above ~50% | **leaks** — the options give it away |

**The run is a matched design and that is the sharper comparison.**
Twelve of the 24 items are the staged candidates and twelve are items
already live in the bank, interleaved, and he is not told which is which.
The live twelve are a control measured on the same reader on the same
day. If the two arms come out level, the candidates are no worse than
what we already ship — which is the actual question.

**Say the n out loud when reporting.** Twelve items per arm is coarse;
margin of error is roughly ±14 points on an arm. "Clean" here means *a
small sample found nothing*, not *verified*. Write it that way every
time.

## Why the human number is the one that counts

The model attack scores ACT Reading at **80.6%**. On the last ACT sitting
the model said 76–79% and he scored **10.0%**. That gap is the whole
reason this sitting exists: a model shares an option-set leak but not a
14-year-old's missing subject recall, so on prose the model attack is a
screen and the human sitting is the verdict.

## After he submits

    node scripts/study-bank/score-sweep-run.mjs actrd-recall-2026-09-14

Validity before score, in this order (SITTING-PROCEDURE §4): completion,
timing, cohort tags, content freshness. Stop if any fails — the number is
seductive and a run can be invalid for reasons that have nothing to do
with it.
