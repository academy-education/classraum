import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

async function isManagerForTest(userId: string, testId: string): Promise<{ ok: boolean; test?: { id: string; academy_id: string; title: string } }> {
  const { data: test } = await supabaseAdmin
    .from('level_tests')
    .select('id, academy_id, title')
    .eq('id', testId)
    .is('deleted_at', null)
    .single()
  if (!test) return { ok: false }
  const { data: mgr } = await supabaseAdmin
    .from('managers')
    .select('user_id')
    .eq('user_id', userId)
    .eq('academy_id', test.academy_id)
    .single()
  return { ok: !!mgr, test }
}

// POST /api/level-tests/[id]/assign - assign test to academy students
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { ok, test } = await isManagerForTest(user.id, id)
    if (!ok || !test) {
      return NextResponse.json({ error: 'Test not found or not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const { student_ids, due_date } = body

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'student_ids array required' }, { status: 400 })
    }

    const assignments = student_ids.map((student_id: string) => ({
      test_id: id,
      student_id,
      assigned_by: user.id,
      due_date: due_date || null,
    }))

    const { data, error } = await supabaseAdmin
      .from('level_test_assignments')
      .upsert(assignments, { onConflict: 'test_id,student_id' })
      .select()

    if (error) {
      console.error('[level-tests assign] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create in-app notifications
    const notifications = student_ids.map((student_id: string) => ({
      user_id: student_id,
      type: 'level_test',
      title: `New level test: ${test.title}`,
      message: `You've been assigned a new level test. ${due_date ? `Due ${new Date(due_date).toLocaleDateString()}` : ''}`,
      navigation_data: { test_id: id },
      is_read: false,
    }))

    await supabaseAdmin.from('notifications').insert(notifications)

    await supabaseAdmin
      .from('level_test_assignments')
      .update({ notification_sent: true })
      .eq('test_id', id)
      .in('student_id', student_ids)

    return NextResponse.json({ assignments: data })
  } catch (error) {
    console.error('[level-tests assign POST] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/level-tests/[id]/assign - list assigned students for this test
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
    const { ok } = await isManagerForTest(user.id, id)
    if (!ok) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('level_test_assignments')
      .select(`
        id, student_id, assigned_at, due_date,
        users!level_test_assignments_student_id_fkey(id, name, email)
      `)
      .eq('test_id', id)
      .order('assigned_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assignments: data })
  } catch (error) {
    console.error('[level-tests assign GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
