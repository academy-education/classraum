import { NextResponse } from 'next/server'

/**
 * POST /api/study/gift/redeem — DISABLED 2026-08-17.
 *
 * Gift subscriptions were removed (see ../purchase/route.ts for the
 * decision + measurement). Redemption is only kept alive while
 * unredeemed codes exist; at removal time study_gift_codes held ZERO
 * rows — nothing to redeem, so this returns 410 too. If a code is ever
 * minted again, restore the pre-removal handler from git history.
 */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    { error: 'Gift codes are no longer redeemable.', code: 'gift_discontinued' },
    { status: 410 },
  )
}
