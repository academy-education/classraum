/** @jest-environment node */
/**
 * Regression tests for POST /api/study/subscription/purchase-pack —
 * real-money endpoint: credit adds must go through the atomic RPC,
 * gating (active + premium + billing key) must hold, and the rate
 * limiter response must pass through untouched.
 */
import { NextResponse } from 'next/server'
import { POST } from '@/app/api/study/subscription/purchase-pack/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { CREDIT_PACK } from '@/lib/study/plans'
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

const PREMIUM_SUB = {
  status: 'active',
  plan: 'premium_v1',
  portone_subscription_id: 'billing-key-1',
  purchased_credits_remaining: 0,
}

describe('POST /api/study/subscription/purchase-pack', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    chargeMock.mockResolvedValue({ ok: true })
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  it('adds credits via the increment_study_purchased_credits RPC (no read-modify-write update)', async () => {
    // Two subscription reads now: the route (gating/stored-key) and the
    // shared grant helper (which re-fetches to persist a card). Both see
    // the existing premium row.
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    const subChainHelper = enqueue('study_subscriptions', { data: PREMIUM_SUB })
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, creditsAdded: CREDIT_PACK.credits })
    expect(body.paymentId).toMatch(/^study-pack-student-1-/)

    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
      p_student_id: 'student-1',
      p_delta: CREDIT_PACK.credits,
    })
    // No .update() on the subscription row (card already stored) — the
    // RPC is the only credit writer.
    expect(subChainHelper.update).not.toHaveBeenCalled()
    // Idempotency row is written before granting.
    expect(fromMock.mock.calls.map(c => c[0])).toContain('study_payments')
  })

  it('returns the rate-limit response as-is (and never reaches the charge)', async () => {
    // The limiter guards the billing-key charge branch, so the buyer
    // needs a stored card to reach it. It must short-circuit before the
    // card is charged.
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    const limited = NextResponse.json({ error: 'rate limited' }, { status: 429 })
    enforceRateLimitMock.mockReturnValue(limited)

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate limited' })
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('lets a lapsed (cancelled) member with a stored card still top up', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, status: 'cancelled' } })
    enqueue('study_credit_ledger', { error: null })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(chargeMock).toHaveBeenCalled()
  })

  it('lets a card-less free user buy by passing a freshly issued billingKey', async () => {
    // Route read (gating): free, no card.
    enqueue('study_subscriptions', { data: { status: 'free', plan: 'free_v1', portone_subscription_id: null } })
    // Helper read: row exists but still cardless → takes the update branch.
    enqueue('study_subscriptions', { data: { portone_subscription_id: null } })
    const update = enqueue('study_subscriptions', { error: null }) // store the new card
    enqueue('study_credit_ledger', { error: null })
    const res = await POST(makeRequest({ billingKey: 'fresh-key' }))
    expect(res.status).toBe(200)
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ billingKey: 'fresh-key' }))
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ portone_subscription_id: 'fresh-key' }))
    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', expect.any(Object))
  })

  it('allows a General (non-premium) subscriber to buy a pack', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, plan: 'general_v1' } })
    enqueue('study_credit_ledger', { error: null })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, creditsAdded: CREDIT_PACK.credits })
    expect(chargeMock).toHaveBeenCalled()
  })

  it('allows a trial subscriber (with a billing key) to buy a pack', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, status: 'trial' } })
    enqueue('study_credit_ledger', { error: null })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(200)
    expect(chargeMock).toHaveBeenCalled()
  })

  it('charges the requested pack size when a packId is passed', async () => {
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    enqueue('study_credit_ledger', { error: null })
    const res = await POST(makeRequest({ packId: 'pack10_v1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, creditsAdded: 10 })
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 13900 }))
  })

  it('denies with 402 when no billing key is on file', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, portone_subscription_id: null } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: 'no payment method on file', code: 'no_billing_key' })
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('returns 402 and never touches credits when the charge fails', async () => {
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    chargeMock.mockResolvedValue({ ok: false, code: 'CARD_DECLINED', message: 'declined' })

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({
      error: 'charge failed', code: 'CARD_DECLINED', message: 'declined',
    })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 500 with the paymentId when the charge succeeds but the credit write fails', async () => {
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc broke' } })

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('credit write failed; support will reconcile')
    expect(body.paymentId).toMatch(/^study-pack-student-1-/)
  })
})
