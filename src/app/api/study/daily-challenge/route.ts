import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { computeDailyChallenge } from '@/lib/study/daily-challenge'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/daily-challenge — today's 5-question micro-quiz.
 *
 * Returns: { date, topic, sessionId, completed, weak }
 * - date: yyyy-mm-dd (UTC, simple for v1)
 * - topic: which topic the challenge will target (weakest with attempts >= 2,
 *   else most-recent topic, else null)
 * - sessionId: if a daily-challenge session exists for today, return its id
 * - completed: true if that session is status='completed'
 *
 * Daily challenge sessions are tagged via session.config.dailyChallenge = 'YYYY-MM-DD'
 * so we can find them by exact-match without a new schema.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`daily-challenge:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  return NextResponse.json(await computeDailyChallenge(user.id))
}