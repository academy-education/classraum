/**
 * SM-2 spaced-repetition scheduler.
 *
 * Standard SuperMemo-2 algorithm (Wozniak 1990) — same one Anki and
 * most modern SRS apps use. Given the student's self-rated quality
 * (0-5) for a review, compute the next interval, ease factor, and
 * repetition count.
 *
 * Quality rating scale (we expose 3 buttons in UI mapped to 1/3/5):
 *   0 - complete blackout (we don't expose this)
 *   1 - "Again" — wrong, but recognized after seeing the answer
 *   2 - wrong, with effort
 *   3 - "Hard" — correct but recalled with serious difficulty
 *   4 - correct after some hesitation
 *   5 - "Easy" — perfect recall
 */

export interface SrsState {
  ease_factor: number    // 1.3 minimum, 2.5 typical start
  interval_days: number  // days until next review
  repetitions: number    // consecutive successful reviews (≥3 quality)
}

export function scheduleNext(prev: SrsState, quality: 0 | 1 | 2 | 3 | 4 | 5): SrsState & { due_at: Date } {
  const q = Math.max(0, Math.min(5, quality))

  // Wrong answer → reset rep count but keep ease factor (slightly nudged
  // down). Card resurfaces same-day.
  if (q < 3) {
    const newEase = Math.max(1.3, prev.ease_factor - 0.2)
    return {
      ease_factor: newEase,
      interval_days: 0,  // see again today
      repetitions: 0,
      due_at: new Date(Date.now() + 10 * 60 * 1000),  // 10 minutes
    }
  }

  // Right answer → SM-2 interval progression.
  // First success: 1 day. Second: 6 days. Subsequent: interval × ease.
  let interval: number
  const newReps = prev.repetitions + 1
  if (newReps === 1) interval = 1
  else if (newReps === 2) interval = 6
  else interval = Math.round(prev.interval_days * prev.ease_factor)

  // Ease factor update — standard SM-2 formula.
  const newEase = Math.max(1.3, prev.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  return {
    ease_factor: newEase,
    interval_days: interval,
    repetitions: newReps,
    due_at: new Date(Date.now() + interval * 24 * 60 * 60 * 1000),
  }
}

/** Initial state for a brand-new card the student has never reviewed. */
export const INITIAL_SRS: SrsState = {
  ease_factor: 2.5,
  interval_days: 0,
  repetitions: 0,
}
