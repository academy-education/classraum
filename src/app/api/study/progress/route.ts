import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/progress — today's stats for the daily goal ring.
 * Returns minutes studied today (computed from study_attempts'
 * time_spent_seconds), question count, and session count. Plus the
 * student's daily goal minutes for ring fill calculation.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // Start of today in the server's timezone. Good enough for the
  // mobile preview — a per-student timezone offset would be more
  // accurate but isn't worth the complexity for a daily aggregate.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startIso = today.toISOString()

  // Pull attempts started today via the join to sessions (RLS
  // enforces ownership). time_spent_seconds may be null on some
  // rows; coalesce to 0.
  const { data: attempts } = await supabaseAdmin
    .from('study_attempts')
    .select(`
      time_spent_seconds, created_at,
      session:study_sessions!inner ( student_id, id )
    `)
    .eq('session.student_id', user.id)
    .gte('created_at', startIso)

  // Distinct sessions touched today.
  const sessionIds = new Set<string>()
  let totalSeconds = 0
  for (const a of attempts ?? []) {
    totalSeconds += (a.time_spent_seconds as number | null) ?? 0
    const s = a.session as { id: string } | { id: string }[] | null
    const id = Array.isArray(s) ? s[0]?.id : s?.id
    if (id) sessionIds.add(id)
  }

  // Daily goal — read from prefs, default 30 min.
  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('daily_goal_minutes')
    .eq('student_id', user.id)
    .maybeSingle()
  const goalMinutes = prefs?.daily_goal_minutes ?? 30

  return NextResponse.json({
    questionsToday: attempts?.length ?? 0,
    minutesToday: Math.round(totalSeconds / 60),
    sessionsToday: sessionIds.size,
    goalMinutes,
  })
}
