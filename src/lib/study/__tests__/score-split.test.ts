import { scoreSplit, type RubricGrade } from '@/lib/study/test-result'
import type { ResultRow } from '@/lib/study/test-result'

/**
 * The unit confusion that produced five separate bugs on this screen —
 * CARD vs DELIVERED vs SCORED — is exactly what this split can get wrong
 * again, so the weighting is asserted directly rather than assumed.
 *
 * A Complete-the-Words card carries several blanks and counts as
 * `blanks.length` DELIVERED questions, not one.
 */
const q = (over: Partial<ResultRow['question']> = {}): ResultRow['question'] =>
  ({ type: 'multiple_choice', prompt: 'p', choices: [], blanks: null, ...over }) as ResultRow['question']

const row = (over: Partial<ResultRow> = {}): ResultRow => ({
  question: q(),
  studentAnswer: 'a',
  correct: true,
  ungraded: false,
  isPilot: false,
  correctAnswerDisplay: '',
  range: null,
  ...over,
})

const grade = (band: number, scaleMax = 5): RubricGrade =>
  ({ band, scaleMax, summary: null, skill: 'speaking' })

describe('scoreSplit', () => {
  it('reports the objective side only from key-matched, non-pilot items', () => {
    const s = scoreSplit([
      row({ correct: true }),
      row({ correct: false }),
      // Pilots are delivered and shown but never counted — that is what
      // scored:false means.
      row({ correct: false, isPilot: true }),
    ], {})
    expect(s.objective).toEqual({ correct: 1, total: 2, percent: 50 })
    expect(s.hasRubric).toBe(false)
  })

  it('weights a Complete-the-Words card by its blanks, not as one question', () => {
    // blanks are objects, not strings — the real shape is built here so
    // the weighting is actually exercised rather than faked past the type.
    const ctw = q({
      type: 'fill_in_blanks',
      blanks: [{ id: 1, answer: 'a' }, { id: 2, answer: 'b' }, { id: 3, answer: 'c' }],
    })
    const s = scoreSplit([row({ question: ctw, correct: true }), row({ correct: false })], {})
    expect(s.objective).toEqual({ correct: 3, total: 4, percent: 75 })
  })

  it('scores rubric items against their own scale, separately', () => {
    const a = q({ type: 'speaking_interview', prompt: 'A' })
    const b = q({ type: 'speaking_interview', prompt: 'B' })
    const s = scoreSplit(
      [row({ question: a, ungraded: true }), row({ question: b, ungraded: true })],
      { A: grade(4), B: grade(1) },
    )
    expect(s.rubric).toEqual({ earned: 5, max: 10, percent: 50, graded: 2, pending: 0, skipped: 0 })
    // The rubric marks must NOT leak into the objective denominator —
    // they are a different scale entirely.
    expect(s.objective).toEqual({ correct: 0, total: 0, percent: 0 })
    expect(s.hasRubric).toBe(true)
  })

  it('reports an answered-but-ungraded response as outstanding, never as zero', () => {
    // Grading is asynchronous. Treating "no grade yet" as a zero would
    // show the student a worse score than they earned.
    const a = q({ type: 'speaking_interview', prompt: 'A' })
    const b = q({ type: 'speaking_interview', prompt: 'B' })
    const s = scoreSplit(
      [row({ question: a, ungraded: true }), row({ question: b, ungraded: true })],
      { A: grade(3) },
    )
    expect(s.rubric).toEqual({ earned: 3, max: 5, percent: 60, graded: 1, pending: 1, skipped: 0 })
  })

  it('calls a blank response blank, not "still being scored"', () => {
    // A rubric item the student never answered will never be graded.
    // Reporting it as in-flight promises a mark that is not coming — the
    // result screen said "1 still being scored" about an answer that did
    // not exist. It is also not folded into `max` as a zero, because the
    // scale is only known from a grade that will never arrive.
    const a = q({ type: 'speaking_interview', prompt: 'A' })
    const b = q({ type: 'speaking_interview', prompt: 'B' })
    const s = scoreSplit([
      row({ question: a, ungraded: true, studentAnswer: 'said something' }),
      row({ question: b, ungraded: true, studentAnswer: null }),
    ], { A: grade(4) })
    expect(s.rubric).toEqual({ earned: 4, max: 5, percent: 80, graded: 1, pending: 0, skipped: 1 })
  })

  it('treats whitespace as blank, not as an answer', () => {
    const a = q({ type: 'speaking_interview', prompt: 'A' })
    const s = scoreSplit([row({ question: a, ungraded: true, studentAnswer: '   ' })], {})
    expect(s.rubric.skipped).toBe(1)
    expect(s.rubric.pending).toBe(0)
  })

  it('mixes both sides without either contaminating the other', () => {
    // TOEFL Speaking in miniature: key-matched repeats plus rubric
    // interviews. The headline percentage covers only the former, which
    // is the whole reason this split exists.
    const iv = q({ type: 'speaking_interview', prompt: 'I' })
    const s = scoreSplit([
      row({ correct: true }), row({ correct: true }), row({ correct: false }),
      row({ question: iv, ungraded: true }),
    ], { I: grade(5) })
    expect(s.objective.percent).toBe(67)
    expect(s.rubric.percent).toBe(100)
  })

  it('does not divide by zero when nothing is scored', () => {
    expect(scoreSplit([], {}).objective.percent).toBe(0)
    expect(scoreSplit([], {}).rubric.percent).toBe(0)
    expect(scoreSplit([row({ isPilot: true })], {}).objective).toEqual(
      { correct: 0, total: 0, percent: 0 })
  })
})
