import crypto from 'crypto'
import {
  verifyWebhookSignature,
  parseWebhookPayload,
  WebhookVerificationError,
} from '../portone-webhook'

const TEST_SECRET = 'whsec_test_secret_key_1234567890'

function createValidHeaders(secret: string, payload: string) {
  const webhookId = 'wh_test_123'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signedContent = `${timestamp}.${webhookId}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf8')
    .digest('base64')

  return {
    'webhook-id': webhookId,
    'webhook-signature': `v1,${signature}`,
    'webhook-timestamp': timestamp,
  }
}

describe('verifyWebhookSignature', () => {
  const payload = JSON.stringify({ type: 'Payment.Paid', data: { paymentId: 'pay_123' } })

  it('accepts a valid signature', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    expect(verifyWebhookSignature(TEST_SECRET, payload, headers)).toBe(true)
  })

  it('rejects an invalid signature', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-signature'] = 'v1,aW52YWxpZHNpZ25hdHVyZQ=='

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow(WebhookVerificationError)
  })

  it('rejects a tampered payload', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    const tamperedPayload = JSON.stringify({ type: 'Payment.Paid', data: { paymentId: 'pay_hacked' } })

    expect(() => verifyWebhookSignature(TEST_SECRET, tamperedPayload, headers))
      .toThrow(WebhookVerificationError)
  })

  it('rejects missing webhook-id header', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-id'] = ''

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('Missing required webhook headers')
  })

  it('rejects missing webhook-signature header', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-signature'] = ''

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('Missing required webhook headers')
  })

  it('rejects missing webhook-timestamp header', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-timestamp'] = ''

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('Missing required webhook headers')
  })

  it('rejects an expired timestamp', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    // Set timestamp to 10 minutes ago (tolerance is 5 minutes)
    headers['webhook-timestamp'] = (Math.floor(Date.now() / 1000) - 600).toString()
    // Recompute signature with the old timestamp
    const signedContent = `${headers['webhook-timestamp']}.${headers['webhook-id']}.${payload}`
    const signature = crypto
      .createHmac('sha256', TEST_SECRET)
      .update(signedContent, 'utf8')
      .digest('base64')
    headers['webhook-signature'] = `v1,${signature}`

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('Webhook timestamp outside tolerance window')
  })

  it('rejects an invalid timestamp', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-timestamp'] = 'not-a-number'

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('Invalid webhook timestamp')
  })

  it('rejects signatures without v1 prefix', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    headers['webhook-signature'] = headers['webhook-signature'].replace('v1,', 'v2,')

    expect(() => verifyWebhookSignature(TEST_SECRET, payload, headers))
      .toThrow('No valid v1 signatures found')
  })

  it('accepts when one of multiple signatures is valid', () => {
    const headers = createValidHeaders(TEST_SECRET, payload)
    // Prepend an invalid signature — the valid one should still pass
    headers['webhook-signature'] = `v1,aW52YWxpZA== ${headers['webhook-signature']}`

    expect(verifyWebhookSignature(TEST_SECRET, payload, headers)).toBe(true)
  })
})

describe('parseWebhookPayload', () => {
  it('parses valid JSON', () => {
    const payload = '{"type":"Payment.Paid","data":{"paymentId":"pay_123"}}'
    const result = parseWebhookPayload(payload)
    expect(result).toEqual({ type: 'Payment.Paid', data: { paymentId: 'pay_123' } })
  })

  it('throws on invalid JSON', () => {
    expect(() => parseWebhookPayload('not json'))
      .toThrow(WebhookVerificationError)
  })

  it('throws on empty string', () => {
    expect(() => parseWebhookPayload(''))
      .toThrow(WebhookVerificationError)
  })
})
