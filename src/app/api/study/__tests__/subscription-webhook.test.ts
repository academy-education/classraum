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

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: jest.fn(), rpc: jest.fn(), auth: { getUser: jest.fn() } },
}))

const fromMock = supabaseAdmin.from as unknown as jest.Mock

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
})
