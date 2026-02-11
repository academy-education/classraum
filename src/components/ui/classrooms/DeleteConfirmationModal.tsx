"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X, AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading?: boolean
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-700">{message}</p>
              <p className="text-xs text-gray-500 mt-2">
                {t('common.actionCannotBeUndone')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-20"
          >
            {isLoading ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
