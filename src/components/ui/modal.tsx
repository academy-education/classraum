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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
        onClick={onClose}
      />
      {/* Container - positioned within safe areas with consistent padding */}
      <div
        className="fixed z-[201] flex items-center justify-center"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          left: '1rem',
          right: '1rem',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
        }}
        onClick={onClose}
      >
        {/* Modal box - constrained to container, flex column for internal layout */}
        <div
          className={`bg-white rounded-lg border border-border w-full ${sizeClasses[size]} shadow-lg overflow-hidden flex flex-col max-h-full`}
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
