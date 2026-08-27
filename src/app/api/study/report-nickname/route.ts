import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { enforceRateLimit, userOrIpKey } from '@/lib/rate-limit'

/**
 * POST /api/study/report-nickname
 *
 * A student reports another student's public handle.
 *
 * The word list in nickname-moderation.ts is deliberately conservative —
 * Korean profanity overlaps ordinary words, so a longer list buys misses
 * back with false positives that stop real students registering their
 * own names. This is the path for everything the list does not catch.
 *
 * THE NICKNAME IS SNAPSHOT SERVER-SIDE, not taken from the client.
 * Two reasons, and the second is the load-bearing one:
 *   - the handle can change (once) and a moderator can clear it, so a
 *     report holding only a user id becomes unreadable afterwards;
 *   - a client-supplied string would let anyone file a report claiming a
 *     victim used words they never used, and that fabrication would sit
 *     in a moderation queue looking like evidence.
 *
 * Returns 200 for an already-open duplicate rather than an error: the
 * reporter has done all they can, and telling them "you already reported
 * this" invites them to look for another way to be heard.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Reporting is cheap to abuse and rarely done in bulk honestly.
  const blocked = enforceRateLimit(
    userOrIpKey('report-nickname', user.id, request),
    { windowMs: 60 * 60 * 1000, max: 10 },
  )
  if (blocked) return blocked

  let body: { studentId?: unknown; reason?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const reportedId = typeof body.studentId === 'string' ? body.studentId.trim() : ''
  if (!/^[0-9a-f-]{36}$/i.test(reportedId)) {
    return NextResponse.json({ error: 'invalid_student' }, { status: 400 })
  }
  if (reportedId === user.id) {
    // Also enforced by a CHECK constraint; refused here so the caller
    // gets a reason rather than a 500.
    return NextResponse.json({ error: 'cannot_report_self' }, { status: 400 })
  }

  const reason =
    typeof body.reason === 'string' && body.reason.trim()
      ? body.reason.trim().slice(0, 500)
      : null

  // Read the handle as it stands, under the service role. If the target
  // has no nickname there is nothing to report.
  const { data: prefs, error: prefsError } = await dbAdmin
    .from('study_user_prefs')
    .select('nickname')
    .eq('student_id', reportedId)
    .maybeSingle()

  if (prefsError) {
    console.error('[report-nickname] prefs lookup failed:', prefsError)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  const nickname = prefs?.nickname
  if (!nickname) {
    return NextResponse.json({ error: 'no_nickname' }, { status: 404 })
  }

  const { error } = await dbAdmin.from('study_nickname_reports').insert({
    reported_student_id: reportedId,
    reported_nickname: nickname,
    reporter_student_id: user.id,
    reason,
  })

  if (error) {
    // 23505 = the partial unique index: this reporter already has an
    // OPEN report about this target. Not a failure from where they sit.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, alreadyReported: true })
    }
    console.error('[report-nickname] insert failed:', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
