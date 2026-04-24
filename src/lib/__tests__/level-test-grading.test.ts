import {
  gradeSubmission,
  recomputeAttemptScore,
  type GradableQuestion,
  type SubmittedAnswer,
} from '../level-test-grading'

describe('gradeSubmission', () => {
  it('auto-grades an all multiple-choice test and returns a number score', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'multiple_choice', correct_answer: 'A' },
      { id: 'q2', type: 'multiple_choice', correct_answer: 'B' },
      { id: 'q3', type: 'multiple_choice', correct_answer: 'C' },
      { id: 'q4', type: 'multiple_choice', correct_answer: 'D' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: 'A' },
      { question_id: 'q2', answer: 'B' },
      { question_id: 'q3', answer: 'X' },
      { question_id: 'q4', answer: 'D' },
    ]

    const result = gradeSubmission(questions, submitted)

    expect(result.correctCount).toBe(3)
    expect(result.autoGradedCount).toBe(4)
    expect(result.needsManualGrading).toBe(false)
    expect(result.status).toBe('graded')
    expect(result.score).toBe(75)
    expect(result.answers).toHaveLength(4)
    expect(result.answers.every(a => a.is_correct !== null)).toBe(true)
  })

  it('is case-insensitive for true/false answers', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'true_false', correct_answer: 'True' },
      { id: 'q2', type: 'true_false', correct_answer: 'False' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: 'TRUE' },
      { question_id: 'q2', answer: 'false' },
    ]

    const result = gradeSubmission(questions, submitted)

    expect(result.correctCount).toBe(2)
    expect(result.score).toBe(100)
    expect(result.status).toBe('graded')
  })

  it('returns null score when there are any short-answer questions', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'multiple_choice', correct_answer: 'A' },
      { id: 'q2', type: 'short_answer', correct_answer: 'photosynthesis' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: 'A' },
      { question_id: 'q2', answer: 'photosynthesis' },
    ]

    const result = gradeSubmission(questions, submitted)

    expect(result.needsManualGrading).toBe(true)
    expect(result.score).toBeNull()
    expect(result.status).toBe('submitted')
    // The short-answer entry is left ungraded
    const shortAns = result.answers.find(a => a.question_id === 'q2')!
    expect(shortAns.is_correct).toBeNull()
  })

  it('treats missing submitted answers as empty (incorrect) for auto-graded types', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'multiple_choice', correct_answer: 'A' },
      { id: 'q2', type: 'true_false', correct_answer: 'True' },
    ]
    const submitted: SubmittedAnswer[] = [] // none submitted

    const result = gradeSubmission(questions, submitted)

    expect(result.correctCount).toBe(0)
    expect(result.autoGradedCount).toBe(2)
    expect(result.score).toBe(0)
    expect(result.status).toBe('graded')
    expect(result.answers.every(a => a.is_correct === false)).toBe(true)
  })

  it('trims whitespace from submitted answers before comparing', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'multiple_choice', correct_answer: 'A' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: '  A  ' },
    ]

    const result = gradeSubmission(questions, submitted)

    expect(result.correctCount).toBe(1)
    expect(result.score).toBe(100)
  })

  it('rounds percentage to two decimal places', () => {
    // 1 correct out of 3 => 33.3333...% => 33.33
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'multiple_choice', correct_answer: 'A' },
      { id: 'q2', type: 'multiple_choice', correct_answer: 'B' },
      { id: 'q3', type: 'multiple_choice', correct_answer: 'C' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: 'A' },
      { question_id: 'q2', answer: 'X' },
      { question_id: 'q3', answer: 'Y' },
    ]

    const result = gradeSubmission(questions, submitted)
    expect(result.score).toBe(33.33)
  })

  it('returns null score for an all-short-answer test', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', type: 'short_answer', correct_answer: 'cat' },
      { id: 'q2', type: 'short_answer', correct_answer: 'dog' },
    ]
    const submitted: SubmittedAnswer[] = [
      { question_id: 'q1', answer: 'cat' },
      { question_id: 'q2', answer: 'dog' },
    ]

    const result = gradeSubmission(questions, submitted)

    expect(result.needsManualGrading).toBe(true)
    expect(result.autoGradedCount).toBe(0)
    expect(result.score).toBeNull()
    expect(result.status).toBe('submitted')
    expect(result.answers.every(a => a.is_correct === null)).toBe(true)
  })

  it('handles an empty questions array by returning null score', () => {
    const result = gradeSubmission([], [])
    expect(result.score).toBeNull()
    expect(result.answers).toEqual([])
    expect(result.status).toBe('graded')
    expect(result.needsManualGrading).toBe(false)
  })
})

describe('recomputeAttemptScore', () => {
  it('returns null score when at least one answer is still ungraded', () => {
    const result = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: null }, { is_correct: false }],
      3
    )
    expect(result.score).toBeNull()
    expect(result.needsManualGrading).toBe(true)
    expect(result.status).toBe('submitted')
  })

  it('unlocks the score once the final ungraded answer is graded', () => {
    // Simulates: two were already auto-graded; the last short-answer just got manually graded.
    const before = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: true }, { is_correct: null }],
      3
    )
    expect(before.score).toBeNull()
    expect(before.status).toBe('submitted')

    const after = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: true }, { is_correct: false }],
      3
    )
    expect(after.score).toBeCloseTo(66.67, 2)
    expect(after.needsManualGrading).toBe(false)
    expect(after.status).toBe('graded')
  })

  it('recomputes when a previously-graded answer is flipped', () => {
    const initial = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: false }, { is_correct: true }],
      3
    )
    expect(initial.score).toBeCloseTo(66.67, 2)

    // Grader flips q2 from incorrect to correct
    const updated = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: true }, { is_correct: true }],
      3
    )
    expect(updated.score).toBe(100)
    expect(updated.status).toBe('graded')
  })

  it('returns a 0 score for a fully-graded attempt with no correct answers', () => {
    const result = recomputeAttemptScore(
      [{ is_correct: false }, { is_correct: false }],
      2
    )
    expect(result.score).toBe(0)
    expect(result.status).toBe('graded')
    expect(result.needsManualGrading).toBe(false)
  })

  it('returns null score when totalQuestions is 0', () => {
    const result = recomputeAttemptScore([], 0)
    expect(result.score).toBeNull()
    // Nothing ungraded, so status is graded even though score is null
    expect(result.needsManualGrading).toBe(false)
    expect(result.status).toBe('graded')
  })

  it('divides by totalQuestions, not by answers.length (guards against missing rows)', () => {
    // Defensive: if for some reason only 2 answer rows are passed but the attempt
    // has 4 questions total, we should NOT report 100% from 2/2.
    const result = recomputeAttemptScore(
      [{ is_correct: true }, { is_correct: true }],
      4
    )
    expect(result.score).toBe(50)
  })
})
