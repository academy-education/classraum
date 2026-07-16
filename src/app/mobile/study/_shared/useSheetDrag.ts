"use client"

import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, TouchEvent } from 'react'
import { hapticTap } from '@/lib/nativeHaptics'

/**
 * Drag-down-to-dismiss for a bottom sheet — the native gesture students
 * expect: grab the sheet (usually by its handle) and fling it down to
 * close. Spread `handleProps` onto the drag zone (the grab handle / header
 * row) and `sheetStyle` onto the sheet container so it tracks the finger,
 * snaps back when the pull is short, and closes past the threshold.
 *
 * Downward drag is 1:1 (feels physical); upward is ignored so the sheet
 * never floats above its resting position. A light haptic fires once the
 * drag crosses the dismiss threshold, matching iOS sheet behavior.
 */
const THRESHOLD = 96   // px of downward drag needed to dismiss on release

export function useSheetDrag(onClose: () => void) {
  const startY = useRef<number | null>(null)
  const crossedRef = useRef(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const onTouchStart = useCallback((e: TouchEvent) => {
    startY.current = e.touches[0].clientY
    crossedRef.current = false
    setDragging(true)
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { setOffset(0); return }   // pulling up → ignore
    setOffset(delta)
    if (!crossedRef.current && delta >= THRESHOLD) {
      crossedRef.current = true
      hapticTap()
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    setDragging(false)
    const shouldClose = offset >= THRESHOLD
    startY.current = null
    if (shouldClose) {
      onClose()
      // Reset after the parent unmounts / animates out so a reopen starts clean.
      setOffset(0)
    } else {
      setOffset(0)
    }
  }, [offset, onClose])

  const sheetStyle: CSSProperties = offset > 0
    ? { transform: `translateY(${offset}px)`, transition: dragging ? 'none' : undefined }
    : {}

  return {
    /** Spread onto the grab-handle / header drag zone. */
    handleProps: { onTouchStart, onTouchMove, onTouchEnd },
    /** Merge onto the sheet container's style. */
    sheetStyle,
    dragging,
    offset,
  }
}
