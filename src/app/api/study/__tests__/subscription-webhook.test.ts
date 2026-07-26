/** @jest-environment node */
/**
 * Regression tests for POST /api/study/subscription/webhook — when
 * PORTONE_WEBHOOK_SECRET is configured, EVERY request must carry a
 * valid Svix-style signature (missing header must NOT fail open).
 *
 * Signature scheme (per the route): HMAC-SHA256 over
 * `${webhook-id}.${webhook-timestamp}.${raw body}` with the secret,
 * base64, sent as `webhook-signature: v1,<sig>`.
 */
import crypto from 'crypto'
import { POST } from '@/app/api/study/subscription/webhook/route'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tableRouter, makeRequest } from '@/tests/study-route-helpers'
import { syncStudyPaymentRefund } from '@/lib/study/sync-refund'
import { raiseAlert } from '@/lib/ops/alert'

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))
jest.mock('@/lib/study/sync-refund', () => ({
  syncStudyPaymentRefund: jest.fn(async () => ({ status: 'marked' })),
}))
jest.mock('@/lib/ops/alert', () => ({ raiseAlert: jest.fn(async () => {}) }))

const fromMock = supabaseAdmin.from as unknown as jest.Mock
const syncRefundMock = syncStudyPaymentRefund as jest.Mock
const raiseAlertMock = raiseAlert as jest.Mock

const SECRET = 'test-webhook-secret'

function sign(raw: string, id: string, ts: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(`${id}.${ts}.${raw}`).digest('base64')
}

function signedHeaders(raw: string, secret = SECRET) {
  const id = 'wh_msg_1'
  const ts = Math.floor(Date.now() / 1000).toString()
  return {
    'webhook-id': id,
    'webhook-timestamp': ts,
    'webhook-signature': `v1,${sign(raw, id, ts, secret)}`,
  }
}

const FAILED_EVENT = JSON.stringify({
  type: 'Transaction.Failed',
  data: {
    paymentId: 'pay_1',
    status: 'FAILED',
    customData: JSON.stringify({ kind: 'study_subscription' }),
  },
})

