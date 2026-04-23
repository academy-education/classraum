import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

// PATCH /api/level-tests/attempts/[attemptId]/save
// Auto-save in-progress answers; status remains 'in_progress'
// Body: { answers: [{ question_id, answer }] }
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
    const { answers } = body
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'answers must be array' }, { status: 400 })
    }

    // Verify access (manager for the test)
    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, test_id, status, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'graded' || attempt.status === 'submitted') {
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

    // Upsert answers (no grading yet — that happens at submit)
    const rows = answers.map((a: { question_id: string; answer: string }) => ({
      attempt_id: attemptId,
      question_id: a.question_id,
      answer: a.answer ?? '',
      is_correct: null,
    }))

    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from('level_test_answers')
        .upsert(rows, { onConflict: 'attempt_id,question_id' })
      if (error) {
        console.error('[attempt save] upsert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, saved_count: rows.length })
  } catch (error) {
    console.error('[attempt save] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/level-tests/attempts/[attemptId]/save - get current saved answers (for resume)
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

    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, test_id, taker_name, status, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const academyId = (attempt.level_tests as unknown as { academy_id: string })?.academy_id
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const { data: answers } = await supabaseAdmin
      .from('level_test_answers')
      .select('question_id, answer')
      .eq('attempt_id', attemptId)

    return NextResponse.json({ attempt, answers: answers || [] })
  } catch (error) {
    console.error('[attempt get] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
