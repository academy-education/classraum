"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { DateInput } from '@/components/ui/common/DateInput'
import { X, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Invoice } from '../hooks/usePaymentsData'

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  editingInvoice: Invoice | null
  editInvoiceName: string
  setEditInvoiceName: (value: string) => void
  editAmount: string
  setEditAmount: (value: string) => void
  editDiscountAmount: string
  setEditDiscountAmount: (value: string) => void
  editDiscountReason: string
  setEditDiscountReason: (value: string) => void
  editDueDate: string
  setEditDueDate: (value: string) => void
  editStatus: string
  setEditStatus: (value: string) => void
  editPaidAt: string
  setEditPaidAt: (value: string) => void
  editPaymentMethod: string
  setEditPaymentMethod: (value: string) => void
  editRefundedAmount: string
  setEditRefundedAmount: (value: string) => void
  formatAmountWithCommas: (value: string) => string
  handleEditPayment: () => void
  isCreating: boolean
  isSaving: boolean
}

export function EditPaymentModal({
  isOpen,
  onClose,
  editingInvoice,
  editInvoiceName,
  setEditInvoiceName,
  editAmount,
  setEditAmount,
  editDiscountAmount,
  setEditDiscountAmount,
  editDiscountReason,
  setEditDiscountReason,
  editDueDate,
  setEditDueDate,
  editStatus,
  setEditStatus,
  editPaidAt,
  setEditPaidAt,
  editPaymentMethod,
  setEditPaymentMethod,
  editRefundedAmount,
  setEditRefundedAmount,
  formatAmountWithCommas,
  handleEditPayment,
  isCreating,
  isSaving,
}: EditPaymentModalProps) {
  const { t } = useTranslation()

  if (!editingInvoice) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.editPayment')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
          <form className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('common.student')}</Label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-medium text-gray-900">{editingInvoice.student_name}</div>
                <div className="text-sm text-gray-500">{editingInvoice.student_email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('payments.invoiceName')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input type="text" placeholder={String(t('payments.invoiceNamePlaceholder'))} className="h-10"
                value={editInvoiceName} onChange={(e) => setEditInvoiceName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.amount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                <Input type="text" placeholder="0" className="h-10 pl-9"
                  value={editAmount}
                  onChange={(e) => { const numericValue = e.target.value.replace(/,/g, ''); setEditAmount(formatAmountWithCommas(numericValue)) }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.discountAmount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                <Input type="text" placeholder="0" className="h-10 pl-9"
                  value={editDiscountAmount}
                  onChange={(e) => { const numericValue = e.target.value.replace(/,/g, ''); setEditDiscountAmount(formatAmountWithCommas(numericValue)) }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.discountReason')}</Label>
              <Input placeholder={String(t('payments.discountReasonPlaceholder'))} className="h-10"
                value={editDiscountReason} onChange={(e) => setEditDiscountReason(e.target.value)}
              />
            </div>

            {editDiscountAmount && parseFloat(editDiscountAmount.replace(/,/g, '')) > 0 && editAmount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">{t('payments.finalPrice')}</span>
                  <span className="text-lg font-bold text-blue-900">
                    ₩{(parseFloat(editAmount.replace(/,/g, '')) - parseFloat(editDiscountAmount.replace(/,/g, ''))).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.dueDate')}</Label>
              <DateInput value={editDueDate} onChange={(value) => setEditDueDate(value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value)}>
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                  <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                  <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.paidDate')}</Label>
              <DateInput value={editPaidAt} onChange={(value) => setEditPaidAt(value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentMethod')}</Label>
              <Select value={editPaymentMethod} onValueChange={(value) => setEditPaymentMethod(value)}>
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue placeholder={t('payments.selectPaymentMethodPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="cash">{t('payments.paymentMethods.cash')}</SelectItem>
                  <SelectItem value="card">{t('payments.paymentMethods.card')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('payments.paymentMethods.bankTransfer')}</SelectItem>
                  <SelectItem value="other">{t('payments.paymentMethods.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editStatus === 'refunded' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('payments.refund')}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                  <Input type="text" placeholder="0" className="h-10 pl-9"
                    value={editRefundedAmount}
                    onChange={(e) => { const numericValue = e.target.value.replace(/,/g, ''); setEditRefundedAmount(formatAmountWithCommas(numericValue)) }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="flex-1 mr-3">
            {t('common.cancel')}
          </Button>
          <Button onClick={handleEditPayment} disabled={isCreating || isSaving} className="flex-1">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('common.saving')}</>
            ) : (
              t('common.saveChanges')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
