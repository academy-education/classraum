/**
 * Pure grading logic for level-test attempts.
 *
 * Extracted from the submit/grade/ai-grade API routes so it can be unit tested
 * without needing a real Supabase connection.
 *
 * The rule for computing score:
 * - Short-answer questions need explicit grading (manual or AI).
 * - Score is ONLY returned as a number when EVERY question has been graded
 *   (is_correct is not null). Partial scores are never shown to avoid
 *   misleading students.
 * - status is 'graded' when fully graded, 'submitted' when partially graded.
 */

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'

export interface GradableQuestion {
  id: string
  type: QuestionType
  correct_answer: string
}

export interface SubmittedAnswer {
  question_id: string
  answer: string
}

export interface AutoGradedAnswer {
  question_id: string
  is_correct: boolean | null // null means manual/AI grading needed
}

export interface GradingSummary {
  answers: AutoGradedAnswer[]
  correctCount: number
  autoGradedCount: number
  needsManualGrading: boolean
  score: number | null
  status: 'graded' | 'submitted'
}

/**
 * Grade multiple_choice / true_false questions and determine if score is available.
 * Short answers are left ungraded (is_correct = null) and block score calculation.
 */
export function gradeSubmission(
  questions: GradableQuestion[],
  submittedAnswers: SubmittedAnswer[]
): GradingSummary {
  const answerMap = new Map(submittedAnswers.map(a => [a.question_id, a.answer]))

  let correctCount = 0
  let autoGradedCount = 0
  let needsManualGrading = false
  const answers: AutoGradedAnswer[] = []

  for (const q of questions) {
    const raw = answerMap.get(q.id) ?? ''
    const ans = raw.toString().trim()
    let isCorrect: boolean | null = null

    if (q.type === 'multiple_choice') {
      isCorrect = ans === q.correct_answer
      if (isCorrect) correctCount++
      autoGradedCount++
    } else if (q.type === 'true_false') {
      isCorrect = ans.toLowerCase() === q.correct_answer.toLowerCase()
      if (isCorrect) correctCount++
      autoGradedCount++
    } else {
      // short_answer: needs human or AI grading
      needsManualGrading = true
    }

    answers.push({ question_id: q.id, is_correct: isCorrect })
  }

  return {
    answers,
    correctCount,
    autoGradedCount,
    needsManualGrading,
    score: computeScore(answers, questions.length),
    status: needsManualGrading ? 'submitted' : 'graded',
  }
}

/**
 * Recompute an attempt's score from already-graded answers.
 *
 * Used after a manual or AI grading of short answers updates is_correct on
 * one or more answer rows. Returns a score only when every question has a
 * non-null is_correct.
 */
export interface GradedAnswerRow {
  is_correct: boolean | null
}

export interface RecomputeResult {
  score: number | null
  needsManualGrading: boolean
  status: 'graded' | 'submitted'
}

export function recomputeAttemptScore(
  answers: GradedAnswerRow[],
  totalQuestions: number
): RecomputeResult {
  const anyUngraded = answers.some(a => a.is_correct === null)
  const correctCount = answers.filter(a => a.is_correct === true).length

  const score = computeScore(
    answers.map(a => ({ question_id: '', is_correct: a.is_correct })),
    totalQuestions
  )

  return {
    score,
    needsManualGrading: anyUngraded,
    status: anyUngraded ? 'submitted' : 'graded',
  }
}

/**
 * Helper: turn graded answers + question count into a score.
 * Returns null when anything is ungraded. Percentage rounded to 2 decimals.
 */
function computeScore(answers: AutoGradedAnswer[], totalQuestions: number): number | null {
  if (totalQuestions <= 0) return null
  if (answers.some(a => a.is_correct === null)) return null
  const correct = answers.filter(a => a.is_correct === true).length
  return Math.round((correct / totalQuestions) * 10000) / 100
}
