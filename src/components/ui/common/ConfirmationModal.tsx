"use client"

import React from 'react'
import { Modal } from '@/components/ui/modal'
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
  const styles = variantStyles[variant]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 relative p-4 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 absolute top-3 right-3"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex flex-col items-center justify-center gap-2">
            <AlertTriangle className={`w-12 h-12 ${styles.icon}`} />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <p className="text-gray-600 mb-4 text-center text-sm whitespace-pre-line">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-center gap-3 p-4 pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={styles.button}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}