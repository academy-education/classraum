import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { trackEvent, CLIENT_TRACKABLE, type StudyEvent } from '@/lib/study/analytics'

/**
 * POST /api/study/track — record a client-side funnel event.
 *
 * The event must be in CLIENT_TRACKABLE (revenue events are written
 * server-side only, never trusted from the client), and student_id is
 * taken from the authed session — the body can't spoof it. Always returns
 * 200 so a tracking failure never surfaces to the user.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Generous — this is a cheap insert; just cap abuse.
  const blocked = enforceRateLimit(`track:user:${user.id}`, { windowMs: 60 * 1000, max: 120 })
  if (blocked) return blocked

  let body: { event?: string; props?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  if (typeof body.event === 'string' && CLIENT_TRACKABLE.has(body.event)) {
    const props = body.props && typeof body.props === 'object' ? body.props : undefined
    await trackEvent(user.id, body.event as StudyEvent, props)
  }
  return NextResponse.json({ ok: true })
}
