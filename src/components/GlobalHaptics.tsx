"use client"

import { useEffect } from 'react'
import { hapticTap } from '@/lib/nativeHaptics'
import { shouldHapticOnClick } from '@/lib/haptic-targets'

/**
 * One listener, every button in the app.
 *
 * Mounted once in the root layout. See lib/haptic-targets.ts for why this
 * is delegated rather than per-component: haptics were first added to the
 * shared <Button>, which study mode — 185 raw <button> elements — imports
 * in zero files.
 *
 * WHY `click` AND NOT `pointerdown`.
 *
 * A native app buzzes on touch-down, which is a touch nicer, and that is
 * the tempting choice. But pointerdown also fires at the START OF EVERY
 * SCROLL that happens to begin on top of a button — and in a list of
 * tappable cards, that is most scrolls. The app would buzz constantly
 * while the user was doing nothing but reading. `click` only fires when a
 * press actually resolves into an activation, so scrolls and drags are
 * silently ignored. Slightly later, and correct.
 *
 * CAPTURE PHASE, deliberately: a handler that calls stopPropagation (a few
 * do, to keep a card's onClick from firing behind a button inside it)
 * would otherwise swallow the feedback for that control.
 *
 * Double-firing with components that call hapticTap themselves is handled
 * in nativeHaptics by a 60ms coalescing window, not by trying to keep two
 * lists in sync.
 */
export function GlobalHaptics() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (shouldHapticOnClick(e.target)) hapticTap()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
