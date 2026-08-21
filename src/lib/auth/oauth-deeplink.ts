/**
 * Turning a native OAuth return into an in-app navigation.
 *
 * On the web the provider redirects the browser and the app just loads.
 * Natively it cannot: the sign-in runs in Chrome Custom Tabs /
 * SFSafariViewController, and the return arrives as a `classraum://`
 * deep link — an `appUrlOpen` event. There was no `appUrlOpen` listener
 * anywhere in this app for it to reach, so this is new plumbing.
 *
 * Two deliberate choices:
 *
 *  1. The native redirect is the CUSTOM SCHEME, not the https callback.
 *     `public/.well-known/apple-app-site-association` claims `/auth/*`,
 *     so an https return from an SFSafariViewController would be handed
 *     to the app as a universal link — the exact shape of the bug that
 *     already bit "subscribe on web" (see AndroidManifest.xml's comment
 *     on claiming paths). A scheme the browser cannot claim avoids the
 *     ambiguity entirely.
 *
 *  2. The deep link is translated to an ordinary in-app route rather
 *     than being handled where it lands. `/auth` already owns the whole
 *     post-return sequence — takeover check, invite restore, join — and
 *     a second implementation of that on the native path is exactly how
 *     the two drift.
 */

import { parseOAuthCallbackUrl } from './oauth-callback'

/**
 * The in-app path to navigate to for a native OAuth return, or null when
 * the deep link is not one (share links, push taps, invite links all
 * arrive through the same event).
 *
 * Pure — this is the whole of the native logic that can be tested
 * without a device.
 */
export function oauthDeepLinkTarget(url: string): string | null {
  const callback = parseOAuthCallbackUrl(url)
  if (!callback) return null

  const params = new URLSearchParams({ flow: 'oauth' })
  if (callback.kind === 'code') {
    params.set('code', callback.code)
  } else if (callback.kind === 'error') {
    params.set('error', callback.error)
    if (callback.description) params.set('error_description', callback.description)
  } else {
    // Implicit tokens ride in the FRAGMENT, never the query — putting an
    // access token in a query string writes it into history and into
    // every server log that sees the URL.
    return `/auth?${params.toString()}#access_token=${encodeURIComponent(
      callback.accessToken
    )}&refresh_token=${encodeURIComponent(callback.refreshToken)}`
  }
  return `/auth?${params.toString()}`
}
