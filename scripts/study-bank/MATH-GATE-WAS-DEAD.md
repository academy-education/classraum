# The maths sandbox never ran on a single SSAT item

**2026-09-01.** `math-bank-helper.mjs verify` recomputes each item's key
from its own `solve` snippet in a sandbox. It is the strongest gate in
this project — deterministic, not a model vote — and CLAUDE.md says
explicitly that a blind vote must not gate maths, because the LLM
harness has a measured ~18% false-negative rate on hard problems.

`shapeOk` pinned `choices.length === 4`.

SAT items carry 4 options. **SSAT items carry 5.** So every SSAT maths
batch printed `SHAPE` on every item and ended with:

    Sandbox: 0/48 recompute to their key.

Proven by reverting the fix and re-running: ssat-math-s6 scores **0/45**
under the old gate and **45/45** under the repaired one.

## Scope, measured rather than assumed

The authoring agent reported that ISEE was affected too. **It was not.**
ISEE uses 4 options, so its batches always passed shape: isee-math-s6
scores 40/40 under both the old and the new gate. The dead gate was
SSAT-only.

Re-running the repaired gate over the SSAT batches already in the bank:

    ssat-math-s2   48/48
    ssat-math-s3   18/18
    ssat-math-v1   11/11

So **no bad item reached the bank**. The authors were right; nothing had
ever checked them. That is the whole finding: for months the strongest
gate in the project was reporting a catastrophic `0/48` on every SSAT
batch and it was read as noise.

## Why it survived

The failure was LOUD, not silent — and that is exactly why it lasted.
`0/48` beside a wall of `SHAPE` lines looks like a broken batch, so the
natural reading is "this file is malformed", not "the checker cannot
accept this shape". CLAUDE.md's rule is *check the count, not just the
colour*; the count was there, in the worst possible direction, and was
never reconciled against the fact that the items were plainly fine.

The repaired gate is break-tested in both directions: mis-key one item
and it reports 44/45; give an item six options or a duplicate option and
it reports SHAPE.

## The rule

**A gate that cannot pass is not a gate.** Before trusting any checker
on a new cohort, feed it data whose answer is already known and confirm
it returns that answer. A checker that has never returned a pass on a
family has never been tested on that family.
