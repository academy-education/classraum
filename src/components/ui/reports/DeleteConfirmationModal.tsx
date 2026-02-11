"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { ReportData } from '@/hooks/useReports'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  report: ReportData | null
  loading?: boolean
}

export const DeleteConfirmationModal = React.memo<DeleteConfirmationModalProps>(({
  isOpen,
  onClose,
  onConfirm,
  report,
  loading = false
}) => {
  const { t } = useTranslation()

  if (!report) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-start p-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('reports.deleteReport')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('common.confirmAction')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <p className="text-gray-700 mb-4">
              {t('reports.deleteConfirmationMessage')}
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-1">
                  {report.report_name || t('reports.untitledReport')}
                </div>
                <div className="text-gray-600">
                  {t('reports.student')}: {report.student_name}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {t('reports.created')}: {new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">{t('common.warning')}</p>
                  <p>{t('reports.deleteWarningMessage')}</p>
                </div>
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-3 p-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
})

DeleteConfirmationModal.displayName = 'DeleteConfirmationModal'