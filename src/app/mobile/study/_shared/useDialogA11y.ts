'use client'

import { useEffect, useRef } from 'react'

/**
 * useDialogA11y — keyboard plumbing for the study surface's hand-rolled
 * sheets and dialogs (no Radix Dialog is installed).
 *
 *   const ref = useDialogA11y(open, onClose)
 *   <div ref={ref} role="dialog" aria-modal="true" aria-labelledby=…>
 *
 *  • Escape calls `onClose`
 *  • Tab / Shift+Tab stay inside the dialog
 *  • focus moves into the dialog when it opens, and back to the opener
 *    when it closes
 *
 * Same behaviour as admin's useModalA11y, with two differences that matter
 * here: it takes an `active` flag (most study sheets stay mounted and render
 * null while closed), and `onClose` is read through a ref so an inline
 * callback does not re-run the effect — which would yank focus back to the
 * first control on every parent re-render. It does not touch body scroll;
 * none of these sheets locked it before and this is not the place to start.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusableSelector =
      'a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(el => !el.hasAttribute('disabled') && el.getClientRects().length > 0)

    if (!node.contains(document.activeElement)) {
      if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1')
      node.focus({ preventScroll: true })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) { e.preventDefault(); return }
      const first = els[0]
      const last = els[els.length - 1]
      const activeEl = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (activeEl === first || activeEl === node || !node.contains(activeEl)) {
          e.preventDefault(); last.focus()
        }
      } else if (activeEl === last || !node.contains(activeEl)) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try { previouslyFocused?.focus?.({ preventScroll: true }) } catch { /* opener may be gone */ }
    }
  }, [active])

  return ref
}
