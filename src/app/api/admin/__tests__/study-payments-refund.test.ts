/** @jest-environment node */
/**
 * Regression tests for POST /api/admin/study/payments (operator refund).
 *
 * The "already refunded" 409 guard is backed by exactly one thing: the
 * `refunded_at` stamp written after PortOne confirms the cancellation.
 * supabase-js `.update()` resolves with { error } and never throws, so an
 * unchecked stamp meant a failed write left the payment looking refundable
 * — and a second press of Refund sent real money back twice.
 *
 * The contract these tests pin down:
 *   - stamp fails  → non-2xx, refundIssued:true, critical alert, and wording
 *                    that never claims the refund failed (it didn't).
 *   - already      → 409 before PortOne is ever called.
 *   - reservation  → the atomic admin_insert_study_refund RPC runs BEFORE
 *                    PortOne, and is compensated (deleted) if PortOne fails.
 *   - revocations  → revokeAccess refused on partial refunds; revokeCredits
 *                    refused when attribution is ambiguous; on success the
 *                    clawback writes a compensating ledger row (kind
 *                    'refund') and access ops mirror the Stellar closure
 *                    (expire sub, delete entitlement).
 */
import { POST } from '@/app/api/admin/study/payments/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { cancelPayment } from '@/lib/portone-charge'
import { logAdminActivity } from '@/lib/admin-auth'
import { raiseAlert } from '@/lib/ops/alert'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } }
  return { dbAdmin: client }
})
jest.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: jest.fn(async () => ({ success: true, user: { id: 'admin-1' } })),
  logAdminActivity: jest.fn(async () => {}),
}))
jest.mock('@/lib/portone-charge', () => ({ cancelPayment: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const rpcMock = dbAdmin.rpc as unknown as jest.Mock
const cancelPaymentMock = cancelPayment as jest.Mock
const raiseAlertMock = raiseAlert as jest.Mock
const logAdminActivityMock = logAdminActivity as jest.Mock

// ₩18,900 = premium_v1 → 20 monthly credits (grant bucket), so the credit
// attribution used by the revocation tests resolves unambiguously.
const PAID_ROW = {
  payment_id: 'study-sub-1',
  student_id: 'stu-1',
  amount_won: 18900,
  kind: 'study_subscription',
  refunded_at: null,
}

const BODY = { paymentId: 'study-sub-1', reason: 'duplicate charge' }

/** Mock the atomic reservation RPC (and default every other rpc to ok). */
function mockReservation(remainingAfter: number) {
  rpcMock.mockImplementation(async (fn: string) =>
    fn === 'admin_insert_study_refund'
      ? { data: [{ refund_id: 'res-1', remaining_after: remainingAfter }], error: null }
      : { data: null, error: null },
  )
}

describe('POST /api/admin/study/payments (refund)', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
    mockReservation(0)
    cancelPaymentMock.mockResolvedValue({ ok: true, status: 'CANCELLED', cancelledAmount: 18900 })
  })
  afterEach(() => { (console.error as jest.Mock).mockRestore() })

  it('stamps the refund and returns ok when the write succeeds', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    const stamp = enqueue('study_payments', { data: null, error: null })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      status: 'CANCELLED',
      cancelledAmount: 18900,
      remainingWon: 0,
      fullyRefunded: true,
      creditsRevoked: null,
      accessRevoked: false,
    })
    expect(rpcMock).toHaveBeenCalledWith('admin_insert_study_refund', expect.objectContaining({
      p_payment_id: 'study-sub-1', p_amount: 18900, p_created_by: 'admin-1',
    }))
    expect(stamp.update).toHaveBeenCalledWith(
      expect.objectContaining({ refund_reason: 'duplicate charge' }),
    )
    expect(raiseAlertMock).not.toHaveBeenCalled()
  })

  it('does NOT report success when the refund stamp fails — money already moved', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    enqueue('study_payments', { data: null, error: { message: 'connection reset' } })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.ok).toBeUndefined()
    // The operator must learn the refund DID happen, so they don't retry it.
    expect(body.refundIssued).toBe(true)
    expect(body.recorded).toBe(false)
    expect(body.error).toMatch(/WAS issued/i)
    expect(body.error).toMatch(/not refund this payment again/i)
    expect(body.error).not.toMatch(/refund failed/i)
  })

  it('raises a critical, payment-scoped alert when the stamp fails', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    enqueue('study_payments', { data: null, error: { message: 'connection reset' } })

    await POST(makeRequest(BODY))
    expect(raiseAlertMock).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'critical',
      dedupeKey: 'study-refund-unrecorded:study-sub-1',
      context: expect.objectContaining({ paymentId: 'study-sub-1', adminUserId: 'admin-1' }),
    }))
    // The refund still happened, so the admin activity log must record it.
    expect(logAdminActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      description: expect.stringMatching(/stamp FAILED/),
    }))
  })

  it('refuses a second refund of an already-stamped payment without calling PortOne', async () => {
    enqueue('study_payments', { data: { ...PAID_ROW, refunded_at: '2026-07-01T00:00:00Z' } })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'already refunded' })
    expect(cancelPaymentMock).not.toHaveBeenCalled()
  })

  it('compensates the reservation and stamps nothing when PortOne refuses', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    const undo = enqueue('study_payment_refunds', { data: null, error: null }) // prior refunds read
    const undo2 = enqueue('study_payment_refunds', { data: null, error: null }) // reservation delete
    const stamp = enqueue('study_payments', { data: null, error: null })
    cancelPaymentMock.mockResolvedValue({ ok: false, message: 'already cancelled at PG' })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(502)
    // The reserved ledger row is deleted so future refunds are not blocked.
    expect(undo.delete.mock.calls.length + undo2.delete.mock.calls.length).toBe(1)
    expect(stamp.update).not.toHaveBeenCalled()
    expect(raiseAlertMock).not.toHaveBeenCalled()
  })

  describe('revocations', () => {
    it('refuses revokeAccess on a partial refund (409, nothing charged back)', async () => {
      enqueue('study_payments', { data: PAID_ROW })
      const res = await POST(makeRequest({ ...BODY, amountWon: 5000, revokeAccess: true }))
      expect(res.status).toBe(409)
      expect((await res.json()).error).toBe('revoke_access_requires_full_refund')
      expect(cancelPaymentMock).not.toHaveBeenCalled()
      expect(rpcMock).not.toHaveBeenCalledWith('admin_insert_study_refund', expect.anything())
    })

    it('refuses revokeCredits when the payment cannot be attributed (409)', async () => {
      // ₩1,234 matches no catalog entry → attribution is ambiguous → refuse.
      enqueue('study_payments', { data: { ...PAID_ROW, amount_won: 1234 } })
      const res = await POST(makeRequest({ ...BODY, revokeCredits: true }))
      expect(res.status).toBe(409)
      expect((await res.json()).error).toBe('revoke_credits_unattributable')
      expect(cancelPaymentMock).not.toHaveBeenCalled()
    })

    it('plan payment: claws back grant credits (ledger row) and expires the sub', async () => {
      enqueue('study_payments', { data: PAID_ROW })
      // revocation context: sub holds 15 unused grant credits
      enqueue('study_subscriptions', {
        data: { plan: 'premium_v1', status: 'active', grant_credits_remaining: 15, purchased_credits_remaining: 0 },
      })
      const claw = enqueue('study_subscriptions', { data: null, error: null }) // grant bucket zeroing
      const ledger = enqueue('study_credit_ledger', { data: null, error: null })
      const expire = enqueue('study_subscriptions', { data: null, error: null }) // access revocation
      enqueue('study_payments', { data: null, error: null }) // stamp

      const res = await POST(makeRequest({ ...BODY, revokeCredits: true, revokeAccess: true }))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.creditsRevoked).toBe(15)
      expect(body.accessRevoked).toBe(true)

      expect(claw.update).toHaveBeenCalledWith(expect.objectContaining({ grant_credits_remaining: 0 }))
      // Compensating ledger row — the Stellar clawback shape.
      expect(ledger.insert).toHaveBeenCalledWith(expect.objectContaining({
        student_id: 'stu-1',
        delta: -15,
        bucket: 'grant',
        kind: 'refund',
        note: expect.stringMatching(/refund clawback — study_subscription \(study-sub-1\) refunded, credits revoked/),
      }))
      expect(expire.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'expired', cancel_at_period_end: true, next_grant_at: null,
      }))
      expect(raiseAlertMock).not.toHaveBeenCalled()
    })

    it('pass payment: zeroes pass credits, expires the pass sub, deletes the entitlement', async () => {
      enqueue('study_payments', {
        data: { payment_id: 'pas-1', student_id: 'stu-1', amount_won: 29000, kind: 'study_exam_pass', refunded_at: null },
      })
      enqueue('study_subscriptions', {
        data: { plan: 'sat_pass_v1', status: 'active', grant_credits_remaining: 0, purchased_credits_remaining: 0 },
      })
      enqueue('study_pass_credits', { data: [{ test: 'sat', remaining: 12 }] })
      const ledger = enqueue('study_credit_ledger', { data: null, error: null })
      const expire = enqueue('study_subscriptions', { data: null, error: null })
      const ent = enqueue('study_entitlements', { data: null, error: null })
      enqueue('study_payments', { data: null, error: null }) // stamp
      cancelPaymentMock.mockResolvedValue({ ok: true, status: 'CANCELLED', cancelledAmount: 29000 })

      const res = await POST(makeRequest({
        paymentId: 'pas-1', reason: 'requested', revokeCredits: true, revokeAccess: true,
      }))
      expect(res.status).toBe(200)
      const body = await res.json()
      // 12 remaining, 20 granted → claw back the 12 that are left.
      expect(body.creditsRevoked).toBe(12)
      expect(body.accessRevoked).toBe(true)

      expect(rpcMock).toHaveBeenCalledWith('increment_study_pass_credits', {
        p_student: 'stu-1', p_test: 'sat', p_delta: -12,
      })
      // Note format matches the manual Stellar clawback row.
      expect(ledger.insert).toHaveBeenCalledWith(expect.objectContaining({
        delta: -12,
        bucket: 'pass:sat',
        kind: 'refund',
        note: 'pass refund clawback — sat_pass_v1 (pas-1) refunded, credits revoked',
      }))
      expect(expire.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'expired' }))
      expect(ent.delete).toHaveBeenCalled()
      expect(ent.eq).toHaveBeenCalledWith('test', 'sat')
      expect(ent.eq).toHaveBeenCalledWith('source', 'pass')
    })

    it('a plain refund without revocation flags touches no credit or access state', async () => {
      enqueue('study_payments', { data: PAID_ROW })
      enqueue('study_payments', { data: null, error: null }) // stamp
      const res = await POST(makeRequest(BODY))
      expect(res.status).toBe(200)
      expect(rpcMock).not.toHaveBeenCalledWith('increment_study_purchased_credits', expect.anything())
      expect(rpcMock).not.toHaveBeenCalledWith('increment_study_pass_credits', expect.anything())
      const tables = fromMock.mock.calls.map((c) => c[0])
      expect(tables).not.toContain('study_credit_ledger')
      expect(tables).not.toContain('study_entitlements')
    })
  })
})
