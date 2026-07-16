import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { evaluateStreak } from '@/lib/study/streak'

/**
 * GET /api/study/streak — server-authoritative streak count + freeze state.
 *
 * Streak is derived from distinct active days in study_sessions.last_active_at
 * (walked back from today with yesterday-grace). On top of that, evaluateStreak
 * layers the freeze: it auto-consumes freeze tokens to bridge a missed day so a
 * single skipped day doesn't reset the streak, grants milestone freezes, and
 * persists the state (study_streak_state). Server timezone is UTC.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`streak:user:${user.id}`, { windowMs: 60 * 1000, max: 30 })
  if (blocked) return blocked

  const { streak, freezes, maxStreak, streakSaved } = await evaluateStreak(user.id)
  return NextResponse.json({ streak, freezes, maxStreak, streakSaved })
}
