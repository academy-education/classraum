/** @jest-environment node */
/**
 * Locks the Digital SAT two-module adaptive routing + path-weighted
 * scoring in src/lib/study/sat-adaptive.ts.
 */
import {
  computeSatRoute,
  difficultiesForModule2,
  estimateSectionScore,
  SAT_MODULE_CONFIG,
} from '@/lib/study/sat-adaptive'

describe('computeSatRoute', () => {
  it('routes to the hard module at or above the 60% boundary', () => {
    expect(computeSatRoute(17, 27)).toBe('hard') // ~63%
    expect(computeSatRoute(27, 27)).toBe('hard') // 100%
  })

  it('routes to the easy module below 60%', () => {
    expect(computeSatRoute(16, 27)).toBe('easy') // ~59.3% < 60%
    expect(computeSatRoute(10, 27)).toBe('easy')
    expect(computeSatRoute(0, 22)).toBe('easy')
  })

  it('lands exactly on the boundary → hard', () => {
    expect(computeSatRoute(6, 10)).toBe('hard') // 0.60 exactly
  })

  it('degrades safely on a zero-length module', () => {
    expect(computeSatRoute(0, 0)).toBe('easy')
  })
})

describe('difficultiesForModule2', () => {
  it('draws only hard items for the hard route', () => {
    expect(difficultiesForModule2('hard')).toEqual(['hard'])
  })
  it('draws easy + medium for the easy route', () => {
    expect(difficultiesForModule2('easy')).toEqual(['easy', 'medium'])
  })
})

describe('estimateSectionScore (path-weighted)', () => {
  it('caps the easy path below the hard path for identical accuracy', () => {
    const easy = estimateSectionScore(40, 54, 'easy')
    const hard = estimateSectionScore(40, 54, 'hard')
    expect(hard.score).toBeGreaterThan(easy.score)
    expect(easy.capped).toBe(true)
    expect(hard.capped).toBe(false)
  })

  it('keeps every score within 200–800', () => {
    for (const route of ['easy', 'hard'] as const) {
      for (let correct = 0; correct <= 54; correct++) {
        const { score } = estimateSectionScore(correct, 54, route)
        expect(score).toBeGreaterThanOrEqual(200)
        expect(score).toBeLessThanOrEqual(800)
        expect(score % 10).toBe(0) // rounded to nearest 10
      }
    }
  })

  it('a perfect hard-path test reaches the 800 ceiling; perfect easy path caps at 590', () => {
    expect(estimateSectionScore(54, 54, 'hard').score).toBe(800)
    expect(estimateSectionScore(54, 54, 'easy').score).toBe(590)
  })

  it('a zero-correct hard path floors at 400; easy path floors at 200', () => {
    expect(estimateSectionScore(0, 54, 'hard').score).toBe(400)
    expect(estimateSectionScore(0, 54, 'easy').score).toBe(200)
  })

  it('clamps out-of-range correct counts', () => {
    expect(estimateSectionScore(99, 54, 'hard').score).toBe(800)
    expect(estimateSectionScore(-5, 54, 'easy').score).toBe(200)
    expect(estimateSectionScore(5, 0, 'hard').score).toBe(400) // no questions → 0%
  })
})

describe('SAT_MODULE_CONFIG', () => {
  it('matches the real Digital SAT module sizes', () => {
    expect(SAT_MODULE_CONFIG.reading_writing.moduleSize).toBe(27)
    expect(SAT_MODULE_CONFIG.math.moduleSize).toBe(22)
  })
})
