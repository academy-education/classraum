"use client"
import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { isNativeApp } from '@/lib/nativeApp'
import { authLinkTarget } from '@/lib/auth/auth-link'

/**
 * Mounted once in the root layout. When the native app is opened by an
 * email link to one of our auth SERVER routes (/auth/confirm,
 * /auth/callback, a token-bearing /auth), load that URL in the WebView so
 * the server verifies the token and hands the session to /auth — the
 * client router cannot serve a Route Handler. Every other link is left to
 * the existing listeners (OAuth return, in-app routes). Renders nothing.
 */
export function NativeAuthLinkOpener() {
  useEffect(() => {
    if (!isNativeApp()) return
    const handle = App.addListener('appUrlOpen', (event: { url: string }) => {
      const target = authLinkTarget(event.url)
      if (target) window.location.assign(target)
    })
    return () => { handle.then(h => h.remove()).catch(() => {}) }
  }, [])
  return null
}
