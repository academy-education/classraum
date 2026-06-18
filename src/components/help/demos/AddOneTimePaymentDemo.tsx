"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the Add Payment modal in One-time mode — mirrors
 * payments/modals/AddPaymentModal.tsx with payment_type='one_time'.
 * Shows the full required-field set so users learn the workflow
 * before opening the real modal.
 */
export function AddOneTimePaymentDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getStudents(language), [language])

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
            <Select value="one_time">
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
              value={ko ? '교재비 — 4학년 수학' : 'Textbook fee — Grade 4 Math'}
            />
          </div>

          {/* Student */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('reports.student')} <span className="text-rose-500">*</span>
            </Label>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2 max-h-40 overflow-y-auto">
              {students.slice(0, 3).map((s, i) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    readOnly
                    checked={i === 0}
                    className="text-primary rounded"
                  />
                  <span className="text-sm text-gray-900">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.amount')} <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
              <Input readOnly className="h-10 pl-9" value="35,000" />
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('common.dueDate')} <span className="text-rose-500">*</span>
            </Label>
            <DatePicker value="2026-06-30" onChange={() => undefined} />
            <p className="text-xs text-gray-500">
              {ko
                ? '마감일이 지나면 결제 링크는 자동 만료됩니다.'
                : 'After the due date passes, the payment link auto-expires.'}
            </p>
          </div>
        </form>
      </ModalShell>
    </NonFunctional>
  )
}
