"use client"

import { useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import {
  exitMarkerKey, isAppReturnedEvent, shouldPauseOnReturn, shouldMarkExit,
  type AppLifecycleEvent, type ExitPlatform,
} from '@/lib/study/test-exit-guard'
import { isMicPromptRecent } from '@/lib/study/mic-prompt'

/**
 * Native-only: PAUSE a timed test when the student leaves the app.
 *
 * The decision logic is in `@/lib/study/test-exit-guard` and is unit
 * tested there. This hook is the wiring — Capacitor listeners, the
 * localStorage marker that survives the OS killing the app, and the
 * calls to `onAway` / `onReturn`.
 *
 * Web is untouched: `Capacitor.isNativePlatform()` is false in a
 * browser, every decision short-circuits on it, and no listener is
 * even registered.
 *
 * This used to call an `onExit` that ended the test. It does not any
 * more, and the difference is not cosmetic: ending ran the submit path,
 * so a student who checked a message mid-test came back to a scored,
 * `completed` session they had paid credits to generate.
 *
 * It also stops the clock itself, via `onAway`. The version that ended
 * tests deliberately did not — its comment read "the existing
 * visibilitychange handler already freezes the clock when the WebView
 * goes hidden", and nothing tested that claim. Rendering the real
 * TestSession and backgrounding it charges the student every second
 * they are away unless a `visibilitychange` happens to arrive, so the
 * one event we KNOW we have is the one that now freezes the clock.
 */
export function useAppExitGuard({
  sessionId, phase, timeLimitMinutes, isPaused, onAway, onReturn,
}: {
  sessionId: string
  /** TestSession phase machine. */
  phase: string
  /** Whole-test budget. 0 = untimed, guard stays off. */
  timeLimitMinutes: number
  /** The test is already paused — nothing to do on the next return. */
  isPaused: boolean
  /**
   * The app just left the screen. Stop the clock — synchronously, this
   * is the last code that runs before the WebView is suspended.
   */
  onAway: () => void
  /**
   * The app is back (or relaunched after being killed) with a pending
   * exit. `pause` true = they were away long enough to pause the test;
   * false = a blip inside the grace window, so just start the clock
   * again. Called once per trip away, any number of times per session.
   */
  onReturn: (pause: boolean) => void
}) {
  // Refs so the listener callbacks (registered once per session) always
  // read current values instead of a stale closure.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const timeLimitRef = useRef(timeLimitMinutes)
  timeLimitRef.current = timeLimitMinutes
  const onAwayRef = useRef(onAway)
  onAwayRef.current = onAway
  const onReturnRef = useRef(onReturn)
  onReturnRef.current = onReturn
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused

  const readMarker = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(exitMarkerKey(sessionId))
      if (!raw) return null
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : null
    } catch { return null }
  }, [sessionId])

  const clearMarker = useCallback(() => {
    try { localStorage.removeItem(exitMarkerKey(sessionId)) } catch { /* ignore */ }
  }, [sessionId])

  /** Marker present → pause the test, or just restart the clock. */
  const evaluatePendingExit = useCallback(() => {
    const exitedAt = readMarker()
    if (exitedAt == null) return
    const pause = shouldPauseOnReturn({
      exitedAt,
      now: Date.now(),
      phase: phaseRef.current,
      alreadyPaused: pausedRef.current,
    })
    // Not pausing AND not live: the test may simply not have loaded
    // yet, so leave the marker for the phase-change re-check below.
    if (!pause && phaseRef.current !== 'taking') return
    // Consumed. The marker carries "you were away" across a process
    // death, and this is that fact being acted on. The version that
    // ENDED tests left it behind on purpose, because the submit it
    // triggered cleared it later; there is no submit now, so a marker
    // left behind would re-fire on every phase change for the rest of
    // the test.
    clearMarker()
    onReturnRef.current(pause)
  }, [readMarker, clearMarker])

  // Re-check whenever the phase changes. Covers the case the listeners
  // cannot: the OS killed the app while it was backgrounded, so no
  // 'resume' ever reached this JS context — the test loads fresh and
  // the marker is still sitting in localStorage.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    evaluatePendingExit()
  }, [phase, evaluatePendingExit])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const platform = Capacitor.getPlatform() as ExitPlatform

    const handle = (event: AppLifecycleEvent) => {
      const ctx = {
        native: true,
        platform,
        phase: phaseRef.current,
        timeLimitMinutes: timeLimitRef.current,
        micPromptRecent: isMicPromptRecent(),
        alreadyPaused: pausedRef.current,
      }
      if (shouldMarkExit(ctx, event)) {
        // Both of these are synchronous on purpose: the WebView's JS is
        // suspended moments after the background event, so anything
        // async may never run.
        try { localStorage.setItem(exitMarkerKey(sessionId), String(Date.now())) } catch { /* quota */ }
        onAwayRef.current()
        return
      }
      if (isAppReturnedEvent(platform, event)) evaluatePendingExit()
    }

    const handles: Array<{ remove: () => Promise<void> }> = []
    let removed = false
    const track = (p: Promise<{ remove: () => Promise<void> }>) => {
      void p.then(h => {
        if (removed) { void h.remove(); return }
        handles.push(h)
      }).catch(() => { /* plugin unavailable — guard simply stays off */ })
    }
    track(App.addListener('appStateChange', s => handle({ type: 'appStateChange', isActive: s.isActive })))
    track(App.addListener('pause', () => handle({ type: 'pause' })))
    track(App.addListener('resume', () => handle({ type: 'resume' })))

    return () => {
      removed = true
      handles.forEach(h => { void h.remove() })
    }
  }, [sessionId, evaluatePendingExit])
}
