# eoi-v3 Stage 1 — pre-registered, before any item exists

Written 2026-08-28, before authoring. Purpose: expand SAT Expression of
Ideas (currently 66 items, the binding constraint on SAT form capacity
at ~6 full tests) without repeating the cohort's known defect.

## What the existing cohort teaches

- v2 EoI is 65/66 Rhetorical Synthesis and scores **100% blind** (12/12
  attacked with source hidden vs ~25% control; accepts.mjs comment,
  MIRROR-PAIR-RESULT.md). The goal statement lives in the prompt, so a
  solver picks the best-goal-fitting option without ever reading the
  notes. B2's human sitting cleared the cohort (2/20, −15.0), so it is
  not being archived — but a NEW batch must not inherit the property.
- Transitions is a hole: 1 item. It is passage-dependent by
  construction (options are connectives; the logical joint is in the
  passage), so the batch weights it heavily.

## Batch design

- Stage 1 pilot: **12 items** (6 Transitions + 6 Rhetorical Synthesis),
  authored to per-item ASSIGNMENTS (subskill, difficulty medium/hard,
  topic, key length rank to a flat 3/3/3/3 histogram, and for RS the
  goal type + per-distractor wrongness modes; for Transitions the key's
  relation type + blank position). Assignment, not preference — the
  77%-rank-2 lesson (REPAIR-BRIEF.md).
- RS note-dependence is the load-bearing property: distractors must
  SOUND goal-fulfilling and fail only on note-faithfulness (wrong
  quantity, reversed relation, misattribution, detail not in notes,
  causal overclaim of a correlational note). Which modes appear varies
  per item — a fixed roster is the tell that killed cr-v1..v6.
- Distractors may hedge; absolutes stay at official-corpus rates.
  Explanations quote options, never positions. Fictional or generic
  entities; no checkable false claims about real named people.

## Gates (stated before authoring)

1. **Source-withheld attack on all 12, immediately after authoring** —
   3 independent Claude solvers, forced choice, stem+options only
   (passage never rendered), options re-lettered per item by seeded
   RNG. Control = best fixed letter over the actual key distribution.
   - margin ≤ **+25** → PASS to Stage 2 (scale to 72 total)
   - margin ≥ **+30** → batch DEAD. No option-text repair. Brief
     revised (max two revisions, then the approach is REFUTED).
   - between → inconclusive: author 12 more to the same brief and
     re-attack the union.
   - Identical pick-strings across solvers = one instrument, not
     three → no verdict, re-run with varied solver framings.
   - Per-subskill view reported; with only 6 items (18 trials) per
     subskill, a subskill breach ≥ +30 at ≥ 18 trials kills that
     subskill's half even if the batch mean passes (AT-V2 per-type
     lesson).
2. **Answer-blind QC** (with source): 3 solvers vote the key
   independently; anchored grader rates difficulty / distractor_quality
   / passage_needed. accepts.mjs decides — including its RS carve-out
   and the passage_needed requirement it exists to enforce.
3. Items failing either gate are DROPPED, never edited (option text is
   immutable post-attack).
4. Stage 2 (only if Stage 1 passes): scale to 72 total, full pre-flight
   (verify-answer-key-spread, verify-option-tells,
   check-duplicate-items), fresh 24-item held-out attack on the scaled
   batch, then insert via bank-helper with BANK_COHORT=eoi-v3.

Nothing is banked before every gate above has a recorded result.
