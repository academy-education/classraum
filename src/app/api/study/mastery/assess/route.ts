import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { assessSessionMastery } from '@/lib/study-mastery-assess'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/mastery/assess — run an AI assessment pass on a
 * specific session's attempts and write strengths/weaknesses to
 * study_mastery for the (student, topic) pair.
 *
 * Test mode calls assessSessionMastery() directly from the submit
 * route. This endpoint exists so the practice / lesson modes (which
 * don't have an explicit submit) can fire an assessment manually —
 * e.g. on a "Done practicing" tap or once N attempts accumulate on
 * the same topic.
 */

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // 6 per minute is plenty — assessment is meant to fire at most
  // once per session, not in a tight loop.
  const blocked = enforceRateLimit(
    `mastery-assess:user:${user.id}`,
    { windowMs: 60 * 1000, max: 6 }
  )
  if (blocked) return blocked

  let body: { sessionId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const sessionId = body.sessionId
  if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

  // Verify the session belongs to the caller before letting the
  // helper run — assessment writes to study_mastery and we don't
  // want a leaked sessionId to overwrite someone else's qualitative
  // mastery.
  const { data: session } = await supabaseAdmin
    .from('study_sessions')
    .select('id, student_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (!session || session.student_id !== user.id) {
    return NextResponse.json({ error: 'session not found' }, { status: 404 })
  }

  await assessSessionMastery(sessionId)
  return NextResponse.json({ ok: true })
}
