"use client"

import React from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
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

export function Modal({ isOpen, onClose, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  const modalContent = (
    <>
      {/* Backdrop - solid overlay for consistent appearance across entire screen */}
      <div
        className="fixed inset-0 z-[200]"
        onClick={onClose}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      />
      {/* Modal container - centers the modal and handles click-outside */}
      <div
        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
        style={{
          // Add safe area padding
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
          paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)',
          paddingRight: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
        onClick={onClose}
      >
        {/* Modal box */}
        <div
          className={`bg-white rounded-lg border border-border w-full ${sizeClasses[size]} shadow-lg flex flex-col overflow-hidden`}
          style={{
            // Explicit max-height using viewport units minus safe areas
            maxHeight: 'calc(100vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
            // Explicit max-height fallback for older browsers
            maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 2rem)',
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
