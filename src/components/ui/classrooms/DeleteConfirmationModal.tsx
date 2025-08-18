"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
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
        
        <div className="p-6 pt-4">
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
        
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200">
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
    </div>
  )
}