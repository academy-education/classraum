# ISEE Reading draft 2: co-founder RELEASE sitting, pre-registered (2026-10-21)

**Committed with the staged insert, before the run is drawn.** Nothing here changes after the draw.

## Why
ISEE Reading holds 117 live items, 2 clean forms (`admission-form-depth.ts`), the thinnest ISEE
section; agent-written ISEE reading has failed the model options-only attack in every round
(`isee-reading-s5`, `-s6`, `-s10`). The SSAT draft route (AI drafts, a person decides in a sitting)
released 36 SSAT items where the model attack read 83.9% and the person 16.7%/36.1%. Owner,
2026-10-21: "Keep making more questions"; this applies the same route to ISEE.

## The batch
`isee-reading-draft-2`: 6 passages x 6 four-choice items = 36, written in-session by Claude to the same
brief as draft 1 (no agents). Genres fiction / memoir / essay / history / science / biography; attitude
keys anxious, warm x2, critical, amused, sorrowful. Mechanical pre-check (`merge.mjs` at K=4): 0
problems after pre-insert author edits (two vocabulary items re-headworded for the 1.5x length rule;
three paragraphs reworded to one negation each; one distractor lengthened on 4 items, key uniquely
longest 11/36 -> 7/36; uniquely shortest 5/36). Edit screen 36/36. **Not run:** AI options-only, AI
graders, independent with-source read.

## The run
- run id `isee-draft2-release-cofounder-<date drawn>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 36 items, `DRAW_COHORT=isee-reading-draft-2 DRAW_FAMILY=isee`, domain Reading Comprehension,
  flat four-wide deal; drawn only when he has no other open run, after the ISEE draft-1 sitting
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
- He will have sat 36 ISEE and 108+ SSAT draft siblings to a similar brief first; familiarity raises his score,
  the conservative direction for the guard.
- Author and checker are the same model; the cheap checks are pre-flight only.
