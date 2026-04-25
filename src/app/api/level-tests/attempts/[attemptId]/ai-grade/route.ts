import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { aiGradeShortAnswers, type Language } from '@/lib/level-test-generator'
import { recomputeAttemptScore } from '@/lib/level-test-grading'

// POST /api/level-tests/attempts/[attemptId]/ai-grade
// Sends all ungraded short-answer questions to OpenAI for grading
// (or, optionally, regrades all short-answer questions if `regrade_all: true`).
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

    let body: { regrade_all?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // empty body is fine
    }
    const regradeAll = body.regrade_all === true

    // Verify manager access + load test language
    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, total_questions, level_tests!inner(academy_id, language)')
      .eq('id', attemptId)
      .single()
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }
    const testInfo = attempt.level_tests as unknown as { academy_id: string; language: Language }

    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', testInfo.academy_id)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Pull short-answer responses (ungraded by default)
    const { data: rows, error: rowsError } = await supabaseAdmin
      .from('level_test_answers')
      .select(`
        question_id, answer, is_correct,
        level_test_questions!inner(question, type, correct_answer)
      `)
      .eq('attempt_id', attemptId)

    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 })
    }

    const targets = (rows || [])
      .map(r => {
        const q = r.level_test_questions as unknown as {
          question: string
          type: string
          correct_answer: string
        }
        return {
          question_id: r.question_id,
          answer: r.answer,
          is_correct: r.is_correct,
          question: q?.question,
          type: q?.type,
          correct_answer: q?.correct_answer,
        }
      })
      .filter(r => r.type === 'short_answer' && (regradeAll || r.is_correct === null))

    if (targets.length === 0) {
      return NextResponse.json({ graded: [], message: 'Nothing to grade' })
    }

    const graded = await aiGradeShortAnswers(
      targets.map(t => ({
        question_id: t.question_id,
        question: t.question,
        correct_answer: t.correct_answer,
        student_answer: t.answer || '',
      })),
      testInfo.language
    )

    // Apply grades
    const now = new Date().toISOString()
    for (const g of graded) {
      await supabaseAdmin
        .from('level_test_answers')
        .update({ is_correct: g.is_correct, graded_at: now })
        .eq('attempt_id', attemptId)
        .eq('question_id', g.question_id)
    }

    // Recompute attempt score
    const { data: allAnswers } = await supabaseAdmin
      .from('level_test_answers')
      .select('is_correct')
      .eq('attempt_id', attemptId)

    const total = attempt.total_questions || (allAnswers?.length ?? 0)
    const { score, needsManualGrading, status } = recomputeAttemptScore(allAnswers || [], total)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('level_test_attempts')
      .update({
        score,
        status,
        needs_manual_grading: needsManualGrading,
      })
      .eq('id', attemptId)
      .select('id, score, status, needs_manual_grading')
      .single()

    if (updateError || !updated) {
      // Attempt may have been deleted between read and write, or RLS blocked.
      // Don't return attempt:null to the client — it'll crash render code that
      // assumes a populated object.
      console.error('[ai-grade] failed to update attempt:', updateError)
      return NextResponse.json(
        { error: 'Failed to update attempt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      graded,
      attempt: updated,
      ungraded: needsManualGrading,
      score,
    })
  } catch (error) {
    console.error('[ai-grade] Exception:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
