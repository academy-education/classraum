import {
  criterionLabel, scoreFraction, scoreTone, TONE_CLASS,
} from '@/lib/study/rubricDisplay'

describe('criterionLabel', () => {
  it('renders the real rubric keys as prose', () => {
    // These are the exact keys the Writing rubrics emit.
    expect(criterionLabel('social_conventions')).toBe('Social conventions')
    expect(criterionLabel('task_fulfillment')).toBe('Task fulfillment')
    expect(criterionLabel('language_facility')).toBe('Language facility')
    expect(criterionLabel('grammar_vocabulary')).toBe('Grammar vocabulary')
    expect(criterionLabel('contribution')).toBe('Contribution')
  })

  it('leaves no underscore behind for CSS capitalize to expose', () => {
    expect(criterionLabel('a_b_c')).not.toContain('_')
  })

  it('survives an empty or junk key', () => {
    expect(criterionLabel('')).toBe('')
    expect(criterionLabel('___')).toBe('')
  })
})

describe('scoreFraction', () => {
  it('maps a band onto its scale', () => {
    expect(scoreFraction(5, 5)).toBe(1)
    expect(scoreFraction(3, 5)).toBeCloseTo(0.6)
    expect(scoreFraction(0, 5)).toBe(0)
  })

  it('never returns NaN, which renders as a zero-width invisible bar', () => {
    // scaleMax 0 is reachable: getRubric returns it if a task type is
    // unknown, and the panel would then draw nothing at all.
    for (const [s, m] of [[3, 0], [NaN, 5], [3, NaN]] as [number, number][]) {
      expect(Number.isFinite(scoreFraction(s, m))).toBe(true)
    }
    expect(scoreFraction(3, 0)).toBe(0)
  })

  it('clamps a score above the scale', () => {
    expect(scoreFraction(9, 5)).toBe(1)
    expect(scoreFraction(-2, 5)).toBe(0)
  })
})

describe('scoreTone', () => {
  it('never paints a low band in failure red', () => {
    // The whole point: a band 1 is a weak PROFICIENCY, not a wrong
    // answer. If any tone maps to rose the card starts lying again.
    const tones = [0, 1, 2, 3, 4, 5].map(s => scoreTone(s, 5))
    for (const t of tones) expect(TONE_CLASS[t].bar).not.toMatch(/rose|red/)
  })

  it('rises with the score and never falls', () => {
    const rank = { weak: 0, developing: 1, solid: 2, strong: 3 }
    let prev = -1
    for (let s = 0; s <= 5; s += 0.5) {
      const r = rank[scoreTone(s, 5)]
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
  })

  it('reads the same on a different scale', () => {
    expect(scoreTone(5, 5)).toBe(scoreTone(6, 6))
    expect(scoreTone(3, 5)).toBe(scoreTone(3.6, 6))
  })
})
