/**
 * The score history behind a topic's trend chart.
 *
 * WHY THIS RECOMPUTES INSTEAD OF READING study_sessions.score.
 *
 * That column holds the score model that was live when the session was
 * submitted, and for TOEFL Speaking and Writing it is the OLD one —
 * correct answers over scored questions, with every essay and interview
 * answer counting for nothing. On 2026-07-29 the stored value for a real
 * Writing session was 60.0 while its own result screen read 83%, because
 * the screen scores the essays and the column does not.
 *
 * Plotting the column would therefore have put a point at 60% on a chart
 * whose "open this test" link leads to a page saying 83%. That is the
 * band-beside-scaled-score bug again with a longer feedback loop: nobody
 * would have noticed until a student compared the two.
 *
 * So the trend calls scoreToeflSection — the same function, with the
 * same weights, that the result screen calls. One score model, one set
 * of numbers. A backfill of the column is still owed; when it lands this
 * module keeps working and simply agrees with it.
 */

import {
  scoreToeflSection, bandFromProportion, detectToeflSection, WEIGHTS_FOR,
  type ScorableItem,
} from './toefl-section-score'
import { scoreListenRepeat } from './listen-repeat-accuracy'

export interface TrendPoint {
  sessionId: string
  /** ISO timestamp the session was completed. */
  at: string
  /** 0-100, the number the result screen shows as the hero. */
  percent: number
  /** 1-6 for TOEFL, null elsewhere — the other families have no band. */
  band: number | null
  /** Raw points behind the percent, for the tooltip. */
  earned: number
  max: number
}

/** One session's worth of graded work, as stored. */
export interface TrendSession {
  sessionId: string
  at: string
  items: ScorableItem[]
  /** Fallbacks for families with no points model (SAT, subject topics)
   *  and for TOEFL Reading / Listening, which are one point per
   *  question and need no weighting. */
  correctCount: number
  totalScored: number
  family: string | null
}

/**
 * Score one session exactly as its result screen would.
 *
 * Mirrors TestResultView: a Speaking or Writing section goes through the
 * weighted points model; everything else is correct over scored. Keeping
 * the branch here rather than in the route means the rule has one home.
 */
export function scoreTrendSession(s: TrendSession): TrendPoint {
  const section = detectToeflSection(s.items)
  const points = section
    ? scoreToeflSection(s.items, WEIGHTS_FOR[section], scoreListenRepeat)
    : null

  const proportion = points
    ? points.proportion
    : s.totalScored > 0 ? s.correctCount / s.totalScored : 0

  return {
    sessionId: s.sessionId,
    at: s.at,
    percent: Math.round(proportion * 100),
    band: s.family === 'toefl' ? bandFromProportion(proportion) : null,
    earned: points ? points.earned : s.correctCount,
    max: points ? points.max : s.totalScored,
  }
}

/** Change between the first and last point, or null when a single
 *  session cannot establish a direction. Two points is the minimum an
 *  honest "trend" can be drawn from. */
export function trendDelta(points: TrendPoint[]): number | null {
  if (points.length < 2) return null
  return points[points.length - 1]!.percent - points[0]!.percent
}

export interface ChartGeometry {
  /** Polyline points, in viewBox units. */
  coords: Array<{ x: number; y: number }>
  /** Same path closed to the baseline, for the area fill. */
  areaPath: string
  linePath: string
  /** The y band actually drawn, after padding. Labelled on the axis so
   *  the chart never implies a 0-100 range it isn't showing. */
  yMin: number
  yMax: number
}

/**
 * Map percentages onto an SVG viewBox.
 *
 * The y range is the DATA's range padded out, not a fixed 0-100 — three
 * sessions at 40/42/41 on a 0-100 axis is a flat line that hides the
 * only movement there is. It is clamped to a minimum span so two nearly
 * equal scores do not render as a dramatic cliff, which is the opposite
 * failure and the more dishonest of the two.
 */
export function chartGeometry(
  percents: number[], width: number, height: number, minSpan = 20,
): ChartGeometry {
  if (percents.length === 0) {
    return { coords: [], areaPath: '', linePath: '', yMin: 0, yMax: 100 }
  }

  const lo = Math.min(...percents)
  const hi = Math.max(...percents)
  const mid = (lo + hi) / 2
  const span = Math.max(hi - lo, minSpan)
  // Keep the window inside 0-100 after centring on the data.
  let yMin = Math.max(0, Math.min(100 - span, mid - span / 2))
  let yMax = yMin + span
  if (yMax > 100) { yMax = 100; yMin = Math.max(0, 100 - span) }

  const range = yMax - yMin || 1
  const n = percents.length
  const coords = percents.map((p, i) => ({
    // A single point sits centred rather than at x=0, where half the
    // marker would be clipped by the viewBox.
    x: n === 1 ? width / 2 : (i / (n - 1)) * width,
    y: height - ((p - yMin) / range) * height,
  }))

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(' ')
  const areaPath = coords.length > 1
    ? `${linePath} L${width},${height} L${coords[0]!.x.toFixed(2)},${height} Z`
    : ''

  return { coords, areaPath, linePath, yMin, yMax }
}
