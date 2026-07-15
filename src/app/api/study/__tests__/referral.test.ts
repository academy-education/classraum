/** @jest-environment node */
/**
 * Tests for the referral loop.
 *   GET  /api/study/referral         — returns / lazily mints a code + stats
 *   POST /api/study/referral/redeem  — grants both sides once, race-safe
 *
 * The redeem endpoint moves credits, so the important invariants are:
 *   - a referee can only ever be rewarded once (already_redeemed / 409),
 *   - self-referral and unknown codes are rejected before any reward,
 *   - a unique-violation on insert (race) is treated as already_redeemed,
 *   - a side with no subscription row is a no-op (no phantom ledger row).
 */
import { GET } from '@/app/api/study/referral/route'
import { POST } from '@/app/api/study/referral/redeem/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { REFERRAL_REWARD_CREDITS } from '@/lib/study/referral'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'
import { NextRequest } from 'next/server'

/** GET NextRequest — makeRequest always attaches a body, which GET rejects. */
function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/study/referral', {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })
}

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const rpcMock = supabaseAdmin.rpc as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock

const UNIQUE_VIOLATION = { code: '23505', message: 'duplicate key' }

describe('referral loop', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    requireStudyUserMock.mockResolvedValue({ user: { id: 'student-1' } })
    enforceRateLimitMock.mockReturnValue(null)
    rpcMock.mockResolvedValue({ data: null, error: null })
    enqueue = tableRouter(fromMock)
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  describe('GET /api/study/referral', () => {
    it('returns an existing code with referral stats', async () => {
      enqueue('study_referral_codes', { data: { code: 'ABC234' } })
      enqueue('study_referral_redemptions', {
        data: [{ rewarded: true }, { rewarded: true }, { rewarded: false }],
      })

      const res = await GET(makeGetRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.code).toBe('ABC234')
      expect(body.rewardPerReferral).toBe(REFERRAL_REWARD_CREDITS)
      // 3 referrals, 2 rewarded → 2 × 5 credits earned.
      expect(body.stats).toEqual({ referrals: 3, creditsEarned: 2 * REFERRAL_REWARD_CREDITS })
    })

    it('mints and inserts a code on first call, then returns it', async () => {
      enqueue('study_referral_codes', { data: null })          // no existing code
      const insertChain = enqueue('study_referral_codes', { data: { code: 'FRESH7' } }) // insert.select.single
      enqueue('study_referral_redemptions', { data: [] })

      const res = await GET(makeGetRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.code).toBe('FRESH7')
      expect(body.stats).toEqual({ referrals: 0, creditsEarned: 0 })
      // Inserted a row keyed to the caller.
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ student_id: 'student-1', code: expect.any(String) }),
      )
    })

    it('retries with a fresh code on a code collision (unique violation)', async () => {
      enqueue('study_referral_codes', { data: null })                    // no existing
      enqueue('study_referral_codes', { error: UNIQUE_VIOLATION })       // 1st insert collides
      enqueue('study_referral_codes', { data: null })                    // re-read after collision: still none
      enqueue('study_referral_codes', { data: { code: 'SECOND' } })      // 2nd insert wins
      enqueue('study_referral_redemptions', { data: [] })

      const res = await GET(makeGetRequest())
      expect(res.status).toBe(200)
      expect((await res.json()).code).toBe('SECOND')
    })

    it('401s when unauthenticated', async () => {
      const { NextResponse } = await import('next/server')
      requireStudyUserMock.mockResolvedValue({ response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) })
      const res = await GET(makeGetRequest())
      expect(res.status).toBe(401)
      expect(fromMock).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/study/referral/redeem', () => {
    it('grants both sides +5 and marks the redemption rewarded', async () => {
      enqueue('study_referral_redemptions', { data: null })                 // not yet referred
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } }) // code owner
      enqueue('study_referral_redemptions', { data: { id: 'redemption-1' } }) // insert
      enqueue('study_subscriptions', { data: { student_id: 'student-1' } })   // referee has a row
      enqueue('study_credit_ledger', { error: null })                        // referee ledger
      enqueue('study_subscriptions', { data: { student_id: 'referrer-1' } })  // referrer has a row
      enqueue('study_credit_ledger', { error: null })                        // referrer ledger
      const updateChain = enqueue('study_referral_redemptions', { error: null }) // mark rewarded

      const res = await POST(makeRequest({ code: 'abc234' }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body).toEqual({ success: true, creditsAdded: REFERRAL_REWARD_CREDITS })

      // Both sides incremented by the reward amount.
      expect(rpcMock).toHaveBeenCalledTimes(2)
      expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
        p_student_id: 'student-1', p_delta: REFERRAL_REWARD_CREDITS,
      })
      expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
        p_student_id: 'referrer-1', p_delta: REFERRAL_REWARD_CREDITS,
      })
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ rewarded: true }))
    })

    it('rejects a second redeem by the same referee with 409', async () => {
      enqueue('study_referral_redemptions', { data: { id: 'existing' } }) // already referred
      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(409)
      expect((await res.json()).code).toBe('already_redeemed')
      expect(rpcMock).not.toHaveBeenCalled()
    })

    it('rejects self-referral with 400', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: { student_id: 'student-1' } }) // owner is the caller
      const res = await POST(makeRequest({ code: 'MYCODE' }))
      expect(res.status).toBe(400)
      expect((await res.json()).code).toBe('self_referral')
      expect(rpcMock).not.toHaveBeenCalled()
    })

    it('returns 404 for an unknown code', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: null }) // no such code
      const res = await POST(makeRequest({ code: 'NOPE99' }))
      expect(res.status).toBe(404)
      expect((await res.json()).code).toBe('unknown_code')
      expect(rpcMock).not.toHaveBeenCalled()
    })

    it('treats an insert unique-violation (race) as already_redeemed', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } })
      enqueue('study_referral_redemptions', { error: UNIQUE_VIOLATION }) // concurrent insert won
      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(409)
      expect((await res.json()).code).toBe('already_redeemed')
      expect(rpcMock).not.toHaveBeenCalled()
    })

    it('no-ops the referee reward when they have no subscription row yet', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } })
      enqueue('study_referral_redemptions', { data: { id: 'redemption-1' } })
      enqueue('study_subscriptions', { data: null })                        // referee: no row
      enqueue('study_subscriptions', { data: { student_id: 'referrer-1' } }) // referrer: has a row
      enqueue('study_credit_ledger', { error: null })
      enqueue('study_referral_redemptions', { error: null })

      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(200)
      expect((await res.json())).toEqual({ success: true, creditsAdded: 0 })
      // Only the referrer got a credit increment.
      expect(rpcMock).toHaveBeenCalledTimes(1)
      expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
        p_student_id: 'referrer-1', p_delta: REFERRAL_REWARD_CREDITS,
      })
    })

    it('rejects a missing code with 400', async () => {
      const res = await POST(makeRequest({}))
      expect(res.status).toBe(400)
      expect((await res.json()).code).toBe('missing_code')
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('passes the rate-limit response through untouched', async () => {
      const { NextResponse } = await import('next/server')
      enforceRateLimitMock.mockReturnValue(NextResponse.json({ error: 'rate limited' }, { status: 429 }))
      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(429)
      expect(fromMock).not.toHaveBeenCalled()
    })
  })
})
