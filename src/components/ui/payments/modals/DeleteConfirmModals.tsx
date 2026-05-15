"use client"

import { ModalShell } from '@/components/ui/common/ModalShell'
import { useTranslation } from '@/hooks/useTranslation'
import type { Invoice, PaymentTemplate, RecurringStudent } from '../hooks/usePaymentsData'

// ─── Delete Invoice ──────────────────────────────────────────────────────
interface DeleteInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceToDelete: Invoice | null
  onConfirm: () => void
}

export function DeleteInvoiceModal({ isOpen, onClose, invoiceToDelete, onConfirm }: DeleteInvoiceModalProps) {
  const { t } = useTranslation()
  return (
    <ModalShell.Confirm
      isOpen={isOpen && !!invoiceToDelete}
      onClose={onClose}
      onConfirm={onConfirm}
      title={String(t('payments.deletePayment'))}
      message={`${t('payments.deletePaymentConfirm', { studentName: invoiceToDelete?.student_name })} ${t('common.actionCannotBeUndone')}`}
      variant="danger"
      confirmLabel={String(t('common.delete'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}

// ─── Delete Recurring Payment ────────────────────────────────────────────
interface DeleteRecurringModalProps {
  isOpen: boolean
  onClose: () => void
  recurringToDelete: RecurringStudent | null
  onConfirm: () => void
}

export function DeleteRecurringModal({ isOpen, onClose, recurringToDelete, onConfirm }: DeleteRecurringModalProps) {
  const { t } = useTranslation()
  return (
    <ModalShell.Confirm
      isOpen={isOpen && !!recurringToDelete}
      onClose={onClose}
      onConfirm={onConfirm}
      title={String(t('payments.deleteRecurringPayment'))}
      message={`${t('payments.deleteRecurringPaymentConfirm', { studentName: recurringToDelete?.student_name })} ${t('common.actionCannotBeUndone')}`}
      variant="danger"
      confirmLabel={String(t('common.delete'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}

// ─── Bulk Delete (one_time / recurring / plans) ──────────────────────────
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
  const title = activeTab === 'one_time'
    ? String(t('payments.deleteSelectedPayments'))
    : String(t('payments.deleteSelectedRecurringPayments'))
  const message = activeTab === 'one_time'
    ? `${t('payments.bulkDeletePaymentsConfirm', { count: selectedOneTimeCount })} ${t('common.actionCannotBeUndone')}`
    : `${t('payments.bulkDeleteRecurringConfirm', { count: selectedRecurringCount })} ${t('common.actionCannotBeUndone')}`
  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      variant="danger"
      confirmLabel={String(t('common.delete'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}

// ─── Delete Payment Plan ─────────────────────────────────────────────────
interface DeletePlanModalProps {
  isOpen: boolean
  onClose: () => void
  templateToDelete: PaymentTemplate | null
  onConfirm: () => void
}

export function DeletePlanModal({ isOpen, onClose, templateToDelete, onConfirm }: DeletePlanModalProps) {
  const { t } = useTranslation()
  return (
    <ModalShell.Confirm
      isOpen={isOpen && !!templateToDelete}
      onClose={onClose}
      onConfirm={onConfirm}
      title={String(t('payments.deletePaymentPlan'))}
      message={String(t('payments.deletePaymentPlanConfirm'))}
      variant="danger"
      confirmLabel={String(t('common.delete'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}

// ─── Pause / Resume Payment Plan ─────────────────────────────────────────
interface PausePlanModalProps {
  isOpen: boolean
  onClose: () => void
  templateToPauseResume: PaymentTemplate | null
  onConfirm: () => void
}

export function PausePlanModal({ isOpen, onClose, templateToPauseResume, onConfirm }: PausePlanModalProps) {
  const { t } = useTranslation()
  if (!templateToPauseResume) return null
  const isActive = templateToPauseResume.is_active
  return (
    <ModalShell.Confirm
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={isActive ? String(t('payments.pausePaymentPlan')) : String(t('payments.resumePaymentPlan'))}
      message={isActive
        ? String(t('payments.pausePaymentPlanConfirm', { name: templateToPauseResume.name }))
        : String(t('payments.resumePaymentPlanConfirm', { name: templateToPauseResume.name }))}
      variant={isActive ? 'warning' : 'info'}
      confirmLabel={isActive ? String(t('payments.pause')) : String(t('payments.resume'))}
      cancelLabel={String(t('common.cancel'))}
    />
  )
}
