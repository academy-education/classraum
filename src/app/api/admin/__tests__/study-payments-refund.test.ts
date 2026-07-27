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
 *   - stamp fails  → the row is NOT marked refunded, so the guard cannot be
 *                    relied on; the operator must be told not to retry.
 *   - already      → 409 before PortOne is ever called.
 */
import { POST } from '@/app/api/admin/study/payments/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { cancelPayment } from '@/lib/portone-charge'
import { logAdminActivity } from '@/lib/admin-auth'
import { raiseAlert } from '@/lib/ops/alert'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'

// dbAdmin and supabaseAdmin are the same client in production — the
// second is only an untyped alias — so the mock exposes one shared
// object under both names.
jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } }
  return { dbAdmin: client, supabaseAdmin: client }
})
jest.mock('@/lib/admin-auth', () => ({
  requireAdminAuth: jest.fn(async () => ({ success: true, user: { id: 'admin-1' } })),
  logAdminActivity: jest.fn(async () => {}),
}))
jest.mock('@/lib/portone-charge', () => ({ cancelPayment: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const cancelPaymentMock = cancelPayment as jest.Mock
const raiseAlertMock = raiseAlert as jest.Mock
const logAdminActivityMock = logAdminActivity as jest.Mock

const PAID_ROW = {
  payment_id: 'study-sub-1',
  student_id: 'stu-1',
  amount_won: 9900,
  kind: 'study_subscription',
  refunded_at: null,
}

const BODY = { paymentId: 'study-sub-1', reason: 'duplicate charge' }

describe('POST /api/admin/study/payments (refund)', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
    cancelPaymentMock.mockResolvedValue({ ok: true, status: 'CANCELLED', cancelledAmount: 9900 })
  })
  afterEach(() => { (console.error as jest.Mock).mockRestore() })

  it('stamps the refund and returns ok when the write succeeds', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    const stamp = enqueue('study_payments', { data: null, error: null })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, status: 'CANCELLED', cancelledAmount: 9900 })
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

  it('does not stamp anything when PortOne refuses the cancellation', async () => {
    enqueue('study_payments', { data: PAID_ROW })
    const stamp = enqueue('study_payments', { data: null, error: null })
    cancelPaymentMock.mockResolvedValue({ ok: false, message: 'already cancelled at PG' })

    const res = await POST(makeRequest(BODY))
    expect(res.status).toBe(502)
    expect(stamp.update).not.toHaveBeenCalled()
    expect(raiseAlertMock).not.toHaveBeenCalled()
  })
})
