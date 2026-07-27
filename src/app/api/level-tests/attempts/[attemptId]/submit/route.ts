import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { gradeSubmission, type GradableQuestion } from '@/lib/level-test-grading'
import { triggerLevelTestSubmittedNotifications } from '@/lib/notification-triggers'

// POST /api/level-tests/attempts/[attemptId]/submit
// Finalize an in-progress attempt: grade MC/TF, mark submitted
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: attempt } = await dbAdmin
      .from('level_test_attempts')
      .select('id, test_id, status, total_questions, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
    }

    const academyId = (attempt.level_tests as unknown as { academy_id: string })?.academy_id
    const { data: mgr } = await dbAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Fetch questions and saved answers to grade
    const { data: questions } = await dbAdmin
      .from('level_test_questions')
      .select('id, type, correct_answer')
      .eq('test_id', attempt.test_id)

    const { data: savedAnswers } = await dbAdmin
      .from('level_test_answers')
      .select('question_id, answer')
      .eq('attempt_id', attemptId)

    if (!questions) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 500 })
    }

    const { answers: updates, correctCount, autoGradedCount, needsManualGrading, score, status } =
      gradeSubmission(
        questions as GradableQuestion[],
        // level_test_answers.answer is nullable — a saved row with no text is
        // an unanswered question. gradeSubmission already treats a MISSING
        // row as '' (`answerMap.get(q.id) ?? ''`), so a null answer must take
        // the same path rather than being dropped.
        (savedAnswers || []).map(a => ({ question_id: a.question_id, answer: a.answer ?? '' }))
      )

    // Update is_correct on existing answer rows.
    const failedAnswerWrites: string[] = []
    for (const u of updates) {
      const { error: answerError } = await dbAdmin
        .from('level_test_answers')
        .update({ is_correct: u.is_correct })
        .eq('attempt_id', attemptId)
        .eq('question_id', u.question_id)
      if (answerError) {
        console.error('[attempt submit] answer grade write failed', {
          attemptId,
          questionId: u.question_id,
          error: answerError,
        })
        failedAnswerWrites.push(u.question_id)
      }
    }

    if (failedAnswerWrites.length > 0) {
      // Stop before flipping the attempt to submitted. The score below is
      // computed in memory; persisting it on top of half-written answer rows
      // would show a score the per-question results can't account for.
      // Leaving the attempt 'in_progress' keeps the submit retryable.
      return NextResponse.json(
        { error: 'Failed to save graded answers', questions: failedAnswerWrites },
        { status: 500 }
      )
    }

    const { data: updatedAttempt, error: updateError } = await dbAdmin
      .from('level_test_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score,
        status,
        needs_manual_grading: needsManualGrading,
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError) {
      console.error('[attempt submit] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fire managers' notifications — best-effort, don't block the response.
    triggerLevelTestSubmittedNotifications(attemptId).catch(err =>
      console.error('[attempt submit] notification dispatch failed:', err)
    )

    return NextResponse.json({
      attempt: updatedAttempt,
      correct: correctCount,
      auto_graded: autoGradedCount,
      total: questions.length,
      score,
      needs_manual_grading: needsManualGrading,
    })
  } catch (error) {
    console.error('[attempt submit] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
