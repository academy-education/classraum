# SSAT Reading draft 4: co-founder RELEASE sitting, pre-registered (2026-10-22)

**Committed with the staged insert, before the run is drawn.** Nothing here changes after the draw.

## Why
`runout-monitor.ts` on 2026-10-22: SSAT Reading is the most binding section for real students. One has 1 clean
test left and two have 2 (depth 5). Draft 3, in the co-founder's open run now, adds at most one form, and nothing
else for SSAT Reading was queued behind it. Draft 1's route has released 36 + 36 + 36 items through this sitting
(SSAT d1, SSAT d2, ISEE d1). On this family the human sitting decides (CLAUDE.md 2026-09-21).

## The batch
`ssat-reading-draft-4`: 6 passages x 6 items = 36, written in-session by Claude to draft 3's brief (no agents,
owner 2026-10-12). Genres: fiction, poetry, memoir, essay, history, science. All six topics were checked against
the 104 live and staged SSAT/ISEE reading passages; none matches. Attitude keys: curious, warm x3, doubtful,
critical. The first five drafts all had warm keys, so two questions were re-aimed to avoid a cross-item pattern.

**New this batch: the co-founder's ISEE draft-1 notes (2026-10-22) became authoring rules.**
1. Main-idea distractors are on-topic: a real part but not the whole, central but too narrow, or a central
   misreading. No distractor is off-topic.
2. Attitude option sets are tailored to each passage. `merge.mjs` now draws from eight directions (adds curious,
   neutral and doubtful). It refuses two sets in the batch that share more than one word, and any set that shares
   4+ words with one of the 45 live one-word attitude sets. Both checks were break-tested: the in-batch check
   fired on the real draft (P03/P04 shared two words, fixed), and the live check fired on a planted live set.
3. Inference and purpose keys are never a restatement of one sentence.
4. Story logic was read line by line (four passage edits before freeze: a redundant line, an unexplained apron,
   an over-general credit line, and a bee figure softened to "more than half").

**Mechanical pre-flight, all passing.**
- `merge.mjs` (draft 3's checks + the two above): 0 problems.
- Key uniquely longest: 10/36 -> 6/36, by lengthening one distractor on 4 items. Uniquely shortest: 6/36.
- Key slots 8/7/7/7/7, at most 2 per passage. Difficulty: 6 easy / 18 medium / 12 hard.
- New `check-explanation-quotes.mjs`: every quoted fragment in an explanation or rationale is an option or appears in the
  passage. 286 fragments, 0 unmatched. Break-tested with a planted misquote; draft 3 reads 3, all benign.
- `check-location-refs`: 10 checked, 3 skipped, 0 mismatches. The poem's " / " line quote made the checker report
  a false mismatch; the checker now handles it, with a self-test case that fails when the fix is reverted.
- Edit screen (`ssat-draft.ts`): 36/36 draft, hash, valid.

**Not run, stated plainly:** no AI options-only attack and no AI with-source graders. The sitting's "Only
defensible" judgement is the only exclusivity check by a reader other than the author. The topic check above was
by opening text, not a semantic duplicate search.

## The run
- run id `ssat-draft4-release-cofounder-<date drawn>`, reviewer `support@classraum.com` (`6ca6edaf…`)
- all 36 draft-4 items, drawn by `draw-next.mjs` from `cofounder-queue.json` (cohort `ssat-reading-draft-4`,
  family ssat, Reading Comprehension, flat five-wide deal), **after** the SSAT draft-3 sitting closes. The drawer
  refuses a second open run, and that guard is not worked around.
- same panel as draft 1: blind pick on options only, then passage + key: Only defensible / Another is also
  defensible / No unique answer, Authentic / Authored, optional note

## Release rule (fixed now, draft 1's rule unchanged)
1. **Batch guard, first.** Blind score >= 18/36 (50%): NOTHING is released; the batch is held whole.
2. Otherwise, **per item**: "Only defensible" -> `verified=true`. "Another is also defensible" or "No unique
   answer" -> `archived=true`, not repaired. Authentic/Authored is recorded, not a gate.
3. **Per passage**: 2 or more of a passage's 6 items flagged or rejected -> archive the whole passage.
4. Unanswered items stay staged until answered. Nothing else changes.
5. After release: run `admission-form-depth.ts`, report SSAT Reading forms, and update `depth-snapshot.json`.

## What this batch can and cannot show about the notes
Draft 4 is the first batch written to his notes, so his blind score and notes on it are a fresh measurement, not a
tuned one. The notes target difficulty, so the expected signal is in his notes (fewer "too easy" remarks) and in
blind accuracy. A blind score that RISES toward the guard would mean closer distractors made the key easier to
spot, not harder: on-topic distractors can collapse onto the key's framing. Report it either way.

## Known limits, stated before the number exists
- One reader, n=36; the blind score is coarse (about +/-13 points).
- By then he will have sat 144+ draft siblings written to one brief, and familiarity could raise his blind score.
  That is the conservative direction for the guard.
- Author and checker are the same model; the cheap checks are pre-flight only.
