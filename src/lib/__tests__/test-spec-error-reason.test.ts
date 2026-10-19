/** @jest-environment node */
jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))
import { errorReason } from '../test-spec-refresh'

describe('errorReason', () => {
  it('reports the provider status, code and message', () => {
    const err = { statusCode: 429, data: { error: { code: 'insufficient_quota', message: 'You have no credits remaining.' } } }
    expect(errorReason(err)).toBe('429 insufficient_quota You have no credits remaining.')
  })
  it('never leaks an API key', () => {
    expect(errorReason(new Error('Incorrect API key provided: sk-proj-abc123XYZ'))).not.toMatch(/abc123/)
  })
  it('falls back to the message, and caps the length', () => {
    expect(errorReason(new Error('boom'))).toBe('boom')
    expect(errorReason(new Error('x'.repeat(500))).length).toBeLessThanOrEqual(160)
  })
})
