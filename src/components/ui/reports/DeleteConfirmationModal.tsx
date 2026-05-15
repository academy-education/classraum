"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      closeDisabled={loading}
      headerSlot={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
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
      }
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={loading}
            className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('common.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </>
            )}
          </Button>
        </ModalShell.Footer>
      }
    >
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

      <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-rose-800">
            <p className="font-medium">{t('common.warning')}</p>
            <p>{t('reports.deleteWarningMessage')}</p>
          </div>
        </div>
      </div>
    </ModalShell>
  )
})

DeleteConfirmationModal.displayName = 'DeleteConfirmationModal'
