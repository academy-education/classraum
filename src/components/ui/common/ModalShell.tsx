"use client"

/**
 * ModalShell — composition layer on top of <Modal> that standardizes the
 * header / body / footer scaffold every modal in the app was hand-rolling.
 *
 * Use this for new modals. The underlying <Modal> primitive is still fine for
 * cases that need fully custom chrome (e.g. the auth modal with branded art).
 *
 * Variants:
 *   <ModalShell>            — header + body + optional footer
 *   <ModalShell.Footer>     — standardized footer button row
 *   <ModalShell.Confirm>    — destructive/warning/info confirmation flow
 */

import React from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, Loader2, type LucideIcon } from 'lucide-react'

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
type ConfirmVariant = 'danger' | 'warning' | 'info'

/* ─────────────────────────────────────────────────────────────────────────
   ModalShell.Footer — opinionated button row
   ───────────────────────────────────────────────────────────────────────── */
interface FooterProps {
  children: React.ReactNode
  /** Split: each direct child gets flex-1 (50/50 button row pattern). */
  split?: boolean
  /** Justify content. Defaults to 'end' (or stretches when split=true). */
  justify?: 'start' | 'center' | 'end' | 'between'
  className?: string
}

function Footer({ children, split, justify = 'end', className = '' }: FooterProps) {
  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  } as const
  return (
    <div
      className={`flex items-center gap-3 ${justifyMap[justify]} ${
        split ? '[&>*]:flex-1' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ModalShell — main composition
   ───────────────────────────────────────────────────────────────────────── */
interface ModalShellProps {
  isOpen: boolean
  onClose: () => void
  size?: Size
  /** Plain title rendered in the header. Pass headerSlot for richer headers. */
  title?: React.ReactNode
  /** Optional muted subtitle below the title. */
  subtitle?: React.ReactNode
  /** Override the default header content entirely (replaces title+subtitle, keeps close button). */
  headerSlot?: React.ReactNode
  /** Slot rendered inside the footer row. Wrap in <ModalShell.Footer> for standard styling. */
  footer?: React.ReactNode
  /** Show a divider between body and footer. Default true when footer is present. */
  footerDivider?: boolean
  /** Add p-6 to the body wrapper. Default true. Set false for layouts that need full-bleed control. */
  bodyPadding?: boolean
  /** Lock the close button (e.g. while saving). */
  closeDisabled?: boolean
  /** Hide the X close button (rare — confirm flows that must use buttons). */
  hideCloseButton?: boolean
  fullHeight?: boolean
  children: React.ReactNode
  /** Optional class on the body div. */
  bodyClassName?: string
}

export function ModalShell({
  isOpen,
  onClose,
  size = 'md',
  title,
  subtitle,
  headerSlot,
  footer,
  footerDivider,
  bodyPadding = true,
  closeDisabled = false,
  hideCloseButton = false,
  fullHeight,
  children,
  bodyClassName = '',
}: ModalShellProps) {
  const showFooterDivider = footerDivider ?? !!footer

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} fullHeight={fullHeight}>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        {(title || subtitle || headerSlot) && (
          <div className="flex-shrink-0 flex items-center justify-between gap-4 p-6 pb-4 border-b border-gray-200">
            <div className="min-w-0 flex-1">
              {headerSlot ?? (
                <>
                  {title && (
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900 truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                  )}
                </>
              )}
            </div>
            {!hideCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={closeDisabled}
                className="p-1 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto ${
            bodyPadding ? 'p-6' : ''
          } ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`flex-shrink-0 p-6 pt-4 ${
              showFooterDivider ? 'border-t border-gray-200' : ''
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </Modal>
  )
}

ModalShell.Footer = Footer

/* ─────────────────────────────────────────────────────────────────────────
   ModalShell.Confirm — danger/warning/info confirmation flow
   ───────────────────────────────────────────────────────────────────────── */
interface ConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  variant?: ConfirmVariant
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  /** Override the default AlertTriangle icon. */
  icon?: LucideIcon
}

const confirmVariantStyles: Record<
  ConfirmVariant,
  { chipBg: string; chipText: string; button: string }
> = {
  danger: {
    chipBg: 'bg-rose-50',
    chipText: 'text-rose-600',
    button: 'bg-red-600 hover:bg-rose-700 text-white',
  },
  warning: {
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    chipBg: 'bg-sky-50',
    chipText: 'text-sky-600',
    button: 'bg-primary hover:bg-primary/90 text-white',
  },
}

function Confirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'danger',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  icon: Icon = AlertTriangle,
}: ConfirmProps) {
  const v = confirmVariantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Centered icon + title */}
        <div className="flex-shrink-0 relative px-6 pt-6 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="p-1 absolute top-3 right-3"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center text-center gap-3">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${v.chipBg}`}
            >
              <Icon className={`w-7 h-7 ${v.chipText}`} strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        {/* Message */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          <div className="text-sm text-gray-600 text-center whitespace-pre-line">
            {message}
          </div>
        </div>

        {/* Footer — split 50/50 buttons */}
        <div className="flex-shrink-0 p-6 pt-4">
          <ModalShell.Footer split>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm} disabled={loading} className={v.button}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmLabel}
            </Button>
          </ModalShell.Footer>
        </div>
      </div>
    </Modal>
  )
}

ModalShell.Confirm = Confirm
