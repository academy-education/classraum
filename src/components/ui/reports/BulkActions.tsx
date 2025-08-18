"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Trash2, Send, CheckCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface BulkActionsProps {
  selectedCount: number
  onBulkDelete: () => void
  onBulkStatusUpdate?: (status: string) => void
  onClearSelection: () => void
  showStatusActions?: boolean
}

export const BulkActions = React.memo<BulkActionsProps>(({
  selectedCount,
  onBulkDelete,
  onBulkStatusUpdate,
  onClearSelection,
  showStatusActions = true
}) => {
  const { t } = useTranslation()

  const handleBulkApprove = React.useCallback(() => {
    onBulkStatusUpdate?.('Approved')
  }, [onBulkStatusUpdate])

  const handleBulkSend = React.useCallback(() => {
    onBulkStatusUpdate?.('Sent')
  }, [onBulkStatusUpdate])

  if (selectedCount === 0) return null

  return (
    <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-800">
            {t('reports.selectedItems', { count: selectedCount })}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('common.clearSelection')}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {showStatusActions && onBulkStatusUpdate && (
            <>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('reports.approve')}
              </Button>
              
              <Button
                size="sm"
                onClick={handleBulkSend}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4 mr-1" />
                {t('reports.send')}
              </Button>
            </>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={onBulkDelete}
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Card>
  )
})