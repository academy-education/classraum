"use client"

import { useEffect } from 'react'

/**
 * Component to disable native browser pull-to-refresh on mobile devices
 * Uses JavaScript event prevention as a fallback for browsers that don't respect CSS overscroll-behavior
 */
export function DisablePullToRefresh() {
  useEffect(() => {
    // Prevent pull-to-refresh on the document level
    let lastTouchY = 0
    let preventPullToRefresh = false

    const touchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      lastTouchY = e.touches[0].clientY

      // Prevent pull-to-refresh only at the top of the page
      preventPullToRefresh = window.scrollY === 0
    }

    const touchMove = (e: TouchEvent) => {
      if (!preventPullToRefresh) return

      const touchY = e.touches[0].clientY
      const touchYDelta = touchY - lastTouchY
      lastTouchY = touchY

      // If scrolling down (pulling down) at the top of the page, prevent it
      if (touchYDelta > 0) {
        e.preventDefault()
      }
    }

    // Add event listeners with passive: false to allow preventDefault
    document.addEventListener('touchstart', touchStart, { passive: false })
    document.addEventListener('touchmove', touchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', touchStart)
      document.removeEventListener('touchmove', touchMove)
    }
  }, [])

  return null // This component doesn't render anything
}
