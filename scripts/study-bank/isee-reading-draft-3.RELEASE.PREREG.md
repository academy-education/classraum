# ISEE Reading draft 3: co-founder RELEASE sitting, pre-registered (2026-10-22)

**Committed with the staged insert, before the run is drawn.** Nothing here changes after the draw.

## Why
ISEE Reading has 2 clean forms (`admission-form-depth.ts`), the thinnest section in the app, and a real
student has 1 clean test left (`runout-monitor.ts`, 2026-10-22). Drafts 1 and 2 (72 items) are staged and
queued; this third batch keeps the route supplied. Owner, 2026-10-22: "Do all".

## The batch
`isee-reading-draft-3`: 6 passages x 6 four-choice items = 36, written in-session by Claude to the draft-1/2
brief (no agents). Fiction (closing a watch repair shop), memoir (learning to swim at 26), essay (too many
park signs), history (the Paris pneumatic post), science (orbital debris), biography (Ynes Mexia); 296-305
words. Attitude keys sorrowful, warm x2, critical, amused, anxious. Mechanical pre-check (`merge.mjs`, K=4):
0 problems after pre-insert author edits (two passages lengthened past 300 words; one paragraph reduced to
one negation; three attitude sets re-worded for the 1.5x length rule; one distractor lengthened on 8 items,
key uniquely longest 17/36 -> 9/36; uniquely shortest 7/36). **New merge rule, stated here before any
draw:** the flat seeded key deal gave one passage the same slot six times, so the deal is re-seeded (counter
in the seed, each re-deal logged) until no passage has more than 3 keys in one slot; 2 re-deals. Stored
order is cosmetic for students (ISEE serving reshuffles per session) and for the sitting (the draw re-deals
flat). Edit screen 36/36. **Not run:** AI options-only, AI graders, independent with-source read.

## The run
- run id `isee-draft3-release-cofounder-<date drawn>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 36 items, `DRAW_COHORT=isee-reading-draft-3 DRAW_FAMILY=isee`, domain Reading Comprehension,
  flat four-wide deal; drawn only when he has no other open run, after the ISEE draft-2 sitting
- same panel: blind pick on options only, then passage + key: Only defensible / Another is also
  defensible / No unique answer, Authentic / Authored, optional note

## Release rule (fixed now)
1. **Batch guard, first.** Blind score >= 18/36 (50%, about double a four-choice deal control of
   25%): NOTHING is released.
2. Otherwise, **per item**: "Only defensible" -> `verified=true`; "Another is also defensible" or
   "No unique answer" -> `archived=true`, not repaired. Authentic/Authored recorded, not a gate.
3. **Per passage**: 2 or more of a passage's 6 items flagged or rejected -> archive the passage.
4. Unanswered items stay staged. Nothing else changes.
5. After release: `admission-form-depth.ts`; report ISEE Reading forms.

## Known limits, stated before the number exists
- One reader, n=36, about +/-14 points. With four choices the guard's distance above control is
  smaller than on SSAT (25 points, not 28-30).
- He will have sat 72 ISEE and 108+ SSAT draft siblings to a similar brief first; familiarity raises his score,
  the conservative direction for the guard.
- Author and checker are the same model; the cheap checks are pre-flight only.
