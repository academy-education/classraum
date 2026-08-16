/** @jest-environment node */
/**
 * The gift SKU was REMOVED 2026-08-17 (zero codes ever sold or redeemed
 * — measured before removal, see the purchase route). Both routes must
 * now refuse loudly with 410 and, critically, must never charge a card
 * or touch the database: a stale client (open tab, cached bundle, native
 * WebView) can still POST here with a real billingKey.
 */
import { POST as PURCHASE } from '@/app/api/study/gift/purchase/route'
import { POST as REDEEM } from '@/app/api/study/gift/redeem/route'

describe('gift routes after removal', () => {
  it('purchase returns 410 with a clear code and never charges', async () => {
    const res = await PURCHASE()
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.code).toBe('gift_discontinued')
    expect(body.error).toMatch(/no longer/i)
  })

  it('redeem returns 410 (zero unredeemed codes existed at removal)', async () => {
    const res = await REDEEM()
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.code).toBe('gift_discontinued')
  })
})
