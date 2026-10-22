# TOEFL Choose a Response crv7 batch 7 (cohort `cr-v11`): co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.**

## Why
Choose a Response binds both lower paths: lower/easy at 11 clean sittings and lower/medium at 12
(`toefl-form-depth.ts`, 2026-10-22). One real student on lower/medium has 2 clean Listening tests
left (`runout-monitor.ts`). Every new item here is easy or medium, which is what those paths draw.

## The batch
`crv7-b7.batch.json`: **16 single-item Choose a Response items**, written in-session by Claude with
the crv7 method that shipped cr-v7: four symmetric worlds per setting, each distractor the natural reply
to a neighbouring world's line and killable by a quoted span. The world is selected post hoc by
`render-crv7.mjs` with the pre-committed seed scheme (base 20260818 + 100 x batch, seed offset 700; 7
re-rolls to meet the kind/act quota, all logged). Key letters 4/4/4/4. Key longest on 4/16. Typography
key vs distractor is level, and the blind file carries no spoken line. Four items exceed the 1.6 reply
length ratio (max 1.90, cr11-10); this is reported and was not rewritten after selection.
Difficulty is the author's grade, 8 easy / 8 medium, not the renderer's blanket "hard".
**Not run:** the AI options-only attack and an independent with-source grader (no agents, 2026-10-12).
The human sitting is the gate, as for every TOEFL listening draft since 2026-10-20.

## Runs
- Run 1: 12 items, `DRAW_COHORT=cr-v11 draw-review-run.mjs "Choose a Response" 12 <co-founder>`,
  flat 3/3/3/3 deal, control 25%. Run 2: the remaining 4 (final short run, 1/1/1/1).
- Queue: run 1 is drawn as soon as the open `toefl-talk1-release1` run closes, AHEAD of talk run 2,
  because the lower path has a real student 2 tests from a repeat, and the hard route's heaviest
  students are 5 tests from theirs. Order only.

## Release rule (fixed now)
1. **Batch guard, first, per run and pooled.** If his blind score is >= 50% (double the 25% control)
   on a run, nothing from that run is released. If it is >= 50% pooled over both runs, nothing not
   yet released is released.
2. Otherwise, **per item**: "Only defensible" -> `verified=true`; "Another is also defensible" or "No
   unique answer" -> `archived=true`, not repaired. Authentic/Authored is recorded, not a gate.
3. Single items: no set rule.
4. Unanswered items stay staged.
5. After release: `toefl-form-depth.ts listening`; report lower/easy and lower/medium sittings.

## Known limits, stated before the number exists
- One reader, 12 + 4 items; the blind score is coarse (about +/-14 points on 12).
- He has seen 132 cr-v7 items written to the same method; familiarity could raise his blind score,
  the conservative direction for the guard.
- The crv7 method's own risk is a canonical-complication heuristic (cr-v10 solvers named it). This
  sitting can see that only through his blind score.
