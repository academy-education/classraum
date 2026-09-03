/** @jest-environment node */
import { ENGLISH_QUOTAS, READING_QUOTAS, MATH_QUOTAS } from '../act-test'

// ENGLISH_QUOTAS carried [38,43]/[18,23]/[38,43] until 2026-09-04 and
// nothing read it, so nothing failed. These assertions exist so that a
// blueprint constant cannot silently disagree with the shares the
// production spec and the generate route actually use.
describe('ACT English reporting-category quotas', () => {
  it('makes Conventions the majority category', () => {
    const [cMin] = ENGLISH_QUOTAS['Conventions of Standard English']
    expect(cMin).toBeGreaterThan(50)
    const [, pMax] = ENGLISH_QUOTAS['Production of Writing']
    const [, kMax] = ENGLISH_QUOTAS['Knowledge of Language']
    expect(cMin).toBeGreaterThan(pMax)
    expect(cMin).toBeGreaterThan(kMax)
  })

  it('matches ACT’s published shares', () => {
    expect(ENGLISH_QUOTAS['Production of Writing']).toEqual([29, 32])
    expect(ENGLISH_QUOTAS['Knowledge of Language']).toEqual([13, 19])
    expect(ENGLISH_QUOTAS['Conventions of Standard English']).toEqual([51, 56])
  })

  // A range set that cannot contain 100 is unsatisfiable by any real form.
  it.each([
    ['english', ENGLISH_QUOTAS],
    ['reading', READING_QUOTAS],
    ['math', MATH_QUOTAS],
  ])('%s ranges admit a form summing to 100', (_name, quotas) => {
    const vals = Object.values(quotas)
    const min = vals.reduce((a, [lo]) => a + lo, 0)
    const max = vals.reduce((a, [, hi]) => a + hi, 0)
    expect(min).toBeLessThanOrEqual(100)
    expect(max).toBeGreaterThanOrEqual(100)
  })
})
