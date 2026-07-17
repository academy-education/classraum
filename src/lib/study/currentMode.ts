"use client"

/**
 * Tracks the user's current top-level mode (Grades vs Study) for the
 * mode chip + mode-aware bottom nav.
 *
 * Pathname alone is not enough: shared routes like /mobile/profile
 * and /mobile/notifications shouldn't flip the mode chip and tab bar
 * just because the user tapped a tab. So we treat the mode as a
 * stateful preference:
 *   - Routes under /mobile/study/* explicitly set mode = study
 *   - Routes that are unambiguously Grades-only set mode = grades
 *   - Shared routes keep whatever was last set (default grades)
 *
 * Stored in localStorage so it SURVIVES app restarts. It was
 * sessionStorage originally ("a fresh tab starts in grades"), but in
 * the Capacitor app every cold launch is a fresh session — study-mode
 * students were dumped back into Grades on every single launch. The
 * entry routers ((app)/page.tsx + auth redirect) read this via
 * readStoredMode() to land the student back in their last mode.
 */

const KEY = 'mobile-current-mode'

const GRADES_PATHS = new Set([
  '/mobile',
  '/mobile/assignments',
  '/mobile/reports',
  '/mobile/schedule',
])

export type MobileMode = 'grades' | 'study'

/** Read the mode that pathname implies, or null if shared/ambiguous. */
export function modeForPath(pathname: string): MobileMode | null {
  if (pathname.startsWith('/mobile/study')) return 'study'
  if (GRADES_PATHS.has(pathname)) return 'grades'
  // /mobile/profile, /mobile/messages, /mobile/notifications, etc.
  // are shared — don't force a mode flip.
  return null
}

/** The persisted mode preference, or null when the user has never
 *  landed in an explicit mode (true first visit). SSR-safe. */
export function readStoredMode(): MobileMode | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(KEY)
  return stored === 'study' || stored === 'grades' ? stored : null
}

/** Resolve the current mode: pathname wins when explicit, else the
 *  stored preference, else grades. SSR-safe. */
export function resolveMode(pathname: string): MobileMode {
  const explicit = modeForPath(pathname)
  if (explicit) return explicit
  return readStoredMode() ?? 'grades'
}

/** Persist the mode for shared-route fallbacks + entry routing. Call
 *  this when the user explicitly picks via ModeSwitcherSheet, and on
 *  every navigation to a path with an explicit mode. */
export function storeMode(mode: MobileMode): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, mode)
}
