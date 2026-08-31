/** @jest-environment node */
/**
 * SSAT/ISEE scoring on the result screen.
 *
 * The screen previously reported percent correct for these families,
 * which is the wrong number for SSAT: a wrong answer costs a quarter
 * point and a blank costs nothing, so two students with identical
 * accuracy and different skip rates do not have the same score.
 *
 * No schema change was needed. study_attempts keeps student_answer null
 * for a blank, and tallyRows already separates skippedWithinCounted, so
 * correct / wrong / omitted comes out of rows the submit path writes.
 */
import { admissionScoreFromRows, familyFromTopicSlug } from '../test-result'

type Row = Parameters<typeof admissionScoreFromRows>[1][number]

/** n rows, the first `answered` of which carry an answer. */
const rows = (n: number, answered: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    question: { type: 'multiple_choice' },
    studentAnswer: i < answered ? 'A' : null,
    correct: false,
    correctAnswerDisplay: '',
  }) as unknown as Row)

describe('family resolution', () => {
  // 'ssat-reading' does not start with 'sat-', but the two families share
  // a suffix and a careless startsWith would collide.
  it('separates ssat and isee from sat', () => {
    expect(familyFromTopicSlug('ssat-reading')).toBe('ssat')
    expect(familyFromTopicSlug('isee-verbal')).toBe('isee')
    expect(familyFromTopicSlug('sat-math')).toBe('sat')
    expect(familyFromTopicSlug('test-ssat')).toBe('other')
  })
})

describe('SSAT applies the penalty and spares blanks', () => {
  // 40 delivered, 30 answered, 20 right → 10 wrong, 10 blank.
  // 20 − 0.25×10 = 17.5, NOT 20 (no penalty) and NOT 15 (blanks penalised).
  it('scores 20 right / 10 wrong / 10 blank as 17.5', () => {
    const s = admissionScoreFromRows('ssat', rows(40, 30), 20)
    expect(s).toMatchObject({ correct: 20, wrong: 10, omitted: 10, raw: 17.5, maxRaw: 40 })
  })

  it('is unaffected by how many were left blank when accuracy is equal', () => {
    // Same 20 correct and 10 wrong, but 0 blanks vs 10 blanks: identical raw.
    const skipped = admissionScoreFromRows('ssat', rows(40, 30), 20)
    const attempted = admissionScoreFromRows('ssat', rows(30, 30), 20)
    expect(skipped.raw).toBe(attempted.raw)
    // …while percent correct DIFFERS, which is why it was the wrong headline.
    expect(skipped.percentCorrect).not.toBe(attempted.percentCorrect)
  })
})

describe('ISEE counts rights only', () => {
  it('ignores wrong answers entirely', () => {
    const s = admissionScoreFromRows('isee', rows(40, 30), 20)
    expect(s).toMatchObject({ correct: 20, wrong: 10, omitted: 10, raw: 20 })
  })
})

describe('the guards that stop a silently wrong number', () => {
  // correctCount comes from study_sessions and rows from study_attempts.
  // If they ever disagreed, a negative `wrong` would INFLATE an SSAT raw
  // score — the one direction this must not fail in.
  it('never lets an inconsistent session inflate the score', () => {
    const s = admissionScoreFromRows('ssat', rows(10, 10), 99)
    expect(s.wrong).toBe(0)
    expect(s.raw).toBe(99)   // not 99 + a positive penalty credit
  })

  it('reports no band and no scaled score, with a reason', () => {
    for (const fam of ['ssat', 'isee'] as const) {
      const s = admissionScoreFromRows(fam, rows(10, 10), 5)
      expect(s.scaled).toBeNull()
      expect(s.stanine).toBeNull()
      expect(s.scaleNote).toMatch(/no norm group/)
    }
  })
})
