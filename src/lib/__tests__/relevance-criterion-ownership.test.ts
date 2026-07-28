import { enforceRelevanceCeiling } from '@/lib/study/gradePipeline'
import { getRubric } from '@/lib/study/responseRubrics'
import type { Grade } from '@/lib/study/responseRubrics'

/**
 * Who owns the relevance criterion.
 *
 * The pipeline runs two raters. The quality rater is told in its prompt
 * that "relevance to the prompt is being judged separately by another
 * rater" — so it has no opinion on relevance and must not be asked for
 * one. Requiring a relevance entry in its schema (added to stop a 502
 * when the model omitted the key) made it invent one: score 0, evidence
 * "N/A". The ceiling then min()'d that to 0.
 *
 * The student-visible result, from a real graded session: an answer that
 * argued a clear position on gap years scored delivery 3, language 3,
 * and topic_relevance 0 — beside a summary praising the position it took.
 *
 * The whole 594-test suite was green on that behaviour, so these assert
 * the ownership rule directly.
 */
const rubric = getRubric('toefl', 'speaking', 'take_interview')
const relKey = rubric.relevanceCriterionKey!

const qualityGrade = (over: Partial<Grade> = {}): Grade => ({
  overallBand: 3,
  summary: 'clear position, limited language',
  modelRewrite: '',
  annotations: [],
  // What the quality rater actually returns now: the non-relevance
  // criteria only.
  criteria: rubric.criteria
    .filter(c => c.key !== relKey)
    .map(c => ({ key: c.key, score: 3, evidence: `saw ${c.key}` })),
  ...over,
})

describe('relevance criterion ownership', () => {
  it('adds the relevance criterion even when the quality rater omits it', () => {
    const { grade } = enforceRelevanceCeiling(qualityGrade(), rubric, 4, 'stayed on topic')
    const rel = grade.criteria.find(c => c.key === relKey)
    expect(rel).toBeDefined()
    expect(rel!.score).toBe(4)
  })

  it('scores it from the ceiling, not from the quality rater', () => {
    // The exact regression: quality rater supplies a junk 0 for a
    // criterion it was told not to judge. That 0 must not survive.
    const withJunk = qualityGrade({
      criteria: [
        ...qualityGrade().criteria,
        { key: relKey, score: 0, evidence: 'N/A' },
      ],
    })
    const { grade } = enforceRelevanceCeiling(withJunk, rubric, 4, 'stayed on topic')
    const rel = grade.criteria.find(c => c.key === relKey)!
    expect(rel.score).toBe(4)
    expect(rel.evidence).toBe('stayed on topic')
    // And it appears exactly once.
    expect(grade.criteria.filter(c => c.key === relKey)).toHaveLength(1)
  })

  it('explains itself using the rater that actually judged relevance', () => {
    const { grade } = enforceRelevanceCeiling(qualityGrade(), rubric, 2, 'drifts after one sentence')
    expect(grade.criteria.find(c => c.key === relKey)!.evidence)
      .toBe('drifts after one sentence')
  })

  it('leaves the other criteria alone', () => {
    const { grade } = enforceRelevanceCeiling(qualityGrade(), rubric, 1, 'off topic')
    for (const c of grade.criteria.filter(c => c.key !== relKey)) {
      // An off-topic answer can still have strong delivery — that is the
      // point of a ceiling rather than an average.
      expect(c.score).toBe(3)
    }
  })

  it('still caps the overall band at the ceiling', () => {
    const { grade, ceilingApplied } = enforceRelevanceCeiling(
      qualityGrade({ overallBand: 5 }), rubric, 2, 'vague',
    )
    expect(grade.overallBand).toBe(2)
    expect(ceilingApplied).toBe(true)
  })

  it('does not raise a weak answer up to the ceiling', () => {
    // The ceiling is a maximum, never a floor.
    const { grade, ceilingApplied } = enforceRelevanceCeiling(
      qualityGrade({ overallBand: 1 }), rubric, 5, 'on topic',
    )
    expect(grade.overallBand).toBe(1)
    expect(ceilingApplied).toBe(false)
  })
})
