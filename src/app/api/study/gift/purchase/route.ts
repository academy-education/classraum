import { NextResponse } from 'next/server'

/**
 * POST /api/study/gift/purchase — DISABLED 2026-08-17.
 *
 * Andy: "We do not need gift subscriptions at the moment. Get rid of it
 * for now." Following the sunung_pass_v1 precedent (plans.ts): measured
 * BEFORE removing —
 *   study_gift_codes: 0 rows ever (0 unredeemed, 0 redeemed)
 *   study_credit_ledger: 0 gift-sourced rows
 *   → no purchaser or recipient loses anything.
 *
 * The gift SKU never sold a single code, so the whole surface is gone:
 * this route and /api/study/gift/redeem return 410, the purchase/redeem
 * page (/mobile/study/gift) was deleted, and the BillingReturn gift
 * branch went with it. The study_gift_codes table and the SKU catalog
 * (src/lib/study/gifts.ts) are KEPT so the feature can be restored by
 * reverting these edits.
 */

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    { error: 'Gift purchases are no longer available.', code: 'gift_discontinued' },
    { status: 410 },
  )
}
