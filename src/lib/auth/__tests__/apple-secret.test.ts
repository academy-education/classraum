import {
  classifyAppleSecret,
  severityFor,
  messageFor,
  secretsAgree,
  APPLE_MAX_SECRET_LIFETIME_S,
  WARN_DAYS,
  CRITICAL_DAYS,
} from '../apple-secret'
import { APPLE_TEAM_ID } from '@/lib/deeplinks'

/**
 * The failure being guarded is a date passing unnoticed, so the tests
 * that matter are the BOUNDARIES — one day either side of each threshold,
 * and the exact moment of expiry. A test that only checks "expired" and
 * "fine" would pass with the comparisons inverted.
 */

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-08-26T00:00:00.000Z')

const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** A well-formed Apple client secret JWT expiring `days` from NOW. */
function jwt(opts: { days?: number; iss?: string; lifetimeS?: number; noExp?: boolean } = {}) {
  const exp = Math.floor((NOW.getTime() + (opts.days ?? 90) * DAY) / 1000)
  const lifetime = opts.lifetimeS ?? 90 * 24 * 60 * 60
  const payload: Record<string, unknown> = {
    iss: opts.iss ?? APPLE_TEAM_ID,
    aud: 'https://appleid.apple.com',
    sub: 'com.classraum.web',
    iat: exp - lifetime,
  }
  if (!opts.noExp) payload.exp = exp
  return `${b64url({ alg: 'ES256', kid: 'ABC123' })}.${b64url(payload)}.sig`
}

const classify = (secret: string | null | undefined, providers = 'apple,google') =>
  classifyAppleSecret({ providersRaw: providers, secret, now: NOW })

