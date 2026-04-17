"use client"

import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import type { Invoice, PaymentTemplate, RecurringStudent } from '../hooks/usePaymentsData'

// Delete Invoice Confirmation Modal
interface DeleteInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceToDelete: Invoice | null
  onConfirm: () => void
}

export function DeleteInvoiceModal({ isOpen, onClose, invoiceToDelete, onConfirm }: DeleteInvoiceModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!invoiceToDelete} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.deletePayment')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <p className="text-sm text-gray-600">
            {t('payments.deletePaymentConfirm', { studentName: invoiceToDelete?.student_name })} {t('common.actionCannotBeUndone')}
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Delete Recurring Payment Confirmation Modal
interface DeleteRecurringModalProps {
  isOpen: boolean
  onClose: () => void
  recurringToDelete: RecurringStudent | null
  onConfirm: () => void
}

export function DeleteRecurringModal({ isOpen, onClose, recurringToDelete, onConfirm }: DeleteRecurringModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!recurringToDelete} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.deleteRecurringPayment')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <p className="text-sm text-gray-600">
            {t('payments.deleteRecurringPaymentConfirm', { studentName: recurringToDelete?.student_name })} {t('common.actionCannotBeUndone')}
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Bulk Delete Confirmation Modal
interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  activeTab: 'one_time' | 'recurring' | 'plans'
  selectedOneTimeCount: number
  selectedRecurringCount: number
  onConfirm: () => void
}

export function BulkDeleteModal({ isOpen, onClose, activeTab, selectedOneTimeCount, selectedRecurringCount, onConfirm }: BulkDeleteModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {activeTab === 'one_time'
              ? t('payments.deleteSelectedPayments')
              : t('payments.deleteSelectedRecurringPayments')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <p className="text-sm text-gray-600">
            {activeTab === 'one_time'
              ? `${t('payments.bulkDeletePaymentsConfirm', { count: selectedOneTimeCount })} ${t('common.actionCannotBeUndone')}`
              : `${t('payments.bulkDeleteRecurringConfirm', { count: selectedRecurringCount })} ${t('common.actionCannotBeUndone')}`}
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Delete Payment Plan Confirmation Modal
interface DeletePlanModalProps {
  isOpen: boolean
  onClose: () => void
  templateToDelete: PaymentTemplate | null
  onConfirm: () => void
}

export function DeletePlanModal({ isOpen, onClose, templateToDelete, onConfirm }: DeletePlanModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!templateToDelete} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.deletePaymentPlan')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 mb-6">
            {t('payments.deletePaymentPlanConfirm')}
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1"
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Pause/Resume Payment Plan Confirmation Modal
interface PausePlanModalProps {
  isOpen: boolean
  onClose: () => void
  templateToPauseResume: PaymentTemplate | null
  onConfirm: () => void
}

export function PausePlanModal({ isOpen, onClose, templateToPauseResume, onConfirm }: PausePlanModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!templateToPauseResume} onClose={onClose} size="md">
      {templateToPauseResume && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {templateToPauseResume.is_active ? t('payments.pausePaymentPlan') : t('payments.resumePaymentPlan')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <p className="text-sm text-gray-600">
              {templateToPauseResume.is_active
                ? t('payments.pausePaymentPlanConfirm', { name: templateToPauseResume.name })
                : t('payments.resumePaymentPlanConfirm', { name: templateToPauseResume.name })
              }
            </p>
          </div>
          <div className="flex-shrink-0 flex gap-3 p-6 pt-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              variant={templateToPauseResume.is_active ? "destructive" : "default"}
            >
              {templateToPauseResume.is_active ? t('payments.pause') : t('payments.resume')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
