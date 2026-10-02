/**
 * Per-question time for a full test.
 *
 * WHY THIS IS ATTRIBUTION, NOT A SECOND CLOCK
 * -------------------------------------------
 * TestSession already keeps an ACTIVE clock (`currentElapsedMs`): it runs
 * only while the tab is visible (visibilitychange), stops on manual pause
 * and on the app-exit guard, and stops while TOEFL Listening/Speaking
 * audio plays (ETS: "the clock counts down only while you are answering").
 * That clock is what submit already receives as `elapsedSeconds`.
 *
 * A second, independent per-question timer would have to re-implement
 * every one of those freeze rules and would drift from the first the
 * moment one was missed. So instead each question is CREDITED with the
 * active time that passed while it was the one on screen: on every
 * question change (navigation, revisit, a section's hard time-out
 * advance) and at submit, `elapsed - mark` goes to the question being
 * left, and the mark moves. Revisits add up because credit accumulates.
 *
 * The invariant this buys: the per-question times sum to the elapsed the
 * test was submitted with. That is what `reconcileQuestionSeconds`
 * checks on the server before trusting them.
 *
 * Pure; no React, no storage. TestSession owns persistence.
 */

export interface QuestionTimeState {
  /** Active milliseconds credited per question index. */
  ms: Record<number, number>
  /** Active-elapsed value at the last checkpoint. */
  markMs: number
}

export function initQuestionTime(elapsedMs: number): QuestionTimeState {
  return { ms: {}, markMs: Math.max(0, elapsedMs) }
}

/**
 * Credit the active time since the last checkpoint to `idx` (the question
 * that WAS on screen) and move the mark to `elapsedMs`.
 *
 * Negative spans are clamped to zero rather than subtracted: after a
 * reload the restored elapsed (saved once a second) can sit slightly
 * behind a mark saved at a checkpoint, and that gap is lost time, not
 * time to take away from a question.
 */
export function checkpointQuestionTime(
  state: QuestionTimeState,
  idx: number | null,
  elapsedMs: number,
): QuestionTimeState {
  const delta = elapsedMs - state.markMs
  if (idx == null || idx < 0 || !Number.isInteger(idx) || !(delta > 0)) {
    return { ms: state.ms, markMs: Math.max(0, elapsedMs) }
  }
  return {
    ms: { ...state.ms, [idx]: (state.ms[idx] ?? 0) + delta },
    markMs: elapsedMs,
  }
}

/**
 * Rebuild the state from localStorage. Anything malformed is dropped
 * rather than trusted; a corrupt store must not invent time. The mark is
 * clamped to the restored elapsed for the reason given above.
 */
export function restoreQuestionTime(raw: unknown, elapsedMs: number): QuestionTimeState {
  const fresh = initQuestionTime(elapsedMs)
  if (!raw || typeof raw !== 'object') return fresh
  const r = raw as { ms?: unknown; markMs?: unknown }
  const ms: Record<number, number> = {}
  if (r.ms && typeof r.ms === 'object') {
    for (const [k, v] of Object.entries(r.ms as Record<string, unknown>)) {
      const i = Number(k)
      if (Number.isInteger(i) && i >= 0 && typeof v === 'number' && Number.isFinite(v) && v > 0) ms[i] = v
    }
  }
  const mark = typeof r.markMs === 'number' && Number.isFinite(r.markMs) ? r.markMs : elapsedMs
  return { ms, markMs: Math.max(0, Math.min(mark, elapsedMs)) }
}

/** Whole seconds per question, one slot per question, 0 for never seen. */
export function questionSecondsArray(state: QuestionTimeState, count: number): number[] {
  return Array.from({ length: count }, (_, i) => Math.round((state.ms[i] ?? 0) / 1000))
}

/**
 * SERVER: what to write to study_attempts.time_spent_seconds.
 *
 * Uses the client's per-question seconds only when they are complete and
 * consistent with the elapsed clock they were carved from: one
 * non-negative integer per question, summing to elapsedSeconds within
 * rounding (each slot rounds by at most half a second) plus a small
 * allowance for the checkpoint and the elapsed being read a tick apart.
 * Anything else, including every client that predates this field, falls
 * back to the even split this route has always written.
 *
 * Even split keeps its old shape exactly: round(elapsed / cards), at
 * least 1, and NULL on a blank. Measured time is written on blanks too:
 * a question looked at and left blank still took that time, and leaving
 * it NULL would drop it from every total.
 */
export function reconcileQuestionSeconds(input: {
  questionSeconds?: (number | null)[] | null
  elapsedSeconds: number
  answers: (string | null)[]
  count: number
}): { basis: 'measured' | 'even_split'; seconds: (number | null)[] } {
  const { questionSeconds: qs, elapsedSeconds, answers, count } = input
  const valid = Array.isArray(qs)
    && qs.length === count
    && qs.every(v => typeof v === 'number' && Number.isInteger(v) && v >= 0)
  if (valid) {
    const sum = (qs as number[]).reduce((a, b) => a + b, 0)
    const slack = Math.ceil(count / 2) + 2
    if (sum > 0 && Math.abs(sum - elapsedSeconds) <= slack) {
      return { basis: 'measured', seconds: qs as number[] }
    }
  }
  const even = Math.max(1, Math.round(elapsedSeconds / Math.max(1, count)))
  return {
    basis: 'even_split',
    seconds: Array.from({ length: count }, (_, i) => (answers[i] == null ? null : even)),
  }
}
