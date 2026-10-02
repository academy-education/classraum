/**
 * Storage for on-demand "More help" explanations (study_attempt_explanations).
 * Shared by the writer (/api/study/explain) and the reader
 * (/api/study/wrong-notebook) so the two cannot disagree about which column a
 * mode lives in.
 *
 * PROMPT-VERSIONED BY COLUMN. Each mode has its own text column, and a column
 * holds the output of ONE prompt. When a mode's prompt changes in substance it
 * gets a NEW column, and the old one is left in place, unread:
 *
 *   simpler  "Explain simply" — 2-4 plain sentences, in Korean often 반말.
 *            Retired 2026-10-01 (e2bafd45). Never read or written any more.
 *   more     "Explain more" — walks every choice by letter, 존댓말.
 *            Added in migration 114.
 *
 * e2bafd45 swapped the prompt but kept writing to `simpler`, so the notebook
 * re-showed seven pre-change texts (four in 반말) under the new label. Falling
 * back to `simpler` when `more` is empty would bring exactly that back.
 */

export type StoredExplainMode = 'steps' | 'more'

export interface SavedExplanation {
  steps: string | null
  more: string | null
  followup: string | null
  followup_question: string | null
}

export const EMPTY_SAVED: SavedExplanation = { steps: null, more: null, followup: null, followup_question: null }

/** Columns the notebook loader selects. `simpler` is deliberately absent. */
export const SAVED_EXPLANATION_SELECT = 'attempt_id, language, steps, more, followup, followup_question'

/** One study_attempt_explanations row -> the saved block the client renders. */
export function savedFromRow(row: Record<string, unknown>): SavedExplanation {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
  return {
    steps: str(row.steps),
    more: str(row.more),
    followup: str(row.followup),
    followup_question: str(row.followup_question),
  }
}
