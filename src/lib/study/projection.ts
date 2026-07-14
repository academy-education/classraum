/**
 * Predicted-score projection (P1 of the score-plan engine).
 *
 * Pure + deterministic so it's unit-testable and identical on client and
 * server. Given each section's history of completed full-test scaled
 * scores, it projects a total score onto test day with an HONEST
 * confidence band — the band widens with fewer attempts and a longer
 * horizon, and cold-start (a section with no test yet) yields no number
 * rather than a fabricated one.
 *
 * SAT-only for now: two sections (Reading & Writing, Math), each 200–800,
 * summing to a 400–1600 total.
 */

export interface Attempt { score: number; date: string } // date = 'YYYY-MM-DD'

export interface SectionInput {
  key: string
  label_en: string
  label_ko: string
  min: number
  max: number
  attempts: Attempt[]
}

export interface SectionProjection {
  key: string
  label_en: string
  label_ko: string
  current: number | null
  predicted: number | null
  low: number | null
  high: number | null
  attempts: number
  perWeek: number // projected points/week (0 when <2 attempts)
}

export interface Prediction {
  enoughData: boolean       // every section has >= 1 completed test
  hasTrend: boolean         // some section has >= 2 (a slope exists)
  current: number | null    // sum of latest section scores
  predicted: number | null  // projected to test day (or a 4-week horizon)
  low: number | null
  high: number | null
  goalScore: number | null
  gap: number | null        // goalScore - predicted (positive = points to gain)
  onTrack: boolean | null   // predicted >= goal
  weeksToTest: number | null
  sections: SectionProjection[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const round5 = (v: number) => Math.round(v / 5) * 5
const round10 = (v: number) => Math.round(v / 10) * 10

/** Whole weeks (fractional) from `from` to `to`, floored at 0. */
export function weeksUntil(to: string, from: Date = new Date()): number {
  const target = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(target)) return 0
  return Math.max(0, (target - from.getTime()) / (7 * 86400_000))
}

/** Least-squares slope of score vs. week-index (points per week). */
function slopePerWeek(attempts: Attempt[]): number {
  if (attempts.length < 2) return 0
  const t0 = Date.parse(`${attempts[0]!.date}T00:00:00Z`)
  const xs = attempts.map(a => (Date.parse(`${a.date}T00:00:00Z`) - t0) / (7 * 86400_000))
  const ys = attempts.map(a => a.score)
  const n = xs.length
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = ys.reduce((s, y) => s + y, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i]! - mx) * (ys[i]! - my); den += (xs[i]! - mx) ** 2 }
  if (den === 0) return 0
  // Clamp to a plausible per-section rate so a lucky jump doesn't imply
  // +200 by test day.
  return clamp(num / den, -15, 30)
}

/** Residual standard deviation around the fitted line (0 for <3 points). */
function residualStd(attempts: Attempt[], slope: number): number {
  if (attempts.length < 3) return 0
  const t0 = Date.parse(`${attempts[0]!.date}T00:00:00Z`)
  const xs = attempts.map(a => (Date.parse(`${a.date}T00:00:00Z`) - t0) / (7 * 86400_000))
  const ys = attempts.map(a => a.score)
  const my = ys.reduce((s, y) => s + y, 0) / ys.length
  const intercept = my - slope * (xs.reduce((s, x) => s + x, 0) / xs.length)
  const res = ys.map((y, i) => y - (intercept + slope * xs[i]!))
  const varr = res.reduce((s, r) => s + r * r, 0) / (res.length - 2)
  return Math.sqrt(Math.max(0, varr))
}

function projectSection(sec: SectionInput, horizonWeeks: number): SectionProjection {
  const attempts = [...sec.attempts].sort((a, b) => a.date.localeCompare(b.date))
  const n = attempts.length
  const base = { key: sec.key, label_en: sec.label_en, label_ko: sec.label_ko, attempts: n }
  if (n === 0) return { ...base, current: null, predicted: null, low: null, high: null, perWeek: 0 }

  const current = attempts[n - 1]!.score
  const slope = slopePerWeek(attempts)
  const predicted = round10(clamp(current + slope * horizonWeeks, sec.min, sec.max))

  // Honest band: wider with a longer horizon + fewer attempts, plus the
  // observed spread. Rounded to 5s, capped so it never looks absurd.
  const attemptFactor = n >= 4 ? 0.6 : n >= 3 ? 0.75 : n >= 2 ? 0.9 : 1.1
  const half = round5(clamp((18 + 5 * horizonWeeks + residualStd(attempts, slope)) * attemptFactor, 15, 90))

  return {
    ...base,
    current,
    predicted,
    low: round10(clamp(predicted - half, sec.min, sec.max)),
    high: round10(clamp(predicted + half, sec.min, sec.max)),
    perWeek: Math.round(slope),
  }
}

export function project(
  sections: SectionInput[],
  goalScore: number | null,
  testDate: string | null,
  now: Date = new Date(),
): Prediction {
  const weeksToTest = testDate ? weeksUntil(testDate, now) : null
  // With no test date we still show a near-term projection so the number
  // isn't just "= current"; label it "if you keep this pace" in the UI.
  const horizon = weeksToTest ?? 4

  const projections = sections.map(s => projectSection(s, horizon))
  const enoughData = projections.length > 0 && projections.every(p => p.current !== null)
  const hasTrend = projections.some(p => p.attempts >= 2)

  const sum = (pick: (p: SectionProjection) => number | null) =>
    projections.reduce((acc, p) => acc + (pick(p) ?? 0), 0)

  const current = enoughData ? sum(p => p.current) : null
  const predicted = enoughData ? sum(p => p.predicted) : null
  const low = enoughData ? sum(p => p.low) : null
  const high = enoughData ? sum(p => p.high) : null

  const gap = goalScore != null && predicted != null ? goalScore - predicted : null

  return {
    enoughData,
    hasTrend,
    current,
    predicted,
    low,
    high,
    goalScore: goalScore ?? null,
    gap,
    onTrack: gap == null ? null : gap <= 0,
    weeksToTest: weeksToTest == null ? null : Math.max(0, Math.round(weeksToTest)),
    sections: projections,
  }
}
