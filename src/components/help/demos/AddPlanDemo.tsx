"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the Add Payment Plan modal — mirrors
 * payments/modals/AddPlanModal.tsx. Fields shown filled with sample
 * tuition (월 400,000원, 25일) so users see what a typical plan looks
 * like before they click Add.
 */
export function AddPlanDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="md"
        title={String(t('payments.addPaymentPlan'))}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline">{t('common.cancel')}</Button>
            <Button>{t('payments.addPaymentPlan')}</Button>
          </ModalShell.Footer>
        }
      >
        <form className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.planName')} <span className="text-rose-500">*</span>
            </Label>
            <Input
              readOnly
              className="h-10"
              value={ko ? '월 수강료' : 'Monthly tuition'}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.amount')} <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
              <Input readOnly type="text" className="h-10 pl-9" value="400,000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.recurrenceType')} <span className="text-rose-500">*</span>
            </Label>
            <Select value="monthly">
              <SelectTrigger className="h-10 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t('payments.monthly')}</SelectItem>
                <SelectItem value="weekly">{t('payments.weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.dayOfMonth')} <span className="text-rose-500">*</span>
            </Label>
            <Input readOnly type="number" className="h-10" value={25} />
            <p className="text-xs text-gray-500">{t('payments.dayOfMonthHelper')}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.startDate')} <span className="text-rose-500">*</span>
            </Label>
            <DatePicker value="2026-06-01" onChange={() => undefined} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.endDateOptional')}
            </Label>
            <DatePicker value="" onChange={() => undefined} />
          </div>
        </form>
      </ModalShell>
    </NonFunctional>
  )
}
