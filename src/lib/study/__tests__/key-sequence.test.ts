/**
 * MUTATION TESTS for the ungrouped key-sequence check and the size-aware
 * position gate (register A24). Each mechanism is pinned separately: a test
 * that only fails when all three statistics are gone would not say which one
 * matters (CLAUDE.md, "break the check").
 */
import {
  analyseKeySequence, sequenceTellFails, positionVerdict,
  SEQ_ALPHA, SEQ_MIN_N,
} from '../key-tells'

// The two authored sequences that reached the bank on 2026-09-04.
const CS_HARD_V3 = 'ABCDBADCCDABDCBAACBDCADB'.split('')   // six complete quads, no period
const SEC_HARD_V6 = 'CBADBDACBDACBDACBDACBDAC'.split('')  // periodic after item 05
// The same 24 keys as CS_HARD_V3 in an order with no structure (hand-scrambled).
const CS_SCRAMBLED = 'AABCDDBCAACDBBDCCADBABDC'.split('')

describe('analyseKeySequence', () => {
  it('flags sat-cs-hard-v3 through the ALIGNED statistic alone', () => {
    const r = analyseKeySequence(CS_HARD_V3, 20000)
    expect(r.alignedRate).toBe(1)
    expect(r.alignedP).toBeLessThan(SEQ_ALPHA)
    // the other two do not reach the bar: without the aligned statistic this
    // cohort passes, which is exactly what the first version of the check did
    expect(r.permP).toBeGreaterThan(SEQ_ALPHA)
    expect(r.periodP).toBeGreaterThan(SEQ_ALPHA)
    expect(sequenceTellFails(r)).toBe(true)
  })

  it('flags sat-sec-hard-v6 through the overlapping and period statistics', () => {
    const r = analyseKeySequence(SEC_HARD_V6, 20000)
    expect(r.permP).toBeLessThan(SEQ_ALPHA)
    expect(r.periodP).toBeLessThan(SEQ_ALPHA)
    expect(r.periodLag).toBe(4)
    expect(sequenceTellFails(r)).toBe(true)
  })

  it('passes the same keys in an unstructured order: the control is composition, not a literal', () => {
    const r = analyseKeySequence(CS_SCRAMBLED, 20000)
    expect([...CS_SCRAMBLED].sort().join('')).toBe([...CS_HARD_V3].sort().join(''))
    expect(sequenceTellFails(r)).toBe(false)
  })

  it('does not condemn a perfectly balanced cohort for being balanced', () => {
    // A 6/6/6/6 deal has a higher chance permutation rate than a uniform one;
    // the shuffled control must carry that, so it sits above the 9.4% a
    // literal would assume.
    const r = analyseKeySequence(CS_SCRAMBLED, 20000)
    expect(r.controlPermRate).toBeGreaterThan(0.11)
  })

  it(`never fails a cohort under ${SEQ_MIN_N}, however regular (the caller prints n/a)`, () => {
    const r = analyseKeySequence('ABCDABCDABC'.split(''), 5000)
    expect(r.n).toBeLessThan(SEQ_MIN_N)
    expect(sequenceTellFails(r)).toBe(false)
  })

  it('a single-letter cohort is not a sequence tell (the position check owns it)', () => {
    expect(sequenceTellFails(analyseKeySequence(Array(20).fill('A'), 2000))).toBe(false)
  })
})

describe('positionVerdict — the minimum-cohort gate', () => {
  it('fails the 14-item cohort at 50% on one slot that once passed', () => {
    expect(positionVerdict([7, 3, 2, 2])).toBe('fail')
  })
  it('fails a small cohort with every key on one slot', () => {
    expect(positionVerdict([9, 0, 0, 0])).toBe('fail')
    expect(positionVerdict([11, 0, 0, 0])).toBe('fail')
  })
  it('does not fail small-sample noise', () => {
    expect(positionVerdict([5, 1, 1, 1])).toBe('ok')   // 8 items, 5 on A
    expect(positionVerdict([3, 2, 2, 2])).toBe('ok')
  })
  it('calls a cohort under 6 untestable, never ok', () => {
    expect(positionVerdict([3, 0, 0, 0])).toBe('untestable')
    expect(positionVerdict([1, 1, 1, 1])).toBe('untestable')
  })
  it('keeps the 45% share at n >= 12', () => {
    expect(positionVerdict([5, 3, 2, 2])).toBe('ok')    // 41.7%
    expect(positionVerdict([6, 2, 2, 2])).toBe('fail')  // 50%
  })
})
