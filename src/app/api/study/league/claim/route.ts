import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { claimRewards, listUnclaimedRewards } from '@/lib/study/league-rewards'

/**
 * Collect league rewards.
 *
 *   GET   → what is waiting
 *   POST  → collect all of it, and move the credits
 *
 * ── This endpoint MINTS CREDITS, so read claimRewards before editing ──
 * The whole anti-double-collect guarantee is one conditional UPDATE in
 * that function — the rows it RETURNS decide what gets paid. Nothing
 * here may re-introduce a "check, then pay" shape by, say, calling
 * listUnclaimedRewards first and handing the total down to be granted.
 * GET is for rendering only; POST asks the database what it actually
 * managed to claim and pays exactly that.
 *
 * The student id comes from requireStudyUser, never from the body. An
 * endpoint that accepts a student id is one that pays out anybody's
 * rewards to whoever asks for them.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const rewards = await listUnclaimedRewards(user.id)
  return NextResponse.json({
    rewards,
    totalCredits: rewards.reduce((n, r) => n + r.credits, 0),
  })
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  // A courtesy, NOT the safety mechanism — the conditional UPDATE is.
  // Someone hammering Collect gets 429s; someone who slips two requests
  // past the limiter still cannot be paid twice.
  const blocked = enforceRateLimit(`league-claim:user:${user.id}`, { windowMs: 60 * 1000, max: 20 })
  if (blocked) return blocked

  try {
    const { claimed, credits } = await claimRewards(user.id)
    // claimed === 0 is an ordinary outcome, not a failure: nothing was
    // waiting, or this is the second tap and the first one won. Calling
    // it an error would tell the student something false about their
    // balance.
    return NextResponse.json({ claimed, credits })
  } catch {
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }
}
