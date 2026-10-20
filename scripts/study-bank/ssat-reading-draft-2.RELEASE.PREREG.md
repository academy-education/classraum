# SSAT Reading draft 2: co-founder RELEASE sitting, pre-registered (2026-10-21)

**Committed with the staged insert, before the run is drawn.** Nothing here changes after the draw.

## Why
Real-student exposure on 2026-10-21: the heaviest real student has seen 120 of 186 live SSAT Reading
items (two students at 120), so one more form exhausts them. Draft 1's route released 36 items:
human blind 13/36 = 36.1% against a 22.2% deal control, 36/36 "Only defensible", where the AI
options-only attack had read 83.9% on the same drafts. On this family the human sitting decides
(CLAUDE.md 2026-09-21). Owner, 2026-10-21: "DO the ones that are tight. Keep making more questions."

## The batch
`ssat-reading-draft-2`: 6 passages x 6 items = 36, written in-session by Claude to draft 1's author
brief (no agents, owner 2026-10-12). Genres fiction / poetry / memoir / essay / history / science;
attitude keys warm x2, sorrowful, amused, critical, anxious. Mechanical pre-check `merge.mjs` (draft 1's
checks + at most one negation per paragraph, no attitude-table word in a passage, five attitude
directions, explanation and every rationale quote their choice): 0 problems; each new check
break-tested with a planted defect. Edit-screen helpers (`ssat-draft.ts`): 36/36 draft, hash, valid.
**Not run, stated plainly:** no AI options-only attack and no AI with-source graders (draft 1 ran both
as diagnostics; neither was a gate). The sitting's "Only defensible" judgement is the only
exclusivity check by a reader other than the author.

## The run
- run id `ssat-draft2-release-cofounder-<date drawn>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 36 draft-2 items, drawn with `DRAW_COHORT=ssat-reading-draft-2 DRAW_FAMILY=ssat`, domain
  Reading Comprehension, flat five-wide deal, **after** `map-draft1b-cofounder-2026-10-21` closes (the
  drawer refuses a second open run, and that guard is not worked around)
- same panel as draft 1: blind pick on options only, then passage + key: Only defensible / Another is
  also defensible / No unique answer, Authentic / Authored, optional note

## Release rule (fixed now, draft 1's rule unchanged)
1. **Batch guard, first.** Blind score >= 18/36 (50%): NOTHING is released; the batch is held whole.
2. Otherwise, **per item**: "Only defensible" -> `verified=true`; "Another is also defensible" or
   "No unique answer" -> `archived=true`, not repaired. Authentic/Authored is recorded, not a gate.
3. **Per passage**: 2 or more of a passage's 6 items flagged or rejected -> archive the whole passage.
4. Unanswered items stay staged until answered. Nothing else changes.
5. After release: `admission-form-depth.ts` and report SSAT Reading forms.

## Known limits, stated before the number exists
- One reader, n=36; the blind score is coarse (about +/-13 points).
- He has now sat 72 draft-1 siblings written to the same brief; familiarity could raise his blind
  score, the conservative direction for the guard.
- Author and checker are the same model; the cheap checks are pre-flight only.
