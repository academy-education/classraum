import { AVAILABLE_TARGET_TESTS, isAvailableTargetTest } from '../target-tests'
import { SHIPPED_TEST_SLUGS } from '../shipped-tests'

// Onboarding must offer every test the landing grid opens. It once offered only
// SAT and TOEFL while ACT, SSAT and ISEE were open, so new students could not pick them.
describe('AVAILABLE_TARGET_TESTS', () => {
  it('matches every shipped test slug', () => {
    const shipped = [...SHIPPED_TEST_SLUGS].filter(s => s.startsWith('test-')).map(s => s.slice(5)).sort()
    expect([...AVAILABLE_TARGET_TESTS].sort()).toEqual(shipped)
  })
  it('opens the tests the app ships today and keeps unshipped ones closed', () => {
    for (const t of ['sat', 'toefl', 'act', 'ssat', 'isee']) expect(isAvailableTargetTest(t)).toBe(true)
    for (const t of ['ksat', 'ap', 'ib', 'igcse', 'ged', 'map']) expect(isAvailableTargetTest(t)).toBe(false)
  })
  it('is case-insensitive and rejects empty input', () => {
    expect(isAvailableTargetTest('SSAT')).toBe(true)
    expect(isAvailableTargetTest('')).toBe(false)
    expect(isAvailableTargetTest(null)).toBe(false)
  })
})
