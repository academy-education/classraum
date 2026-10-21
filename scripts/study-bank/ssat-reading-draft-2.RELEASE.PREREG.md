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

## Drawn (2026-10-21)
Run `ssat-draft2-release-cofounder-2026-10-21`, 36 items, five-wide deal A8 B7 C7 D7 E7 (control
22.2%), drawn after the MAP run was withdrawn unseen (map-reading-draft-1 Amendment 3). Rule unchanged.

## Amendment 1 (2026-10-21, before any item is seen): a 12-item SAMPLE sitting replaces the 36

Owner, 2026-10-21: reduce the number of questions the co-founder has to do. The run drawn above is
trimmed, unseen, to **two passages (12 items)**, chosen by the lowest sha256 of
`ssat-reading-draft-2-sample:<passage_id>` over P01-P06: **D2-P02 (0df56614) and D2-P05 (36c52e98)**.
The other 24 rows are withdrawn unseen.

Rule (replaces "Release rule" above for this batch):
1. **Batch guard.** Blind >= 6/12 (50%): nothing is released; the batch is held whole.
2. **All 12 "Only defensible"** (and the guard not reached): **all 36 items released**, the 24
   unsampled on the strength of the sample.
3. **Exactly 1 of 12 flagged** ("Another is also defensible" / "No unique answer"): that item is
   archived; the sampled passage it belongs to is archived only under the 2-of-6 passage rule; the
   24 unsampled items are NOT released on the sample: they go to a follow-up sitting of the
   remaining four passages under the original per-item rule.
4. **2 or more of 12 flagged:** nothing released; the 24 go to a full sitting under the original rule.

Why this is defensible, and its limit, stated before the number exists:
- Draft 1 (same brief): 72/72 items judged "Only defensible" across two sittings, 0 rejected. A
  per-item reject rate of 5% would leave a clean 12 with probability 0.54; 10%, 0.28; 20%, 0.07. So
  a clean sample is weak evidence against a 5% defect rate and fair evidence against 20%.
- Draft 2 has a different author (Claude in-session, not the draft-1 agents), so draft 1's rate may
  not transfer. **24 items will reach students without a human exclusivity read** if rule 2 fires.
- A student report of a defective item archives it (existing path); nothing else watches them.

### Trimmed (2026-10-21)
Run now 12 rows (D2-P02 + D2-P05), all unseen; 24 withdrawn rows snapshotted in
`fixes/snapshot-ssat-draft2-run-trimmed-2026-10-21.json`. Kept key slots A3 B1 C2 D3 E3: the
always-pick-the-commonest-letter control is 25.0% (sum of p^2 22.2%), so the 6/12 guard sits at
double the control.

## Amendment 2 (2026-10-21, before any item is seen): Amendment 1's sample rule is withdrawn

Owner, 2026-10-21: "I still want him to finish all of them." Every one of the 36 items gets the
co-founder's per-item read; nothing is released on a sample. To keep each sitting short, the batch is
sat in **three runs of two passages (12 items)**, in this order: D2-P02 + D2-P05 (already drawn),
then D2-P01 + D2-P03, then D2-P04 + D2-P06. Each later run is drawn only when the previous closes.

The ORIGINAL release rule applies, unchanged, with the batch guard on the pooled 36:
1. Pooled blind >= 18/36: nothing released.
2. Per item: "Only defensible" -> `verified=true`; otherwise `archived=true`.
3. Per passage: 2 or more of 6 flagged -> the passage is archived.
**Nothing is released until all three runs are answered**, so the guard is evaluated once, on 36.

### Run 1 answered (2026-10-21), nothing released yet (Amendment 2: release after all three runs)
`ssat-draft2-release-cofounder-2026-10-21` (D2-P02, D2-P05): blind 4/12 = 33.3% vs 25.0% control;
12/12 "Only defensible"; realism P02 6/6 authentic, P05 1/6 authentic (5 "artificial"); ~9 minutes.
Run 2 drawn: `ssat-draft2-release2-cofounder-2026-10-21` (D2-P01, D2-P03), 12 unseen, slots A3 B3 D3 E3.
