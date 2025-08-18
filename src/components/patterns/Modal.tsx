"use client"

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ModalContextType {
  onClose: () => void
}

const ModalContext = React.createContext<ModalContextType | null>(null)

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

interface ModalHeaderProps {
  children: React.ReactNode
  showCloseButton?: boolean
}

interface ModalBodyProps {
  children: React.ReactNode
  className?: string
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

// Hook to use modal context
export const useModal = () => {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error('Modal components must be used within a Modal')
  }
  return context
}

// Size configurations
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-7xl'
}

// Main Modal component
export const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  const handleOverlayClick = React.useCallback((e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }, [closeOnOverlayClick, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className={`bg-white rounded-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col shadow-xl`}>
        <ModalContext.Provider value={{ onClose }}>
          {children}
        </ModalContext.Provider>
      </div>
    </div>
  )

  // Render in portal if we're in the browser
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
})

// Modal Header component
export const ModalHeader = React.memo<ModalHeaderProps>(({
  children,
  showCloseButton = true
}) => {
  const { onClose } = useModal()

  return (
    <div className="flex justify-between items-center p-6 border-b border-gray-200">
      <div className="flex-1">
        {children}
      </div>
      {showCloseButton && (
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
})

// Modal Body component
export const ModalBody = React.memo<ModalBodyProps>(({
  children,
  className = ""
}) => {
  return (
    <div className={`flex-1 overflow-y-auto p-6 ${className}`}>
      {children}
    </div>
  )
})

// Modal Footer component
export const ModalFooter = React.memo<ModalFooterProps>(({
  children,
  className = ""
}) => {
  return (
    <div className={`p-6 border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  )
})

// Compound component assignment
Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter

// Export types for consumers
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps }