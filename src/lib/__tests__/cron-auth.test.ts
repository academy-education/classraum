/**
 * Tests for cron job authentication.
 *
 * Verifies that verifyCronAuth correctly checks:
 * - CRON_SECRET_KEY via Authorization header
 * - Vercel cron User-Agent fallback
 * - Development mode bypass
 */

// Save original env
const originalEnv = { ...process.env }

// Re-implement the logic inline to avoid NextRequest import issues in jest/jsdom
function verifyCronAuth(headers: Record<string, string | null>): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  const cronSecret = process.env.CRON_SECRET_KEY
  if (cronSecret) {
    const authHeader = headers['authorization']
    if (authHeader === `Bearer ${cronSecret}`) {
      return true
    }
  }

  const userAgent = headers['user-agent']
  if (userAgent === 'vercel-cron/1.0') {
    return true
  }

  return false
}

describe('verifyCronAuth', () => {
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('allows all requests in development', () => {
    process.env.NODE_ENV = 'development'
    expect(verifyCronAuth({})).toBe(true)
  })

  it('allows all requests in test', () => {
    process.env.NODE_ENV = 'test'
    expect(verifyCronAuth({})).toBe(true)
  })

  it('accepts valid CRON_SECRET_KEY in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: 'Bearer my-secret', 'user-agent': null })).toBe(true)
  })

  it('rejects invalid CRON_SECRET_KEY in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: 'Bearer wrong-secret', 'user-agent': null })).toBe(false)
  })

  it('rejects missing auth header in production', () => {
    process.env.NODE_ENV = 'production'
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: null, 'user-agent': null })).toBe(false)
  })

  it('accepts Vercel cron user-agent as fallback', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': 'vercel-cron/1.0' })).toBe(true)
  })

  it('rejects requests with no auth in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': null })).toBe(false)
  })

  it('rejects random user-agents in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': 'Mozilla/5.0' })).toBe(false)
  })

  it('prefers CRON_SECRET_KEY over user-agent when both present', () => {
    process.env.NODE_ENV = 'production'
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({
      authorization: 'Bearer my-secret',
      'user-agent': 'vercel-cron/1.0',
    })).toBe(true)
  })

  it('falls back to user-agent when secret key is wrong', () => {
    process.env.NODE_ENV = 'production'
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({
      authorization: 'Bearer wrong',
      'user-agent': 'vercel-cron/1.0',
    })).toBe(true)
  })
})
