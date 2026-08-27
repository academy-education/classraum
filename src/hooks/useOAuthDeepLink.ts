"use client"

import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { isNativeApp } from '@/lib/nativeApp'
import { oauthDeepLinkTarget } from '@/lib/auth/oauth-deeplink'

/**
 * Catch the native OAuth return.
 *
 * This is its OWN `appUrlOpen` listener rather than a branch inside
 * `setupDeepLinkListener` (src/lib/nativeApp.ts), for two reasons:
 *
 *  - that listener is only mounted by the two authenticated layouts, and
 *    a sign-in happens before either of them exists;
 *  - its handler maps a deep-link path onto an in-app route and pushes
 *    it, which for `/auth/callback` would client-navigate to a ROUTE
 *    HANDLER. Capacitor fires every registered listener, so adding one
 *    here does not disturb the existing one, and `oauthDeepLinkTarget`
 *    returns null for every link that listener cares about.
 *
 * `Browser.close()` dismisses the SFSafariViewController /Custom Tab that
 * is still sitting in front of the app; without it the user comes back to
 * a blank provider page and has to dismiss it by hand.
 *
 * UNVERIFIED ON DEVICE. Everything decidable from a string is covered by
 * oauth-deeplink.test.ts. What cannot be checked without a real build:
 * that iOS/Android actually deliver `classraum://auth/callback` to this
 * listener, and that Browser.close() fires early enough.
 */
export function useOAuthDeepLink(): void {
  useEffect(() => {
    if (!isNativeApp()) return

    let cancelled = false
    const handle = App.addListener('appUrlOpen', (event: { url: string }) => {
      const target = oauthDeepLinkTarget(event.url)
      if (!target) return // not ours — the other listener may want it
      Browser.close().catch(() => {
        // Android Custom Tabs sometimes have nothing to close; the
        // navigation below is what matters and must not depend on it.
      })
      /* HARD navigation, deliberately — this used to be router.replace().
       *
       * The whole OAuth-return machinery on /auth runs AT PAGE LOAD:
       * `oauthReturning` is a lazy useState initializer reading
       * window.location.search, and supabase-js only exchanges ?code=
       * for a session via detectSessionInUrl when the client boots. On
       * web that is exactly what happens, because the provider redirect
       * IS a fresh load. Natively the user is already sitting on a
       * mounted /auth (they pressed the button there), so a soft
       * client-side navigation changes the URL and NOTHING ELSE — no
       * initializer re-runs, no exchange, no error banner. The deep
       * link arrived and the screen just sat there, which shipped as
       * "OAuth works on web but not in the app" (2026-08-28, reproduced
       * on the simulator with a probe deep link).
       *
       * location.replace() makes the native return a fresh load of the
       * same URL a web return lands on — one code path, no second
       * implementation of the return sequence. */
      if (!cancelled) window.location.replace(target)
    })

    return () => {
      cancelled = true
      handle.then((l) => l.remove()).catch(() => {})
    }
  }, [])
}
