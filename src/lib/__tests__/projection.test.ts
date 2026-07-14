/** @jest-environment node */
import { project, weeksUntil, type SectionInput } from '../study/projection'

const NOW = new Date('2026-01-01T00:00:00Z')

const sat = (rw: Array<[string, number]>, math: Array<[string, number]>): SectionInput[] => [
  { key: 'rw', label_en: 'Reading & Writing', label_ko: '읽기·쓰기', min: 200, max: 800, attempts: rw.map(([date, score]) => ({ date, score })) },
  { key: 'math', label_en: 'Math', label_ko: '수학', min: 200, max: 800, attempts: math.map(([date, score]) => ({ date, score })) },
]

describe('weeksUntil', () => {
  it('counts whole+fractional weeks forward', () => {
    expect(weeksUntil('2026-01-15', NOW)).toBeCloseTo(2, 5)
  })
  it('floors past dates at 0', () => {
    expect(weeksUntil('2025-12-01', NOW)).toBe(0)
  })
})

describe('project — cold start', () => {
  it('no data → not enough, no number', () => {
    const p = project(sat([], []), 1400, '2026-03-01', NOW)
    expect(p.enoughData).toBe(false)
    expect(p.predicted).toBeNull()
    expect(p.current).toBeNull()
  })
  it('one section missing → still not enough (need a total)', () => {
    const p = project(sat([['2025-12-01', 600]], []), 1400, '2026-03-01', NOW)
    expect(p.enoughData).toBe(false)
    expect(p.predicted).toBeNull()
  })
})

describe('project — single attempt per section', () => {
  const p = project(sat([['2025-12-15', 600]], [['2025-12-15', 640]]), 1400, '2026-02-26', NOW)
  it('has a current total but no trend', () => {
    expect(p.enoughData).toBe(true)
    expect(p.hasTrend).toBe(false)
    expect(p.current).toBe(1240)
  })
  it('predicts ~current with a band around it', () => {
    expect(p.predicted).toBe(1240) // slope 0 → no drift
    expect(p.low!).toBeLessThan(p.predicted!)
    expect(p.high!).toBeGreaterThan(p.predicted!)
  })
  it('computes gap + weeks + off-track', () => {
    expect(p.gap).toBe(160) // 1400 - 1240
    expect(p.onTrack).toBe(false)
    expect(p.weeksToTest).toBe(8)
  })
})

describe('project — improving trend projects upward', () => {
  const rw: Array<[string, number]> = [['2025-11-01', 560], ['2025-11-15', 590], ['2025-12-01', 620]]
  const math: Array<[string, number]> = [['2025-11-01', 600], ['2025-11-15', 620], ['2025-12-01', 640]]
  const p = project(sat(rw, math), 1300, '2026-02-01', NOW)
  it('predicted exceeds current when trending up', () => {
    expect(p.hasTrend).toBe(true)
    expect(p.current).toBe(1260) // 620 + 640
    expect(p.predicted!).toBeGreaterThan(p.current!)
  })
  it('can flip to on-track once projection clears the goal', () => {
    expect(p.predicted!).toBeGreaterThanOrEqual(1300)
    expect(p.onTrack).toBe(true)
    expect(p.gap!).toBeLessThanOrEqual(0)
  })
})

describe('project — no goal / no test date', () => {
  const p = project(sat([['2025-12-15', 600]], [['2025-12-15', 640]]), null, null, NOW)
  it('gap + onTrack null without a goal', () => {
    expect(p.gap).toBeNull()
    expect(p.onTrack).toBeNull()
  })
  it('weeksToTest null without a date, still predicts', () => {
    expect(p.weeksToTest).toBeNull()
    expect(p.predicted).not.toBeNull()
  })
})

describe('project — scores stay within section bounds', () => {
  it('clamps a hot streak to 800/section (1600 total)', () => {
    const rw: Array<[string, number]> = [['2025-11-01', 740], ['2025-12-01', 790]]
    const math: Array<[string, number]> = [['2025-11-01', 760], ['2025-12-01', 795]]
    const p = project(sat(rw, math), 1600, '2026-04-01', NOW)
    expect(p.predicted!).toBeLessThanOrEqual(1600)
    p.sections.forEach(s => expect(s.high!).toBeLessThanOrEqual(800))
  })
})
