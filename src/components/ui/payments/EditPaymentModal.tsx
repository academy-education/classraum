"use client"

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Invoice {
  id: string
  student_id: string
  student_name: string
  amount: number
  discount_amount: number
  final_amount: number
  discount_reason?: string
  due_date: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string
  payment_method?: string
  refunded_amount: number
}

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (invoiceData: Partial<Invoice>) => void
  invoice: Invoice | null
}

export function EditPaymentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  invoice 
}: EditPaymentModalProps) {
  const { t } = useTranslation()
  
  // Form state
  const [amount, setAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('pending')
  const [paidAt, setPaidAt] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [refundedAmount, setRefundedAmount] = useState('')

  // Initialize form when invoice changes
  useEffect(() => {
    if (invoice) {
      setAmount(invoice.amount.toString())
      setDiscountAmount(invoice.discount_amount.toString())
      setDiscountReason(invoice.discount_reason || '')
      setDueDate(invoice.due_date)
      setStatus(invoice.status)
      setPaidAt(invoice.paid_at ? invoice.paid_at.split('T')[0] : '')
      setPaymentMethod(invoice.payment_method || '')
      setRefundedAmount(invoice.refunded_amount.toString())
    }
  }, [invoice])

  // Handle form submission
  const handleSubmit = async () => {
    if (!invoice) return

    const updatedInvoice = {
      id: invoice.id,
      amount: parseFloat(amount) || 0,
      discount_amount: parseFloat(discountAmount) || 0,
      discount_reason: discountReason,
      due_date: dueDate,
      status: status as Invoice['status'],
      paid_at: status === 'paid' && paidAt ? new Date(paidAt).toISOString() : undefined,
      payment_method: paymentMethod,
      refunded_amount: parseFloat(refundedAmount) || 0
    }

    await onSave(updatedInvoice)
    onClose()
  }

  // Calculate final amount
  const finalAmount = (parseFloat(amount) || 0) - (parseFloat(discountAmount) || 0)

  if (!invoice) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{t('payments.editPayment')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* Student Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">{t('payments.studentInfo')}</h3>
            <p className="text-sm text-gray-600">{invoice.student_name}</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Amount */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('payments.amount')}
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Discount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('payments.discountAmount')}
                </Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('payments.finalAmount')}
                </Label>
                <Input
                  type="number"
                  value={finalAmount}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Discount Reason */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('payments.discountReason')}
              </Label>
              <Textarea
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder={String(t('payments.discountReasonPlaceholder'))}
                rows={2}
              />
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('payments.dueDate')}
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('payments.status')}
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('payments.status.pending')}</SelectItem>
                  <SelectItem value="paid">{t('payments.status.paid')}</SelectItem>
                  <SelectItem value="failed">{t('payments.status.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('payments.status.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Details for Paid Status */}
            {status === 'paid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('payments.paidDate')}
                  </Label>
                  <Input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('payments.paymentMethod')}
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('payments.selectPaymentMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">{t('payments.methods.card')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('payments.methods.bankTransfer')}</SelectItem>
                      <SelectItem value="cash">{t('payments.methods.cash')}</SelectItem>
                      <SelectItem value="other">{t('payments.methods.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Refunded Amount for Refunded Status */}
            {status === 'refunded' && (
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('payments.refundedAmount')}
                </Label>
                <Input
                  type="number"
                  value={refundedAmount}
                  onChange={(e) => setRefundedAmount(e.target.value)}
                  placeholder="0"
                  max={finalAmount}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}