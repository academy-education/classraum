"use client"

import { ReactNode, useEffect, useRef, useState } from 'react'
import { PathMascot } from './PathMascot'

/** One full head-tilt cycle of the thinking animation. */
export const MASCOT_CYCLE_MS = 3200
/** Grace window before the mascot commits to appearing. */
const APPEAR_DELAY_MS = 300

/**
 * Show/hide gate for the study loading mascot with ONE rule everywhere:
 * Raumi either never appears (load finished inside the 300ms grace
 * window) or he appears and performs a full animation cycle — no
 * split-second flashes, regardless of how fast the fetch resolves.
 *
 * Usage:
 *   const showLoader = useMascotGate(loading)
 *   if (loading || showLoader) {
 *     return showLoader ? <MascotLoader ... /> : <div /> // grace: blank
 *   }
 */
export function useMascotGate(
  loading: boolean,
  delayMs: number = APPEAR_DELAY_MS,
  minVisibleMs: number = MASCOT_CYCLE_MS,
): boolean {
  const [show, setShow] = useState(false)
  const shownAt = useRef<number | null>(null)

  useEffect(() => {
    let timer: number | undefined
    if (loading && !show) {
      timer = window.setTimeout(() => {
        shownAt.current = Date.now()
        setShow(true)
      }, delayMs)
    } else if (!loading && show) {
      const left = minVisibleMs - (Date.now() - (shownAt.current ?? 0))
      if (left > 0) {
        timer = window.setTimeout(() => { setShow(false); shownAt.current = null }, left)
      } else {
        setShow(false)
        shownAt.current = null
      }
    }
    return () => { if (timer) window.clearTimeout(timer) }
  }, [loading, show, delayMs, minVisibleMs])

  return show
}

/**
 * Standard study-mode wait state: Raumi thinking + a label, with a
 * quick fade-in. Pair with useMascotGate (page-data loads) or a
 * fetcher-side hold (generation waits) so he always completes a cycle.
 */
export function MascotLoader({ label, className = '' }: {
  label?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center px-6 ${className}`}>
      <div className="flex flex-col items-center gap-3 text-sm text-gray-500 text-center animate-fade-in">
        <PathMascot state="thinking" size={96} />
        {label && <div>{label}</div>}
      </div>
    </div>
  )
}
