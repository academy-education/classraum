import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/study/social-presence — count of academy peers currently
 * studying. Korean-market study apps (Qanda, EBSi study timer) lean
 * heavily on peer-presence as a motivator; the deep-research pass
 * flagged this as our top Korea-market gap since our streak/XP/league
 * stack alone doesn't satisfy the "누가 지금 공부하고 있나" expectation.
 *
 * "Studying now" = at least one study_sessions row with last_active_at
 * within the last 10 minutes, belonging to a student in the same
 * academy as the caller. Excludes the caller themselves so it never
 * reads "1 studying now — that's you".
 *
 * Returns { count, windowMinutes } where windowMinutes reflects the
 * threshold the count was computed against (client can render it in
 * copy). Returns { count: 0 } silently on unauthenticated or
 * academy-less callers rather than 4xx — this is a soft affordance
 * and a 401 would just hide the card noisily.
 */

export const dynamic = 'force-dynamic'

const WINDOW_MINUTES = 10

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ count: 0, windowMinutes: WINDOW_MINUTES })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ count: 0, windowMinutes: WINDOW_MINUTES })

  const blocked = enforceRateLimit(`social-presence:${user.id}`, { windowMs: 60 * 1000, max: 30 })
  if (blocked) return blocked

  // Look up the caller's academy — social presence is scoped there so
  // students see their real peers, not the whole platform (which would
  // both leak cross-academy activity and read as noise for small
  // academies).
  const { data: studentRow } = await supabaseAdmin
    .from('students')
    .select('academy_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const academyId = studentRow?.academy_id as string | undefined
  if (!academyId) return NextResponse.json({ count: 0, windowMinutes: WINDOW_MINUTES })

  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()

  // Peers = students in the same academy other than the caller. Count
  // distinct student_ids with any recent session activity.
  const { data: peerRows } = await supabaseAdmin
    .from('students')
    .select('user_id')
    .eq('academy_id', academyId)
    .neq('user_id', user.id)
  const peerIds = (peerRows ?? []).map(r => r.user_id as string)
  if (peerIds.length === 0) return NextResponse.json({ count: 0, windowMinutes: WINDOW_MINUTES })

  const { data: activeRows } = await supabaseAdmin
    .from('study_sessions')
    .select('student_id')
    .in('student_id', peerIds)
    .gte('last_active_at', cutoff)

  const activeStudents = new Set<string>()
  for (const row of activeRows ?? []) {
    if (row.student_id) activeStudents.add(row.student_id as string)
  }

  return NextResponse.json({
    count: activeStudents.size,
    windowMinutes: WINDOW_MINUTES,
  })
}
