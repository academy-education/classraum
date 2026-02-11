"use client"

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, Search, Edit, Trash2, Pause, Play, Plus } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface PaymentTemplate {
  id: string
  academy_id: string
  name: string
  amount: number
  recurrence_type: 'monthly' | 'weekly'
  day_of_month?: number
  day_of_week?: number
  interval_weeks?: number
  semester_months?: number
  next_due_date: string
  start_date: string
  end_date?: string
  is_active: boolean
  created_at: string
  student_count?: number
}

interface PaymentPlansModalProps {
  isOpen: boolean
  onClose: () => void
  onAddPlan: () => void
  onEditPlan: (template: PaymentTemplate) => void
  onDeletePlan: (template: PaymentTemplate) => void
  onTogglePlan: (template: PaymentTemplate) => void
  paymentTemplates: PaymentTemplate[]
  loading: boolean
}

export const PaymentPlansModal = React.memo<PaymentPlansModalProps>(({
  isOpen,
  onClose,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onTogglePlan,
  paymentTemplates,
  loading
}) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Memoized filtered templates
  const filteredTemplates = React.useMemo(() => 
    paymentTemplates.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [paymentTemplates, searchQuery]
  )

  // Memoized utility functions
  const getRecurrenceText = React.useCallback((template: PaymentTemplate) => {
    if (template.recurrence_type === 'monthly') {
      if (template.day_of_month) {
        return t('payments.monthlyOnDay', { day: template.day_of_month })
      }
      return t('payments.monthly')
    } else {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = template.day_of_week !== undefined ? t(`common.days.${days[template.day_of_week]}`) : ''
      if (template.interval_weeks && template.interval_weeks > 1) {
        return t('payments.everyNWeeksOnDay', { weeks: template.interval_weeks, day: String(dayName) })
      }
      return t('payments.weeklyOnDay', { day: String(dayName) })
    }
  }, [t])

  const formatDate = React.useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{t('payments.paymentPlans')}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={onAddPlan}>
              <Plus className="w-4 h-4 mr-2" />
              {t('payments.addPlan')}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={String(t('payments.searchPlans'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">{t('common.loading')}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                {searchQuery ? t('payments.noPlansFound') : t('payments.noPlansYet')}
              </p>
              {!searchQuery && (
                <Button onClick={onAddPlan}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('payments.createFirstPlan')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg mb-1">{template.name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mb-2">
                        ₩{template.amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        template.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.is_active ? t('common.active') : t('common.paused')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>{getRecurrenceText(template)}</div>
                    <div>{t('payments.studentsEnrolled', { count: template.student_count || 0 })}</div>
                    <div>{t('payments.nextDue')}: {formatDate(template.next_due_date)}</div>
                    <div>{t('payments.startDate')}: {formatDate(template.start_date)}</div>
                    {template.end_date && (
                      <div>{t('payments.endDate')}: {formatDate(template.end_date)}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditPlan(template)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTogglePlan(template)}
                    >
                      {template.is_active ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          {t('common.pause')}
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          {t('common.resume')}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeletePlan(template)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
})

PaymentPlansModal.displayName = 'PaymentPlansModal'