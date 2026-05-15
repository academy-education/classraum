'use client'

import { useEffect, useRef } from 'react'

/**
 * usePolling — calls `fn` every `intervalMs` ms while `enabled` is true.
 *
 *   usePolling(loadData, { intervalMs: 30_000, enabled: true })
 *
 * Behavior:
 * - Auto-pauses when the tab is hidden (Page Visibility API) so we don't
 *   waste server cycles on tabs nobody's looking at.
 * - Resumes immediately on visibility change.
 * - Cleans up the interval on unmount or when `enabled` flips to false.
 * - `fn` is captured in a ref, so callers can pass an inline arrow function
 *   without re-arming the interval on every render.
 */
export function usePolling(
  fn: () => void | Promise<void>,
  { intervalMs, enabled = true }: { intervalMs: number; enabled?: boolean },
) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    let id: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (id != null) return
      id = setInterval(() => { fnRef.current() }, intervalMs)
    }
    const stop = () => {
      if (id != null) {
        clearInterval(id)
        id = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // When the tab comes back, fire once immediately to catch up,
        // then keep the interval going.
        fnRef.current()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, intervalMs])
}
