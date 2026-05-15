'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * useLiveAnnounce — small hook that exposes:
 *   1. an `announce(text)` function callers fire on noteworthy events
 *      ("Loaded 50 academies", "Settlement refunded", "Failed to update")
 *   2. a `<LiveRegion />` element callers render once near the top of their
 *      tree. Screen readers will read its content aloud whenever it changes.
 *
 *   const { announce, LiveRegion } = useLiveAnnounce()
 *   ...
 *   useEffect(() => {
 *     if (!loading && data) announce(`Loaded ${data.length} rows`)
 *   }, [loading, data])
 *   return <>...<LiveRegion />...</>
 *
 * Behavior:
 * - Uses `aria-live="polite"` so announcements don't interrupt other speech.
 * - Visually hidden; only announced. The text rotates between two slots so
 *   identical messages still trigger an announcement on repeat.
 */
export function useLiveAnnounce() {
  const [textA, setTextA] = useState('')
  const [textB, setTextB] = useState('')
  const slotRef = useRef<'a' | 'b'>('a')

  const announce = useCallback((text: string) => {
    if (!text) return
    if (slotRef.current === 'a') {
      setTextB('')
      setTextA(text)
      slotRef.current = 'b'
    } else {
      setTextA('')
      setTextB(text)
      slotRef.current = 'a'
    }
  }, [])

  // Memo'd component. Render this somewhere in the tree (typically just
  // inside the page root). It's visually hidden — `sr-only` keeps it out
  // of the visual layout but readable by assistive tech.
  const LiveRegion = useCallback(() => (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <div>{textA}</div>
      <div>{textB}</div>
    </div>
  ), [textA, textB])

  // Clear announcements after 5s so old text doesn't pile up if a screen
  // reader starts navigating into the live region.
  useEffect(() => {
    if (!textA && !textB) return
    const id = setTimeout(() => {
      setTextA('')
      setTextB('')
    }, 5_000)
    return () => clearTimeout(id)
  }, [textA, textB])

  return { announce, LiveRegion }
}
