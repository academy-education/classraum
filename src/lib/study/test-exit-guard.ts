/**
 * "The student left the app during a timed test" — decision logic.
 *
 * ─────────────────────────────────────────────────────────────────
 * What leaving the app COSTS the student: the clock, and nothing else
 * ─────────────────────────────────────────────────────────────────
 * This guard used to END the test — it ran the submit path with
 * whatever had been answered so far and wrote
 * `ended_reason = 'app_exited'` on the session. Two production rows
 * show what that meant in practice: a full_test opened, backgrounded,
 * and marked `completed` with a score of 0/20 inside ninety seconds.
 * The test generation had already been paid for in credits, and there
 * was no way back into it.
 *
 * It PAUSES now. Backgrounding freezes the clock and puts the paused
 * overlay up; the student taps Resume and carries on. The anti-cheat
 * value that mattered — you cannot gain answering time by leaving to
 * look something up — is entirely in the freeze, which the timer does
 * anyway. Ending the test never added anything to that; it only added
 * a way to lose a test.
 *
 * Pure by design: every input is passed in, nothing is read from
 * Capacitor, the DOM or localStorage here. The wiring lives in
 * `useAppExitGuard`; this file is what the unit tests attack.
 *
 * ─────────────────────────────────────────────────────────────────
 * Why the authoritative event is DIFFERENT on iOS and Android
 * ─────────────────────────────────────────────────────────────────
 * @capacitor/app 6.x maps its two lifecycle events onto different
 * native callbacks per platform. Read from the plugin sources in
 * node_modules (not from the docs, which describe neither):
 *
 *   iOS — node_modules/@capacitor/app/ios/Sources/AppPlugin/AppPlugin.swift
 *     appStateChange{isActive:false}  ← UIApplication.willResignActive
 *     pause                           ← UIApplication.didEnterBackground
 *
 *   Android — .../android/.../app/AppPlugin.java + @capacitor/android
 *             BridgeActivity.java
 *     appStateChange{isActive:false}  ← Activity.onStop (activityDepth 0)
 *     pause                           ← Activity.onPause
 *
 * `willResignActive` on iOS fires for things that never take the
 * student out of the app: the Control Centre pull-down, a notification
 * banner, an incoming-call banner, and — the one that matters here —
 * the system microphone permission alert that `getUserMedia` raises on
 * the first Speaking item. Ending a test on it would kill a Speaking
 * section the moment the student was asked for the mic.
 * `didEnterBackground` fires only when the app actually leaves the
 * screen, so on iOS the `pause` event is the honest signal.
 *
 * Android is the mirror image. `onPause` fires for the runtime
 * permission dialog (a dialog-themed activity that leaves the WebView
 * visible underneath) and for any transient overlay, while `onStop`
 * fires when the activity is no longer visible at all — a real
 * app-switch or Home press. So on Android `appStateChange(false)` is
 * the honest signal and `pause` is the noisy one.
 *
 * Neither of those platform behaviours could be verified on a device
 * in the session that wrote this, hence the second layer: a grace
 * period, plus an explicit suppression while a mic prompt is on
 * screen. Both are cheap; a false positive costs a student their test.
 */

export type ExitPlatform = 'ios' | 'android' | 'web'

/** The @capacitor/app events we listen to, normalised. */
export type AppLifecycleEvent =
  | { type: 'appStateChange'; isActive: boolean }
  | { type: 'pause' }
  | { type: 'resume' }

/**
 * How long the app must stay away before leaving counts as leaving.
 *
 * Deliberately short: three seconds is not enough to look anything up,
 * but it absorbs an event that immediately reverses itself — an app
 * switcher peek, or an OEM that stops the activity for a permission
 * dialog the student dismisses instantly. Below this we don't even
 * bother raising the paused overlay; the timer freeze during those
 * three seconds stands on its own.
 */
export const EXIT_GRACE_MS = 3000

