/** @jest-environment node */
/**
 * Regression tests for POST /api/study/subscription/purchase-pack —
 * real-money endpoint: credit adds must go through the atomic RPC, the
 * rate limiter response must pass through untouched, and — critically —
 * a pack must NEVER be charged to the card stored for the buyer's
 * subscription. A pack is a one-off purchase, so the buyer always pays
 * through a fresh checkout (either a one-time paymentId we verify, or an
 * explicitly-supplied freshly-issued billing key).
 */
import { NextResponse } from 'next/server'
import { POST } from '@/app/api/study/subscription/purchase-pack/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { chargeBillingKey } from '@/lib/portone-charge'
import { CREDIT_PACK } from '@/lib/study/plans'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/portone-charge', () => ({
  chargeBillingKey: jest.fn(),
  verifyOneTimePayment: jest.fn(),
}))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock

/** A row that HAS a stored subscription card — must never be spent on a pack. */
const PREMIUM_SUB = {
  status: 'active',
  plan: 'premium_v1',
  portone_subscription_id: 'subscription-card-key',
  purchased_credits_remaining: 0,
}

/** A freshly issued card from the checkout window — the only key we may charge. */
const FRESH = { billingKey: 'fresh-key' }

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

  // ── The core contract ────────────────────────────────────────────────
  it('NEVER charges the subscription card: no card supplied → 402, no charge', async () => {
    // Even for an active premium subscriber whose row holds a usable
    // billing key, a bare purchase must be refused so the client opens a
    // fresh checkout window instead of silently billing the saved card.
    enqueue('study_subscriptions', { data: PREMIUM_SUB })

    const res = await POST(makeRequest({}))

    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: 'no payment method on file', code: 'no_billing_key' })
    expect(chargeMock).not.toHaveBeenCalled()
    // Strongest guarantee: the route never even reads the subscription
    // row, so it cannot reuse the stored key by construction.
    expect(fromMock.mock.calls.map(c => c[0])).not.toContain('study_subscriptions')
  })

  it('does not persist the card used for a pack (each top-up prompts again)', async () => {
    const helperSub = enqueue('study_subscriptions', { data: { portone_subscription_id: null } })
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(makeRequest({ ...FRESH }))

    expect(res.status).toBe(200)
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ billingKey: 'fresh-key' }))
    // A one-off purchase must not leave a stored card behind.
    expect(helperSub.update).not.toHaveBeenCalled()
  })

  // ── Grant mechanics ──────────────────────────────────────────────────
  it('adds credits via the increment_study_purchased_credits RPC (no read-modify-write update)', async () => {
    const helperSub = enqueue('study_subscriptions', { data: PREMIUM_SUB })
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(makeRequest({ ...FRESH }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, creditsAdded: CREDIT_PACK.credits })
    expect(body.paymentId).toMatch(/^study-pack-student-1-/)

    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
      p_student_id: 'student-1',
      p_delta: CREDIT_PACK.credits,
    })
    // The RPC is the only credit writer.
    expect(helperSub.update).not.toHaveBeenCalled()
    // Idempotency row is written before granting.
    expect(fromMock.mock.calls.map(c => c[0])).toContain('study_payments')
  })

  it('returns the rate-limit response as-is (and never reaches the charge)', async () => {
    const limited = NextResponse.json({ error: 'rate limited' }, { status: 429 })
    enforceRateLimitMock.mockReturnValue(limited)

    const res = await POST(makeRequest({ ...FRESH }))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate limited' })
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('charges the requested pack size when a packId is passed', async () => {
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(makeRequest({ packId: 'pack10_v1', ...FRESH }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, creditsAdded: 10 })
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 13900 }))
  })

  // ── Who may buy — plan/status is irrelevant, credits are status-agnostic ──
  it.each([
    ['a lapsed (cancelled) member', { ...PREMIUM_SUB, status: 'cancelled' }],
    ['a General (non-premium) subscriber', { ...PREMIUM_SUB, plan: 'general_v1' }],
    ['a card-less free user', { status: 'free', plan: 'free_v1', portone_subscription_id: null }],
  ])('lets %s top up with a freshly issued card', async (_label, sub) => {
    enqueue('study_subscriptions', { data: sub })
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(makeRequest({ ...FRESH }))
    expect(res.status).toBe(200)
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ billingKey: 'fresh-key' }))
    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', expect.any(Object))
  })

  // ── Failure paths ────────────────────────────────────────────────────
  it('returns 402 and never touches credits when the charge fails', async () => {
    chargeMock.mockResolvedValue({ ok: false, code: 'CARD_DECLINED', message: 'declined' })

    const res = await POST(makeRequest({ ...FRESH }))
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({
      error: 'charge failed', code: 'CARD_DECLINED', message: 'declined',
    })
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 500 with the paymentId when the charge succeeds but the credit write fails', async () => {
    enqueue('study_subscriptions', { data: PREMIUM_SUB })
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc broke' } })

    const res = await POST(makeRequest({ ...FRESH }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('credit write failed; support will reconcile')
    expect(body.paymentId).toMatch(/^study-pack-student-1-/)
  })
})
