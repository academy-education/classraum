/**
 * Per-criterion movement over time for a student's graded responses.
 *
 * WHY THIS STAT AND NOT A PREDICTED SCORE.
 *
 * The rubric grader is not calibrated: against ETS's own published
 * samples it runs 1-2 bands harsh (scripts/calibrate-grader.ts, still
 * failing by design). So "you are a band 3" is not a claim we can make.
 * But the SAME miscalibration applies at both ends of a comparison, so
 * whether task fulfillment moved up while language use stayed flat is
 * mostly preserved even when the absolute level is wrong. This module
 * exists because it is the one Speaking/Writing statistic that survives
 * the calibration problem rather than depending on it being fixed.
 *
 * THE NOISE FLOOR IS REAL AND IT IS LARGE.
 *
 * On 2026-07-29 the same discussion essay, graded twice seconds apart by
 * two callers, came back band 4 and band 3. That is a full band of
 * run-to-run variance on a single response. A "you improved!" drawn from
 * two data points would therefore be reporting grader noise as student
 * progress — the most damaging thing a progress tracker can do, because
 * it is indistinguishable from the real thing.
 *
 * So a direction is only ever stated when there are enough responses on
 * BOTH sides of the comparison and the gap clears the floor. Below that
 * the UI shows the scores and says nothing about direction. Points are
 * always plotted; only the CLAIM is gated.
 */

import { criterionLabel } from './rubricDisplay'

export interface CriterionSample {
  key: string
  score: number
  /** ISO timestamp of the grade. */
  at: string
}

export type TrendDirection = 'up' | 'down' | 'flat'

export interface CriterionTrend {
  key: string
  /** Humanised, e.g. "Task fulfillment". */
  label: string
  /** Oldest first, for plotting. */
  scores: number[]
  /** Most recent score. */
  latest: number
  /** Mean of the whole series — the number to show as "where you are". */
  average: number
  /** MEDIAN of the earliest / latest window, when the series is long
   *  enough to have two. Median, not mean — see the note on the window
   *  constants. Null when the series is too short. */
  earlyMedian: number | null
  lateMedian: number | null
  /** lateMedian - earlyMedian, or null when not computable. */
  delta: number | null
  /** Set ONLY when the movement clears the noise floor. Null means "we
   *  are not saying" — which is different from 'flat', which means "we
   *  looked and it did not move". */
  direction: TrendDirection | null
  samples: number
}

/**
 * Minimum responses before a direction may be claimed, and how the two
 * windows are compared.
 *
 * Six, so each window holds three.
 *
 * The windows are compared by MEDIAN, not mean, and that is the whole
 * design. A mean over three samples is moved 0.67 of a band by a single
 * outlier grade — so a series of 3,3,3,3,3,5, which is five identical
 * results and one erratic grade, cleared a 0.5 threshold and reported
 * "improving". Given that this grader returned 4 and 3 for the SAME
 * essay seconds apart, that outlier is exactly the case the floor exists
 * to absorb, and the mean could not absorb it. A median of three is
 * unmoved by one bad grade and still shifts on a genuine one-band
 * change, which is the behaviour we want.
 *
 * Caught by a unit test, not by reasoning: the doc comment here
 * previously claimed the mean-based floor was robust to a single
 * erratic grade, and it was not.
 */
export const MIN_SAMPLES_FOR_DIRECTION = 6
export const WINDOW = 3
export const NOISE_FLOOR = 0.5

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length

/** Middle value; mean of the two middles on an even count. */
const median = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/**
 * Group samples by criterion and score each series.
 *
 * Criterion keys are task-specific — an email is graded on
 * social_conventions, a discussion on contribution, a spoken answer on
 * delivery — so a series covers only the responses that were graded on
 * that criterion. `samples` is therefore per-criterion, not per-student,
 * and is surfaced in the UI for exactly that reason.
 */
export function buildCriterionTrends(
  samples: CriterionSample[],
  opts: { minSamples?: number } = {},
): CriterionTrend[] {
  const { minSamples = 2 } = opts

  const byKey = new Map<string, CriterionSample[]>()
  for (const s of samples) {
    if (!s.key || !Number.isFinite(s.score)) continue
    const list = byKey.get(s.key) ?? []
    list.push(s)
    byKey.set(s.key, list)
  }

  const trends: CriterionTrend[] = []
  for (const [key, list] of byKey) {
    if (list.length < minSamples) continue
    // Oldest first. Sorting by timestamp rather than trusting query
    // order, because two grades written in the same second are common
    // (a batch grades every response at once).
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at))
    const scores = sorted.map(s => s.score)

    const canSplit = scores.length >= MIN_SAMPLES_FOR_DIRECTION
    const earlyMedian = canSplit ? median(scores.slice(0, WINDOW)) : null
    const lateMedian = canSplit ? median(scores.slice(-WINDOW)) : null
    const delta = earlyMedian !== null && lateMedian !== null
      ? lateMedian - earlyMedian
      : null

    let direction: TrendDirection | null = null
    if (delta !== null) {
      direction = Math.abs(delta) < NOISE_FLOOR ? 'flat' : delta > 0 ? 'up' : 'down'
    }

    trends.push({
      key,
      label: criterionLabel(key),
      scores,
      latest: scores[scores.length - 1]!,
      average: mean(scores),
      earlyMedian,
      lateMedian,
      delta,
      direction,
      samples: scores.length,
    })
  }

  // Weakest average first: the row worth reading is the one to work on,
  // the same ordering rule the section breakdown uses.
  trends.sort((a, b) => a.average - b.average || b.samples - a.samples)
  return trends
}

/**
 * How many more responses until a criterion can be given a direction.
 * Shown to the student so the empty state is a countdown rather than a
 * silence — "2 more responses" is a reason to keep going.
 */
export function samplesUntilDirection(trend: CriterionTrend): number {
  return Math.max(0, MIN_SAMPLES_FOR_DIRECTION - trend.samples)
}
