# SSAT Reading draft 3: co-founder RELEASE sitting, pre-registered (2026-10-21)

**Committed with the staged insert, before the run is drawn.** Nothing here changes after the draw.

## Why
Real-student exposure on 2026-10-21: the heaviest real student has seen 120 of 186 live SSAT Reading
items (two students at 120), so one more form exhausts them. Draft 1's route released 36 items:
human blind 13/36 = 36.1% against a 22.2% deal control, 36/36 "Only defensible", where the AI
options-only attack had read 83.9% on the same drafts. On this family the human sitting decides
(CLAUDE.md 2026-09-21). Owner, 2026-10-21: "I want to make a lot more questions for all these so that we have everything prepared."

## The batch
`ssat-reading-draft-3`: 6 passages x 6 items = 36, written in-session by Claude to draft 1's author
brief (no agents, owner 2026-10-12). Genres fiction / poetry / memoir / essay / history / science;
attitude keys critical x2, warm x2, sorrowful, amused. Pre-insert author edits: poem lengthened to the
220-word floor; one attitude-table word ("alarm") removed from a passage; one distractor lengthened on 7
items where the key was uniquely longest (14/36 -> 7/36; key uniquely shortest 1/36, below chance,
recorded and left). Mechanical pre-check `merge.mjs` (draft 1's
checks + at most one negation per paragraph, no attitude-table word in a passage, five attitude
directions, explanation and every rationale quote their choice): 0 problems; each new check
break-tested with a planted defect. Edit-screen helpers (`ssat-draft.ts`): 36/36 draft, hash, valid.
**Not run, stated plainly:** no AI options-only attack and no AI with-source graders (draft 1 ran both
as diagnostics; neither was a gate). The sitting's "Only defensible" judgement is the only
exclusivity check by a reader other than the author.

## The run
- run id `ssat-draft3-release-cofounder-<date drawn>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 36 draft-3 items, drawn with `DRAW_COHORT=ssat-reading-draft-3 DRAW_FAMILY=ssat`, domain
  Reading Comprehension, flat five-wide deal, **after** the SSAT draft-2 and ISEE draft-1 release sittings close (the
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
- He will have sat 108+ SSAT draft siblings written to the same brief; familiarity could raise his blind
  score, the conservative direction for the guard.
- Author and checker are the same model; the cheap checks are pre-flight only.

## Result (2026-10-22)
`ssat-draft3-release-cofounder-2026-10-22`: blind 13/36 = 36.1% (guard 18/36), 36/36 "Only defensible", 36/36
authentic. The rule releases all 36. **Released 24; 12 held staged (author deviation, conservative direction).**
Two of his notes name factual errors in passages while every item stayed uniquely answerable:
- D3-P01 (soccer): offside is called on the forward's own kick, but offside is judged when a teammate passes. Item 2's
  key teaches the wrong rule.
- D3-P06 (goldfish): the last sentence says the myth "was invented to justify" round bowls, contradicting "its origin
  is a mystery".
The held passages are unserved, not archived, and await an owner-approved wording fix. No other item's outcome changed.
SSAT Reading stays at 5 clean forms (form 6 is 35/40); the 12 held items would complete it. Other notes: four easy
main-idea/function sets, and two keys that could be more precise ("queue" -> rows/files; "stall" -> break down).
Neither has a competing distractor.
