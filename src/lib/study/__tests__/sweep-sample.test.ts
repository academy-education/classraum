/** @jest-environment node */
/**
 * The sweep sample must be representative, deterministic, and unable to
 * miss a cohort.
 *
 * The alternative a reviewer would otherwise fall into is "do the first
 * 40", and the sweep lists items ordered by family then section then id
 * — so the first 40 are 40 ISEE maths items in a row. That sample can
 * be perfectly clean while the defect sits entirely in SSAT verbal.
 *
 * Every defect this project has found was concentrated in ONE authoring
 * cohort: the SAT maths hub was 98.3% in one cohort and 8.0% across the
 * other 730. A sample that can miss a cohort can miss the finding.
 */
import { stratifiedSample } from '../sweep-sample'

const bank = (spec: Record<string, number>) =>
  Object.entries(spec).flatMap(([cohort, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `${cohort}-${i}`, cohort })))

// Roughly the live shape: 31 cohorts, 982 items, very uneven.
const LIVE = bank({
  'ssat-reading-worlds-s4': 75, 'ssat-verbal-s6': 56, 'isee-verbal-s2': 55,
  'ssat-verbal-s2': 51, 'isee-reading-worlds-s5': 50, 'ssat-math-s2': 48,
  'isee-math-s4': 45, 'ssat-math-s6': 45, 'isee-math-s5': 44, 'isee-math-s7': 40,
  'isee-math-s2': 40, 'isee-math-s6': 40, 'isee-verbal-s4': 32, 'isee-math-s3': 30,
  'ssat-verbal-s3': 29, 'ssat-verbal-s5': 23, 'isee-verbal-v1': 22, 'ssat-verbal-v1': 21,
  'isee-reading-worlds-v1': 19, 'ssat-math-s4': 19, 'ssat-math-s3': 18,
  'isee-math-v1': 15, 'ssat-math-s5': 12, 'ssat-math-v1': 11,
  'isee-essay-v1': 8, 'ssat-essay-v1': 4,
})

describe('the 40-item sweep sample', () => {
  const S = stratifiedSample(LIVE, 40, 'b5-round1-2026-09-01')

  it('returns exactly the requested size', () => {
    expect(S).toHaveLength(40)
  })

  it('includes every cohort, including the smallest', () => {
    // ssat-essay-v1 has 4 items of 982. Proportional allocation alone
    // would give it 0.16 of a place and drop it.
    const seen = new Set(S.map(r => r.cohort))
    expect(seen.size).toBe(new Set(LIVE.map(r => r.cohort)).size)
    expect(seen.has('ssat-essay-v1')).toBe(true)
  })

  it('draws no item twice', () => {
    expect(new Set(S.map(r => r.id)).size).toBe(S.length)
  })

  it('is deterministic — the same seed gives the same draw', () => {
    const again = stratifiedSample(LIVE, 40, 'b5-round1-2026-09-01')
    expect(again.map(r => r.id)).toEqual(S.map(r => r.id))
  })

  it('is not the first N, which would be one cohort', () => {
    const firstN = LIVE.slice(0, 40)
    expect(new Set(firstN.map(r => r.cohort)).size).toBe(1)   // the trap
    expect(new Set(S.map(r => r.cohort)).size).toBeGreaterThan(20)
  })

  it('does not run the same cohort consecutively for long', () => {
    // A reviewer seeing six of one cohort in a row starts reading the
    // cohort rather than the item.
    let run = 1, worst = 1
    for (let i = 1; i < S.length; i++) {
      run = S[i].cohort === S[i - 1].cohort ? run + 1 : 1
      worst = Math.max(worst, run)
    }
    expect(worst).toBeLessThanOrEqual(3)
  })

  it('gives the whole bank back when the sample is not smaller', () => {
    expect(stratifiedSample(LIVE, LIVE.length, 's')).toHaveLength(LIVE.length)
    expect(stratifiedSample(LIVE, 99999, 's')).toHaveLength(LIVE.length)
  })

  it('degrades to one-per-cohort when asked for fewer items than cohorts', () => {
    const tiny = stratifiedSample(LIVE, 10, 's')
    expect(tiny).toHaveLength(10)
    expect(new Set(tiny.map(r => r.cohort)).size).toBe(10)
  })
})
