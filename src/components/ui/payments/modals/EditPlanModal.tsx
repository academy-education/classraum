"use client"

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import type { PaymentTemplate } from '../hooks/usePaymentsData'

interface PlanFormData {
  name: string
  amount: string
  recurrence_type: string
  day_of_month: string
  day_of_week: string
  start_date: string
  end_date: string
}

interface EditPlanModalProps {
  isOpen: boolean
  onClose: () => void
  editingTemplate: PaymentTemplate | null
  planFormData: PlanFormData
  setPlanFormData: (updater: (prev: PlanFormData) => PlanFormData) => void
  formatAmountWithCommas: (value: string) => string
  handleAmountChange: (value: string) => void
  onSubmit: () => void
  isCreating: boolean
  isSaving: boolean
  DatePickerComponent: (props: { value: string; onChange: (value: string) => void; fieldId: string; key?: string }) => ReactNode
}

export function EditPlanModal({
  isOpen,
  onClose,
  editingTemplate,
  planFormData,
  setPlanFormData,
  formatAmountWithCommas,
  handleAmountChange,
  onSubmit,
  isCreating,
  isSaving,
  DatePickerComponent,
}: EditPlanModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen && !!editingTemplate} onClose={onClose} size="md">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.editPaymentPlan')}</h2>
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
                <Label className="text-sm font-medium text-foreground/80">
                  {t('payments.planName')}
                  <span className="text-red-500 ml-1">*</span>
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
                  <span className="text-red-500 ml-1">*</span>
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
                  <span className="text-red-500 ml-1">*</span>
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
                    <span className="text-red-500 ml-1">*</span>
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
                    <span className="text-red-500 ml-1">*</span>
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
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <DatePickerComponent
                  key={`edit-start-${editingTemplate?.id || 'new'}-${planFormData.start_date}`}
                  value={planFormData.start_date}
                  onChange={(value) => setPlanFormData(prev => ({ ...prev, start_date: value }))}
                  fieldId="edit-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('payments.endDateOptional')}</Label>
                <DatePickerComponent
                  key={`edit-end-${editingTemplate?.id || 'new'}-${planFormData.end_date}`}
                  value={planFormData.end_date}
                  onChange={(value) => setPlanFormData(prev => ({ ...prev, end_date: value }))}
                  fieldId="edit-end-date"
                />
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
            <Button
              onClick={onSubmit}
              disabled={isCreating || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('common.saving')}
                </>
              ) : (
                t('payments.updatePaymentPlan')
              )}
            </Button>
          </div>
      </div>
    </Modal>
  )
}
