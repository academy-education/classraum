"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  Plus,
  X,
  Calendar,
  Users,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
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
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('payments.paymentPlans')}</h2>
              <p className="text-gray-500">{t('payments.manageRecurringTemplates')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={onAddPlan} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
  {t('payments.addPaymentPlan')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
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
                          {!template.is_active && <span className="text-gray-500 font-normal"> (비활성)</span>}
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
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noPaymentPlansFound')}</h3>
                <p className="text-gray-600 mb-4">{t('payments.getStartedFirstPlan')}</p>
                <Button onClick={onAddPlan} className="flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
    {t('payments.addPaymentPlan')}
                </Button>
              </div>
            )}
          </div>
      </div>
    </Modal>
  )
}
