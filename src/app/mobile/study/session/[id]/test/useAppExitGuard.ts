"use client"

import { useCallback, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import {
  exitMarkerKey, isAppReturnedEvent, shouldEndOnReturn, shouldMarkExit,
  type AppLifecycleEvent, type ExitPlatform,
} from '@/lib/study/test-exit-guard'
import { isMicPromptRecent } from '@/lib/study/mic-prompt'

/**
 * Native-only: end a timed test when the student leaves the app.
 *
 * The decision logic is in `@/lib/study/test-exit-guard` and is unit
 * tested there. This hook is the wiring — Capacitor listeners, the
 * localStorage marker that survives the OS killing the app, and the
 * single call to `onExit`.
 *
 * Web is untouched: `Capacitor.isNativePlatform()` is false in a
 * browser, every decision short-circuits on it, and no listener is
 * even registered.
 *
 * It deliberately does NOT touch TestSession's timer: the existing
 * `visibilitychange` handler already freezes the clock when the WebView
 * goes hidden, and the Listening player's `paused` prop is its own
 * notion of paused. Adding a third would be a competing source of
 * truth for the same fact.
 */
export function useAppExitGuard({
  sessionId, phase, timeLimitMinutes, onExit,
}: {
  sessionId: string
  /** TestSession phase machine. */
  phase: string
  /** Whole-test budget. 0 = untimed, guard stays off. */
  timeLimitMinutes: number
  /** Called at most once: the test must now end because the app was left. */
  onExit: () => void
}) {
  // Refs so the listener callbacks (registered once per session) always
  // read current values instead of a stale closure.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const timeLimitRef = useRef(timeLimitMinutes)
  timeLimitRef.current = timeLimitMinutes
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const firedRef = useRef(false)

  const readMarker = useCallback((): number | null => {
    try {
      const raw = localStorage.getItem(exitMarkerKey(sessionId))
      if (!raw) return null
      const parsed = Number(raw)
      return Number.isFinite(parsed) ? parsed : null
    } catch { return null }
  }, [sessionId])

  /** Marker present and old enough → end the test, once. */
  const evaluatePendingExit = useCallback(() => {
    const exitedAt = readMarker()
    if (exitedAt == null) return
    const decision = shouldEndOnReturn({
      exitedAt,
      now: Date.now(),
      phase: phaseRef.current,
      alreadyEnded: firedRef.current,
    })
    if (decision) {
      firedRef.current = true
      // The marker is NOT cleared here. It is cleared only when the
      // submit succeeds (TestSession clears it alongside the other
      // resume keys), so an app killed between here and the POST still
      // ends the test on the next mount instead of handing back a live
      // test with the clock running.
      onExitRef.current()
      return
    }
    // Present but inside the grace window while the test is live →
    // spurious event, forget it. (When the phase is not 'taking' the
    // marker is left alone: the test may not have loaded yet.)
    if (phaseRef.current === 'taking') {
      try { localStorage.removeItem(exitMarkerKey(sessionId)) } catch { /* ignore */ }
    }
  }, [readMarker, sessionId])

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
        alreadyEnded: firedRef.current,
      }
      if (shouldMarkExit(ctx, event)) {
        // Synchronous on purpose: the WebView's JS is suspended moments
        // after the background event, so anything async may never run.
        try { localStorage.setItem(exitMarkerKey(sessionId), String(Date.now())) } catch { /* quota */ }
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
