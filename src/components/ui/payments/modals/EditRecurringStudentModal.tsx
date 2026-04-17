"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import type { RecurringStudent } from '../hooks/usePaymentsData'

interface EditRecurringStudentModalProps {
  isOpen: boolean
  onClose: () => void
  editingRecurringStudent: RecurringStudent | null
  hasAmountOverride: boolean
  setHasAmountOverride: (value: boolean) => void
  recurringOverrideAmount: string
  setRecurringOverrideAmount: (value: string) => void
  recurringStatus: string
  setRecurringStatus: (value: string) => void
  formatAmountWithCommas: (value: string) => string
  formatCurrency: (amount: number) => string
  onSubmit: () => void
}

export function EditRecurringStudentModal({
  isOpen,
  onClose,
  editingRecurringStudent,
  hasAmountOverride,
  setHasAmountOverride,
  recurringOverrideAmount,
  setRecurringOverrideAmount,
  recurringStatus,
  setRecurringStatus,
  formatAmountWithCommas,
  formatCurrency,
  onSubmit,
}: EditRecurringStudentModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!editingRecurringStudent} onClose={onClose} size="md">
      {editingRecurringStudent && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{t('payments.editRecurringPayment')}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
            <form className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('common.student')}</Label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{editingRecurringStudent.student_name}</div>
                  <div className="text-sm text-gray-500">{editingRecurringStudent.student_email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentTemplate')}</Label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="font-medium text-gray-900">{editingRecurringStudent.template_name}</div>
                  <div className="text-sm text-gray-500">
                    {t('payments.baseAmount')}: {formatCurrency(editingRecurringStudent.template_amount)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('payments.customAmount')}</Label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hasAmountOverride}
                      onChange={(e) => setHasAmountOverride(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{t('payments.overrideDefaultAmount')}</span>
                  </label>

                  {hasAmountOverride && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                      <Input
                        type="text"
                        placeholder="0"
                        className="h-10 pl-9"
                        value={recurringOverrideAmount}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/,/g, '')
                          setRecurringOverrideAmount(formatAmountWithCommas(numericValue))
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
                <Select value={recurringStatus} onValueChange={(value) => setRecurringStatus(value)}>
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="paused">{t('payments.paused')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </div>

          <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 mr-3"
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={onSubmit} className="flex-1">
              {t('common.saveChanges')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
