/** @jest-environment node */
import {
  parseOAuthCallbackUrl,
  oauthRedirectTo,
  NATIVE_CALLBACK_URL,
  OAUTH_CALLBACK_PATH,
  markOAuthFlow,
  isOAuthFlow,
} from '../oauth-callback'

describe('parseOAuthCallbackUrl — web', () => {
  it('reads a PKCE code off the query', () => {
    expect(
      parseOAuthCallbackUrl('https://app.classraum.com/auth/callback?code=abc123')
    ).toEqual({ kind: 'code', code: 'abc123' })
  })

  it('reads implicit tokens off the fragment', () => {
    expect(
      parseOAuthCallbackUrl(
        'https://app.classraum.com/auth/callback#access_token=AAA&refresh_token=BBB&token_type=bearer'
      )
    ).toEqual({ kind: 'session', accessToken: 'AAA', refreshToken: 'BBB' })
  })

  it('does not report a session from an access token with no refresh token', () => {
    expect(
      parseOAuthCallbackUrl('https://app.classraum.com/auth/callback#access_token=AAA')
    ).toBeNull()
  })

  it('reports a denied consent instead of returning null', () => {
    expect(
      parseOAuthCallbackUrl(
        'https://app.classraum.com/auth/callback?error=access_denied&error_description=User%20denied'
      )
    ).toEqual({ kind: 'error', error: 'access_denied', description: 'User denied' })
  })

  it('prefers the error over a code that arrives with it', () => {
    const r = parseOAuthCallbackUrl(
      'https://app.classraum.com/auth/callback?code=abc&error=server_error'
    )
    expect(r?.kind).toBe('error')
  })

  it('tolerates a trailing slash', () => {
    expect(parseOAuthCallbackUrl('https://app.classraum.com/auth/callback/?code=x')).toEqual({
      kind: 'code',
      code: 'x',
    })
  })
})

describe('parseOAuthCallbackUrl — native custom scheme', () => {
  it('reads a code from classraum://auth/callback', () => {
    expect(parseOAuthCallbackUrl('classraum://auth/callback?code=nativecode')).toEqual({
      kind: 'code',
      code: 'nativecode',
    })
  })

  it('reads a code from the triple-slash spelling some providers emit', () => {
    expect(parseOAuthCallbackUrl('classraum:///auth/callback?code=nativecode')).toEqual({
      kind: 'code',
      code: 'nativecode',
    })
  })

  it('reads implicit tokens from the native fragment', () => {
    expect(
      parseOAuthCallbackUrl('classraum://auth/callback#access_token=A&refresh_token=R')
    ).toEqual({ kind: 'session', accessToken: 'A', refreshToken: 'R' })
  })

  it('reads a native error', () => {
    expect(parseOAuthCallbackUrl('classraum://auth/callback?error=access_denied')).toEqual({
      kind: 'error',
      error: 'access_denied',
    })
  })
})

describe('parseOAuthCallbackUrl — everything else is NOT a callback', () => {
  it.each([
    ['an ordinary share deep link', 'classraum://invite/ABCD'],
    // The trap: an unrelated deep link carrying a param called `code`.
    ['a share link with a code param', 'classraum://mobile/session/123?code=ABCD'],
    ['a universal link to the app', 'https://app.classraum.com/mobile/study'],
    ['the invite page', 'https://app.classraum.com/invite/XYZ?code=1'],
    ['a bare auth page', 'https://app.classraum.com/auth'],
    ['a password reset', 'https://app.classraum.com/auth?type=reset&access_token=a&refresh_token=b'],
    ['garbage', 'not a url at all'],
    ['empty', ''],
    ['a near-miss path', 'https://app.classraum.com/auth/callbacks?code=x'],
  ])('returns null for %s', (_label, url) => {
    expect(parseOAuthCallbackUrl(url)).toBeNull()
  })

  it('returns null for a callback that carries nothing', () => {
    expect(parseOAuthCallbackUrl('https://app.classraum.com/auth/callback')).toBeNull()
  })
})

