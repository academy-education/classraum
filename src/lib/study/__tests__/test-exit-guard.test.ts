/** @jest-environment node */
/**
 * The decision the timed-test exit guard makes, and every way it must
 * NOT fire.
 *
 * These assertions are written to fail loudly if the two guards that
 * matter are removed — mutation-tested by hand:
 *   - invert `native` (make the web path fire): "web is untouched" and
 *     "a browser tab never ends a test" fail.
 *   - delete the `phase !== 'taking'` guard: the reviewing/submitting/
 *     generating cases fail.
 * See the report in the PR/session notes for the recorded runs.
 */
import {
  EXIT_GRACE_MS, isAppLeftEvent, isAppReturnedEvent, shouldPauseOnReturn, shouldMarkExit,
  exitMarkerKey, type AppLifecycleEvent, type ExitGuardContext,
} from '../test-exit-guard'

const live = (over: Partial<ExitGuardContext> = {}): ExitGuardContext => ({
  native: true,
  platform: 'ios',
  phase: 'taking',
  timeLimitMinutes: 35,
  micPromptRecent: false,
  alreadyPaused: false,
  ...over,
})

const BACKGROUNDED: AppLifecycleEvent = { type: 'pause' }
const RESIGNED_ACTIVE: AppLifecycleEvent = { type: 'appStateChange', isActive: false }

describe('isAppLeftEvent — the authoritative event differs per platform', () => {
  it('iOS: didEnterBackground (pause) means the student left', () => {
    expect(isAppLeftEvent('ios', { type: 'pause' })).toBe(true)
  })

  it('iOS: willResignActive (appStateChange false) does NOT — it fires for the mic permission alert, Control Centre and call banners', () => {
    expect(isAppLeftEvent('ios', { type: 'appStateChange', isActive: false })).toBe(false)
  })

  it('Android: onStop (appStateChange false) means the student left', () => {
    expect(isAppLeftEvent('android', { type: 'appStateChange', isActive: false })).toBe(true)
  })

  it('Android: onPause does NOT — the runtime permission dialog leaves the WebView visible underneath', () => {
    expect(isAppLeftEvent('android', { type: 'pause' })).toBe(false)
  })

  it('web: no event ever counts', () => {
    for (const e of [
      { type: 'pause' } as const,
      { type: 'appStateChange', isActive: false } as const,
      { type: 'resume' } as const,
    ]) {
      expect(isAppLeftEvent('web', e)).toBe(false)
    }
  })
})

describe('isAppReturnedEvent', () => {
  it('resume and appStateChange(true) both count on native', () => {
    expect(isAppReturnedEvent('ios', { type: 'resume' })).toBe(true)
    expect(isAppReturnedEvent('android', { type: 'appStateChange', isActive: true })).toBe(true)
  })
  it('never counts on web', () => {
    expect(isAppReturnedEvent('web', { type: 'resume' })).toBe(false)
    expect(isAppReturnedEvent('web', { type: 'appStateChange', isActive: true })).toBe(false)
  })
})

