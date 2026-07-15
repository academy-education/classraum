/** @jest-environment node */
/**
 * Regression tests for the gift SKU:
 *   POST /api/study/gift/purchase — real-money charge that mints a code.
 *   POST /api/study/gift/redeem   — code → Premium + credits grant.
 *
 * Both are guarded, idempotent, and race-safe. The redeem path grants
 * Premium WITHOUT a card (modelled like the seasonal pass) and must
 * refuse double-redeem, self-gift, unknown codes, and clobbering a live
 * recurring subscription.
 */
import { POST as PURCHASE } from '@/app/api/study/gift/purchase/route'
import { POST as REDEEM } from '@/app/api/study/gift/redeem/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const rpcMock = supabaseAdmin.rpc as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock

describe('POST /api/study/gift/purchase', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'parent-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    chargeMock.mockResolvedValue({ ok: true })
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => { (console.error as jest.Mock).mockRestore() })

  const withKey = (body: object = {}) => makeRequest({ billingKey: 'bk-1', ...body })

  it('charges ₩45,000 once and inserts an unredeemed code', async () => {
    const insert = enqueue('study_gift_codes', { error: null })
    const res = await PURCHASE(withKey())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.code).toMatch(/^GIFT-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 45000 }))
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
      purchaser_id: 'parent-1',
      status: 'unredeemed',
      paid_amount_cents: 45000 * 100,
      months: 3,
      credits: 20,
    }))
  })

  it('returns 400 when billingKey is missing', async () => {
    const res = await PURCHASE(makeRequest({}))
    expect(res.status).toBe(400)
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('returns 402 and never writes a code when the charge fails', async () => {
    const insert = enqueue('study_gift_codes', { error: null })
    chargeMock.mockResolvedValue({ ok: false, code: 'CARD_DECLINED', message: 'declined' })
    const res = await PURCHASE(withKey())
    expect(res.status).toBe(402)
    expect(insert.insert).not.toHaveBeenCalled()
  })
})

describe('POST /api/study/gift/redeem', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })
  afterEach(() => { (console.error as jest.Mock).mockRestore() })

  const withCode = (code = 'GIFT-ABCD-EFGH') => makeRequest({ code })

  it('grants Premium + credits and marks the code redeemed', async () => {
    enqueue('study_gift_codes', { data: { id: 'g1', purchaser_id: 'parent-1', months: 3, credits: 20, status: 'unredeemed' } })
    enqueue('study_subscriptions', { data: null }) // no existing sub
    const claim = enqueue('study_gift_codes', { data: [{ id: 'g1' }] }) // atomic claim
    const upsert = enqueue('study_subscriptions', { error: null })
    enqueue('study_credit_ledger', { error: null })

    const res = await REDEEM(withCode())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, months: 3, creditsAdded: 20 })
    expect(body.current_period_end).toBeTruthy()
    // Marked redeemed for this student.
    expect(claim.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'redeemed', redeemed_by: 'student-1' }))
    // Premium row without a card, cancel_at_period_end, no monthly grant refresh.
    expect(upsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student-1',
        status: 'active',
        plan: 'premium_v1',
        cancel_at_period_end: true,
        next_grant_at: null,
        portone_subscription_id: null,
      }),
      expect.objectContaining({ onConflict: 'student_id' }),
    )
    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
      p_student_id: 'student-1', p_delta: 20,
    })
  })

  it('refuses a double-redeem when the atomic claim updates 0 rows (409)', async () => {
    enqueue('study_gift_codes', { data: { id: 'g1', purchaser_id: 'parent-1', months: 3, credits: 20, status: 'unredeemed' } })
    enqueue('study_subscriptions', { data: null })
    enqueue('study_gift_codes', { data: [] }) // lost the race
    const res = await REDEEM(withCode())
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('already_redeemed')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('refuses redeeming your own gift (403)', async () => {
    enqueue('study_gift_codes', { data: { id: 'g1', purchaser_id: 'student-1', months: 3, credits: 20, status: 'unredeemed' } })
    const res = await REDEEM(withCode())
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('self_gift')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown code', async () => {
    enqueue('study_gift_codes', { data: null })
    const res = await REDEEM(withCode())
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('not_found')
  })

  it('refuses to clobber a live recurring subscription (409)', async () => {
    enqueue('study_gift_codes', { data: { id: 'g1', purchaser_id: 'parent-1', months: 3, credits: 20, status: 'unredeemed' } })
    enqueue('study_subscriptions', { data: { status: 'active', plan: 'premium_v1' } })
    const res = await REDEEM(withCode())
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('already_subscribed')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a missing code', async () => {
    const res = await REDEEM(makeRequest({ code: '   ' }))
    expect(res.status).toBe(400)
  })
})
