"use client"

import React, { useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
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

  return (
    <Modal isOpen={isOpen} onClose={closeOnOverlayClick ? onClose : () => {}} size="md">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={`flex flex-col ${className}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
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
          <div id={descId} className="flex-shrink-0 px-4 pt-2 text-sm text-gray-600">
            {description}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </Modal>
  )
}