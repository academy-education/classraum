/** @jest-environment node */
/**
 * Locks the TOEFL two-module adaptive contract in src/lib/toefl-adaptive.ts:
 * module sizes (reconciled to TEST_SPECS), the three-way routing
 * thresholds, and the difficulty mix / bank filter a routed Module 2
 * is drawn from.
 */
import {
  TOEFL_ADAPTIVE_SECTIONS,
  computeToeflRoute,
  difficultyMixForRoute,
  difficultiesForToeflModule2,
  isToeflAdaptiveSection,
  toeflAdaptiveConfig,
} from '@/lib/toefl-adaptive'
import { TEST_SPECS } from '@/lib/test-specs'

describe('TOEFL_ADAPTIVE_SECTIONS module sizes', () => {
  const reading = TOEFL_ADAPTIVE_SECTIONS.Reading!
  const listening = TOEFL_ADAPTIVE_SECTIONS.Listening!

  it('Reading splits the spec 50 SCORED items 25/25', () => {
    expect(reading.module1Scored).toBe(25)
    expect(reading.module2Scored).toBe(25)
    expect(reading.module1Scored + reading.module2Scored).toBe(50)
  })

  it('Reading is 16 ON-SCREEN cards per module — 1 Complete-the-Words + 15 MC', () => {
    // Complete-the-Words is one card scored per blank (10 blanks), so
    // 1 CtW + 15 MC = 16 cards but 25 scored items. Conflating the two
    // is what let the bank ship a 36% overlong section.
    expect(reading.module1Items).toBe(16)
    expect(reading.module2Items).toBe(16)
    const CTW_BLANKS = 10
    expect(1 * CTW_BLANKS + (reading.module1Items - 1)).toBe(reading.module1Scored)
    expect(1 * CTW_BLANKS + (reading.module2Items - 1)).toBe(reading.module2Scored)
  })

  it('Listening splits 47 MC as 24/23 — odd item goes to Module 1', () => {
    expect(listening.module1Items).toBe(24)
    expect(listening.module2Items).toBe(23)
    expect(listening.module1Items + listening.module2Items).toBe(47)
    // Listening has no per-blank scoring: cards === scored items.
    expect(listening.module1Scored).toBe(listening.module1Items)
    expect(listening.module2Scored).toBe(listening.module2Items)
  })

  it('module 1 takes the ceiling of an odd split (matches the assembler)', () => {
    // The assembler splits each task-type quota with Math.ceil(n / 2);
    // these constants must agree with that or the client's break index
    // drifts off the drawn payload.
    expect(listening.module1Items).toBe(Math.ceil(47 / 2))
    expect(listening.module2Items).toBe(47 - Math.ceil(47 / 2))
  })

  it('agrees with TEST_SPECS — the spec is the source of truth', () => {
    const sections = TEST_SPECS.toefl!.sections
    const spec = (name: string) => sections.find(s => s.name_en === name)!
    expect(spec('Reading').questionsPerSection)
      .toBe(reading.module1Scored + reading.module2Scored)
    expect(spec('Listening').questionsPerSection)
      .toBe(listening.module1Scored + listening.module2Scored)
    // Per-module clocks must sum to the section's total time.
    expect(2 * reading.minutesPerModule).toBe(spec('Reading').minutesPerSection)
    expect(2 * listening.minutesPerModule).toBe(spec('Listening').minutesPerSection)
  })

  it('points each section at its item-bank key', () => {
    expect(reading.bankSection).toBe('reading')
    expect(listening.bankSection).toBe('listening')
  })
})

describe('isToeflAdaptiveSection / toeflAdaptiveConfig', () => {
  it('only Reading and Listening adapt — Speaking and Writing are linear', () => {
    // ETS Jan-2026 blueprint, Note 5: Writing and Speaking are linear,
    // every test taker gets the same tasks.
    expect(isToeflAdaptiveSection('Reading')).toBe(true)
    expect(isToeflAdaptiveSection('Listening')).toBe(true)
    expect(isToeflAdaptiveSection('Speaking')).toBe(false)
    expect(isToeflAdaptiveSection('Writing')).toBe(false)
  })

  it('resolves case-insensitively — display name or bank key', () => {
    expect(toeflAdaptiveConfig('reading')).toBe(TOEFL_ADAPTIVE_SECTIONS.Reading)
    expect(toeflAdaptiveConfig('LISTENING')).toBe(TOEFL_ADAPTIVE_SECTIONS.Listening)
    expect(toeflAdaptiveConfig('  Reading  ')).toBe(TOEFL_ADAPTIVE_SECTIONS.Reading)
  })

  it('degrades safely on missing / unknown names', () => {
    expect(toeflAdaptiveConfig(null)).toBeNull()
    expect(toeflAdaptiveConfig('')).toBeNull()
    expect(toeflAdaptiveConfig('Math')).toBeNull()
  })
})

