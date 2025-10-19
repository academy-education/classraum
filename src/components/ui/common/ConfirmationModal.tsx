"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

const variantStyles = {
  danger: {
    icon: 'text-red-600',
    button: 'bg-red-600 hover:bg-red-700 text-white'
  },
  warning: {
    icon: 'text-yellow-600',
    button: 'bg-yellow-600 hover:bg-yellow-600/90 text-white'
  },
  info: {
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700 text-white'
  }
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
        <div className="relative p-6 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 absolute top-4 right-4"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center justify-center gap-3">
            <AlertTriangle className={`w-16 h-16 ${styles.icon}`} />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="text-gray-600 mb-6 text-center whitespace-pre-line">{message}</p>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={styles.button}
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}