/** @jest-environment node */
/**
 * Tests for the referral loop.
 *   GET  /api/study/referral         — returns / lazily mints a code + stats
 *   POST /api/study/referral/redeem  — pays the INVITED student once, race-safe
 *
 * The redeem endpoint moves credits, so the important invariants are:
 *   - a referee can only ever be rewarded once (already_redeemed / 409),
 *   - self-referral and unknown codes are rejected before any reward,
 *   - a unique-violation on insert (race) is treated as already_redeemed,
 *   - only the invited student is paid (REFERRAL_INVITEE_CREDITS, since
 *     2026-10-01); the inviter is never provisioned, credited or ledgered,
 *   - the invitee is provisioned a study_subscriptions row before granting
 *     (the credit RPC keys on student_id and silently no-ops without one),
 *   - `rewarded: true` is written only when the grant actually landed.
 */
import { GET } from '@/app/api/study/referral/route'
import { POST } from '@/app/api/study/referral/redeem/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { REFERRAL_INVITEE_CREDITS } from '@/lib/study/referral'
import { raiseAlert } from '@/lib/ops/alert'
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
  dbAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/rate-limit', () => ({ enforceRateLimit: jest.fn(() => null) }))
jest.mock('@/lib/study/auth', () => ({ requireStudyUser: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock
const requireStudyUserMock = requireStudyUser as unknown as jest.Mock
const enforceRateLimitMock = enforceRateLimit as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock

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
        data: [
          { id: 'r1', converted: true },
          { id: 'r2', converted: false },
          { id: 'r3', converted: false },
        ],
      })
      // Credits earned are read from the ledger: what was actually paid under
      // the old two-stage scheme (1 + 5 on r1, 1 on r2), nothing since.
      const ledger = enqueue('study_credit_ledger', { data: [{ delta: 1 }, { delta: 5 }, { delta: 1 }] })

      const res = await GET(makeGetRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.code).toBe('ABC234')
      expect(body.inviteeReward).toBe(REFERRAL_INVITEE_CREDITS)
      expect(body.stats).toEqual({ referrals: 3, creditsEarned: 7, converted: 1 })
      expect(ledger.in).toHaveBeenCalledWith('source_id', ['r1', 'r2', 'r3'])
    })

    it('mints and inserts a code on first call, then returns it', async () => {
      enqueue('study_referral_codes', { data: null })          // no existing code
      const insertChain = enqueue('study_referral_codes', { data: { code: 'FRESH7' } }) // insert.select.single
      enqueue('study_referral_redemptions', { data: [] })

      const res = await GET(makeGetRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.code).toBe('FRESH7')
      expect(body.stats).toEqual({ referrals: 0, creditsEarned: 0, converted: 0 })
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
    it('pays ONLY the invited student and marks the redemption rewarded', async () => {
      enqueue('study_referral_redemptions', { data: null })                 // not yet referred
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } }) // code owner
      enqueue('study_referral_redemptions', { data: { id: 'redemption-1' } }) // insert
      enqueue('study_subscriptions', { data: { student_id: 'student-1' } })   // invitee provision check
      enqueue('study_subscriptions', { data: { student_id: 'student-1' } })   // invitee grant check
      const ledger = enqueue('study_credit_ledger', { error: null })          // invitee ledger
      const updateChain = enqueue('study_referral_redemptions', { error: null }) // mark rewarded
      // The inviter HAS a subscription row, so any attempt to pay them would
      // land: without this a stray inviter grant would silently no-op here.
      enqueue('study_subscriptions', { data: { student_id: 'referrer-1' } })
      enqueue('study_credit_ledger', { error: null })

      const res = await POST(makeRequest({ code: 'abc234' }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, creditsAdded: REFERRAL_INVITEE_CREDITS })

      // One grant, to the invitee; the inviter gets nothing.
      expect(rpcMock).toHaveBeenCalledTimes(1)
      expect(rpcMock).toHaveBeenCalledWith('increment_study_purchased_credits', {
        p_student_id: 'student-1', p_delta: REFERRAL_INVITEE_CREDITS,
      })
      expect(rpcMock).not.toHaveBeenCalledWith('increment_study_purchased_credits', expect.objectContaining({ p_student_id: 'referrer-1' }))
      expect(ledger.insert).toHaveBeenCalledWith(expect.objectContaining({ student_id: 'student-1', delta: REFERRAL_INVITEE_CREDITS }))
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({ rewarded: true }))
      expect(alertMock).not.toHaveBeenCalled()
    })

    it('does NOT mark rewarded (and alerts critical) when the grant fails', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } })
      enqueue('study_referral_redemptions', { data: { id: 'redemption-1' } })
      enqueue('study_subscriptions', { data: { student_id: 'student-1' } })   // invitee provisioned
      enqueue('study_subscriptions', { data: { student_id: 'student-1' } })   // invitee grant check
      const updateChain = enqueue('study_referral_redemptions', { error: null })
      rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc broke' } })

      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true, creditsAdded: 0 })
      // rewarded=false is what makes the failure recoverable at all.
      expect(updateChain.update).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'critical',
        dedupeKey: 'referral-grant-failed:redemption-1',
        context: expect.objectContaining({ credits: REFERRAL_INVITEE_CREDITS }),
      }))
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

    it('reports 0 credits and leaves rewarded=false when the invitee still has no subscription row', async () => {
      enqueue('study_referral_redemptions', { data: null })
      enqueue('study_referral_codes', { data: { student_id: 'referrer-1' } })
      enqueue('study_referral_redemptions', { data: { id: 'redemption-1' } })
      // ensureFreeSubscription(invitee): no row → provisioning insert fails,
      // so the credit RPC has nothing to update.
      enqueue('study_subscriptions', { data: null })                        // provision check
      enqueue('study_subscriptions', { error: { message: 'insert broke' } }) // provision insert fails
      enqueue('study_subscriptions', { data: null })                        // grant check: still none
      const updateChain = enqueue('study_referral_redemptions', { error: null })

      const res = await POST(makeRequest({ code: 'ABC234' }))
      expect(res.status).toBe(200)
      expect((await res.json())).toEqual({ success: true, creditsAdded: 0 })
      expect(rpcMock).not.toHaveBeenCalled()
      expect(updateChain.update).not.toHaveBeenCalled()
      expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'critical' }))
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
