import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

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

    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, test_id, status, total_questions, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
    }

    const academyId = (attempt.level_tests as unknown as { academy_id: string })?.academy_id
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Fetch questions and saved answers to grade
    const { data: questions } = await supabaseAdmin
      .from('level_test_questions')
      .select('id, type, correct_answer')
      .eq('test_id', attempt.test_id)

    const { data: savedAnswers } = await supabaseAdmin
      .from('level_test_answers')
      .select('question_id, answer')
      .eq('attempt_id', attemptId)

    if (!questions) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 500 })
    }

    const answerMap = new Map((savedAnswers || []).map(a => [a.question_id, a.answer]))

    let correctCount = 0
    let autoGradedCount = 0
    let needsManualGrading = false
    const updates: Array<{ question_id: string; is_correct: boolean | null }> = []

    for (const q of questions) {
      const ans = (answerMap.get(q.id) || '').toString().trim()
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
        needsManualGrading = true
      }

      updates.push({ question_id: q.id, is_correct: isCorrect })
    }

    // Update is_correct on existing answer rows
    for (const u of updates) {
      await supabaseAdmin
        .from('level_test_answers')
        .update({ is_correct: u.is_correct })
        .eq('attempt_id', attemptId)
        .eq('question_id', u.question_id)
    }

    // Score is only computed when fully graded (no pending short answers).
    // If short answers exist, the score stays null until they are graded.
    const score = needsManualGrading
      ? null
      : (autoGradedCount > 0
          ? Math.round((correctCount / questions.length) * 10000) / 100
          : null)

    const { data: updatedAttempt, error: updateError } = await supabaseAdmin
      .from('level_test_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score,
        status: needsManualGrading ? 'submitted' : 'graded',
        needs_manual_grading: needsManualGrading,
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError) {
      console.error('[attempt submit] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

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