describe('shouldMarkExit — native, in-progress, timed', () => {
  it('fires for a backgrounded in-progress timed test on iOS', () => {
    expect(shouldMarkExit(live(), BACKGROUNDED)).toBe(true)
  })

  it('fires for a backgrounded in-progress timed test on Android', () => {
    expect(shouldMarkExit(live({ platform: 'android' }), RESIGNED_ACTIVE)).toBe(true)
  })

  // ── the native gate ──────────────────────────────────────────────
  it('web is untouched: a non-native context never fires, whatever the event', () => {
    for (const e of [BACKGROUNDED, RESIGNED_ACTIVE]) {
      expect(shouldMarkExit(live({ native: false, platform: 'web' }), e)).toBe(false)
      // Even if a build somehow reported a native platform string while
      // isNativePlatform() was false, `native` alone must stop it.
      expect(shouldMarkExit(live({ native: false, platform: 'ios' }), e)).toBe(false)
      expect(shouldMarkExit(live({ native: false, platform: 'android' }), e)).toBe(false)
    }
  })

  it('a browser tab never triggers the guard, even mid-question', () => {
    expect(shouldMarkExit(
      live({ native: false, platform: 'web', phase: 'taking', timeLimitMinutes: 35 }),
      BACKGROUNDED,
    )).toBe(false)
  })

  // ── the in-progress gate ─────────────────────────────────────────
  it.each(['detecting', 'resuming', 'preparing', 'generating', 'submitting', 'reviewing', 'error'])(
    'does not fire while the phase is %s',
    phase => {
      expect(shouldMarkExit(live({ phase }), BACKGROUNDED)).toBe(false)
    },
  )

  it('does not fire for an untimed test', () => {
    expect(shouldMarkExit(live({ timeLimitMinutes: 0 }), BACKGROUNDED)).toBe(false)
  })

  it('does not mark an exit while the test is already paused', () => {
    expect(shouldMarkExit(live({ alreadyPaused: true }), BACKGROUNDED)).toBe(false)
  })

  // ── the false-positive gate ──────────────────────────────────────
  it('does not fire while a mic permission prompt is on screen', () => {
    expect(shouldMarkExit(live({ micPromptRecent: true }), BACKGROUNDED)).toBe(false)
    expect(shouldMarkExit(live({ platform: 'android', micPromptRecent: true }), RESIGNED_ACTIVE)).toBe(false)
  })

  it('an iOS interruption that leaves the app on screen (call banner, Control Centre, permission alert) does not fire', () => {
    expect(shouldMarkExit(live({ platform: 'ios' }), RESIGNED_ACTIVE)).toBe(false)
  })

  it('an Android transient pause (permission dialog) does not fire', () => {
    expect(shouldMarkExit(live({ platform: 'android' }), BACKGROUNDED)).toBe(false)
  })

  it('a return event never marks an exit', () => {
    expect(shouldMarkExit(live(), { type: 'resume' })).toBe(false)
    expect(shouldMarkExit(live(), { type: 'appStateChange', isActive: true })).toBe(false)
  })
})

describe('shouldPauseOnReturn — the grace window', () => {
  const t0 = 1_700_000_000_000

  it('pauses the test when the student was away longer than the grace period', () => {
    expect(shouldPauseOnReturn({
      exitedAt: t0, now: t0 + EXIT_GRACE_MS, phase: 'taking', alreadyPaused: false,
    })).toBe(true)
    expect(shouldPauseOnReturn({
      exitedAt: t0, now: t0 + 60_000, phase: 'taking', alreadyPaused: false,
    })).toBe(true)
  })

  it('forgives a blip shorter than the grace period', () => {
    expect(shouldPauseOnReturn({
      exitedAt: t0, now: t0 + EXIT_GRACE_MS - 1, phase: 'taking', alreadyPaused: false,
    })).toBe(false)
  })

  it('does nothing without a pending marker', () => {
    expect(shouldPauseOnReturn({
      exitedAt: null, now: t0 + 60_000, phase: 'taking', alreadyPaused: false,
    })).toBe(false)
  })

  it('does not fire once the test is no longer in progress', () => {
    for (const phase of ['submitting', 'reviewing', 'error', 'detecting']) {
      expect(shouldPauseOnReturn({
        exitedAt: t0, now: t0 + 60_000, phase, alreadyPaused: false,
      })).toBe(false)
    }
  })

  it('does not re-pause a test that is already paused', () => {
    expect(shouldPauseOnReturn({
      exitedAt: t0, now: t0 + 60_000, phase: 'taking', alreadyPaused: true,
    })).toBe(false)
  })

  it('a clock that jumped backwards does not read as time away', () => {
    expect(shouldPauseOnReturn({
      exitedAt: t0, now: t0 - 60_000, phase: 'taking', alreadyPaused: false,
    })).toBe(false)
  })

  it('three seconds is short enough to be honest about: it is a blip absorber, not a lookup window', () => {
    // Documents the constant so a future change to it is deliberate.
    expect(EXIT_GRACE_MS).toBe(3000)
  })
})

describe('exitMarkerKey', () => {
  it('is namespaced per session alongside the other resume keys', () => {
    expect(exitMarkerKey('abc')).toBe('study:test:abc:exitedAt')
  })
})