describe('computeToeflRoute (three-way branch)', () => {
  it('routes hard at or above 70%', () => {
    expect(computeToeflRoute('Reading', 7, 10)).toBe('hard')      // exactly 70%
    expect(computeToeflRoute('Reading', 25, 25)).toBe('hard')     // 100%
    expect(computeToeflRoute('Listening', 18, 24)).toBe('hard')   // 75%
  })

  it('routes medium in the 40–69% band', () => {
    expect(computeToeflRoute('Reading', 4, 10)).toBe('medium')    // exactly 40%
    expect(computeToeflRoute('Reading', 69, 100)).toBe('medium')  // 69%
    expect(computeToeflRoute('Listening', 12, 24)).toBe('medium') // 50%
  })

  it('routes easy below 40%', () => {
    expect(computeToeflRoute('Reading', 39, 100)).toBe('easy')
    expect(computeToeflRoute('Reading', 0, 25)).toBe('easy')
  })

  it('is a strict three-way split — every accuracy lands in exactly one band', () => {
    for (let correct = 0; correct <= 100; correct++) {
      const route = computeToeflRoute('Reading', correct, 100)
      const expected = correct >= 70 ? 'hard' : correct >= 40 ? 'medium' : 'easy'
      expect(route).toBe(expected)
    }
  })

  it('is monotonic — more correct answers never route you lower', () => {
    const rank = { easy: 0, medium: 1, hard: 2 } as const
    let prev = -1
    for (let correct = 0; correct <= 47; correct++) {
      const route = computeToeflRoute('Listening', correct, 47)!
      expect(rank[route]).toBeGreaterThanOrEqual(prev)
      prev = rank[route]
    }
  })

  it('returns null for the linear sections so callers no-op', () => {
    expect(computeToeflRoute('Speaking', 10, 11)).toBeNull()
    expect(computeToeflRoute('Writing', 10, 12)).toBeNull()
  })

  it('degrades to medium on a zero-length module rather than crashing', () => {
    expect(computeToeflRoute('Reading', 0, 0)).toBe('medium')
  })
})

describe('difficultyMixForRoute', () => {
  it('every mix is a probability distribution', () => {
    for (const route of ['easy', 'medium', 'hard'] as const) {
      const mix = difficultyMixForRoute(route)
      expect(mix.easy + mix.medium + mix.hard).toBeCloseTo(1, 6)
      for (const v of Object.values(mix)) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('swaps the whole mix rather than just adding hard items', () => {
    const easy = difficultyMixForRoute('easy')
    const hard = difficultyMixForRoute('hard')
    expect(easy.easy).toBeGreaterThan(hard.easy)
    expect(hard.hard).toBeGreaterThan(easy.hard)
  })

  it('shifts monotonically harder across the three routes', () => {
    const [e, m, h] = (['easy', 'medium', 'hard'] as const).map(difficultyMixForRoute)
    expect(e.hard).toBeLessThan(m.hard)
    expect(m.hard).toBeLessThan(h.hard)
    expect(e.easy).toBeGreaterThan(m.easy)
    expect(m.easy).toBeGreaterThan(h.easy)
  })
})

describe('difficultiesForToeflModule2 (bank filter)', () => {
  it('maps each route to the bands worth drawing from', () => {
    expect(difficultiesForToeflModule2('easy')).toEqual(['easy', 'medium'])
    expect(difficultiesForToeflModule2('medium')).toEqual(['easy', 'medium', 'hard'])
    expect(difficultiesForToeflModule2('hard')).toEqual(['medium', 'hard'])
  })

  it('drops the negligible band — a 5% slice must not be able to fill a module', () => {
    // The bank draw is a set filter, not a weighted sampler, so keeping
    // 'easy' in the hard route would let a thin bank serve an all-easy
    // "hard" Module 2.
    expect(difficultiesForToeflModule2('hard')).not.toContain('easy')
    expect(difficultiesForToeflModule2('easy')).not.toContain('hard')
  })

  it('is derived from difficultyMixForRoute, not hardcoded', () => {
    for (const route of ['easy', 'medium', 'hard'] as const) {
      const mix = difficultyMixForRoute(route)
      const bands = difficultiesForToeflModule2(route)
      for (const band of bands) expect(mix[band]).toBeGreaterThanOrEqual(0.20)
      for (const band of ['easy', 'medium', 'hard'] as const) {
        if (!bands.includes(band)) expect(mix[band]).toBeLessThan(0.20)
      }
    }
  })

  it('never returns an empty filter (that would 409 the student out of Module 2)', () => {
    for (const route of ['easy', 'medium', 'hard'] as const) {
      expect(difficultiesForToeflModule2(route).length).toBeGreaterThan(0)
    }
  })

  it('always keeps the band the route is named for', () => {
    expect(difficultiesForToeflModule2('easy')).toContain('easy')
    expect(difficultiesForToeflModule2('medium')).toContain('medium')
    expect(difficultiesForToeflModule2('hard')).toContain('hard')
  })
})
