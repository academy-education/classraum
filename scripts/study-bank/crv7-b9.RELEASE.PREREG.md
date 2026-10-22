# TOEFL Choose a Response crv7 batch 9 (cohort `cr-v13`): co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.** Same rule as `crv7-b7.RELEASE.PREREG.md` / `crv7-b8`.

## Why
Choose a Response binds both lower TOEFL paths (lower/easy 11, lower/medium 12); a lower sitting draws about 20.
cr-v11 (16) and cr-v12 (20) are staged; this batch takes the staged total to 56, about three more sittings if released.

## The batch
`crv7-b9.batch.json`: 20 single-item Choose a Response items, 20 new settings x 4 symmetric worlds, written
in-session by Claude with the crv7 method; seeded post-hoc selection (`render-crv7.mjs`, seed offset 900, 6
logged re-rolls). Difficulty is the author's grade, 10 easy / 10 medium.

**The b8 lessons were applied before render, to all 80 worlds:** every reply that repeated a content word of its
own line was reworded (18 found even when writing with the rule in mind, then 2 more), and reply lengths were
kept within 1.6x per item. After render, a read of the 20 selected items found 5 replies that a reader could
defend or that were unclear (cr13-12, -13, -15, -18, -19); each was reworded in its own world, and the re-render
with the same seed gave the same selection. Final: letters 5/5/5/5, key echo 0/20 (distractors 3/60), key
uniquely longest 2/20 (below chance: a mild reverse tell, recorded, not tuned), no spoken line matches any of 285
live or staged lines, no reply-length warning. **Not run:** AI attack, independent grader (no agents).

## Runs and rule
Run 1: 12, run 2: 8, `DRAW_COHORT=cr-v13 draw-review-run.mjs "Choose a Response" <n> <co-founder>`, flat deal,
control 25%. Queue: after cr-v12 (`cofounder-queue.json`). Release rule identical to cr-v11/cr-v12: per-run and
pooled 50% guard; per item "Only defensible" -> verified, otherwise archived; no set rule
(`release-toefl-conv-runs.mjs cr-v13`).
