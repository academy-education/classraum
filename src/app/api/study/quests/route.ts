import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { computeQuests } from '@/lib/study/quests'

/**
 * GET /api/study/quests — weekly quest progress for the current student.
 *
 * Progress is derived from this week's activity; completing a quest
 * grants its one-time bonus XP (idempotent per week). `earnedXp` in the
 * response is what was just granted on this call, so the client can pop
 * an XP toast the moment a quest crosses the line.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  try {
    const payload = await computeQuests(user.id)
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[study/quests] failed', e)
    return NextResponse.json({ error: 'quests failed' }, { status: 500 })
  }
}
