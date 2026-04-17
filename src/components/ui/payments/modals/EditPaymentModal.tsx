"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
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
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
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
  activeDatePicker,
  setActiveDatePicker,
}: EditPaymentModalProps) {
  const { t, language } = useTranslation()

  // DatePickerComponent
  const DatePickerComponent = ({
    value,
    onChange,
    fieldId
  }: {
    value: string
    onChange: (value: string) => void
    fieldId: string
  }) => {
    const isOpen = activeDatePicker === fieldId
    const datePickerRef = useRef<HTMLDivElement>(null)

    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date()
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const currentDate = value ? parseLocalDate(value) : new Date()
    const today = new Date()

    const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
    const [viewYear, setViewYear] = useState(currentDate.getFullYear())

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setActiveDatePicker(null)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    const formatDisplayDate = (dateString: string) => {
      if (!dateString) return t('reports.selectDate')
      const date = parseLocalDate(dateString)
      const locale = language === 'korean' ? 'ko-KR' : 'en-US'
      return date.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    }

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay()

    const selectDate = (day: number) => {
      const selectedDate = new Date(viewYear, viewMonth, day)
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dayStr = String(selectedDate.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${dayStr}`)
      setActiveDatePicker(null)
    }

    const navigateMonth = (direction: number) => {
      let newMonth = viewMonth + direction
      let newYear = viewYear
      if (newMonth < 0) { newMonth = 11; newYear -= 1 }
      else if (newMonth > 11) { newMonth = 0; newYear += 1 }
      setViewMonth(newMonth)
      setViewYear(newYear)
    }

    const monthNames = language === 'korean' ? ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'] : ['January','February','March','April','May','June','July','August','September','October','November','December']
    const dayNames = language === 'korean' ? ['일','월','화','수','목','금','토'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

    const daysInMonth = getDaysInMonth(viewMonth, viewYear)
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
    const selectedDate = value ? parseLocalDate(value) : null

    return (
      <div className="relative" ref={datePickerRef}>
        <button type="button" onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
          className={`w-full h-10 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${isOpen ? 'border-primary' : 'border-border focus:border-primary'}`}
        >{formatDisplayDate(value)}</button>
        {isOpen && (
          <div className="absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0" style={{ zIndex: 9999 }}>
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="font-medium text-gray-900">{monthNames[viewMonth]} {viewYear}</div>
              <button type="button" onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (<div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">{day}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => (<div key={`empty-${i}`} className="h-8"></div>))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear
                const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear
                return (
                  <button key={day} type="button" onClick={() => selectDate(day)}
                    className={`h-8 w-8 text-sm rounded hover:bg-gray-100 flex items-center justify-center ${isSelected ? 'bg-primary/10 text-primary font-medium' : isToday ? 'bg-gray-100 font-medium' : ''}`}
                  >{day}</button>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button type="button" onClick={() => { onChange(today.toISOString().split('T')[0]); setActiveDatePicker(null) }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">{t('dashboard.today')}</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!editingInvoice) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.editPayment')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
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
              <DatePickerComponent value={editDueDate} onChange={(value) => setEditDueDate(value)} fieldId="edit-payment-due-date" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value)}>
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                  <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                  <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.paidDate')}</Label>
              <DatePickerComponent value={editPaidAt} onChange={(value) => setEditPaidAt(value)} fieldId="edit-payment-paid-at" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentMethod')}</Label>
              <Select value={editPaymentMethod} onValueChange={(value) => setEditPaymentMethod(value)}>
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue placeholder={t('payments.selectPaymentMethodPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="z-[70]">
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
