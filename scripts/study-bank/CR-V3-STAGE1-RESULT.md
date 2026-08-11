# cr-v3 stage 1 — FAIL, worse than the thing it replaced

Run 2026-08-11 against `A3-STAGE1-PREREGISTERED.md`. 12 items authored to
`CR-V3-BRIEF.md`, attacked immediately, nothing banked.

| | |
|---|---|
| solver 1 | 9/12 — 75.0% |
| solver 2 | 9/12 — 75.0% |
| solver 3 | 10/12 — 83.3% |
| **mean blind** | **77.8%** |
| control | 25.0% (key spread exactly 3/3/3/3) |
| **margin** | **+52.8** |
| pre-registered line | ≤ 25 PASS, > 25 FAIL |

**Abstentions: zero, across all three solvers and all 36 judgements.**
Nobody found a single item hard. All three agreed on 10 of 12; all three
solved 8 of 12.

For comparison, cr-v1 — the cohort this was meant to replace — scores
+45.1. **The rebuild is 7.7 points worse than the defect.**

## The pre-flight passed, and it was worthless

Every structural check sat at chance before the attack:

    key letters       3/3/3/3       control 25.0%
    key longest       3/12 (25%)    chance 25%
    key shortest      2/12 (17%)    chance 25%
    avg length        77.7 / 74.2
    question marks    key 58%  other 53%

That is the sixth structural proxy to pass a batch the attack then
destroys. It is also the first time the proxies were run BEFORE the
attack rather than after, which is the only reason this is cheap to say.

The first authoring pass was in fact caught by pre-flight — key longest
11/12, question mark 11/12 — and rewriting to fix those two numbers
moved the blind score not at all, because they were never the mechanism.

## What the solvers actually used

All three named the same structure, independently, unprompted, in their
own words. Paraphrasing the agreement:

> The key is the reply that **accepts a constraint and asks a narrow
> practical follow-up**, usually opening with an inference marker
> ("then", "so", "in that case"). The distractors are **over-relieved**
> ("that takes the pressure off", "that'll save me days"),
> **over-catastrophic** (an incredulous echo — "nothing at all?", "none
> of them free?"), or **answering a different topic**.

Solver 1 put the winning heuristic in one line: *"pick the most
inconvenient specific consequence with a follow-up question."* Solver 3
gave the same rule as a procedure: *"discard the relieved one, discard
the '…at all?' one, discard the odd-topic one, take what remains."*

## Why the brief produced it — the part worth keeping

The near-miss method works exactly as designed and that is the problem.

For each item I wrote one spoken line, then three near-miss lines with
one fact changed, and took the natural reply to each. But **every
spoken line I wrote was the same kind of line**: a two-part piece of
mildly bad news — a constraint plus a complication. Given that stimulus,
"one fact changed" almost always means *the constraint is looser* or
*the constraint isn't there*, so the replies to the near-misses are
systematically **relief** or **disbelief**, and the reply to the real
line is systematically **rueful acceptance**.

cr-v1 fixed a roster of distractor TYPES. cr-v3 removed that roster and
silently installed a roster of STIMULUS types instead. The tell moved up
one level and got stronger.

This is the CLAUDE.md corollary landing for the fourth time: *the more
rigid the authoring spec, the more the answer is predictable from the
spec rather than the content.* I applied that rule to the distractors,
wrote it into the brief, and then violated it one layer up without
noticing — the brief does not contain the sentence "vary the spoken
line", because it did not occur to me that the line was a variable.

## What revision 2 has to change

Not the distractor method. **The stimulus.**

If every line is bad news, the key is always the inconvenienced reply
and no distractor discipline can hide that. The spoken line must
sometimes be good news, sometimes neutral, sometimes a question,
sometimes a request, sometimes an offer — so that "accepts a
constraint" stops being a winning guess. Concretely, the batch needs
the key to be the relieved reply about as often as it is the rueful
one.

Under the pre-registration this is **revision 1 of a maximum 2**. If
revision 2 fails, §6 applies: reduce Choose a Response in the Listening
blueprint, redistribute to Conversation and Academic Talk, and document
the deviation from the ETS shape.

## Status of the 12 items

Discarded. Not banked, not repaired, not reused as a template — the
pre-registration forbids tuning the next slice against this attack, and
that is the calibration trap in CLAUDE.md. They stay in
`cr-v3-stage1.json` as the record of what failed and why.

**The 72 cr-v1 items remain live to students.** Nothing about this run
changes that, and it is now the fourth consecutive attempt not to.