describe('POST /api/study/subscription/webhook', () => {
  const originalSecret = process.env.PORTONE_WEBHOOK_SECRET
  let enqueue: ReturnType<typeof tableRouter>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    enqueue = tableRouter(fromMock)
    syncRefundMock.mockResolvedValue({ status: 'marked' })
  })

  afterEach(() => {
    ;(console.warn as jest.Mock).mockRestore()
    if (originalSecret === undefined) delete process.env.PORTONE_WEBHOOK_SECRET
    else process.env.PORTONE_WEBHOOK_SECRET = originalSecret
  })

  describe('with PORTONE_WEBHOOK_SECRET set', () => {
    beforeEach(() => { process.env.PORTONE_WEBHOOK_SECRET = SECRET })

    it('rejects a request missing the signature header with 401 (no fail-open)', async () => {
      const res = await POST(makeRequest(FAILED_EVENT))
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'missing signature' })
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('rejects a wrong signature with 401', async () => {
      const res = await POST(makeRequest(FAILED_EVENT, {
        headers: {
          'webhook-id': 'wh_msg_1',
          'webhook-timestamp': Math.floor(Date.now() / 1000).toString(),
          'webhook-signature': 'v1,aW52YWxpZHNpZ25hdHVyZQ==',
        },
      }))
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'invalid signature' })
      expect(fromMock).not.toHaveBeenCalled()
    })

    it('rejects a validly signed but stale payload with 401 (replay protection)', async () => {
      // Signed correctly — but with a timestamp 10 minutes old. The
      // signature verifies; the tolerance check must still reject it.
      const id = 'wh_msg_replay'
      const staleTs = Math.floor(Date.now() / 1000 - 10 * 60).toString()
      const res = await POST(makeRequest(FAILED_EVENT, { headers: {
        'webhook-id': id,
        'webhook-timestamp': staleTs,
        'webhook-signature': `v1,${sign(FAILED_EVENT, id, staleTs)}`,
      } }))
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'invalid signature' })
    })

    it('rejects a non-numeric timestamp with 401', async () => {
      const id = 'wh_msg_badts'
      const res = await POST(makeRequest(FAILED_EVENT, { headers: {
        'webhook-id': id,
        'webhook-timestamp': 'not-a-number',
        'webhook-signature': `v1,${sign(FAILED_EVENT, id, 'not-a-number')}`,
      } }))
      expect(res.status).toBe(401)
    })

    it('rejects a signature computed with the wrong secret with 401', async () => {
      const res = await POST(makeRequest(FAILED_EVENT, {
        headers: signedHeaders(FAILED_EVENT, 'some-other-secret'),
      }))
      expect(res.status).toBe(401)
    })

    it('processes a validly signed Transaction.Failed event (flips row to past_due)', async () => {
      enqueue('study_subscriptions', {
        data: { id: 'sub-1', status: 'active', current_period_end: null },
      })
      const updateChain = enqueue('study_subscriptions', { data: null, error: null })

      const res = await POST(makeRequest(FAILED_EVENT, { headers: signedHeaders(FAILED_EVENT) }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, applied: 'past_due' })
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'past_due',
        last_payment_failure: 'webhook: FAILED',
      }))
    })

    it('ignores non-study events (but only after signature verification)', async () => {
      const raw = JSON.stringify({
        type: 'Transaction.Paid',
        data: { paymentId: 'pay_2', customData: JSON.stringify({ kind: 'academy_something' }) },
      })
      const res = await POST(makeRequest(raw, { headers: signedHeaders(raw) }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, ignored: 'not a study event' })
      expect(fromMock).not.toHaveBeenCalled()
    })
  })

  describe('without PORTONE_WEBHOOK_SECRET', () => {
    beforeEach(() => { delete process.env.PORTONE_WEBHOOK_SECRET })

    it('processes an unsigned request (local test mode)', async () => {
      enqueue('study_subscriptions', {
        data: { id: 'sub-1', status: 'active', current_period_end: null },
      })
      enqueue('study_subscriptions', { data: null, error: null })

      const res = await POST(makeRequest(FAILED_EVENT))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, applied: 'past_due' })
    })
  })

  /**
   * A 2xx tells PortOne "handled — stop retrying". supabase-js `.update()`
   * resolves with { error } and never throws, so an unchecked write used to
   * ack a state change that never happened: a refunded subscriber kept
   * Premium forever, a failed charge never entered dunning, and no retry
   * was ever coming. Every one of these must answer non-2xx instead.
   */
  describe('write failures must not be acked', () => {
    beforeEach(() => { delete process.env.PORTONE_WEBHOOK_SECRET })

    it('Transaction.Failed: past_due update fails → 500, not ok:true', async () => {
      enqueue('study_subscriptions', {
        data: { id: 'sub-1', status: 'active', current_period_end: null },
      })
      enqueue('study_subscriptions', { data: null, error: { message: 'deadlock detected' } })

      const res = await POST(makeRequest(FAILED_EVENT))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.ok).toBeUndefined()
      expect(body.retry).toBe(true)
      expect(raiseAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical', dedupeKey: expect.stringContaining('sub-1') }),
      )
    })

    it('Transaction.Cancelled: cancel update fails → 500 and refund sync is not attempted', async () => {
      const raw = JSON.stringify({
        type: 'Transaction.Cancelled',
        data: { paymentId: 'pay_1', customData: JSON.stringify({ kind: 'study_subscription' }) },
      })
      enqueue('study_subscriptions', {
        data: { id: 'sub-9', status: 'active', current_period_end: null },
      })
      enqueue('study_subscriptions', { data: null, error: { message: 'connection reset' } })

      const res = await POST(makeRequest(raw))
      expect(res.status).toBe(500)
      expect((await res.json()).ok).toBeUndefined()
      expect(syncRefundMock).not.toHaveBeenCalled()
      expect(raiseAlertMock).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'critical' }),
      )
    })

    it('Transaction.Cancelled: refund sync unverifiable → 503 so PortOne redelivers', async () => {
      const raw = JSON.stringify({
        type: 'Transaction.Cancelled',
        data: { paymentId: 'pay_1', customData: JSON.stringify({ kind: 'study_subscription' }) },
      })
      enqueue('study_subscriptions', {
        data: { id: 'sub-9', status: 'active', current_period_end: null },
      })
      enqueue('study_subscriptions', { data: null, error: null })
      syncRefundMock.mockResolvedValue({ status: 'unverifiable', retryable: true })

      const res = await POST(makeRequest(raw))
      expect(res.status).toBe(503)
      expect((await res.json()).retry).toBe(true)
    })

    it('Transaction.Cancelled: everything persists → 200 ok', async () => {
      const raw = JSON.stringify({
        type: 'Transaction.Cancelled',
        data: { paymentId: 'pay_1', customData: JSON.stringify({ kind: 'study_subscription' }) },
      })
      enqueue('study_subscriptions', {
        data: { id: 'sub-9', status: 'active', current_period_end: null },
      })
      const updateChain = enqueue('study_subscriptions', { data: null, error: null })

      const res = await POST(makeRequest(raw))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, applied: 'cancelled' })
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled', cancel_at_period_end: false }),
      )
      expect(syncRefundMock).toHaveBeenCalledWith('pay_1')
      expect(raiseAlertMock).not.toHaveBeenCalled()
    })

    it('still 200s a terminal row it deliberately skips (no write, nothing to persist)', async () => {
      enqueue('study_subscriptions', {
        data: { id: 'sub-2', status: 'cancelled', current_period_end: null },
      })
      const res = await POST(makeRequest(FAILED_EVENT))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true, applied: 'past_due' })
      expect(raiseAlertMock).not.toHaveBeenCalled()
    })
  })
})
