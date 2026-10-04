/** @jest-environment node */
/**
 * The academy payment webhook wrote with the cookie-bound ANON client until
 * 2026-10-04. A PortOne call has no session cookie, so RLS rejected the
 * webhook_events claim (401 in prod, 3x) and the claim's failure read as
 * "already claimed" — invoice-paid notifications never fired.
 *
 * The anon client mock below behaves exactly like that production client:
 * every insert fails with 42501 and every update matches zero rows. If the
 * route ever goes back to it, these tests fail.
 */
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { chain, tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: jest.fn(() => {
      const c = chain({ data: [], error: { code: '42501', message: 'new row violates row-level security policy' } })
      return c
    }),
  })),
}))
jest.mock('@/lib/portone', () => ({ verifyPayment: jest.fn() }))
jest.mock('@/lib/notification-triggers', () => ({ triggerInvoicePaymentNotifications: jest.fn(async () => {}) }))
jest.mock('@/lib/study/payment-webhook-handler', () => ({
  tryHandleStudyOneTimeWebhook: jest.fn(async () => ({ handled: false })),
}))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

import { POST } from '../route'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyPayment } from '@/lib/portone'
import { triggerInvoicePaymentNotifications } from '@/lib/notification-triggers'
import { raiseAlert } from '@/lib/ops/alert'

const SECRET = 'whsec_dGVzdHNlY3JldGtleTEyMzQ1Njc4OTA='
const INVOICE = '11111111-2222-4333-8444-555555555555'
const PAYMENT_ID = `invoice_${INVOICE}_1696000000`

const fromMock = dbAdmin.from as unknown as jest.Mock
const verifyMock = verifyPayment as unknown as jest.Mock
const notifyMock = triggerInvoicePaymentNotifications as unknown as jest.Mock
const alertMock = raiseAlert as unknown as jest.Mock

function signed(body: string, opts: { badSig?: boolean } = {}) {
  const id = 'wh_test_1'
  const ts = Math.floor(Date.now() / 1000).toString()
  const key = Buffer.from(SECRET.slice(6), 'base64')
  const sig = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`, 'utf8').digest('base64')
  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': id,
      'webhook-timestamp': ts,
      'webhook-signature': `v1,${opts.badSig ? sig.replace(/^./, sig[0] === 'A' ? 'B' : 'A') : sig}`,
    },
    body,
  })
}

const body = JSON.stringify({ payment_id: PAYMENT_ID })

let enqueue: ReturnType<typeof tableRouter>
beforeEach(() => {
  jest.clearAllMocks()
  process.env.PORTONE_WEBHOOK_SECRET = SECRET
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'log').mockImplementation(() => {})
  enqueue = tableRouter(fromMock)
  verifyMock.mockResolvedValue({
    success: true,
    payment: { status: 'PAID', paidAt: '2026-10-04T00:00:00Z', amount: { total: 50000 }, method: { type: 'CARD' } },
  })
})

describe('payment webhook — service-role writes, every error checked', () => {
  it('marks the invoice paid with the service-role client and fires the notification once', async () => {
    enqueue('webhook_events', { data: null })                   // idempotency lookup: new
    const inv = enqueue('invoices', { data: [{ id: INVOICE }] }) // update matched
    enqueue('webhook_events', { data: null })                   // claim ok
    enqueue('webhook_events', { error: { code: '23505', message: 'dup' } }) // final claim: already ours

    const res = await POST(signed(body))
    expect(res.status).toBe(200)
    expect(inv.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'paid', transaction_id: PAYMENT_ID }))
    expect(inv.eq).toHaveBeenCalledWith('id', INVOICE)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock).toHaveBeenCalledWith(INVOICE)
  })

  it('returns 500 (retryable) and does NOT notify when the claim fails for a reason other than 23505', async () => {
    enqueue('webhook_events', { data: null })
    enqueue('invoices', { data: [{ id: INVOICE }] })
    enqueue('webhook_events', { error: { code: '42501', message: 'new row violates row-level security policy' } })

    const res = await POST(signed(body))
    expect(res.status).toBe(500)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('a 23505 on the claim is a duplicate: 200, no second notification', async () => {
    enqueue('webhook_events', { data: null })
    enqueue('invoices', { data: [{ id: INVOICE }] })
    enqueue('webhook_events', { error: { code: '23505', message: 'dup' } })
    enqueue('webhook_events', { error: { code: '23505', message: 'dup' } })

    const res = await POST(signed(body))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it('an update matching zero invoices alerts and does not notify', async () => {
    enqueue('webhook_events', { data: null })
    enqueue('invoices', { data: [] })
    enqueue('webhook_events', { data: null })                  // final audit claim

    const res = await POST(signed(body))
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(alertMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Payment webhook matched no invoice' }))
  })

  it('a failed idempotency lookup is retryable, not "new"', async () => {
    enqueue('webhook_events', { error: { code: '57014', message: 'statement timeout' } })
    const res = await POST(signed(body))
    expect(res.status).toBe(500)
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it('a failed final audit claim on a non-invoice payment is retryable', async () => {
    const other = JSON.stringify({ payment_id: 'misc_123' })
    enqueue('webhook_events', { data: null })
    enqueue('webhook_events', { error: { code: '42501', message: 'rls' } })
    const res = await POST(signed(other))
    expect(res.status).toBe(500)
  })

  it('signature verification is intact: a bad signature is 401 and touches no table', async () => {
    const res = await POST(signed(body, { badSig: true }))
    expect(res.status).toBe(401)
    expect(fromMock).not.toHaveBeenCalled()
    expect(verifyMock).not.toHaveBeenCalled()
  })
})
