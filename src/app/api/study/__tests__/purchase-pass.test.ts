/** @jest-environment node */
/**
 * Regression tests for POST /api/study/subscription/purchase-pass — the
 * one-time 수능 대비 패스. Real-money endpoint: it must charge once, grant
 * the pass credits via the atomic RPC, and refuse to clobber a live
 * recurring subscription or an already-active pass.
 *
 * NOTE: the season guard keys off SUNUNG_EXAM_DATE vs the real clock.
 * These tests assume they run before that exam date (they exercise the
 * in-season path); after it, the route returns 409 pass_unavailable.
 */
import { POST } from '@/app/api/study/subscription/purchase-pass/route'
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

const withKey = (body: object = {}) => makeRequest({ billingKey: 'bk-1', ...body })

describe('POST /api/study/subscription/purchase-pass', () => {
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

  afterEach(() => { ;(console.error as jest.Mock).mockRestore() })

  it('charges ₩39,000 once and grants 30 credits for a free user', async () => {
    enqueue('study_subscriptions', { data: { status: 'free', plan: 'free_v1' } }) // sub lookup
    enqueue('study_subscriptions', { error: null }) // upsert
    enqueue('study_credit_ledger', { error: null })

    const res = await POST(withKey())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, creditsAdded: 30 })
    expect(chargeMock).toHaveBeenCalledWith(expect.objectContaining({ amount: 39000 }))
    expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
      p_student_id: 'student-1', p_delta: 30,
    })
  })

  it('refuses to clobber an active recurring subscription', async () => {
    enqueue('study_subscriptions', { data: { status: 'active', plan: 'premium_v1' } })
    const res = await POST(withKey())
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('already_subscribed')
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('refuses when a pass is already active', async () => {
    enqueue('study_subscriptions', { data: { status: 'active', plan: 'sunung_pass_v1' } })
    const res = await POST(withKey())
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('pass_active')
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('returns 400 when billingKey is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    expect(chargeMock).not.toHaveBeenCalled()
  })

  it('returns 402 and never grants credits when the charge fails', async () => {
    enqueue('study_subscriptions', { data: { status: 'free', plan: 'free_v1' } })
    chargeMock.mockResolvedValue({ ok: false, code: 'CARD_DECLINED', message: 'declined' })
    const res = await POST(withKey())
    expect(res.status).toBe(402)
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
