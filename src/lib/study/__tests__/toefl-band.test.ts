import {
  toeflScaledScore, toeflBandFromScaled, toeflBandFromPercent,
} from '@/lib/study/test-result'

/**
 * The property that actually matters is CONSISTENCY: the band shown on
 * the result screen must be the scaled score shown beside it, divided by
 * five. The old code computed the two from unrelated formulas and shipped
 * a screen reading "band 3.0" next to "13 / 30" — 13 ÷ 5 = 2.6, so the
 * two numbers on one card described different scores.
 *
 * Anything asserting only that "3.0 maps to 3.0" would have passed on the
 * broken version, so the tests below are written against the relationship
 * rather than against a table of expected outputs.
 */
describe('TOEFL scaled score and band', () => {
  it('keeps the band and the scaled score in agreement, always', () => {
    // The regression, stated as a law over the whole input range.
    for (let pct = 0; pct <= 100; pct += 0.5) {
      const scaled = toeflScaledScore(pct)
      expect(toeflBandFromPercent(pct)).toBe(toeflBandFromScaled(scaled))
    }
  })

  it('reproduces the case that was visibly wrong on screen', () => {
    // 3 of 7 correct. Shipped as band 3.0 beside 13/30.
    const pct = (3 / 7) * 100
    expect(toeflScaledScore(pct)).toBe(13)
    expect(toeflBandFromPercent(pct)).toBe(2.5)
  })

  it('anchors both ends of the published scale', () => {
    expect(toeflScaledScore(100)).toBe(30)
    expect(toeflBandFromPercent(100)).toBe(6)
    // A scaled 0 is a band 1 — the scale starts at 1, not 0.
    expect(toeflScaledScore(0)).toBe(0)
    expect(toeflBandFromPercent(0)).toBe(1)
  })

  it('only ever emits half-band values', () => {
    for (let s = 0; s <= 30; s++) {
      const band = toeflBandFromScaled(s)
      expect(band * 2).toBe(Math.round(band * 2))
      expect(band).toBeGreaterThanOrEqual(1)
      expect(band).toBeLessThanOrEqual(6)
    }
  })

  it('never goes backwards as the student scores higher', () => {
    let prev = 0
    for (let pct = 0; pct <= 100; pct += 0.5) {
      const band = toeflBandFromPercent(pct)
      expect(band).toBeGreaterThanOrEqual(prev)
      prev = band
    }
  })

  it('clamps rather than extrapolating on out-of-range input', () => {
    expect(toeflScaledScore(140)).toBe(30)
    expect(toeflScaledScore(-20)).toBe(0)
    expect(toeflBandFromScaled(99)).toBe(6)
    expect(toeflBandFromScaled(-3)).toBe(1)
    expect(toeflBandFromPercent(Number.NaN)).toBe(1)
  })
})
