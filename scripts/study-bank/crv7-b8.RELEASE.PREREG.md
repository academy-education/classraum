# TOEFL Choose a Response crv7 batch 8 (cohort `cr-v12`): co-founder RELEASE sittings, pre-registered (2026-10-22)

**Committed with the staged insert, before any run is drawn.** Same rule as `crv7-b7.RELEASE.PREREG.md`.

## Why
Choose a Response binds both lower TOEFL paths (lower/easy 11, lower/medium 12), and a lower sitting draws
about 20 of them, so cr-v11's 16 staged items add less than one sitting. A real lower/medium student has 2
clean Listening tests left.

## The batch
`crv7-b8.batch.json`: **20 single-item Choose a Response items**, 20 new settings x 4 symmetric worlds,
written in-session by Claude with the crv7 method; post-hoc seeded selection (`render-crv7.mjs`, seed offset
800, 3 logged re-rolls). Key letters 5/5/5/5; difficulty is the author's grade, 10 easy / 10 medium.

**Three author passes after the first render, each applied to ALL 80 worlds by a rule that does not look at
which world was selected** (the selection is seeded and does not depend on reply text, so it was unchanged):
1. Key uniquely longest 9/20 (45%) on first render. Rule: in every item, the second-longest reply was extended
   to at least the longest reply's length. Result 4/20.
2. **Echo tell:** a key shared a content word with its spoken line on 10/20 items (uniquely most overlap 9/20),
   against 2-4/20 in shipped crv7 batches. A listener who picks the reply that repeats a word would score
   about 50%. Rule: in every world, a reply that repeats a content word of its own line was reworded (33 of 80
   worlds, then 7 more). Result: key shares a content word 0/20, distractors 4/60.
3. Reading the selected items with source found three distractors the rewording had made arguably correct
   (cr12-06, cr12-10, cr12-17). Each was made checkably wrong.
Final: key longest 4/20, letters flat, typography level, no spoken line in the blind file, no spoken line
matches any of 265 live or staged lines. 10 items exceed the 1.6 reply-length ratio, reported, not driving.
**Not run:** AI attack, independent grader (no agents).

## Runs and rule
Run 1: 12 items, run 2: 8, `DRAW_COHORT=cr-v12 draw-review-run.mjs "Choose a Response" <n> <co-founder>`,
flat deal, control 25%. Queue: right after cr-v11's two runs. Release rule identical to cr-v11's: per-run and
pooled 50% guard; per item "Only defensible" -> verified, otherwise archived; no set rule
(`release-toefl-conv-runs.mjs cr-v12`).

## Known limits, stated before the number exists
- The echo-removal pass leaves keys sharing NO words with their lines, while 4/60 distractors do. A student
  who avoids echoing replies gains a sliver; a student who seeks them is drawn to a lure, as on the real test.
- One reader; the blind score is coarse.
