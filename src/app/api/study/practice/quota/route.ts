import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { getPracticeQuota } from '@/lib/study/practice-quota'

/**
 * GET /api/study/practice/quota — today's practice budget for the
 * signed-in student, so the topic page can lock the practice/flashcards
 * cards for free users and show "N left today" for paid users without
 * having to attempt a session start.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const quota = await getPracticeQuota(authResult.user.id)
  return NextResponse.json(quota)
}
