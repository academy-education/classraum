# SSAT Reading draft 1: co-founder RELEASE sitting, pre-registered (2026-10-18)

**Committed before the run is drawn.**

## Why
The feedback review of 36 draft-1 items (`ssat-draft1-review-cofounder-2026-10-12`) found the AI
options-only leak (83.9%) does not reach a person: human blind 6/36 = 16.7% against a 22.2% deal
control, 36/36 "only defensible", 30/36 "authentic". On families where model and human disagree,
the human sitting decides (CLAUDE.md 2026-09-21). Owner approved a release sitting (2026-10-18).

## The run
- run id `ssat-draft1-release-cofounder-2026-10-18`, reviewer `support@classraum.com` (`6ca6edaf…`)
- the 36 draft-1 items he has NOT seen: passages P02, P04, P06, P08, P10, P12 (6 x 6), drawn with
  `DRAW_COHORT=ssat-reading-draft-1 DRAW_FAMILY=ssat`, domain Reading Comprehension, flat five-wide deal.
  The 36 items he already reviewed are not eligible for release by any sitting.
- same panel: blind pick on options only, then passage + key: Only defensible / Another is also
  defensible / No unique answer, Authentic / Authored, optional note.

## Release rule (fixed now)
1. **Batch guard, first.** If his blind score is >= 18/36 (50%, more than double the ~20-22% deal
   control), NOTHING is released: the batch is guessable by a person and is held whole.
2. Otherwise, **per item**: "Only defensible" -> `verified=true`; "Another is also defensible" or
   "No unique answer" -> `archived=true`, not repaired. Authentic/Authored is recorded, not a gate.
3. **Per passage**: if 2 or more of a passage's 6 items are flagged or rejected, archive the whole
   passage (a passage served with 4 of 6 items breaks the 6-per-passage shape).
4. Unanswered items stay staged until answered. Nothing else changes.
5. After release: run `form-capacity.mjs` and `admission-form-depth.ts` and report SSAT Reading forms.

## Known limits, stated before the number exists
- One reader, n=36; the blind score is coarse (about +/-13 points). The batch guard is set far above
  control on purpose so that it only fires on a real leak.
- He has now read 36 sibling items written to the same brief; familiarity could raise his score,
  the conservative direction for the guard.
