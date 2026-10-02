/** @jest-environment node */
/**
 * sendChargeReceipt — exactly once, never throws (CLAUDE.md, "Every Study
 * charge gets a receipt — exactly once").
 *
 * Until 2026-10-02 nothing exercised this module: every claim, hold and
 * release below could be deleted with the whole suite still green. The DB
 * is an in-memory fake that honours filters (src/tests/fake-supabase.ts),
 * because a queue mock returns the enqueued row whatever the code filtered
 * on and so cannot see a dropped `.is(...)` guard.
 *
 * Each test was break-checked against a specific source mutation, named
 * in the test's comment.
 */
import { fakeDb, type FakeDb } from '@/tests/fake-supabase'
import { sendChargeReceipt } from '../charge-receipt'
import { sendResendEmail } from '@/lib/resend'
import { raiseAlert } from '@/lib/ops/alert'
import { notifyStudent } from '@/lib/study/notify'

let mockDb: FakeDb
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: (t: string) => mockDb.from(t) } }))
jest.mock('@/lib/portone-config', () => ({ getPortOneConfig: () => ({ apiSecret: 'sk_test' }) }))
jest.mock('@/lib/resend', () => ({ sendResendEmail: jest.fn() }))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))
jest.mock('@/lib/study/notify', () => ({
  notifyStudent: jest.fn(async () => {}),
  studentNotifLang: jest.fn(async () => 'english'),
}))

const sendMock = sendResendEmail as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock
const notifyMock = notifyStudent as unknown as jest.Mock

const PID = 'study-sub-renew-1'
const row = (over: Record<string, unknown> = {}) => ({
  payment_id: PID, student_id: 'stu-1', kind: 'study_credit_pack', amount_won: 9900,
  created_at: '2026-10-01T00:00:00Z', receipt_sent_at: null, refunded_at: null, receipt_held_reason: null,
  ...over,
})
const paid = (over: Record<string, unknown> = {}) => ({
  status: 'PAID', orderName: 'Classraum Study — 10 credits', amount: { total: 9900 },
  paidAt: '2026-10-01T00:00:00Z', receiptUrl: 'https://iniweb.inicis.com/r', channel: { type: 'LIVE' },
  method: { card: { name: '신한카드', number: '451842******1234' } }, ...over,
})

let portone: Record<string, unknown>
const realFetch = global.fetch
const payment = () => mockDb.tables.study_payments[0]

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
  mockDb = fakeDb({
    study_payments: [row()],
    users: [{ id: 'stu-1', email: 'student@example.com' }],
    study_subscriptions: [],
  })
  portone = paid()
  global.fetch = jest.fn(async () => new Response(JSON.stringify(portone), { status: 200 })) as unknown as typeof fetch
  sendMock.mockResolvedValue({ sent: true, id: 'r1' })
})
afterEach(() => { global.fetch = realFetch; (console.error as jest.Mock).mockRestore() })

