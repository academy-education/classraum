/**
 * Simple in-memory token bucket rate limiter.
 *
 * Good enough for a single-instance deployment. For multi-instance
 * (multiple Vercel regions, horizontal scaling), swap this for a
 * Redis-backed limiter — the interface below is what you'd keep.
 *
 * Scope keys to both the bucket name and the caller identifier so
 * separate features don't share counters, e.g.
 *   checkRateLimit(`assignments-parse:${user.id}`, { windowMs, max })
 */

export interface RateLimitOptions {
  /** Rolling window in ms */
  windowMs: number
  /** Max requests allowed within the window */
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  /** How many requests remain in the current window */
  remaining: number
  /** Unix ms when the current window resets */
  resetAt: number
}

// Shared store across calls in the same process
const store = new Map<string, { count: number; windowStart: number }>()

/**
 * Check (and consume) a token for `key`. Returns allowed=false once max is hit.
 * Resets automatically when the rolling window elapses.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart >= opts.windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: opts.max - 1, resetAt: now + opts.windowMs }
  }

  if (entry.count >= opts.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + opts.windowMs,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: opts.max - entry.count,
    resetAt: entry.windowStart + opts.windowMs,
  }
}

/** For tests: wipe state between cases */
export function __resetRateLimitStore() {
  store.clear()
}
