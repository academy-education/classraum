"use client"

import { useCallback, useRef, useState } from 'react'
import type { TouchEvent } from 'react'
import { hapticTap } from '@/lib/nativeHaptics'

/**
 * Pull-to-refresh for a scroll container — the native gesture students
 * expect from an app, not a web page. Attach `handlers` to the scrollable
 * element and drive `scrollRef` to it; render the indicator off
 * `pullDistance` / `refreshing` and translate the content down by
 * `pullDistance`.
 *
 * Only engages when the container is scrolled to the very top, so it never
 * fights a normal upward scroll. Applies rubber-band damping and a light
 * haptic when the pull crosses the release threshold.
 */
const THRESHOLD = 72       // px of (damped) pull needed to trigger a refresh
const MAX_PULL = 96        // cap so the content never slides too far
const DAMP = 0.5           // rubber-band resistance on the raw finger delta

export function usePullToRefresh(onRefresh: (() => void | Promise<void>) | undefined) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const startY = useRef<number | null>(null)
  const armedRef = useRef(false)      // began the gesture at scrollTop 0
  const crossedRef = useRef(false)    // already fired the threshold haptic
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!onRefresh || refreshing) return
    // Only arm when the list is at the very top; otherwise this is a scroll.
    armedRef.current = (scrollRef.current?.scrollTop ?? 1) <= 0
    startY.current = armedRef.current ? e.touches[0].clientY : null
    crossedRef.current = false
  }, [onRefresh, refreshing])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!armedRef.current || startY.current === null || refreshing) return
    const raw = e.touches[0].clientY - startY.current
    if (raw <= 0) { setPullDistance(0); return }        // pulling up → ignore
    const damped = Math.min(MAX_PULL, raw * DAMP)
    setPullDistance(damped)
    if (!crossedRef.current && damped >= THRESHOLD) {
      crossedRef.current = true
      hapticTap()
    }
  }, [refreshing])

  const onTouchEnd = useCallback(async () => {
    if (!armedRef.current || refreshing) { setPullDistance(0); return }
    armedRef.current = false
    startY.current = null
    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true)
      setPullDistance(THRESHOLD)   // hold the spinner at the threshold row
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, refreshing, onRefresh])

  const enabled = !!onRefresh
  return {
    scrollRef,
    pullDistance,
    refreshing,
    threshold: THRESHOLD,
    /** Spread onto the scroll container (no-ops when onRefresh is undefined). */
    handlers: enabled ? { onTouchStart, onTouchMove, onTouchEnd } : {},
  }
}
