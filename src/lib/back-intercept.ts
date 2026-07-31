/**
 * Lets one surface take ownership of the Android hardware back button.
 *
 * WHY A SHARED SLOT AND NOT A SECOND LISTENER. Capacitor fires EVERY
 * registered `backButton` listener. A component that adds its own does not
 * stop `useNativeApp`'s from also running, so the press would still reach
 * `router.back()` or `App.exitApp()` — two handlers, one action, and the
 * newer one silently loses. That is the same shape as the duplicate
 * grade-batch call recorded in CLAUDE.md. So there is exactly ONE listener
 * (in useNativeApp) and it consults this module first.
 *
 * WHAT IT PREVENTS. During a timed test, back was destructive either way:
 * with history it navigated off the test, and without it called
 * `App.exitApp()` — which finishes the activity, fires onStop, and that is
 * precisely the authoritative end-the-test event on Android
 * (test-exit-guard.ts). So the most-pressed button on the platform was an
 * accidental trigger for "your exam is over". Now it opens the submit
 * confirmation instead, turning an accident into a decision.
 *
 * A single slot, not an array: only one surface can meaningfully own back at
 * a time (the topmost blocking view), and a slot makes "who owns it"
 * unambiguous. The cost is that a caller MUST clear it on unmount, or back
 * stays dead for the rest of the session — hence the paired
 * set/clear in a single effect, and the test that asserts it.
 *
 * iOS is unaffected: there is no hardware back, and Capacitor's WKWebView
 * does not enable swipe-back navigation by default.
 */

let interceptor: (() => void) | null = null

/** Take ownership of back. Pass null to release it. */
export function setBackInterceptor(fn: (() => void) | null): void {
  interceptor = fn
}

/**
 * Run the current owner, if any.
 * @returns true when the press was consumed — the caller must then do
 *          NOTHING else, in particular neither navigate nor exit.
 */
export function runBackInterceptor(): boolean {
  if (!interceptor) return false
  interceptor()
  return true
}

/** Test-only reset, so one case cannot leak an owner into the next. */
export function __resetBackInterceptor(): void {
  interceptor = null
}
