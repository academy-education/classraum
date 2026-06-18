"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the Add Payment modal in Recurring mode — mirrors
 * payments/modals/AddPaymentModal.tsx with payment_type='recurring'.
 * Shows the template picker + multi-student selection so users see how
 * to attach students to an existing plan.
 */
export function AssignRecurringDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getStudents(language), [language])
  const templateLabel = ko ? '월 수강료 - ₩400,000' : 'Monthly tuition - ₩400,000'

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="md"
        title={String(t('payments.addPayment'))}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline">{t('common.cancel')}</Button>
            <Button>{t('payments.addPayment')}</Button>
          </ModalShell.Footer>
        }
      >
        <form className="space-y-5">
          {/* Payment Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.paymentType')} <span className="text-rose-500">*</span>
            </Label>
            <Select value="recurring">
              <SelectTrigger className="h-10 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">{t('payments.oneTime')}</SelectItem>
                <SelectItem value="recurring">{t('payments.recurring')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.invoiceName')} <span className="text-rose-500">*</span>
            </Label>
            <Input
              readOnly
              className="h-10"
              value={ko ? '2026년 6월 수강료' : 'June 2026 tuition'}
            />
          </div>

          {/* Plan Template */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.paymentPlan') ?? 'Payment Plan'} <span className="text-rose-500">*</span>
            </Label>
            <Select value="tpl1">
              <SelectTrigger className="h-10 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tpl1">{templateLabel}</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('payments.amount')}</span>
                <span>₩400,000</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-medium">{ko ? '다음 청구일' : 'Next billing'}</span>
                <span>{ko ? '2026년 6월 25일' : 'Jun 25, 2026'}</span>
              </div>
            </div>
          </div>

          {/* Multi-student select with Select All */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground/80">
                {t('reports.student')} <span className="text-rose-500">*</span>
              </Label>
              <button type="button" className="text-xs font-medium text-primary hover:underline">
                {ko ? '전체 선택' : 'Select all'}
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2 max-h-40 overflow-y-auto">
              {students.slice(0, 4).map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    readOnly
                    checked={true}
                    className="text-primary rounded"
                  />
                  <span className="text-sm text-gray-900">{s.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {ko ? '선택된 학생 4명' : '4 students selected'}
            </p>
          </div>
        </form>
      </ModalShell>
    </NonFunctional>
  )
}
