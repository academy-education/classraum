"use client"

/**
 * Tab-switch detection to prevent skeleton flashes when the user briefly
 * switches tabs / apps and returns. Uses the Page Visibility API plus a
 * short timing window to distinguish "true tab return" from regular
 * in-app navigation.
 *
 * Logging policy: warn/error always, info only in development.
 */

const APP_LOADED_KEY = 'classraum-app-loaded'
const RETURN_DETECTION_WINDOW_MS = 300
const IS_DEV = process.env.NODE_ENV === 'development'

let hasBeenVisible = false
let wasRecentlyHidden = false
let recentVisibilityTimer: NodeJS.Timeout | null = null

const debugLog = (...args: unknown[]): void => {
  if (IS_DEV) console.log(...args)
}

export const simpleTabDetection = {
  /** True if this looks like a tab return (not initial app load or in-app nav). */
  isReturningToTab(): boolean {
    if (typeof window === 'undefined') return false

    const hasUsedApp = sessionStorage.getItem(APP_LOADED_KEY) === 'true'
    if (!hasUsedApp) return false

    // Recent hidden→visible transition = tab return.
    if (wasRecentlyHidden && !document.hidden) return true

    // Document hidden right now while app was already used = tab return.
    if (document.hidden) return true

    // Otherwise: regular in-app navigation.
    return false
  },

  /** Alias kept for callsite compatibility. */
  isTrueTabReturn(): boolean {
    return this.isReturningToTab()
  },

  /** Mark that the app has loaded successfully (called once first data is ready). */
  markAppLoaded(): void {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(APP_LOADED_KEY, 'true')
  },

  /** Set up the visibilitychange listener. Idempotent (safe to call multiple times). */
  initializeVisibilityTracking(): void {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasRecentlyHidden = true
        if (recentVisibilityTimer) {
          clearTimeout(recentVisibilityTimer)
          recentVisibilityTimer = null
        }
      } else {
        hasBeenVisible = true
        if (recentVisibilityTimer) clearTimeout(recentVisibilityTimer)
        recentVisibilityTimer = setTimeout(() => {
          wasRecentlyHidden = false
        }, RETURN_DETECTION_WINDOW_MS)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (!document.hidden) hasBeenVisible = true
  },

  /** Reset for logout. */
  reset(): void {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(APP_LOADED_KEY)
    hasBeenVisible = false
    wasRecentlyHidden = false
    if (recentVisibilityTimer) {
      clearTimeout(recentVisibilityTimer)
      recentVisibilityTimer = null
    }
    debugLog('[SimpleTabDetection] Reset')
  }
}

// Initialize once on import (browser only).
if (typeof window !== 'undefined') {
  simpleTabDetection.initializeVisibilityTracking()
}
