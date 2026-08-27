/**
 * Where OAuth comes back to, and how to read what it brings.
 *
 * Two return paths, and they are NOT the same shape:
 *
 *  - Web: the provider redirects the browser to `<origin>/auth/callback`.
 *    Supabase's JS client (PKCE by default) puts `?code=…` in the QUERY.
 *  - Native (Capacitor): the provider cannot redirect into a WebView, so
 *    the sign-in runs in Chrome Custom Tabs / SFSafariViewController and
 *    returns through the custom scheme `classraum://auth/callback`. That
 *    arrives as an `appUrlOpen` event, NOT as a navigation — nothing in
 *    the web layer sees it unless something is listening.
 *
 * The parser also handles the legacy implicit shape (`#access_token=…`),
 * because that is what arrives if the project's flow type is ever switched
 * back, and because a fragment is invisible to every server-side redirect
 * in this repo — `/auth/callback/route.ts` can only read the query string,
 * so a fragment response would reach the page with the tokens still on the
 * URL and no code to exchange.
 *
 * Everything here is pure and string-in / object-out precisely so the
 * native path can be tested without a device.
 */

/**
 * Marker appended to `redirectTo` so `/auth/callback` can recognise an
 * OAuth return and forward it to `/auth`, where the post-return wiring
 * lives.
 *
 * Without a marker the route cannot tell an OAuth `?code=` from an email
 * confirmation `?code=` — they are the same parameter — and the existing
 * confirmation behaviour (redirect to `/`) must not change. Supabase
 * preserves query params already present on redirectTo.
 */
export const OAUTH_FLOW_PARAM = 'flow'
export const OAUTH_FLOW_VALUE = 'oauth'

/** Append the marker, idempotently. */
export function markOAuthFlow(url: string): string {
  if (url.includes(`${OAUTH_FLOW_PARAM}=${OAUTH_FLOW_VALUE}`)) return url
  return `${url}${url.includes('?') ? '&' : '?'}${OAUTH_FLOW_PARAM}=${OAUTH_FLOW_VALUE}`
}

/** Is this URL/search string an OAuth return we are responsible for? */
export function isOAuthFlow(search: string): boolean {
  try {
    return new URLSearchParams(search).get(OAUTH_FLOW_PARAM) === OAUTH_FLOW_VALUE
  } catch {
    return false
  }
}

export type OAuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'session'; accessToken: string; refreshToken: string }
  | { kind: 'error'; error: string; description?: string }

/** Path both platforms return to. Kept as one constant so the console
 *  entries, the native scheme and the listener cannot drift apart. */
export const OAUTH_CALLBACK_PATH = '/auth/callback'

/** Custom scheme registered by the native shells (capacitor.config.ts:
 *  `ios.scheme = 'classraum'`; Android intent-filter). */
export const NATIVE_CALLBACK_URL = 'classraum://auth/callback'

/**
 * Parse a callback URL of either shape.
 *
 * Returns null when the URL is not an OAuth callback at all — which is the
 * common case, since `appUrlOpen` also fires for share links, universal
 * links and push-notification taps. A listener that assumed every deep
 * link was a callback would swallow those.
 */
export function parseOAuthCallbackUrl(url: string): OAuthCallback | null {
  if (typeof url !== 'string' || !url.trim()) return null

  let query: URLSearchParams
  let fragment: URLSearchParams
  let path: string

  try {
    if (url.startsWith('classraum://')) {
      // `new URL('classraum://auth/callback?code=x')` parses, but browsers
      // disagree about whether "auth" is the host or the first path
      // segment for a non-special scheme. Normalise to https so the path
      // is unambiguous, then read it back.
      const rest = url.slice('classraum://'.length)
      const asHttps = new URL('https://native.invalid/' + rest.replace(/^\/+/, ''))
      path = asHttps.pathname
      query = asHttps.searchParams
      fragment = new URLSearchParams(asHttps.hash.replace(/^#/, ''))
    } else {
      const u = new URL(url)
      path = u.pathname
      query = u.searchParams
      fragment = new URLSearchParams(u.hash.replace(/^#/, ''))
    }
  } catch {
    return null
  }

  // Only ever act on OUR callback path. Without this, a deep link to
  // `/mobile/session/123?code=ABC` (a perfectly ordinary share link with a
  // param that happens to be called `code`) would be handed to
  // exchangeCodeForSession.
  if (!/^\/auth\/callback\/?$/.test(path)) return null

  // Errors first: a provider that denies consent sends `error` ALONGSIDE
  // nothing else, and treating that as "no callback" would hang the UI on
  // a spinner forever.
  const err = query.get('error') ?? fragment.get('error')
  if (err) {
    const description =
      query.get('error_description') ?? fragment.get('error_description') ?? undefined
    return { kind: 'error', error: err, ...(description ? { description } : {}) }
  }

  const code = query.get('code') ?? fragment.get('code')
  if (code) return { kind: 'code', code }

  const accessToken = fragment.get('access_token') ?? query.get('access_token')
  const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token')
  if (accessToken && refreshToken) return { kind: 'session', accessToken, refreshToken }

  return null
}

/**
 * The `redirectTo` handed to `signInWithOAuth`.
 *
 * MUST be registered verbatim in the Supabase dashboard's redirect
 * allow-list, including the native scheme — Supabase refuses anything not
 * on that list and the failure looks like a provider misconfiguration.
 *
 * The web value is normalised the same way `handleForgotPassword` on the
 * auth page normalises its own: production always resolves to
 * app.classraum.com, because app.www.classraum.com is a real malformed
 * host that has been observed here.
 */
export function oauthRedirectTo(opts: {
  native: boolean
  protocol?: string
  hostname?: string
  port?: string
}): string {
  if (opts.native) return NATIVE_CALLBACK_URL

  const protocol = opts.protocol ?? 'https:'
  const hostname = opts.hostname ?? 'app.classraum.com'
  const port = opts.port ?? ''

  /* Local development, INCLUDING the `app.` subdomain that dev uses to
     exercise the real subdomain routing.
 
     The port is load-bearing here and only here: Next picks a free port
     when 3000 is taken, so a dev server frequently lives on something
     like 62420. `app.localhost` used to fall through to the production
     `startsWith('app.')` branch below, which drops the port because a
     production host never has one — producing
     `http://app.localhost/auth/callback`, i.e. port 80, where nothing is
     listening. Supabase then rejects it as an unregistered redirect and
     the failure reads like a provider misconfiguration. */
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  if (isLocalHost) {
    return `${protocol}//${hostname}${port ? ':' + port : ''}${OAUTH_CALLBACK_PATH}`
  }
  if (hostname === 'app.www.classraum.com') {
    return `${protocol}//app.classraum.com${OAUTH_CALLBACK_PATH}`
  }
  if (hostname.startsWith('app.')) {
    return `${protocol}//${hostname}${OAUTH_CALLBACK_PATH}`
  }
  const base = hostname.replace(/^www\./, '')
  return `${protocol}//app.${base}${OAUTH_CALLBACK_PATH}`
}