describe('oauthRedirectTo', () => {
  it('uses the custom scheme on native, whatever the web host is', () => {
    expect(
      oauthRedirectTo({ native: true, protocol: 'https:', hostname: 'app.classraum.com' })
    ).toBe(NATIVE_CALLBACK_URL)
  })

  it('keeps the port in local development', () => {
    expect(
      oauthRedirectTo({ native: false, protocol: 'http:', hostname: 'localhost', port: '3000' })
    ).toBe(`http://localhost:3000${OAUTH_CALLBACK_PATH}`)
  })

  it('keeps the port on the app.localhost subdomain too', () => {
    // The case the test above did NOT cover, and the bug that hid there:
    // `app.localhost` matched the production `startsWith('app.')` branch,
    // which drops the port because a production host never has one. The
    // result was `http://app.localhost/auth/callback` — port 80, nothing
    // listening — and Supabase rejected it as an unregistered redirect,
    // which reads like a provider misconfiguration rather than our bug.
    //
    // Dev runs on the app subdomain to exercise the real routing, and
    // Next picks a free port whenever 3000 is taken, so this is the
    // ordinary local case, not an exotic one.
    expect(
      oauthRedirectTo({ native: false, protocol: 'http:', hostname: 'app.localhost', port: '62420' })
    ).toBe(`http://app.localhost:62420${OAUTH_CALLBACK_PATH}`)
  })

  it.each(['localhost', '127.0.0.1', 'app.localhost'])(
    'keeps %s addressable without a port when none is given',
    (hostname) => {
      expect(
        oauthRedirectTo({ native: false, protocol: 'http:', hostname })
      ).toBe(`http://${hostname}${OAUTH_CALLBACK_PATH}`)
    },
  )

  it('does not mistake a real domain ending in localhost-ish text', () => {
    // `.endsWith('.localhost')` must not catch a production host. Only a
    // true .localhost TLD is local.
    expect(
      oauthRedirectTo({ native: false, protocol: 'https:', hostname: 'app.notlocalhost.com' })
    ).toBe(`https://app.notlocalhost.com${OAUTH_CALLBACK_PATH}`)
  })

  it('repairs the malformed app.www host that has been seen in production', () => {
    expect(
      oauthRedirectTo({ native: false, protocol: 'https:', hostname: 'app.www.classraum.com' })
    ).toBe(`https://app.classraum.com${OAUTH_CALLBACK_PATH}`)
  })

  it('sends the marketing domain to the app subdomain', () => {
    for (const host of ['classraum.com', 'www.classraum.com']) {
      expect(oauthRedirectTo({ native: false, protocol: 'https:', hostname: host })).toBe(
        `https://app.classraum.com${OAUTH_CALLBACK_PATH}`
      )
    }
  })

  it('leaves an already-correct app subdomain alone', () => {
    expect(
      oauthRedirectTo({ native: false, protocol: 'https:', hostname: 'app.staging.classraum.com' })
    ).toBe(`https://app.staging.classraum.com${OAUTH_CALLBACK_PATH}`)
  })

  it('round-trips: what it builds, the parser recognises', () => {
    for (const native of [true, false]) {
      const url = oauthRedirectTo({ native, protocol: 'https:', hostname: 'app.classraum.com' })
      expect(parseOAuthCallbackUrl(`${url}?code=abc`)).toEqual({ kind: 'code', code: 'abc' })
    }
  })
})

describe('markOAuthFlow / isOAuthFlow — telling an OAuth code from an email-confirmation code', () => {
  it('appends the marker to a bare URL', () => {
    expect(markOAuthFlow('https://app.classraum.com/auth/callback')).toBe(
      'https://app.classraum.com/auth/callback?flow=oauth'
    )
  })

  it('appends with & when the URL already has a query', () => {
    expect(markOAuthFlow('https://app.classraum.com/auth/callback?a=1')).toBe(
      'https://app.classraum.com/auth/callback?a=1&flow=oauth'
    )
  })

  it('marks the native scheme too — the native return needs the same branch', () => {
    expect(markOAuthFlow(NATIVE_CALLBACK_URL)).toBe('classraum://auth/callback?flow=oauth')
  })

  it('is idempotent', () => {
    const once = markOAuthFlow('https://app.classraum.com/auth/callback')
    expect(markOAuthFlow(once)).toBe(once)
  })

  it('recognises its own marker', () => {
    expect(isOAuthFlow('?flow=oauth&code=abc')).toBe(true)
    expect(isOAuthFlow('flow=oauth')).toBe(true)
  })

  it('does NOT claim an email confirmation, which carries the same code param', () => {
    expect(isOAuthFlow('?code=abc&type=email')).toBe(false)
    expect(isOAuthFlow('?type=reset&access_token=a&refresh_token=b')).toBe(false)
    expect(isOAuthFlow('')).toBe(false)
    expect(isOAuthFlow('?flow=recovery')).toBe(false)
  })

  it('the marked redirect still parses as a callback carrying a code', () => {
    const url = markOAuthFlow(
      oauthRedirectTo({ native: false, protocol: 'https:', hostname: 'app.classraum.com' })
    )
    expect(parseOAuthCallbackUrl(`${url}&code=abc`)).toEqual({ kind: 'code', code: 'abc' })
    expect(isOAuthFlow(new URL(`${url}&code=abc`).search)).toBe(true)
  })
})
