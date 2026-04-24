import { checkRateLimit, __resetRateLimitStore } from '../rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStore()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows the first request and decrements remaining', () => {
    const r = checkRateLimit('k', { windowMs: 60_000, max: 3 })
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it('blocks once max is reached within the window', () => {
    const key = 'user:1'
    const opts = { windowMs: 60_000, max: 3 }
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    expect(checkRateLimit(key, opts).allowed).toBe(true)
    const blocked = checkRateLimit(key, opts)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets when the window elapses', () => {
    const key = 'user:2'
    const opts = { windowMs: 60_000, max: 2 }
    checkRateLimit(key, opts)
    checkRateLimit(key, opts)
    expect(checkRateLimit(key, opts).allowed).toBe(false)

    // advance past the window
    jest.advanceTimersByTime(60_001)

    const afterReset = checkRateLimit(key, opts)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('keeps separate counters per key', () => {
    const opts = { windowMs: 60_000, max: 1 }
    expect(checkRateLimit('a', opts).allowed).toBe(true)
    expect(checkRateLimit('a', opts).allowed).toBe(false)
    // different key is unaffected
    expect(checkRateLimit('b', opts).allowed).toBe(true)
  })

  it('returns the resetAt timestamp consistently within a window', () => {
    const opts = { windowMs: 60_000, max: 5 }
    const first = checkRateLimit('k', opts)
    jest.advanceTimersByTime(1_000)
    const second = checkRateLimit('k', opts)
    expect(second.resetAt).toBe(first.resetAt)
  })
})
