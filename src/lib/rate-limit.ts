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

import type { NextRequest, NextResponse } from 'next/server'
import { NextResponse as NextResponseImpl } from 'next/server'

/**
 * Pull a reasonable client identifier from a NextRequest.
 *
 * Prefers x-forwarded-for (Vercel sets this), then x-real-ip, then
 * falls back to "unknown" so the limiter at least has a key. Behind a
 * shared proxy / corporate NAT this will be the proxy's IP — combine
 * with a user identifier (see `userOrIpKey` below) for endpoints where
 * shared-IP collisions would block legitimate users.
 */
export function getClientIp(request: NextRequest | Request): string {
  const headers = 'headers' in request ? request.headers : (request as Request).headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Build a rate-limit key that prefers user.id when available and falls
 * back to IP. Use this for endpoints called by authenticated users — it
 * prevents:
 *   1. Coffee-shop NAT problem: 10 users behind one IP sharing a counter
 *   2. VPN-rotation bypass: an attacker rotating IPs would otherwise
 *      reset the counter every request
 * Returns a namespaced key like `bucket:user:UUID` or `bucket:ip:1.2.3.4`.
 */
export function userOrIpKey(bucket: string, userId: string | null | undefined, request: NextRequest | Request): string {
  if (userId) return `${bucket}:user:${userId}`
  return `${bucket}:ip:${getClientIp(request)}`
}

/**
 * Convenience: check + return a 429 Response in one go. Returns null
 * when allowed (caller proceeds normally) or a JSON 429 response when
 * blocked. Adds Retry-After + X-RateLimit-* headers for client UX.
 */
export function enforceRateLimit(
  key: string,
  opts: RateLimitOptions,
  message = 'Too many requests. Please try again later.'
): NextResponse | null {
  const result = checkRateLimit(key, opts)
  if (result.allowed) return null
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))
  return NextResponseImpl.json(
    { error: message, retryAfter: retryAfterSec },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(opts.max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  )
}

// Re-export NextResponse only to satisfy the return type; consumers
// import NextResponse from 'next/server' themselves.
export type { NextResponse }
