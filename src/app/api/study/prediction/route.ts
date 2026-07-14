import { NextRequest, NextResponse } from 'next/server'
import { requireStudyUser } from '@/lib/study/auth'
import { computeSatPrediction } from '@/lib/study/predict'

/**
 * GET /api/study/prediction — predicted total score + per-section
 * breakdown for the student's target test (SAT-only for now). The math
 * lives in computeSatPrediction so /plan shares the same gap.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  try {
    const pred = await computeSatPrediction(user.id)
    // dailyGoalMinutes is a plan input; the card doesn't need it.
    const { dailyGoalMinutes: _omit, ...payload } = pred
    void _omit
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[study/prediction] failed', e)
    return NextResponse.json({ error: 'prediction failed' }, { status: 500 })
  }
}
