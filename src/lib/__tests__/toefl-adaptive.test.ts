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
import { toeflSectionShape } from '@/lib/study/assemble'

// assemble.ts builds a Supabase admin client at module scope, which throws
// without service-role env. toeflSectionShape() is pure — it reads the
// blueprint table and touches no client — so a bare stub is enough to let
// the module load. Same pattern as assemble-blueprint.test.ts.
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

/**
 * THE BLUEPRINT IS THE SOURCE OF TRUTH, NOT THE SPEC.
 *
 * This block used to assert that TOEFL_ADAPTIVE_SECTIONS agreed with
 * TEST_SPECS, under the heading "the spec is the source of truth". They
 * agreed — at 50 Reading / 47 Listening — for a day after the bank
 * blueprint moved to 48/48, because neither of them is what draws the
 * test. The customization sheet promised 50 questions and the session
 * served 48, and this file was green the whole time.
 *
 * So every count here is now checked against toeflSectionShape(), which
 * computes it from TOEFL_META in lib/study/assemble.ts — the table the
 * assembler actually reads. Change the blueprint and these fail until the
 * spec and the module config are brought along.
 */
describe('TOEFL_ADAPTIVE_SECTIONS module sizes', () => {
  const reading = TOEFL_ADAPTIVE_SECTIONS.Reading!
  const listening = TOEFL_ADAPTIVE_SECTIONS.Listening!
  const shape = { reading: toeflSectionShape('reading'), listening: toeflSectionShape('listening') }

  it('ETS Table 1 shape: both sections deliver 48 and score 35', () => {
    for (const s of ['reading', 'listening'] as const) {
      expect(shape[s].total.delivered).toBe(48)
      expect(shape[s].total.scored).toBe(35)
    }
  })

  it('holds on BOTH Stage 2 paths — the two modules differ in task mix, not size', () => {
    // The lower path drops Academic Talk / Academic Passage and the upper
    // drops Announcement / Daily Life. That inversion is the point of the
    // routing, but it must not change how long the section is: a student
    // routed down and a student routed up answer the same number.
    for (const s of ['reading', 'listening'] as const) {
      const lower = toeflSectionShape(s, 'lower')
      const upper = toeflSectionShape(s, 'upper')
      expect(lower.total).toEqual(upper.total)
      expect(lower.stage2.delivered).toBe(upper.stage2.delivered)
    }
  })

  it('Reading module sizes track the blueprint (cards ≠ questions)', () => {
    // A Complete-the-Words paragraph is ONE card worth TEN questions, so
    // Reading's card count (30) and question count (48) diverge. Conflating
    // them is what let the bank ship a 36% overlong section once already.
    expect(reading.module1Items).toBe(shape.reading.stage1.cards)
    expect(reading.module2Items).toBe(shape.reading.stage2.cards)
    expect(reading.module1Delivered).toBe(shape.reading.stage1.delivered)
    expect(reading.module2Delivered).toBe(shape.reading.stage2.delivered)
    expect(reading.module1Scored).toBe(shape.reading.stage1.scored)
    expect(reading.module2Scored).toBe(shape.reading.stage2.scored)
    // The divergence is real and not an artifact of equal numbers.
    expect(shape.reading.total.cards).not.toBe(shape.reading.total.delivered)
  })

  it('Listening module sizes track the blueprint (all MC — cards === questions)', () => {
    expect(listening.module1Items).toBe(shape.listening.stage1.cards)
    expect(listening.module2Items).toBe(shape.listening.stage2.cards)
    expect(listening.module1Delivered).toBe(shape.listening.stage1.delivered)
    expect(listening.module2Delivered).toBe(shape.listening.stage2.delivered)
    expect(listening.module1Scored).toBe(shape.listening.stage1.scored)
    expect(listening.module2Scored).toBe(shape.listening.stage2.scored)
    expect(shape.listening.total.cards).toBe(shape.listening.total.delivered)
  })

  it('TEST_SPECS advertises what the blueprint DELIVERS, not what it scores', () => {
    // questionsPerSection is what the customization sheet shows the student
    // and what the AI generator targets, so it has to be the number they
    // actually answer (48) — not the scored subset (35), and not a third
    // number nobody serves (50 / 47, which is what it was).
    const sections = TEST_SPECS.toefl!.sections
    const spec = (name: string) => sections.find(s => s.name_en === name)!
    expect(spec('Reading').questionsPerSection).toBe(shape.reading.total.delivered)
    expect(spec('Listening').questionsPerSection).toBe(shape.listening.total.delivered)
    // Guard the near-miss directly: 35 would also be "a number from the
    // blueprint", and shipping it would under-generate by 13 items.
    expect(spec('Reading').questionsPerSection).not.toBe(shape.reading.total.scored)
    // Per-module clocks must sum to the section's total time.
    expect(2 * reading.minutesPerModule).toBe(spec('Reading').minutesPerSection)
    expect(2 * listening.minutesPerModule).toBe(spec('Listening').minutesPerSection)
  })

  it('linear sections carry no module split and score everything', () => {
    // Speaking and Writing are not adaptive (ETS Note 5: everyone gets the
    // same tasks), so stage 2 is empty and there are no pilot items.
    for (const s of ['speaking', 'writing'] as const) {
      const x = toeflSectionShape(s)
      expect(x.stage2.delivered).toBe(0)
      expect(x.total.scored).toBe(x.total.delivered)
      expect(isToeflAdaptiveSection(s)).toBe(false)
    }
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
