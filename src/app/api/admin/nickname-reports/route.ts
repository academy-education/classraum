import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

/**
 * Moderation for reported study nicknames.
 *
 *   GET   ?status=pending   the queue
 *   PATCH { id, status, note? }   resolve one
 *
 * ADMIN ONLY, checked by re-reading `users.role` server-side rather than
 * trusting anything the caller sends. This runs with the service role,
 * so the role check IS the access control — there is no RLS underneath
 * to catch a mistake here.
 *
 * Resolving does NOT change the reported nickname. Clearing or forcing a
 * handle is a separate, heavier action with its own consequences for the
 * user, and folding it into "mark this report handled" would make an
 * irreversible change a side effect of triage.
 */

const STATUSES = ['pending', 'actioned', 'dismissed'] as const
type Status = (typeof STATUSES)[number]

/** Shared gate. Returns the admin's id, or a response to return. */
async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data, error } = await dbAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !data || !['admin', 'super_admin'].includes(data.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { adminId: user.id }
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request)
  if ('error' in gate) return gate.error

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status') ?? 'pending'
  const status = (STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as Status)
    : 'pending'

  // Bounded. An unbounded select here is the PostgREST 1000-row cap
  // waiting to happen, and a silently truncated moderation queue looks
  // exactly like an empty one.
  const LIMIT = 200

  const { data, error } = await dbAdmin
    .from('study_nickname_reports')
    .select(`
      id, reported_nickname, reason, status, created_at, resolved_at, resolution_note,
      reported_student_id, reporter_student_id
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error('[admin/nickname-reports] query failed:', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  const rows = data ?? []

  /* How many OPEN reports exist against each target in this page. One
     complaint is noise; five from different students is the signal a
     moderator acts on, and the queue is useless without it. */
  const targets = [...new Set(rows.map(r => r.reported_student_id))]
  const counts = new Map<string, number>()
  if (targets.length > 0) {
    const { data: openRows } = await dbAdmin
      .from('study_nickname_reports')
      .select('reported_student_id')
      .eq('status', 'pending')
      .in('reported_student_id', targets)
    for (const r of openRows ?? []) {
      counts.set(r.reported_student_id, (counts.get(r.reported_student_id) ?? 0) + 1)
    }
  }

  return NextResponse.json({
    reports: rows.map(r => ({ ...r, openReportsAgainstTarget: counts.get(r.reported_student_id) ?? 0 })),
    truncated: rows.length === LIMIT,
  })
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin(request)
  if ('error' in gate) return gate.error

  let body: { id?: unknown; status?: unknown; note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const status = typeof body.status === 'string' ? body.status : ''
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 })
  if (status !== 'actioned' && status !== 'dismissed') {
    // Reopening is deliberately not offered: the partial unique index
    // allows a fresh report once one is resolved, so re-opening an old
    // row would create two competing ways to represent the same state.
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const note =
    typeof body.note === 'string' && body.note.trim()
      ? body.note.trim().slice(0, 1000)
      : null

  const { error } = await dbAdmin
    .from('study_nickname_reports')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: gate.adminId,
      resolution_note: note,
    })
    .eq('id', id)
    // Only an OPEN report can be resolved. Without this an admin could
    // silently overwrite another admin's decision and its note.
    .eq('status', 'pending')

  if (error) {
    console.error('[admin/nickname-reports] update failed:', error)
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
