"use client"

import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import type { Invoice } from '../hooks/usePaymentsData'

interface ViewPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  viewingInvoice: Invoice | null
  formatDate: (dateString: string) => string
  formatCurrency: (amount: number) => string
}

export function ViewPaymentModal({
  isOpen,
  onClose,
  viewingInvoice,
  formatDate,
  formatCurrency,
}: ViewPaymentModalProps) {
  const { t } = useTranslation()

  return (
    <>
      {viewingInvoice && (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
          {viewingInvoice && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t('payments.viewPayment')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                {/* Student Information */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('common.student')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{viewingInvoice.student_name}</div>
                    <div className="text-sm text-gray-600">{viewingInvoice.student_email}</div>
                  </div>
                </div>

                {/* Invoice Name */}
                {viewingInvoice.invoice_name && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.invoiceName')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {viewingInvoice.invoice_name}
                    </div>
                  </div>
                )}

                {/* Amount Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.amount')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg font-medium">
                      {formatCurrency(viewingInvoice.amount)}
                    </div>
                  </div>

                  {viewingInvoice.discount_amount > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">{t('payments.discount')}</Label>
                      <div className="p-3 bg-gray-50 rounded-lg font-medium text-red-600">
                        -{formatCurrency(viewingInvoice.discount_amount)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Amount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('payments.finalAmount')}</Label>
                  <div className="p-3 bg-blue-50 rounded-lg font-bold text-lg text-blue-900">
                    {formatCurrency(viewingInvoice.final_amount)}
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('payments.dueDate')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {formatDate(viewingInvoice.due_date)}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('common.status')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      viewingInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      viewingInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      viewingInvoice.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {viewingInvoice.status === 'paid' && <CheckCircle className="w-4 h-4" />}
                      {viewingInvoice.status === 'pending' && <Clock className="w-4 h-4" />}
                      {viewingInvoice.status === 'failed' && <XCircle className="w-4 h-4" />}
                      {viewingInvoice.status === 'refunded' && <RotateCcw className="w-4 h-4" />}
                      {t(`payments.${viewingInvoice.status}`)}
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                {viewingInvoice.paid_at && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.paidDate')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {formatDate(viewingInvoice.paid_at)}
                    </div>
                  </div>
                )}

                {viewingInvoice.payment_method && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.paymentMethod')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {viewingInvoice.payment_method}
                    </div>
                  </div>
                )}

                {viewingInvoice.discount_reason && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.discountReason')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      {viewingInvoice.discount_reason}
                    </div>
                  </div>
                )}

                {/* Transaction ID */}
                {viewingInvoice.transaction_id && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('payments.transactionId')}</Label>
                    <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm">
                      {viewingInvoice.transaction_id}
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t('payments.createdAt')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {formatDate(viewingInvoice.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-gray-200 p-6">
                <Button
                  onClick={onClose}
                  className="w-full"
                >
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
