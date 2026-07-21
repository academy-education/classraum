import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { getEnergy } from '@/lib/study/practice-quota'

/**
 * GET /api/study/energy — the signed-in student's current practice energy
 * (regen applied virtually). Backs the top-bar energy chip and any surface
 * that shows the balance + time to the next refill.
 *
 * Returns { paid, energy, cap, nextRefillSeconds, refillHours }.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const state = await getEnergy(authResult.user.id)
  return NextResponse.json(state)
}
