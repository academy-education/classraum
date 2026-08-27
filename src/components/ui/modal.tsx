"use client"

import React from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  fullHeight?: boolean
  /**
   * Accessible name for the dialog. Optional: when omitted the modal
   * labels itself from the first heading it contains, which is what
   * every caller in this repo already renders. Pass it only when there
   * is no heading, or when the heading is the wrong announcement.
   */
  label?: string
  /**
   * Render the modal card inline (no portal, no backdrop, no fixed
   * positioning). Used by the help center to show a live, read-only
   * preview of a real modal next to its instructions. Treat as a render
   * mode — the modal still appears visually identical, it's just laid
   * out in document flow instead of overlaid.
   */
  inline?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full',
}

/** Focusable descendants, in document order, skipping anything inert. */
function focusablesIn(root: HTMLElement): HTMLElement[] {
  const sel = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')
  return [...root.querySelectorAll<HTMLElement>(sel)]
    .filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
}

export function Modal({ isOpen, onClose, children, size = 'md', fullHeight, label, inline }: ModalProps) {
  const boxRef = React.useRef<HTMLDivElement | null>(null)
  const labelId = React.useId()

  /* Lock the page behind the modal. Without this the body scrolls under
     the backdrop — on a phone a drag anywhere outside the card moves the
     page, so the modal appears to drift off its own backdrop. */
  React.useEffect(() => {
    if (!isOpen || inline) return
    const { overflow, paddingRight } = document.body.style
    // Compensate for the scrollbar we are about to remove, so desktop
    // layout does not jump sideways when the modal opens.
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => { document.body.style.overflow = overflow; document.body.style.paddingRight = paddingRight }
  }, [isOpen, inline])

  /* Move focus into the dialog, keep Tab inside it, and put focus back
     where it was on close. */
  React.useEffect(() => {
    if (!isOpen || inline) return
    const previous = document.activeElement as HTMLElement | null
    const box = boxRef.current
    if (box) {
      const first = focusablesIn(box)[0]
      // Focus the first control, or the box itself so a screen reader
      // announces the dialog rather than staying on the trigger.
      ;(first ?? box).focus({ preventScroll: true })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const el = boxRef.current
      if (!el) return
      /* CRITICAL: only trap when focus is already inside the card.
         Radix Select/Popover/Tooltip content portals to document.body,
         OUTSIDE this box — several of these modals contain Selects. A
         trap that unconditionally yanked focus back would fight those
         dropdowns and make them unusable, so focus that has legitimately
         moved into a portal is left alone. */
      const active = document.activeElement as HTMLElement | null
      if (!active || !el.contains(active)) return
      const items = focusablesIn(el)
      if (items.length === 0) return
      const first = items[0], last = items[items.length - 1]
      if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Only restore if focus did not deliberately move elsewhere.
      if (previous && document.body.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [isOpen, inline])

  /* Label the dialog from its own first heading. Callers all render one;
     `label` overrides when they do not. Done in an effect rather than by
     reaching into `children`, which may be arbitrarily nested. */
  React.useEffect(() => {
    if (!isOpen || inline || label) return
    const box = boxRef.current
    if (!box) return
    const h = box.querySelector('h1, h2, h3')
    if (!h) return
    if (!h.id) h.id = labelId
    box.setAttribute('aria-labelledby', h.id)
  }, [isOpen, inline, label, labelId, children])

  if (!isOpen) return null

  // Inline mode: render the card directly in document flow. No portal,
  // no backdrop, no fixed positioning. Card chrome (white bg, ring,
  // shadow, rounded-2xl) is preserved so it still looks like a modal.
  if (inline) {
    return (
      <div
        className={`my-6 mx-auto bg-white rounded-2xl ring-1 ring-gray-100 w-full ${sizeClasses[size]} shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] flex flex-col`}
      >
        {children}
      </div>
    )
  }

  /* `onClose` is intentionally NOT wired to the backdrop or to Escape.
     These dialogs are mostly long forms, and a stray outside-click that
     discards a half-typed assignment is worse than requiring the Cancel
     button — which the focus trap above now guarantees is reachable by
     keyboard. Several callers bind Escape themselves where it is safe
     (see CampReviewPresenter, SelfCheckInModal). If this becomes a
     product decision to change, change it HERE, once, not per caller. */
  void onClose

  // Large modals (2xl+) default to full height, small ones fit content
  const largeSizes = ['2xl', '3xl', '4xl', '5xl', '6xl', 'full']
  const useFullHeight = fullHeight ?? largeSizes.includes(size)
  const heightStyle = 'calc(100dvh - var(--safe-area-top) - var(--safe-area-bottom) - 2rem)'

  const modalContent = (
    <>
      {/* Backdrop — soft blur for a modern depth-of-field feel */}
      <div
        /* Marker, not a style hook: the setup tour queries for this to
           know a real modal is open, so that it can hide itself and stop
           competing for Escape / outside-clicks. */
        data-app-modal="true"
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
      />
      {/* Modal container - centers the modal */}
      <div
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        style={{
          // Add safe area padding
          paddingTop: 'calc(var(--safe-area-top) + 1rem)',
          paddingBottom: 'calc(var(--safe-area-bottom) + 1rem)',
          paddingLeft: 'calc(var(--safe-area-left) + 1rem)',
          paddingRight: 'calc(var(--safe-area-right) + 1rem)',
        }}
      >
        {/* Modal box */}
        <div
          ref={boxRef}
          /* Was an unlabelled <div>: assistive tech had no way to know a
             dialog had opened, and nothing kept Tab from wandering into
             the page behind the backdrop. */
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          /* Second marker, same reason as `data-app-modal` above: the
             setup tour measures this box so its docked hint can sit in
             whichever gutter the dialog leaves free, instead of over
             the dialog's own buttons. */
          data-app-modal-box="true"
          className={`bg-white rounded-2xl ring-1 ring-gray-100 w-full ${sizeClasses[size]} shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] flex flex-col focus:outline-none`}
          style={{
            ...(useFullHeight ? { height: heightStyle } : { maxHeight: heightStyle }),
            overflow: 'visible',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return null
}
