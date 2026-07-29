import {
  scoreTrendSession, trendDelta, chartGeometry, type TrendSession,
} from '@/lib/study/topic-trend'
import type { ScorableItem } from '@/lib/study/toefl-section-score'

const SENT = 'She works at the library on Friday afternoons'
const session = (over: Partial<TrendSession>): TrendSession => ({
  sessionId: 's', at: '2026-07-28T00:00:00Z', items: [],
  correctCount: 0, totalScored: 0, family: 'toefl', ...over,
})

describe('scoreTrendSession', () => {
  it('scores writing on weighted points, NOT correct-over-total', () => {
    // The real shape of session 114cc85d: 6 of 10 sentences right, and
    // two essays the old model ignored entirely. Stored score: 60. The
    // result screen says 83, and the trend must agree with the screen.
    const items: ScorableItem[] = [
      ...Array.from({ length: 6 }, () => ({ type: 'arrange_words', correct: true })),
      ...Array.from({ length: 4 }, () => ({ type: 'arrange_words', correct: false })),
      { type: 'writing_email', rubricBand: 5 },
      { type: 'writing_discussion', rubricBand: 4 },
    ]
    const p = scoreTrendSession(session({ items, correctCount: 6, totalScored: 10 }))
    expect(p.percent).toBe(83)
    expect(p.percent).not.toBe(60)   // the stored column
    expect(p.earned).toBe(15)
    expect(p.max).toBe(20)
  })

  it('scores speaking on weighted points', () => {
    // 63667648: stored 42.86 (3 of 7), screen says 54%.
    const items: ScorableItem[] = [
      ...Array.from({ length: 3 }, () => ({ type: 'speaking_repeat', expectedText: SENT, studentAnswer: SENT })),
      ...Array.from({ length: 4 }, () => ({ type: 'speaking_repeat', expectedText: SENT, studentAnswer: 'she works' })),
      ...Array.from({ length: 3 }, () => ({ type: 'speaking_interview', rubricBand: 2 })),
    ]
    const p = scoreTrendSession(session({ items, correctCount: 3, totalScored: 7 }))
    expect(p.percent).toBeGreaterThan(42)
    expect(p.max).toBe(50)
  })

  it('falls back to correct-over-total where there is no points model', () => {
    // Reading and Listening are one point per question already.
    const p = scoreTrendSession(session({ correctCount: 14, totalScored: 35 }))
    expect(p.percent).toBe(40)
    expect(p.band).toBe(2.5)         // the verified Listening band
  })

  it('has no band outside TOEFL', () => {
    const p = scoreTrendSession(session({ correctCount: 13, totalScored: 44, family: 'sat' }))
    expect(p.band).toBeNull()
    expect(p.percent).toBe(30)
  })

  it('does not divide by zero on an empty session', () => {
    const p = scoreTrendSession(session({}))
    expect(p.percent).toBe(0)
  })
})

describe('trendDelta', () => {
  const at = (percent: number) =>
    ({ sessionId: 'x', at: '', percent, band: null, earned: 0, max: 0 })

  it('refuses to call one session a trend', () => {
    expect(trendDelta([])).toBeNull()
    expect(trendDelta([at(50)])).toBeNull()
  })

  it('measures first to last, not last two', () => {
    // A dip in the middle must not read as a decline overall.
    expect(trendDelta([at(40), at(20), at(60)])).toBe(20)
    expect(trendDelta([at(60), at(50)])).toBe(-10)
  })
})

describe('chartGeometry', () => {
  it('zooms to the data so small real movement is visible', () => {
    // 40/42/41 on a 0-100 axis is a flat line hiding the only signal.
    const g = chartGeometry([40, 42, 41], 100, 40)
    expect(g.yMax - g.yMin).toBe(20)
    expect(g.yMin).toBeLessThan(40)
    expect(g.yMax).toBeGreaterThan(42)
  })

  it('does not magnify a one-point difference into a cliff', () => {
    const g = chartGeometry([50, 51], 100, 40)
    const rise = Math.abs(g.coords[0]!.y - g.coords[1]!.y)
    expect(rise).toBeLessThan(40 * 0.15)   // under 15% of the plot height
  })

  it('keeps the window inside 0-100', () => {
    for (const data of [[0, 2], [99, 100], [100, 100], [0, 0]]) {
      const g = chartGeometry(data, 100, 40)
      expect(g.yMin).toBeGreaterThanOrEqual(0)
      expect(g.yMax).toBeLessThanOrEqual(100)
      for (const c of g.coords) {
        expect(c.y).toBeGreaterThanOrEqual(0)
        expect(c.y).toBeLessThanOrEqual(40)
      }
    }
  })

  it('centres a lone point instead of clipping it at the edge', () => {
    const g = chartGeometry([70], 100, 40)
    expect(g.coords[0]!.x).toBe(50)
    expect(g.areaPath).toBe('')   // no area under a single point
  })

  it('emits nothing at all for no sessions', () => {
    const g = chartGeometry([], 100, 40)
    expect(g.coords).toEqual([])
    expect(g.linePath).toBe('')
  })

  it('rises on the screen as the score rises', () => {
    // SVG y grows downward; a better score must sit HIGHER.
    const g = chartGeometry([30, 80], 100, 40)
    expect(g.coords[1]!.y).toBeLessThan(g.coords[0]!.y)
  })
})
