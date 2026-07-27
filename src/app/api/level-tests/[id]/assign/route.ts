import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import type { NotificationType } from '@/lib/notification-types'
import type { Database } from '@/lib/database.types'

/**
 * A `notifications` insert as the TYPED client wants it, with `type` narrowed
 * to the legal CHECK-constraint values.
 *
 * `NotificationInsert` (lib/notification-types.ts) declares `navigation_data`
 * as `Record<string, unknown>`, which is not assignable to the generated
 * `Json` column type. Intersecting the generated Insert with the narrowed
 * `type` keeps the compile-time guarantee that motivated NotificationInsert
 * — an illegal `type` is still a compile error — while matching the real
 * column types exactly.
 */
type NotificationRow = Database['public']['Tables']['notifications']['Insert'] & {
  type: NotificationType
}

async function isManagerForTest(userId: string, testId: string): Promise<{ ok: boolean; test?: { id: string; academy_id: string; title: string } }> {
  const { data: test } = await dbAdmin
    .from('level_tests')
    .select('id, academy_id, title')
    .eq('id', testId)
    .is('deleted_at', null)
    .single()
  if (!test) return { ok: false }
  const { data: mgr } = await dbAdmin
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

    const { data, error } = await dbAdmin
      .from('level_test_assignments')
      .upsert(assignments, { onConflict: 'test_id,student_id' })
      .select()

    if (error) {
      console.error('[level-tests assign] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create in-app notifications. Typed against NotificationInsert so an
    // illegal `type` is a compile error — this insert spent months being
    // rejected by the notifications_type_check constraint with nobody the
    // wiser (see lib/notification-types.ts).
    const notifications: NotificationRow[] = student_ids.map((student_id: string) => ({
      user_id: student_id,
      type: 'level_test',
      title: `New level test: ${test.title}`,
      message: `You've been assigned a new level test. ${due_date ? `Due ${new Date(due_date).toLocaleDateString()}` : ''}`,
      navigation_data: { test_id: id },
      is_read: false,
    }))

    // supabase-js `.insert()` RESOLVES with `{ error }` — it never throws.
    // Read it: the outer try/catch is not a safety net for this call.
    const { error: notifyError } = await dbAdmin.from('notifications').insert(notifications)

    if (notifyError) {
      // notification_sent is a factual record of delivery, not an
      // intention. Leave it false so a retry/backfill can find these.
      console.error('[level-tests assign] notification insert REJECTED', {
        testId: id,
        students: student_ids.length,
        code: notifyError.code,
        message: notifyError.message,
        details: notifyError.details,
        hint: notifyError.hint,
      })
    } else {
      const { error: markError } = await dbAdmin
        .from('level_test_assignments')
        .update({ notification_sent: true })
        .eq('test_id', id)
        .in('student_id', student_ids)
      if (markError) {
        console.error('[level-tests assign] notification_sent update failed', id, markError)
      }
    }

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

    const { data, error } = await dbAdmin
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
