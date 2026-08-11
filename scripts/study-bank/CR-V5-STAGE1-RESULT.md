# cr-v5 stage 1 — FAIL, +47.2, and I caused it

| cohort | margin |
|---|---|
| cr-v1 — live to students | +45.1 |
| cr-v3 — revision 1 | +52.8 |
| **cr-v4 — revision 2** | **+22.2** |
| **cr-v5 — this slice** | **+47.2** |

Solvers: 9/12, 8/12, 9/12 — mean 72.2% against a 25.0% control. **All
three gave the identical answer on 11 of 12 items.** They were not
guessing independently; they were reading the same signal.

## What I did wrong

cr-v5 kept cr-v4's brief and added one rule the solvers had asked for:
ban the incredulous restatement ("X at all?"). Removing it stripped
questions out of the distractor pool, so pre-flight showed a new tell —
question marks 33% in keys against 6% in distractors. I fixed that by
rewriting 12 distractors to carry ordinary follow-up questions.

**In doing so I re-authored the distractors to a roster.** Measured
afterwards, exactly:

    hedge word ("I thought", "I gather", "apparently", "perhaps")
      cr-v4   keys 0/12   distractors 0/36
      cr-v5   keys 0/12   distractors 6/36

    catastrophic option ("rejection", "neither has room", "lapsed")
      cr-v4   keys 0/12   distractors 0/36
      cr-v5   keys 1/12   distractors 4/36

Both solvers named these unprompted. Solver 2: *"hedge words mark the
option that mishears the stimulus… a solver can just strike hedged
options."* Solver 3: *"the key is the low-drama, cooperative reply that
accepts the news and does one small practical thing."*

That is a distractor roster — the precise defect cr-v1 was condemned for
and cr-v3 was killed for. I reintroduced it while fixing a cosmetic
question-mark imbalance, and the fix cost 25 points.

## The lesson, which is not the one I expected

The pre-flight caught a real asymmetry and my repair of it caused the
regression. Three slices now show the same shape: **the structural check
identifies a surface imbalance, and correcting that imbalance by hand
introduces a semantic tell that is far more powerful than the one
removed.** cr-v3 fixed length and gained nothing; cr-v5 fixed question
marks and lost 25 points.

Structural pre-flight should gate authoring, never *drive* rewriting.

## Where the pre-registration leaves this

By its own terms we are at §6. cr-v3 failed (revision 1), cr-v4 was
inconclusive, cr-v5 failed with a changed brief — a third authored slice
and a second clear failure. The rule reads: *"Two revisions maximum. A
third failure is §6, not a fourth brief."*

§6 is: reduce Choose a Response in the Listening blueprint, redistribute
to Conversation and Academic Talk (16× and 17× the depth), and document
the deviation from the ETS shape in the spec, on the score report, and
wherever the product claims to mirror the real exam.

**One caveat, stated once and not pressed.** cr-v4's brief scored +22.2
and was never re-tested unchanged — cr-v5 differed from it by the ban
rule and by my distractor drift, and the drift is measurably what
failed. So "the cr-v4 brief cannot work" is not what was demonstrated.
But that argument is exactly the kind the pre-registration exists to
refuse, and I am not going to author a fourth slice on the strength of
it. **This is Andy's call, not mine.**

## Status

Not banked. Not repaired. The 72 cr-v1 items remain live to students.
