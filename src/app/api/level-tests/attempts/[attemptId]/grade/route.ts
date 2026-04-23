import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

// Helper: recompute attempt score and status based on current answer is_correct values
async function recomputeAttempt(attemptId: string) {
  const { data: attempt } = await supabaseAdmin
    .from('level_test_attempts')
    .select('id, test_id, total_questions')
    .eq('id', attemptId)
    .single()
  if (!attempt) return

  const { data: answers } = await supabaseAdmin
    .from('level_test_answers')
    .select('is_correct, level_test_questions!inner(type)')
    .eq('attempt_id', attemptId)

  if (!answers) return

  const total = attempt.total_questions || answers.length
  const ungraded = answers.some(a => a.is_correct === null)
  const correctCount = answers.filter(a => a.is_correct === true).length

  const score = ungraded ? null : Math.round((correctCount / total) * 10000) / 100

  await supabaseAdmin
    .from('level_test_attempts')
    .update({
      score,
      status: ungraded ? 'submitted' : 'graded',
      needs_manual_grading: ungraded,
    })
    .eq('id', attemptId)
}

// PATCH /api/level-tests/attempts/[attemptId]/grade
// Manager manually marks a single short-answer as correct or incorrect.
// Body: { question_id: string, is_correct: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question_id, is_correct } = body
    if (typeof question_id !== 'string' || typeof is_correct !== 'boolean') {
      return NextResponse.json({ error: 'question_id (string) and is_correct (boolean) required' }, { status: 400 })
    }

    // Verify manager access via attempt's test
    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    const academyId = (attempt.level_tests as unknown as { academy_id: string })?.academy_id
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Update the answer
    const { error } = await supabaseAdmin
      .from('level_test_answers')
      .update({
        is_correct,
        graded_at: new Date().toISOString(),
      })
      .eq('attempt_id', attemptId)
      .eq('question_id', question_id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Recompute attempt score
    await recomputeAttempt(attemptId)

    // Return fresh attempt
    const { data: updated } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, score, status, needs_manual_grading')
      .eq('id', attemptId)
      .single()

    return NextResponse.json({ attempt: updated })
  } catch (error) {
    console.error('[attempt grade] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
