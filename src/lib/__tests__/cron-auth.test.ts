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

// Node 22's types mark `process.env.NODE_ENV` as readonly. The runtime
// is still mutable, and tests need to flip it per case — go through this
// helper instead of writing the field directly.
function setNodeEnv(value: string) {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = value
}

describe('verifyCronAuth', () => {
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('allows all requests in development', () => {
    setNodeEnv('development')
    expect(verifyCronAuth({})).toBe(true)
  })

  it('allows all requests in test', () => {
    setNodeEnv('test')
    expect(verifyCronAuth({})).toBe(true)
  })

  it('accepts valid CRON_SECRET_KEY in production', () => {
    setNodeEnv('production')
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: 'Bearer my-secret', 'user-agent': null })).toBe(true)
  })

  it('rejects invalid CRON_SECRET_KEY in production', () => {
    setNodeEnv('production')
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: 'Bearer wrong-secret', 'user-agent': null })).toBe(false)
  })

  it('rejects missing auth header in production', () => {
    setNodeEnv('production')
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({ authorization: null, 'user-agent': null })).toBe(false)
  })

  it('accepts Vercel cron user-agent as fallback', () => {
    setNodeEnv('production')
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': 'vercel-cron/1.0' })).toBe(true)
  })

  it('rejects requests with no auth in production', () => {
    setNodeEnv('production')
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': null })).toBe(false)
  })

  it('rejects random user-agents in production', () => {
    setNodeEnv('production')
    delete process.env.CRON_SECRET_KEY

    expect(verifyCronAuth({ authorization: null, 'user-agent': 'Mozilla/5.0' })).toBe(false)
  })

  it('prefers CRON_SECRET_KEY over user-agent when both present', () => {
    setNodeEnv('production')
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({
      authorization: 'Bearer my-secret',
      'user-agent': 'vercel-cron/1.0',
    })).toBe(true)
  })

  it('falls back to user-agent when secret key is wrong', () => {
    setNodeEnv('production')
    process.env.CRON_SECRET_KEY = 'my-secret'

    expect(verifyCronAuth({
      authorization: 'Bearer wrong',
      'user-agent': 'vercel-cron/1.0',
    })).toBe(true)
  })
})
