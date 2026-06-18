"use client"

import React from 'react'

/**
 * Wraps a live-rendered real component so clicks, form submits, and
 * keyboard activations don't fire the underlying handlers. Used by the
 * help center where we render real modals/pages for visual reference but
 * don't want navigation, submission, or state changes.
 *
 * - `onClickCapture` runs before any descendant's onClick. We
 *   stopPropagation + preventDefault so nothing inside fires.
 * - `onSubmitCapture` does the same for form submissions.
 * - `onKeyDownCapture` blocks Enter/Space on focused buttons.
 *
 * Hover and focus styles still work because we're not blocking pointer
 * events — only click side-effects. Inputs still accept typing into
 * their local state (uncontrolled or controlled) because keystrokes
 * aren't suppressed.
 */
export function NonFunctional({ children }: { children: React.ReactNode }) {
  // Radix Select / Popover / Dialog open on pointer-down (not click), so
  // we need pointer-down + click-down captures. Also block pointer-down
  // entirely on roles that open menus (combobox, button) so Radix never
  // even tries to open the floating UI. Inputs stay usable because their
  // type is 'text' / 'date' etc., not button/combobox.
  const blockPointer: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement
    const trigger = target.closest('[role="combobox"],[data-radix-collection-item],button[data-slot],button,[role="menuitem"]')
    if (trigger) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  return (
    <div
      onPointerDownCapture={blockPointer}
      onClickCapture={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onSubmitCapture={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onKeyDownCapture={(e) => {
        // Block Enter/Space when a button is focused — both would fire
        // its onClick. Leave keystrokes through for everything else so
        // inputs remain usable.
        const target = e.target as HTMLElement
        const isButton =
          target.tagName === 'BUTTON' ||
          target.getAttribute('role') === 'button' ||
          target.getAttribute('role') === 'combobox'
        if (isButton && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {children}
    </div>
  )
}