describe('sendChargeReceipt — exactly once', () => {
  it('sends once, marks the row, and a re-run sends nothing', async () => {
    // mutation: drop .is('receipt_sent_at', null) from the claim
    expect(await sendChargeReceipt(PID)).toEqual({ status: 'sent', to: 'student@example.com' })
    expect(payment().receipt_sent_at).not.toBeNull()
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })

  it('two concurrent callers (webhook racing the cron) send one receipt', async () => {
    const out = await Promise.all([sendChargeReceipt(PID), sendChargeReceipt(PID)])
    expect(out.map(o => o.status).sort()).toEqual(['sent', 'skipped'])
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a failed send releases the claim, posts no in-app notice, and the retry sends', async () => {
    // mutation: delete the release() in the !sent.sent branch
    sendMock.mockResolvedValueOnce({ sent: false, error: 'Resend 500' })
    expect(await sendChargeReceipt(PID)).toEqual({ status: 'failed', reason: 'Resend 500' })
    expect(payment().receipt_sent_at).toBeNull()
    expect(notifyMock).not.toHaveBeenCalled()
    expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: `receipt-send:${PID}` }))

    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'sent' })
    expect(sendMock).toHaveBeenCalledTimes(2)
    expect(notifyMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendChargeReceipt — holds', () => {
  it('a held row is never receipted (and PortOne is not even asked)', async () => {
    // mutation: drop .is('receipt_held_reason', null) from the claim
    mockDb.tables.study_payments[0].receipt_held_reason = 'fabricated-looking address'
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(sendMock).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(payment().receipt_sent_at).toBeNull()
  })

  it('a refunded row is never receipted', async () => {
    mockDb.tables.study_payments[0].refunded_at = '2026-10-01T01:00:00Z'
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('a TEST-channel payment holds itself instead of emailing', async () => {
    // mutation: disable the channel.type !== 'LIVE' branch
    portone = paid({ channel: { type: 'TEST' } })
    expect(await sendChargeReceipt(PID)).toEqual({ status: 'skipped', reason: 'test-mode charge' })
    expect(sendMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
    expect(payment().receipt_held_reason).toMatch(/test-mode/)
    expect(payment().receipt_sent_at).toBeNull()
    // ...and being held, it is not retried.
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('a suppressed address holds the row: no alert, no notice, no retry', async () => {
    // mutation: disable the `if (sent.suppressed)` block (it then falls into
    // the failed-send path: released, alerted, retried by the sweep forever)
    sendMock.mockResolvedValue({ sent: false, suppressed: true, error: 'recipient is on the suppression list' })
    expect(await sendChargeReceipt(PID)).toEqual({ status: 'skipped', reason: 'address suppressed' })
    expect(payment().receipt_held_reason).toMatch(/suppress/)
    expect(payment().receipt_sent_at).toBeNull()
    expect(alertMock).not.toHaveBeenCalled()
    expect(notifyMock).not.toHaveBeenCalled()
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('a non-PAID PortOne status releases the claim without sending', async () => {
    portone = paid({ status: 'CANCELLED' })
    expect(await sendChargeReceipt(PID)).toMatchObject({ status: 'skipped' })
    expect(payment().receipt_sent_at).toBeNull()
    expect(sendMock).not.toHaveBeenCalled()
  })
})

describe('sendChargeReceipt — never throws', () => {
  it('an exception mid-send resolves to failed and releases the claim', async () => {
    // mutation: rethrow from the outer catch
    sendMock.mockRejectedValueOnce(new Error('socket hang up'))
    await expect(sendChargeReceipt(PID)).resolves.toEqual({ status: 'failed', reason: 'socket hang up' })
    expect(payment().receipt_sent_at).toBeNull()
  })
})

describe('sendChargeReceipt — next-renewal line', () => {
  const sub = (last: string) => ({
    student_id: 'stu-1', status: 'active', plan: 'premium_plus_v1', pending_plan: null,
    current_period_end: '2026-10-31T00:00:00Z', cancel_at_period_end: false, last_payment_id: last,
  })
  const html = () => String(sendMock.mock.calls[0][0].text)

  it('quotes the renewal only when this charge is the subscription\'s last_payment_id', async () => {
    // Why callers must write last_payment_id BEFORE recordSubscriptionPayment:
    // written after, the receipt reads the previous id and omits the date.
    mockDb.tables.study_payments[0].kind = 'study_subscription'
    mockDb.tables.study_subscriptions = [sub(PID)]
    await sendChargeReceipt(PID)
    expect(html()).toMatch(/Nov 1, 2026|Oct 31, 2026/)

    sendMock.mockClear()
    mockDb.tables.study_payments[0].receipt_sent_at = null
    mockDb.tables.study_subscriptions = [sub('study-sub-renew-0')]
    await sendChargeReceipt(PID)
    expect(html()).not.toMatch(/Nov 1, 2026|Oct 31, 2026/)
  })
})
