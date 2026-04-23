import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

// GET /api/level-tests/[id]/attempts - list attempts for a test
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is manager for the test's academy
    const { data: test } = await supabaseAdmin
      .from('level_tests')
      .select('academy_id')
      .eq('id', id)
      .single()
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', test.academy_id)
      .single()
    if (!mgr) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, taker_name, taker_email, score, total_questions, submitted_at, status, needs_manual_grading')
      .eq('test_id', id)
      .order('submitted_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ attempts: data || [] })
  } catch (error) {
    console.error('[level-tests attempts GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
