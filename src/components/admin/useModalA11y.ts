'use client'

import { useEffect, useRef } from 'react'

/**
 * useModalA11y — basic accessibility plumbing for ad-hoc modal containers.
 *
 *   const dialogRef = useModalA11y(onClose)
 *   <div ref={dialogRef} role="dialog" aria-modal="true" ...>
 *
 * Behavior:
 *  • Escape key calls `onClose`
 *  • Tab / Shift+Tab cycle focus within the modal (focus trap)
 *  • On mount: moves focus to the first focusable element inside
 *  • On unmount: restores focus to whatever had focus before the modal opened
 *  • Locks body scroll while the modal is open
 *
 * Designed for hand-rolled `<div role="dialog">` modals. The shared
 * <ModalShell> primitive in the main app already handles this — this hook
 * gives the admin section the same behavior without a full migration.
 */
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Remember whatever was focused so we can restore on close. This avoids
    // the classic "modal closes and focus jumps to the top of the page" bug.
    const previouslyFocused = (document.activeElement as HTMLElement | null)

    // Lock body scroll. Restored in cleanup. Saving the prior value lets us
    // play nicely with nested modals — though admin doesn't really nest them.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Selector for elements that can receive keyboard focus.
    const focusableSelector =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(focusableSelector))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)

    // Move focus into the modal — first focusable element. If the modal
    // contains nothing focusable (rare), focus the dialog itself.
    const initial = focusables()[0]
    if (initial) {
      initial.focus()
    } else {
      node.setAttribute('tabindex', '-1')
      node.focus()
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Trap Tab navigation inside the modal. Recompute on each Tab press
      // so focusables added/removed dynamically (e.g. step wizards) work.
      const els = focusables()
      if (els.length === 0) {
        e.preventDefault()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey) {
        if (active === first || !node.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last || !node.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      // Best-effort: restore focus to what was focused before we opened.
      try { previouslyFocused?.focus?.() } catch { /* element may be gone */ }
    }
  }, [onClose])

  return ref
}
