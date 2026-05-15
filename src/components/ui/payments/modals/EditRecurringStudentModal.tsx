"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { TableCheckbox } from '@/components/ui/dashboard'
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

  if (!editingRecurringStudent) return null
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={String(t('payments.editRecurringPayment'))}
      footer={
        <ModalShell.Footer split>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit}>
            {t('common.saveChanges')}
          </Button>
        </ModalShell.Footer>
      }
    >
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
                    <TableCheckbox
                      checked={hasAmountOverride}
                      ariaLabel={String(t('payments.overrideDefaultAmount'))}
                      onChange={() => setHasAmountOverride(!hasAmountOverride)}
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
    </ModalShell>
  )
}
