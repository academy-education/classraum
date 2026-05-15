"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  Calendar,
  Users,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'
import type { PaymentTemplate } from '../hooks/usePaymentsData'

interface ViewPlansModalProps {
  isOpen: boolean
  onClose: () => void
  paymentTemplates: PaymentTemplate[]
  templatesLoading: boolean
  planSearchQuery: string
  setPlanSearchQuery: (query: string) => void
  onAddPlan: () => void
  onEditTemplate: (template: PaymentTemplate) => void
  onDeleteTemplate: (template: PaymentTemplate) => void
  formatDate: (dateString: string) => string
  formatCurrency: (amount: number) => string
  calculateNextDueDate: (template: PaymentTemplate) => string
  integerToDayOfWeek: (dayInt: number | null) => string
}

export function ViewPlansModal({
  isOpen,
  onClose,
  paymentTemplates,
  templatesLoading,
  planSearchQuery,
  setPlanSearchQuery,
  onAddPlan,
  onEditTemplate,
  onDeleteTemplate,
  formatDate,
  formatCurrency,
  calculateNextDueDate,
  integerToDayOfWeek,
}: ViewPlansModalProps) {
  const { t } = useTranslation()

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
      headerSlot={
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate">{t('payments.paymentPlans')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('payments.manageRecurringTemplates')}</p>
          </div>
          <Button onClick={onAddPlan} className="flex items-center gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
            {t('payments.addPaymentPlan')}
          </Button>
        </div>
      }
    >
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
              <Input
                type="text"
                placeholder={String(t('payments.searchPaymentPlans'))}
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
              />
            </div>

            {templatesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paymentTemplates
                  .filter(template =>
                    !planSearchQuery ||
                    template.name.toLowerCase().includes(planSearchQuery.toLowerCase()) ||
                    template.recurrence_type.toLowerCase().includes(planSearchQuery.toLowerCase())
                  )
                  .map((template) => (
                  <Card key={template.id} className={`p-6 hover:shadow-md transition-shadow ${!template.is_active ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {template.name}
                          {!template.is_active && <span className="text-gray-500 font-normal">{t('payments.inactiveSuffix')}</span>}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => onEditTemplate(template)}
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => onDeleteTemplate(template)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-gray-500 font-medium text-sm">₩</span>
                        <span>{template.amount.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {template.recurrence_type === 'monthly' && template.day_of_month && (
                            `매월 ${template.day_of_month}일`
                          )}
                          {template.recurrence_type === 'weekly' && template.day_of_week !== null && (
                            `매주 ${integerToDayOfWeek(template.day_of_week ?? null)}요일`
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{t('payments.studentsEnrolled', { count: template.student_count || 0 })}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{t('payments.nextDue')}: {formatDate(calculateNextDueDate(template))}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{t('payments.started')}: {formatDate(template.start_date)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {paymentTemplates.length === 0 && !templatesLoading && (
              <EmptyState
                icon={Calendar}
                title={String(t('payments.noPaymentPlansFound'))}
                description={String(t('payments.getStartedFirstPlan'))}
                actionLabel={String(t('payments.addPaymentPlan'))}
                onAction={onAddPlan}
                actionIcon={<Plus className="w-4 h-4" />}
              />
            )}
    </ModalShell>
  )
}
