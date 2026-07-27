/** @jest-environment node */
/**
 * Regression tests for the study-billing cron's UNVERIFIED WRITES.
 *
 * supabase-js `.update()/.insert()` resolve with `{ error }` — they never
 * throw. The cron used to increment its success counters straight after
 * those calls, so a failed write was reported as a clean run. The worst
 * case: the renewal charge lands at PortOne, the subscription update
 * fails, and `summary.charged++` runs anyway — the student paid for a
 * month whose period was never extended and whose credits never
 * refreshed, and nothing anywhere says so.
 */
import { GET } from '@/app/api/cron/study-billing/route'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { chargeBillingKey } from '@/lib/portone-charge'
import { raiseAlert } from '@/lib/ops/alert'
import { recordSubscriptionPayment } from '@/lib/study/record-subscription-payment'
import { NextRequest } from 'next/server'
import { tableRouter } from '@/tests/study-route-helpers'

// dbAdmin and dbAdmin are the same client in production — the
// second is only an untyped alias — so the mock exposes one shared
// object under both names. Routes keep passing as they migrate.
jest.mock('@/lib/supabase-admin', () => {
  const client = { from: jest.fn() }
  return { dbAdmin: client }
})
jest.mock('@/lib/cron-auth', () => ({ verifyCronAuth: jest.fn(() => true) }))
jest.mock('@/lib/portone-charge', () => ({ chargeBillingKey: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/record-subscription-payment', () => ({
  recordSubscriptionPayment: jest.fn(async () => {}),
}))
jest.mock('@/lib/study/notify', () => ({ notifyStudent: jest.fn(async () => {}) }))

const fromMock = dbAdmin.from as unknown as jest.Mock
const chargeMock = chargeBillingKey as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock
const recordPaymentMock = recordSubscriptionPayment as unknown as jest.Mock

describe('study-billing cron — writes are verified before counting success', () => {
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(verifyCronAuth as unknown as jest.Mock).mockReturnValue(true)
    enqueue = tableRouter(fromMock)
  })

  const req = () => new NextRequest('http://localhost/api/cron/study-billing', {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
  })

  const dueRow = {
    id: 'sub-1',
    student_id: 'stu-1',
    status: 'active',
    plan: 'general_monthly_v1',
    pending_plan: null,
    current_period_end: '2020-01-01T00:00:00.000Z',
    cancel_at_period_end: false,
    portone_subscription_id: 'billing-key-1',
    last_payment_attempt_at: null,
  }

  it('does NOT count a charge whose subscription update failed, and raises a critical alert', async () => {
    // Queue order follows the actual from('study_subscriptions') call
    // order: §1 select, §2 select, the renewal's update, then §3 and §4.
    enqueue('study_subscriptions', { data: [] })          // §1 cancellations
    enqueue('study_subscriptions', { data: [dueRow] })    // §2 renewals due
    // The renewal's advance write fails.
    enqueue('study_subscriptions', { error: { message: 'deadlock detected' } })
    enqueue('study_subscriptions', { data: [] })          // §3 past-due retries
    enqueue('study_subscriptions', { data: [] })          // §4 grant sweep

    chargeMock.mockResolvedValue({ ok: true })

    const res = await GET(req())
    const body = await res.json()

    // Money left the card, but this is not a clean charge.
    expect(chargeMock).toHaveBeenCalledTimes(1)
    expect(body.summary.charged).toBe(0)
    expect(body.summary.failed).toBe(1)
    expect(body.summary.errors.length).toBeGreaterThan(0)
    // The run itself is not reported as healthy.
    expect(body.ok).toBe(false)

    // A human is paged: money taken, entitlement not delivered.
    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical',
        dedupeKey: 'study-renewal-advance-failed:sub-1',
      }),
    )

    // The charge is still recorded so it stays visible/refundable in admin.
    expect(recordPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: 'stu-1' }),
    )
  })

  it('counts a charge normally when every write lands', async () => {
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [dueRow] })
    enqueue('study_subscriptions', { error: null })      // advance ok
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_credit_ledger', { error: null })      // ledger ok

    chargeMock.mockResolvedValue({ ok: true })

    const res = await GET(req())
    const body = await res.json()

    expect(body.summary.charged).toBe(1)
    expect(body.summary.failed).toBe(0)
    expect(body.ok).toBe(true)
    expect(alertMock).not.toHaveBeenCalled()
  })

  it('does not send a dunning notice when the past_due write failed', async () => {
    const { notifyStudent } = jest.requireMock('@/lib/study/notify')
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [dueRow] })
    enqueue('study_subscriptions', { error: { message: 'connection reset' } }) // past_due write
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })

    chargeMock.mockResolvedValue({ ok: false, code: 'CARD_DECLINED', message: 'declined' })

    const res = await GET(req())
    const body = await res.json()

    expect(body.summary.failed).toBe(1)
    expect(body.ok).toBe(false)
    expect(notifyStudent).not.toHaveBeenCalled()
    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'study-past-due-failed:sub-1' }),
    )
  })

  it('does not count a monthly grant whose refresh write failed', async () => {
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', { data: [] })
    enqueue('study_subscriptions', {
      data: [{
        id: 'sub-annual',
        student_id: 'stu-2',
        plan: 'general_annual_v1',
        next_grant_at: '2020-01-01T00:00:00.000Z',
      }],
    })
    enqueue('study_subscriptions', { error: { message: 'timeout' } }) // grant refresh

    const res = await GET(req())
    const body = await res.json()

    expect(body.summary.granted).toBe(0)
    expect(body.ok).toBe(false)
    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'study-grant-refresh-failed:sub-annual' }),
    )
  })
})
