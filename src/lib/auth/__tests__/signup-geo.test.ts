import { parseSignupGeo, isWithinSignupWindow, SIGNUP_GEO_WINDOW_MS } from '@/lib/auth/signup-geo'

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null })

describe('parseSignupGeo', () => {
  it('reads country, region and a URL-encoded city', () => {
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': 'kr', 'x-vercel-ip-country-region': '11', 'x-vercel-ip-city': 'Seoul' })))
      .toEqual({ country: 'KR', region: '11', city: 'Seoul' })
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': 'BR', 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' }))?.city).toBe('São Paulo')
  })

  it('returns null without a two-letter country (local dev, other hosts)', () => {
    expect(parseSignupGeo(h({}))).toBeNull()
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': 'Korea' }))).toBeNull()
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': '' }))).toBeNull()
  })

  it('keeps a malformed escape raw instead of throwing, and drops blanks', () => {
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': '%E0%A4%A' }))?.city).toBe('%E0%A4%A')
    expect(parseSignupGeo(h({ 'x-vercel-ip-country': 'US', 'x-vercel-ip-city': '  ' }))?.city).toBeNull()
  })
})

describe('isWithinSignupWindow', () => {
  const now = Date.parse('2026-10-29T12:00:00Z')
  it('accepts a new account and refuses an old one, a future one or no date', () => {
    expect(isWithinSignupWindow('2026-10-29T11:00:00Z', now)).toBe(true)
    expect(isWithinSignupWindow(new Date(now - SIGNUP_GEO_WINDOW_MS - 1000).toISOString(), now)).toBe(false)
    expect(isWithinSignupWindow('2026-10-30T12:00:00Z', now)).toBe(false)
    expect(isWithinSignupWindow(null, now)).toBe(false)
  })
})