/**
 * How long after a `getUserMedia` call a background event is still
 * attributed to the permission prompt rather than to the student.
 * The prompt is answered once per install, so the window an exploit
 * could hide in is one dialog wide.
 */
export const MIC_PROMPT_SETTLE_MS = 2500

/**
 * Does this lifecycle event mean the app actually left the screen?
 * See the platform notes at the top of the file.
 */
export function isAppLeftEvent(platform: ExitPlatform, event: AppLifecycleEvent): boolean {
  if (platform === 'ios') return event.type === 'pause'
  if (platform === 'android') return event.type === 'appStateChange' && event.isActive === false
  // Web/PWA: the browser tab already has `visibilitychange`, and this
  // feature must not change web behaviour at all.
  return false
}

/** Did the app just come back to the foreground? */
export function isAppReturnedEvent(platform: ExitPlatform, event: AppLifecycleEvent): boolean {
  if (platform === 'web') return false
  if (event.type === 'resume') return true
  return event.type === 'appStateChange' && event.isActive === true
}

export interface ExitGuardContext {
  /** Capacitor.isNativePlatform(). Web must be untouched. */
  native: boolean
  platform: ExitPlatform
  /** TestSession's phase machine. Only 'taking' is in progress. */
  phase: string
  /** Whole-test budget in minutes. 0/absent = untimed → not our business. */
  timeLimitMinutes: number
  /** A mic permission prompt is open, or closed within the settle window. */
  micPromptRecent: boolean
  /** The test is ALREADY paused, so there is nothing to record. */
  alreadyPaused: boolean
}

/**
 * Step 1 — on a lifecycle event, should we record that the student
 * left? Recording is not pausing: the decision is made on return, by
 * `shouldPauseOnReturn`, once we know how long they were gone.
 */
export function shouldMarkExit(ctx: ExitGuardContext, event: AppLifecycleEvent): boolean {
  if (!ctx.native) return false
  if (ctx.phase !== 'taking') return false
  if (!(ctx.timeLimitMinutes > 0)) return false
  if (ctx.alreadyPaused) return false
  if (ctx.micPromptRecent) return false
  return isAppLeftEvent(ctx.platform, event)
}

export interface ReturnContext {
  /** Timestamp recorded by `shouldMarkExit`; null = no exit pending. */
  exitedAt: number | null
  now: number
  graceMs?: number
  phase: string
  /** Already paused (manually, or by an earlier trip away). */
  alreadyPaused: boolean
}

/**
 * Step 2 — the app is back (or the page has just re-mounted after the
 * OS killed it). Was the student away long enough to pause the test?
 *
 * Evaluated on RETURN rather than at background time on purpose: the
 * WebView's JS is frozen while the app is backgrounded, so a timer
 * armed on the way out would not run. Deciding here also means the
 * elapsed away time is measured, not assumed.
 *
 * Unlike the version that ended the test, this may answer `true` any
 * number of times in a session — a student who leaves the app four
 * times comes back to a paused test four times.
 */
export function shouldPauseOnReturn(ctx: ReturnContext): boolean {
  if (ctx.exitedAt == null) return false
  if (ctx.phase !== 'taking') return false
  if (ctx.alreadyPaused) return false
  const graceMs = ctx.graceMs ?? EXIT_GRACE_MS
  // A clock that went backwards (device time change) must not be read
  // as "gone for a negative time"; treat it as not yet proven.
  const awayMs = ctx.now - ctx.exitedAt
  return awayMs >= graceMs
}

/** localStorage key holding the pending-exit timestamp. */
export function exitMarkerKey(sessionId: string): string {
  return `study:test:${sessionId}:exitedAt`
}

/**
 * The value that USED to be persisted on study_sessions.ended_reason
 * when leaving the app ended a test. Nothing writes it any more — it
 * stays because rows written before that change still carry it and the
 * submit route still accepts it.
 */
export const EXIT_END_REASON = 'app_exited' as const
export type TestEndReason = typeof EXIT_END_REASON
