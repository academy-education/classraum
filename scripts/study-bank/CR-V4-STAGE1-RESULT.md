# cr-v4 stage 1 — INCONCLUSIVE, and the mechanism is fixed

Run 2026-08-11. Revision 2 under `A3-STAGE1-PREREGISTERED.md`. 12 items,
attacked immediately, nothing banked.

| | |
|---|---|
| solver 1 | 5/12 — 41.7% |
| solver 2 | 5/12 — 41.7% |
| solver 3 | 7/12 — 58.3% |
| **mean blind** | **47.2%** |
| control | 25.0% (key spread 3/3/3/3) |
| **margin** | **+22.2** |

| cohort | margin |
|---|---|
| cr-v1 — live to students | +45.1 |
| cr-v3 — revision 1 | +52.8 |
| **cr-v4 — revision 2** | **+22.2** |

## Why this is not being called a PASS

The rule table says ≤25 passes, and 22.2 is under 25. **It is still not a
pass**, on the pre-registration's own terms:

> *12 items is a small sample. A margin near the line (say 20–30) should
> be treated as inconclusive, not as a pass. Only a clear result decides.*

22.2 is inside that band. That clause was written before any item existed
precisely so that a number landing just under the threshold could not be
read as a win, and reading it as a win now is the exact move it forbids.
One item moves the margin by 2.8 points here; the gap between "pass" and
"fail" is under three items.

## What DID move, and it is not small

The cr-v3 mechanism is gone. That is a real finding rather than a
threshold artefact:

| | cr-v3 | cr-v4 |
|---|---|---|
| margin | +52.8 | +22.2 |
| all three solvers solved | 8/12 | 4/12 |
| all three solvers missed | 2/12 | 4/12 |
| key = rueful acceptance | ~12/12 | 1/12 |
| distinct stimulus kinds | 1 | 12 |

The diagnosis held. Varying the STIMULUS — good news, a request, a
question, an offer, neutral information, a correction, an invitation, a
complaint, a suggestion, an apology, an announcement — cut 30 points off
the margin without touching the distractor method.

**The solvers stayed confident and got worse.** All three described a
"two-move reply" template (echo the news, then commit to an action) with
the same certainty as in cr-v3, and it now selects distractors as often
as keys, because distractors carry the same shape. Solver 1 scored 41.7%
while calling items 4, 5, 6, 8, 11 "close to giveaways". That divergence
between confidence and accuracy is the signature of a tell that has
actually been removed.

## The one tell they named that is still real

Solver 2, unprompted and precisely:

> *the "wait, X at all?" construction should be banned from the option
> pool entirely, because right now it is a near-perfect negative marker*

That is checkable and true of this slice: incredulous restatements with
an intensifier — "at all", "outright", "all week", "in one go" — appear
only in distractors. It is a brief-level rule, not an item-level repair,
so acting on it is not tuning against the attack.

## Next, and what it is not

**Author a fresh 12 under the same brief plus that one rule, and attack
them.** Not a revision — the brief's load-bearing property is unchanged
and vindicated. The purpose is to leave the 20–30 band, in either
direction, with a clear number.

Explicitly NOT doing:

- **Not banking these 12.** Inconclusive is not clean.
- **Not repairing the 4 items all three solvers got.** That is tuning
  against the attack, which the pre-registration forbids and CLAUDE.md
  records as the calibration trap.
- **Not scaling to ~200.** Stage 2 needs a stage-1 result, and this is
  not one.

Revision budget is untouched by this run: cr-v3 was revision 1 and
failed; cr-v4 did not fail, so the "two revisions maximum, then §6"
counter still stands at one.

**The 72 cr-v1 items remain live to students.**
