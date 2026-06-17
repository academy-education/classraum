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
  return (
    <div
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
          target.getAttribute('role') === 'button'
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
