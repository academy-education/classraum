"use client"

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { AccessibleButton } from './AccessibleButton'
import { useFocusTrap, useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'
import { useAccessibleId } from '@/hooks/useAccessibility'

interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = '',
  closeOnEscape = true,
  closeOnOverlayClick = true
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = useAccessibleId('modal-title')
  const descId = useAccessibleId('modal-desc')
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Trap focus within modal
  useFocusTrap(modalRef as React.RefObject<HTMLElement>, isOpen)

  // Handle keyboard navigation
  useKeyboardNavigation({
    containerRef: modalRef as React.RefObject<HTMLElement>,
    itemSelector: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    onEscape: closeOnEscape ? onClose : undefined,
    disabled: !isOpen
  })

  // Store and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  // Handle body scroll and ARIA
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Set aria-hidden on main content
      const mainContent = document.querySelector('main, #__next, [role="main"]')
      if (mainContent) {
        mainContent.setAttribute('aria-hidden', 'true')
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = ''
      
      // Remove aria-hidden from main content
      const mainContent = document.querySelector('main, #__next, [role="main"]')
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden')
      }
    }

    return () => {
      document.body.style.overflow = ''
      const mainContent = document.querySelector('main, #__next, [role="main"]')
      if (mainContent) {
        mainContent.removeAttribute('aria-hidden')
      }
    }
  }, [isOpen])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed z-[200] flex items-center justify-center"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        bottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={handleOverlayClick}
    >
      {/* Backdrop - covers full screen including safe areas */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal - positioned within safe area */}
      <div
        ref={modalRef}
        className={`
          relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4
          flex flex-col overflow-hidden
          max-h-[calc(100%-2rem)]
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2
            id={titleId}
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <AccessibleButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </AccessibleButton>
        </div>

        {/* Description */}
        {description && (
          <div id={descId} className="px-4 pt-2 text-sm text-gray-600 flex-shrink-0">
            {description}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}