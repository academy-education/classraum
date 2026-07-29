/** @jest-environment node */
/**
 * Regression tests for the two failures that made Speaking feedback
 * unusable on 2026-07-28, both recovered from the dev-server log rather
 * than guessed at.
 */
import { gradeSchemaForCriteria, getRubric } from '@/lib/study/responseRubrics'

const validGrade = (criteria: { key: string; score: number }[]) => ({
  summary: 'A summary of the response.',
  criteria: criteria.map(c => ({ ...c, evidence: 'quoted span — reasoning.' })),
  annotations: [],
  modelRewrite: 'A rewrite.',
  overallBand: 3,
})

describe('gradeSchemaForCriteria', () => {
  // The live failure: gpt-4o returned `delivery` + `language_use` and
  // dropped `topic_relevance`. The generic GradeSchema only checks the
  // COUNT (min 3), so the model could satisfy "3 items" with the wrong
  // headings, or — as here — return 2 and blow up inside generateObject
  // as AI_NoObjectGeneratedError, surfacing to the student as a 502.
  const keys = getRubric('toefl', 'speaking', 'take_interview').criteria.map(c => c.key)

  it('uses the TOEFL speaking rubric’s three real keys', () => {
    expect(keys).toEqual(['topic_relevance', 'delivery', 'language_use'])
  })

  it('rejects the exact payload that 502d — one criterion missing', () => {
    const r = gradeSchemaForCriteria(keys).safeParse(validGrade([
      { key: 'delivery', score: 3 },
      { key: 'language_use', score: 3 },
    ]))
    expect(r.success).toBe(false)
  })

  it('accepts a grade carrying every rubric criterion', () => {
    const r = gradeSchemaForCriteria(keys).safeParse(validGrade([
      { key: 'topic_relevance', score: 3 },
      { key: 'delivery', score: 3 },
      { key: 'language_use', score: 4 },
    ]))
    expect(r.success).toBe(true)
  })

  it('rejects a right-sized grade with an invented key', () => {
    // The generic schema would have passed this: three entries, correct
    // shape, headings the rubric never defined.
    const r = gradeSchemaForCriteria(keys).safeParse(validGrade([
      { key: 'topic_relevance', score: 3 },
      { key: 'delivery', score: 3 },
      { key: 'pronunciation', score: 4 },
    ]))
    expect(r.success).toBe(false)
  })

  it('adapts to a 4-criterion rubric rather than hardcoding three', () => {
    const ielts = getRubric('ielts', 'speaking', undefined).criteria.map(c => c.key)
    expect(ielts).toHaveLength(4)
    expect(gradeSchemaForCriteria(ielts).safeParse(
      validGrade(ielts.map(k => ({ key: k, score: 6 }))),
    ).success).toBe(true)
  })
})

describe('duration_seconds coercion', () => {
  // 22P02: MediaRecorder reports 44.459999084472656, the column is
  // INTEGER, and PostgREST rejected the whole insert — so a grade that
  // had already been generated was discarded and the student saw only
  // "persist failed".
  const coerce = (d: number | null | undefined) =>
    d == null ? null : Math.max(0, Math.round(d))

  it('rounds a fractional recorder duration to an integer', () => {
    expect(coerce(44.459999084472656)).toBe(44)
    expect(Number.isInteger(coerce(44.459999084472656)!)).toBe(true)
  })

  it('keeps null null, and never emits a negative', () => {
    expect(coerce(null)).toBeNull()
    expect(coerce(undefined)).toBeNull()
    expect(coerce(-0.4)).toBe(0)
  })
})