describe('apple client secret expiry', () => {
  describe('only speaks when Apple is actually enabled', () => {
    it('is silent when the flag omits apple, even with no secret at all', () => {
      // Otherwise this alerts every week for however many months pass
      // before Apple is switched on, and gets muted — which is how a real
      // alert later goes unread.
      expect(classify(undefined, 'google,kakao').kind).toBe('not_enabled')
      expect(classify(jwt({ days: -400 }), 'google').kind).toBe('not_enabled')
      expect(classify(undefined, '').kind).toBe('not_enabled')
    })

    it('a missing secret becomes an alert the moment apple is enabled', () => {
      const s = classify(undefined, 'apple')
      expect(s.kind).toBe('missing')
      expect(severityFor(s)).toBe('critical')
    })
  })

  describe('threshold boundaries', () => {
    it('one day the safe side of the warning threshold is ok', () => {
      const s = classify(jwt({ days: WARN_DAYS + 1 }))
      expect(s.kind).toBe('ok')
      expect(severityFor(s)).toBeNull()
    })

    it('exactly at the warning threshold it warns', () => {
      const s = classify(jwt({ days: WARN_DAYS }))
      expect(s.kind).toBe('expiring')
      expect(severityFor(s)).toBe('warning')
    })

    it('escalates to critical at the critical threshold, not before', () => {
      expect(severityFor(classify(jwt({ days: CRITICAL_DAYS + 1 })))).toBe('warning')
      expect(severityFor(classify(jwt({ days: CRITICAL_DAYS })))).toBe('critical')
    })

    it('the instant it expires it is expired, not "expiring"', () => {
      // msLeft === 0. A `<` instead of `<=` would call this expiring and
      // report 0 days left while sign-in is already broken.
      const exp = Math.floor(NOW.getTime() / 1000)
      const token = `${b64url({ alg: 'ES256' })}.${b64url({ iss: APPLE_TEAM_ID, exp })}.sig`
      expect(classify(token).kind).toBe('expired')
    })

    it('reports how long ago it lapsed', () => {
      const s = classify(jwt({ days: -10 }))
      expect(s).toMatchObject({ kind: 'expired', daysAgo: 10 })
      expect(severityFor(s)).toBe('critical')
    })

    it('rounds days left DOWN, so it crosses a threshold early not late', () => {
      // 30.9 days must read as 30 and warn. Rounding to nearest would
      // report 31 and stay quiet for another day — erring in exactly the
      // direction this job exists to prevent.
      const exp = Math.floor((NOW.getTime() + 30.9 * DAY) / 1000)
      const token = `${b64url({ alg: 'ES256' })}.${b64url({ iss: APPLE_TEAM_ID, exp })}.sig`
      const s = classify(token)
      expect(s).toMatchObject({ kind: 'expiring', daysLeft: 30 })
    })
  })

  describe('config errors Apple would reject', () => {
    it('rejects a lifetime beyond Apple’s six-month ceiling', () => {
      // A generator asked for "1 year" yields a token that looks healthy
      // here and fails at Apple. Reporting 12 months of headroom would be
      // worse than reporting nothing.
      const s = classify(jwt({ days: 300, lifetimeS: APPLE_MAX_SECRET_LIFETIME_S + 1 }))
      expect(s.kind).toBe('malformed')
      expect(severityFor(s)).toBe('critical')
      if (s.kind === 'malformed') expect(s.reason).toMatch(/6-month/)
    })

    it('accepts a lifetime exactly at the ceiling', () => {
      const s = classify(jwt({ days: 90, lifetimeS: APPLE_MAX_SECRET_LIFETIME_S }))
      expect(s.kind).toBe('ok')
    })

    it('catches a secret issued for the wrong Apple team', () => {
      const s = classify(jwt({ days: 90, iss: 'WRONGTEAM1' }))
      expect(s.kind).toBe('malformed')
      if (s.kind === 'malformed') expect(s.reason).toContain(APPLE_TEAM_ID)
    })

    it('treats the .p8 itself as malformed rather than crashing', () => {
      // The likeliest paste error: the key file instead of the JWT.
      const p8 = '-----BEGIN PRIVATE KEY-----\nMIGTAg...\n-----END PRIVATE KEY-----'
      expect(classify(p8).kind).toBe('malformed')
    })

    it.each([
      ['empty string', '   '],
      ['two segments', 'aaa.bbb'],
      ['undecodable payload', 'aaa.!!!!.ccc'],
    ])('handles %s without throwing', (_label, value) => {
      expect(() => classify(value)).not.toThrow()
      expect(['missing', 'malformed']).toContain(classify(value).kind)
    })

    it('a JWT with no exp is malformed, not treated as never-expiring', () => {
      const s = classify(jwt({ noExp: true }))
      expect(s.kind).toBe('malformed')
      if (s.kind === 'malformed') expect(s.reason).toMatch(/exp/)
    })
  })

  describe('alert copy', () => {
    it('says nothing when there is nothing to say', () => {
      expect(messageFor(classify(jwt({ days: 120 })))).toBeNull()
      expect(messageFor(classify(undefined, 'google'))).toBeNull()
    })

    it('always names the env var, so the wrong copy is not edited', () => {
      // The authoritative secret is in the Supabase dashboard; this reads
      // a duplicate. A message that did not say which one it read would
      // send someone to check the wrong place.
      for (const s of [classify(undefined, 'apple'), classify(jwt({ days: 3 })), classify('nope')]) {
        expect(messageFor(s)).toContain('APPLE_OAUTH_SECRET')
      }
    })

    it('tells you to update BOTH places', () => {
      expect(messageFor(classify(jwt({ days: 3 })))).toContain('Supabase')
    })
  })

  it('secretsAgree only agrees on a real match', () => {
    expect(secretsAgree('abc', 'abc')).toBe(true)
    expect(secretsAgree(' abc ', 'abc')).toBe(true)
    expect(secretsAgree('abc', 'abd')).toBe(false)
    expect(secretsAgree('', '')).toBe(false)
    expect(secretsAgree(null, undefined)).toBe(false)
  })
})
