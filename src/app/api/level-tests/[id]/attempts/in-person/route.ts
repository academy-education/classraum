import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

// POST /api/level-tests/[id]/attempts/in-person
// Manager creates a new in-person attempt for a named student
// Returns attempt id; manager then uses /attempts/[attemptId]/save to update answers
// and /attempts/[attemptId]/submit to finalize.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: testId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taker_name, student_id } = body

    if (!taker_name || typeof taker_name !== 'string' || !taker_name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Verify manager access
    const { data: test } = await supabaseAdmin
      .from('level_tests')
      .select('id, academy_id, question_count')
      .eq('id', testId)
      .is('deleted_at', null)
      .single()
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', test.academy_id)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const { data: attempt, error } = await supabaseAdmin
      .from('level_test_attempts')
      .insert({
        test_id: testId,
        student_id: student_id || null,
        taker_name: taker_name.trim(),
        total_questions: test.question_count,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error || !attempt) {
      console.error('[in-person attempt] insert error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to create attempt' }, { status: 500 })
    }

    return NextResponse.json({ attempt })
  } catch (error) {
    console.error('[in-person attempt] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
