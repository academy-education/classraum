import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

// GET /api/level-tests/attempts/[attemptId]/answers
// Returns the taker's answers for a submitted attempt, joined with question data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify manager access via the attempt's test's academy
    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, test_id, level_tests!inner(academy_id)')
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
    if (!mgr) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch answers with question data
    const { data: answers, error } = await supabaseAdmin
      .from('level_test_answers')
      .select(`
        question_id,
        answer,
        is_correct,
        manual_score,
        level_test_questions!inner(
          question,
          type,
          choices,
          correct_answer,
          explanation,
          order_index
        )
      `)
      .eq('attempt_id', attemptId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalize and sort
    const normalized = (answers || [])
      .map(a => {
        const q = a.level_test_questions as unknown as {
          question: string
          type: string
          choices: string | string[] | null
          correct_answer: string
          explanation: string | null
          order_index: number
        }
        return {
          question_id: a.question_id,
          answer: a.answer,
          is_correct: a.is_correct,
          manual_score: a.manual_score,
          question: q?.question,
          type: q?.type,
          choices: q?.choices
            ? typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices
            : null,
          correct_answer: q?.correct_answer,
          explanation: q?.explanation,
          order_index: q?.order_index ?? 0,
        }
      })
      .sort((a, b) => a.order_index - b.order_index)

    return NextResponse.json({ answers: normalized })
  } catch (error) {
    console.error('[attempt answers] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
