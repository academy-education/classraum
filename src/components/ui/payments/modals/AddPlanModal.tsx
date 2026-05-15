"use client"

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { useTranslation } from '@/hooks/useTranslation'

interface PlanFormData {
  name: string
  amount: string
  recurrence_type: string
  day_of_month: string
  day_of_week: string
  start_date: string
  end_date: string
}

interface AddPlanModalProps {
  isOpen: boolean
  onClose: () => void
  planFormData: PlanFormData
  setPlanFormData: (updater: (prev: PlanFormData) => PlanFormData) => void
  formatAmountWithCommas: (value: string) => string
  handleAmountChange: (value: string) => void
  onSubmit: () => void
  isCreating: boolean
  isSaving: boolean
  DatePickerComponent: (props: { value: string; onChange: (value: string) => void; fieldId: string }) => ReactNode
}

export function AddPlanModal({
  isOpen,
  onClose,
  planFormData,
  setPlanFormData,
  formatAmountWithCommas,
  handleAmountChange,
  onSubmit,
  isCreating,
  isSaving,
  DatePickerComponent,
}: AddPlanModalProps) {
  const { t } = useTranslation()

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={String(t('payments.addPaymentPlan'))}
      footer={
        <ModalShell.Footer split>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={isCreating || isSaving}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.creating')}
              </>
            ) : (
              t('payments.addPaymentPlan')
            )}
          </Button>
        </ModalShell.Footer>
      }
    >
      <form className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">
            {t('payments.planName')}
            <span className="text-rose-500 ml-1">*</span>
          </Label>
          <Input
            placeholder={String(t('payments.planNamePlaceholder'))}
            className="h-10"
            value={planFormData.name}
            onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">
            {t('payments.amount')}
            <span className="text-rose-500 ml-1">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
            <Input
              type="text"
              placeholder="0"
              className="h-10 pl-9"
              value={formatAmountWithCommas(planFormData.amount)}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">
            {t('payments.recurrenceType')}
            <span className="text-rose-500 ml-1">*</span>
          </Label>
          <Select
            value={planFormData.recurrence_type}
            onValueChange={(value) => setPlanFormData(prev => ({ ...prev, recurrence_type: value }))}
          >
            <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t('payments.monthly')}</SelectItem>
              <SelectItem value="weekly">{t('payments.weekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {planFormData.recurrence_type === 'monthly' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.dayOfMonth')}
              <span className="text-rose-500 ml-1">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              max="31"
              placeholder="1"
              className="h-10"
              value={planFormData.day_of_month}
              onChange={(e) => setPlanFormData(prev => ({ ...prev, day_of_month: e.target.value }))}
            />
            <p className="text-xs text-gray-500">{t('payments.dayOfMonthHelper')}</p>
          </div>
        )}

        {planFormData.recurrence_type === 'weekly' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('payments.dayOfWeek')}
              <span className="text-rose-500 ml-1">*</span>
            </Label>
            <Select
              value={planFormData.day_of_week}
              onValueChange={(value) => setPlanFormData(prev => ({ ...prev, day_of_week: value }))}
            >
              <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                <SelectValue placeholder={t('payments.selectDayOfWeekPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">{t('payments.weekdays.monday')}</SelectItem>
                <SelectItem value="tuesday">{t('payments.weekdays.tuesday')}</SelectItem>
                <SelectItem value="wednesday">{t('payments.weekdays.wednesday')}</SelectItem>
                <SelectItem value="thursday">{t('payments.weekdays.thursday')}</SelectItem>
                <SelectItem value="friday">{t('payments.weekdays.friday')}</SelectItem>
                <SelectItem value="saturday">{t('payments.weekdays.saturday')}</SelectItem>
                <SelectItem value="sunday">{t('payments.weekdays.sunday')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">
            {t('payments.startDate')}
            <span className="text-rose-500 ml-1">*</span>
          </Label>
          <DatePickerComponent
            value={planFormData.start_date}
            onChange={(value) => setPlanFormData(prev => ({ ...prev, start_date: value }))}
            fieldId="add-start-date"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground/80">{t('payments.endDateOptional')}</Label>
          <DatePickerComponent
            value={planFormData.end_date}
            onChange={(value) => setPlanFormData(prev => ({ ...prev, end_date: value }))}
            fieldId="add-end-date"
          />
        </div>
      </form>
    </ModalShell>
  )
}
