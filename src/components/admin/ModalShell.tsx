'use client'

import React from 'react'
import { X } from 'lucide-react'
import { useModalA11y } from './useModalA11y'

/**
 * ModalShell — shared modal scaffold for admin dialogs.
 *
 * Wraps the boilerplate that every admin modal was hand-rolling:
 *   • backdrop (`fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50`)
 *   • white dialog box with size + scroll behaviour
 *   • Escape / focus-trap / scroll-lock via useModalA11y
 *   • optional header with title and a close button
 *   • optional sticky footer slot
 *
 * Two ways to use it:
 *   1. Pass `title` + `footer` and put body content as children — the shell
 *      renders the standard header / scrollable body / footer regions.
 *   2. Omit `title` and use it as a bare a11y-enabled scaffold — children
 *      get the full dialog area to lay out themselves.
 *
 * Backdrop click and Escape both trigger `onClose`.
 */
export type ModalShellSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'

const sizeClass: Record<ModalShellSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
}

export interface ModalShellProps {
  onClose: () => void
  /** Optional dialog title shown in the standard header. */
  title?: React.ReactNode
  /** Optional secondary text under the title. */
  description?: React.ReactNode
  /** Optional footer (typically Cancel / Confirm). Rendered in a sticky-bottom band. */
  footer?: React.ReactNode
  /** Tailwind max-width preset for the dialog box. Default: 'md'. */
  size?: ModalShellSize
  /** When true, hides the X close button in the header. */
  hideClose?: boolean
  /** Disables backdrop-click-to-close (e.g. while a request is in flight). */
  disableBackdropClose?: boolean
  /** Override aria-label for the close button. */
  closeLabel?: string
  className?: string
  bodyClassName?: string
  children?: React.ReactNode
}

export function ModalShell({
  onClose,
  title,
  description,
  footer,
  size = 'md',
  hideClose = false,
  disableBackdropClose = false,
  closeLabel = 'Close',
  className,
  bodyClassName,
  children,
}: ModalShellProps) {
  const dialogRef = useModalA11y(onClose)

  const onBackdropClick = (e: React.MouseEvent) => {
    if (disableBackdropClose) return
    if (e.target === e.currentTarget) onClose()
  }

  const hasHeader = title !== undefined || !hideClose
  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={
          `bg-white rounded-lg border border-border shadow-lg w-full ${sizeClass[size]} ` +
          `max-h-[90vh] flex flex-col overflow-hidden ` +
          (className || '')
        }
      >
        {hasHeader && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title !== undefined && (
                <h2 className="text-xl font-semibold text-gray-900 truncate">{title}</h2>
              )}
              {description !== undefined && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label={closeLabel}
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${bodyClassName ?? 'p-6'}`}>
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
