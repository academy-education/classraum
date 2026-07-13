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
    const subChain = enqueue('study_subscriptions', { data: PREMIUM_SUB })
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
    // No .update() on the subscription row — the RPC is the only writer
    expect(subChain.update).not.toHaveBeenCalled()
    expect(fromMock.mock.calls.map(c => c[0])).toEqual(['study_subscriptions', 'study_credit_ledger'])
  })

  it('returns the rate-limit response as-is', async () => {
    const limited = NextResponse.json({ error: 'rate limited' }, { status: 429 })
    enforceRateLimitMock.mockReturnValue(limited)

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate limited' })
    expect(fromMock).not.toHaveBeenCalled()
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('denies with 403 when there is no active subscription', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, status: 'cancelled' } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'active subscription required' })
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('denies with 403 premium_required for non-premium plans', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, plan: 'general_v1' } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'premium required', code: 'premium_required' })
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('denies with 402 when no billing key is on file', async () => {
    enqueue('study_subscriptions', { data: { ...PREMIUM_SUB, portone_subscription_id: null } })
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: 'no payment method on file' })
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
    expect(body.error).toBe('charge ok but credit write failed; support will reconcile')
    expect(body.paymentId).toMatch(/^study-pack-student-1-/)
  })
})
