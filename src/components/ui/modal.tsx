"use client"

import React from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  fullHeight?: boolean
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

export function Modal({ isOpen, onClose, children, size = 'md', fullHeight }: ModalProps) {
  if (!isOpen) return null

  // Large modals (2xl+) default to full height, small ones fit content
  const largeSizes = ['2xl', '3xl', '4xl', '5xl', '6xl', 'full']
  const useFullHeight = fullHeight ?? largeSizes.includes(size)
  const heightStyle = 'calc(100dvh - var(--safe-area-top) - var(--safe-area-bottom) - 2rem)'

  const modalContent = (
    <>
      {/* Backdrop - covers entire screen including safe areas */}
      <div
        className="fixed inset-0 z-[200] bg-black/50"
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
          className={`bg-white rounded-lg border border-border w-full ${sizeClasses[size]} shadow-lg flex flex-col`}
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
