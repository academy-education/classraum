/**
 * Where a new account signed up from, read from the geo headers Vercel adds to
 * every request (x-vercel-ip-country / -country-region / -city). Pure, so the
 * header parsing is testable without a request. See migration 129.
 */

export interface SignupGeo {
  country: string
  region: string | null
  city: string | null
}

/** Only an account this new gets a "signup" location; an older account's
 *  location today says nothing about where it signed up. */
export const SIGNUP_GEO_WINDOW_MS = 48 * 60 * 60 * 1000

type HeaderGetter = { get(name: string): string | null }

function clean(v: string | null, max: number): string | null {
  if (!v) return null
  let s = v
  // Vercel URL-encodes the city ("S%C3%A3o%20Paulo"); a malformed escape is kept raw.
  try { s = decodeURIComponent(v) } catch { /* keep raw */ }
  s = s.trim()
  return s ? s.slice(0, max) : null
}

/** Null when there is no usable country (local dev, a non-Vercel host). */
export function parseSignupGeo(headers: HeaderGetter): SignupGeo | null {
  const country = (headers.get('x-vercel-ip-country') ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) return null
  return {
    country,
    region: clean(headers.get('x-vercel-ip-country-region'), 16),
    city: clean(headers.get('x-vercel-ip-city'), 80),
  }
}

export function isWithinSignupWindow(createdAt: string | null | undefined, now = Date.now()): boolean {
  if (!createdAt) return false
  const t = Date.parse(createdAt)
  return Number.isFinite(t) && now - t >= 0 && now - t <= SIGNUP_GEO_WINDOW_MS
}
