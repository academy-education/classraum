import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/level-tests/[id]/assign - assign test to academy students
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { student_ids, due_date } = body

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: 'student_ids array required' }, { status: 400 })
    }

    // Verify test exists and user is manager
    const { data: test } = await supabase
      .from('level_tests')
      .select('id, academy_id, title')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    // Upsert assignments (skip duplicates)
    const assignments = student_ids.map((student_id: string) => ({
      test_id: id,
      student_id,
      assigned_by: user.id,
      due_date: due_date || null,
    }))

    const { data, error } = await supabase
      .from('level_test_assignments')
      .upsert(assignments, { onConflict: 'test_id,student_id' })
      .select()

    if (error) {
      console.error('[level-tests assign] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create in-app notifications for each assigned student
    const notifications = student_ids.map((student_id: string) => ({
      user_id: student_id,
      type: 'level_test',
      title: `New level test: ${test.title}`,
      message: `You've been assigned a new level test. ${due_date ? `Due ${new Date(due_date).toLocaleDateString()}` : ''}`,
      navigation_data: { test_id: id },
      is_read: false,
    }))

    await supabase.from('notifications').insert(notifications)

    // Mark as notified
    await supabase
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
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
