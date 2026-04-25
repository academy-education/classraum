"use client"

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { DateInput } from '@/components/ui/common/DateInput'
import {
  Search,
  X,
  Users,
  CheckCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  Invoice,
  PaymentTemplate,
  RecurringStudent,
  PaymentsStudent,
} from '../hooks/usePaymentsData'

export interface PaymentFormData {
  payment_type: string
  recurring_template_id: string
  selected_students: string[]
  invoice_name: string
  amount: string
  due_date: string
  description: string
  status: string
  discount_amount: string
  discount_reason: string
  paid_at: string
  payment_method: string
  refunded_amount: string
  student_amount_overrides: { [studentId: string]: { enabled: boolean; amount: string; reason?: string } }
  student_discount_overrides: { [studentId: string]: { enabled: boolean; amount: string; reason: string } }
}

export const emptyPaymentFormData: PaymentFormData = {
  payment_type: 'one_time',
  recurring_template_id: '',
  selected_students: [],
  invoice_name: '',
  amount: '',
  due_date: '',
  description: '',
  status: 'pending',
  discount_amount: '',
  discount_reason: '',
  paid_at: '',
  payment_method: '',
  refunded_amount: '',
  student_amount_overrides: {},
  student_discount_overrides: {}
}

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentFormData: PaymentFormData
  setPaymentFormData: React.Dispatch<React.SetStateAction<PaymentFormData>>
  students: PaymentsStudent[]
  studentsLoading: boolean
  paymentTemplates: PaymentTemplate[]
  recurringStudents: RecurringStudent[]
  studentSearchQuery: string
  setStudentSearchQuery: (query: string) => void
  expandedOverrides: Set<string>
  toggleOverrideExpanded: (studentId: string) => void
  toggleSelectAllStudents: () => void
  hoveredStudent: string | null
  setHoveredStudent: (id: string | null) => void
  tooltipPosition: { x: number; y: number }
  setTooltipPosition: (pos: { x: number; y: number }) => void
  formatAmountWithCommas: (value: string) => string
  formatDate: (dateString: string) => string
  handleAddPayment: () => void
  isCreating: boolean
  isSaving: boolean
  filteredRecurringModalStudents: PaymentsStudent[]
  filteredOneTimeModalStudents: PaymentsStudent[]
}

export function AddPaymentModal({
  isOpen,
  onClose,
  paymentFormData,
  setPaymentFormData,
  students,
  studentsLoading,
  paymentTemplates,
  recurringStudents,
  studentSearchQuery,
  setStudentSearchQuery,
  expandedOverrides,
  toggleOverrideExpanded,
  toggleSelectAllStudents,
  hoveredStudent,
  setHoveredStudent,
  tooltipPosition,
  setTooltipPosition,
  formatAmountWithCommas,
  formatDate,
  handleAddPayment,
  isCreating,
  isSaving,
  filteredRecurringModalStudents,
  filteredOneTimeModalStudents,
}: AddPaymentModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('payments.addPayment')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
          <form className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('payments.paymentType')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select
                value={paymentFormData.payment_type}
                onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_type: value }))}
              >
                <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="one_time">{t('payments.oneTime')}</SelectItem>
                  <SelectItem value="recurring">{t('payments.recurring')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Name Field - shown for both payment types */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('payments.invoiceName')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                type="text"
                placeholder={String(t('payments.invoiceNamePlaceholder'))}
                className="h-10"
                value={paymentFormData.invoice_name}
                onChange={(e) => setPaymentFormData(prev => ({ ...prev, invoice_name: e.target.value }))}
              />
            </div>

            {paymentFormData.payment_type === 'recurring' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('payments.paymentPlan')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={paymentFormData.recurring_template_id}
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, recurring_template_id: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t('payments.selectPaymentPlan')} />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      {paymentTemplates.filter(template => template.is_active).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - ₩{template.amount.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Plan Information */}
                {paymentFormData.recurring_template_id && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {(() => {
                        const selectedTemplate = paymentTemplates.find(t => t.id === paymentFormData.recurring_template_id)
                        if (!selectedTemplate) return null

                        const getRecurrenceText = () => {
                          if (selectedTemplate.recurrence_type === 'monthly') {
                            return `매월 ${selectedTemplate.day_of_month}일`
                          } else if (selectedTemplate.recurrence_type === 'weekly') {
                            const days = ['일', '월', '화', '수', '목', '금', '토']
                            return `매주 ${days[selectedTemplate.day_of_week ?? 0]}요일`
                          }
                          return selectedTemplate.recurrence_type
                        }

                        const getOrdinalSuffix = ((num: number) => {
                          const j = num % 10
                          const k = num % 100
                          if (j === 1 && k !== 11) return 'st'
                          if (j === 2 && k !== 12) return 'nd'
                          if (j === 3 && k !== 13) return 'rd'
                          return 'th'
                        })
                        getOrdinalSuffix(1)

                        return (
                          <div className="space-y-2">
                            <h4 className="font-medium text-blue-900">{selectedTemplate.name}</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-blue-700 font-medium">{t('payments.amount')}:</span>
                                <p className="text-blue-800">₩{selectedTemplate.amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-blue-700 font-medium">일정:</span>
                                <p className="text-blue-800">{getRecurrenceText()}</p>
                              </div>
                            </div>
                            {selectedTemplate.next_due_date && (
                              <div className="text-sm">
                                <span className="text-blue-700 font-medium">{t('payments.nextDue')}:</span>
                                <span className="text-blue-800 ml-1">
                                  {formatDate(selectedTemplate.next_due_date)}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('common.students')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  {paymentFormData.recurring_template_id && (() => {
                    const hiddenStudentsCount = students.filter(student => {
                      return recurringStudents.some(
                        enrollment => enrollment.template_id === paymentFormData.recurring_template_id &&
                                     enrollment.student_id === student.user_id
                      )
                    }).length

                    if (hiddenStudentsCount > 0) {
                      return (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-700">
                            {t('payments.studentsHiddenDueToExistingEnrollment', { count: hiddenStudentsCount })}
                          </p>
                        </div>
                      )
                    }
                    return null
                  })()}
                  <div className="border border-border rounded-lg bg-gray-50 p-4">
                    {studentsLoading ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('payments.loadingStudents')}</p>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('payments.noStudentsAvailable')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                          <Input
                            type="text"
                            placeholder={String(t('payments.searchStudentsByNameOrSchool'))}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                          />
                        </div>

                        <div className="mb-3">
                          <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllStudents}
                            className="h-8 px-3 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {(() => {
                              const filteredStudentIds = filteredRecurringModalStudents.map(student => student.user_id)
                              const allSelected = filteredStudentIds.every(id => paymentFormData.selected_students.includes(id))
                              return allSelected ? t("payments.deselectAll") : t("payments.selectAll")
                            })()}
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                          {filteredRecurringModalStudents.map(student => {
                            const isSelected = paymentFormData.selected_students.includes(student.user_id)
                            const hasAmountOverride = paymentFormData.student_amount_overrides[student.user_id]?.enabled

                            return (
                              <div key={student.user_id} className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all bg-white">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        const updatedSelectedStudents = isSelected
                                          ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                          : [...paymentFormData.selected_students, student.user_id];
                                        const updatedOverrides = { ...paymentFormData.student_amount_overrides }
                                        if (isSelected) delete updatedOverrides[student.user_id]
                                        setPaymentFormData(prev => ({ ...prev, selected_students: updatedSelectedStudents, student_amount_overrides: updatedOverrides }));
                                      }}
                                      className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                    />
                                    <div className="flex-1 min-w-0 relative">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate cursor-default"
                                          onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltipPosition({ x: rect.right + 10, y: rect.top }); setHoveredStudent(student.id) }}
                                          onMouseLeave={() => setHoveredStudent(null)}
                                        >{student.name}</span>
                                        {student.school_name && (<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">{student.school_name}</span>)}
                                      </div>
                                      {hoveredStudent === student.id && (
                                        <div className="fixed z-[90] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px] animate-in fade-in duration-150" style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}>
                                          <div className="space-y-2 text-sm">
                                            <div><span className="font-semibold text-gray-700">{student.name}</span></div>
                                            {student.phone && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.phone")}:</span><span className="text-gray-900">{student.phone}</span></div>)}
                                            {student.email && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.email")}:</span><span className="text-gray-900 break-all">{student.email}</span></div>)}
                                            {student.family_name && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.family")}:</span><span className="text-gray-900">{student.family_name}</span></div>)}
                                            {student.parent_names && student.parent_names.length > 0 && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.parents")}:</span><span className="text-gray-900">{student.parent_names.join(', ')}</span></div>)}
                                            {!student.phone && !student.email && !student.family_name && (<div className="text-gray-500 text-xs">{t("classrooms.noAdditionalInfo")}</div>)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </label>

                                  {isSelected && (
                                    <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                      <input type="checkbox" checked={hasAmountOverride || false}
                                        onChange={(e) => {
                                          setPaymentFormData(prev => ({ ...prev, student_amount_overrides: { ...prev.student_amount_overrides, [student.user_id]: { enabled: e.target.checked, amount: e.target.checked ? (prev.student_amount_overrides[student.user_id]?.amount || '') : '' } } }))
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-1 focus:ring-primary focus:outline-none"
                                      />
                                      <span className="text-xs font-medium text-gray-600">₩</span>
                                    </label>
                                  )}
                                </div>

                                {isSelected && hasAmountOverride && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <button type="button" onClick={() => toggleOverrideExpanded(student.user_id)}
                                      className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors">
                                      <span className="text-xs font-medium text-gray-700 cursor-pointer">{String(t('payments.amountOverride'))}</span>
                                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedOverrides.has(student.user_id) ? 'transform rotate-180' : ''}`} />
                                    </button>
                                    {expandedOverrides.has(student.user_id) && (
                                      <div className="mt-2 space-y-2">
                                        <div>
                                          <Label className="text-xs font-medium text-gray-700 mb-1">{t('payments.overrideAmount')}</Label>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium">₩</span>
                                            <Input type="text" placeholder="0"
                                              value={formatAmountWithCommas(paymentFormData.student_amount_overrides[student.user_id]?.amount || '')}
                                              onChange={(e) => {
                                                const numericValue = e.target.value.replace(/,/g, '')
                                                setPaymentFormData(prev => ({ ...prev, student_amount_overrides: { ...prev.student_amount_overrides, [student.user_id]: { ...prev.student_amount_overrides[student.user_id], enabled: true, amount: numericValue } } }))
                                              }}
                                              className="h-8 text-xs pl-6 pr-3 rounded border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-right"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-medium text-gray-700 mb-1">{t('payments.reason')}</Label>
                                          <Input placeholder={String(t('payments.reasonForOverridePlaceholder'))}
                                            value={paymentFormData.student_amount_overrides[student.user_id]?.reason || ''}
                                            onChange={(e) => {
                                              setPaymentFormData(prev => ({ ...prev, student_amount_overrides: { ...prev.student_amount_overrides, [student.user_id]: { ...prev.student_amount_overrides[student.user_id], reason: e.target.value } } }))
                                            }}
                                            className="h-8 text-xs border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {paymentFormData.payment_type === 'one_time' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('payments.amount')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                    <Input type="text" placeholder="0" className="h-10 pl-9"
                      value={formatAmountWithCommas(paymentFormData.amount)}
                      onChange={(e) => { const numericValue = e.target.value.replace(/,/g, ''); setPaymentFormData(prev => ({ ...prev, amount: numericValue })) }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('common.students')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <div className="border border-border rounded-lg bg-gray-50 p-4">
                    {studentsLoading ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('payments.loadingStudents')}</p>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t('payments.noStudentsAvailable')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                          <Input type="text" placeholder={String(t('payments.searchStudentsByNameOrSchool'))}
                            value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                          />
                        </div>

                        <div className="mb-3">
                          <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllStudents}
                            className="h-8 px-3 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {(() => {
                              const filteredStudentIds = filteredOneTimeModalStudents.map(student => student.user_id)
                              const allSelected = filteredStudentIds.every(id => paymentFormData.selected_students.includes(id))
                              return allSelected ? t("payments.deselectAll") : t("payments.selectAll")
                            })()}
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                          {filteredOneTimeModalStudents.map(student => {
                            const isSelected = paymentFormData.selected_students.includes(student.user_id)
                            const hasDiscount = paymentFormData.student_discount_overrides[student.user_id]?.enabled

                            return (
                              <div key={student.user_id} className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all bg-white">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <input type="checkbox" checked={isSelected}
                                      onChange={() => {
                                        const updatedSelectedStudents = isSelected
                                          ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                          : [...paymentFormData.selected_students, student.user_id];
                                        const updatedAmountOverrides = { ...paymentFormData.student_amount_overrides }
                                        const updatedDiscountOverrides = { ...paymentFormData.student_discount_overrides }
                                        if (isSelected) { delete updatedAmountOverrides[student.user_id]; delete updatedDiscountOverrides[student.user_id] }
                                        setPaymentFormData(prev => ({ ...prev, selected_students: updatedSelectedStudents, student_amount_overrides: updatedAmountOverrides, student_discount_overrides: updatedDiscountOverrides }));
                                      }}
                                      className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                    />
                                    <div className="flex-1 min-w-0 relative">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-gray-900 truncate cursor-default"
                                          onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltipPosition({ x: rect.right + 10, y: rect.top }); setHoveredStudent(student.id) }}
                                          onMouseLeave={() => setHoveredStudent(null)}
                                        >{student.name}</span>
                                        {student.school_name && (<span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">{student.school_name}</span>)}
                                      </div>
                                      {hoveredStudent === student.id && (
                                        <div className="fixed z-[90] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px] animate-in fade-in duration-150" style={{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }}>
                                          <div className="space-y-2 text-sm">
                                            <div><span className="font-semibold text-gray-700">{student.name}</span></div>
                                            {student.phone && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.phone")}:</span><span className="text-gray-900">{student.phone}</span></div>)}
                                            {student.email && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.email")}:</span><span className="text-gray-900 break-all">{student.email}</span></div>)}
                                            {student.family_name && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.family")}:</span><span className="text-gray-900">{student.family_name}</span></div>)}
                                            {student.parent_names && student.parent_names.length > 0 && (<div className="flex items-start gap-2"><span className="text-gray-500 min-w-[60px]">{t("classrooms.parents")}:</span><span className="text-gray-900">{student.parent_names.join(', ')}</span></div>)}
                                            {!student.phone && !student.email && !student.family_name && (<div className="text-gray-500 text-xs">{t("classrooms.noAdditionalInfo")}</div>)}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </label>

                                  {isSelected && (
                                    <label className="flex items-center gap-1 cursor-pointer shrink-0">
                                      <input type="checkbox" checked={hasDiscount || false}
                                        onChange={(e) => {
                                          setPaymentFormData(prev => ({ ...prev, student_discount_overrides: { ...prev.student_discount_overrides, [student.user_id]: { enabled: e.target.checked, amount: e.target.checked ? (prev.student_discount_overrides[student.user_id]?.amount || '') : '', reason: e.target.checked ? (prev.student_discount_overrides[student.user_id]?.reason || '') : '' } } }))
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-1 focus:ring-primary focus:outline-none"
                                      />
                                      <span className="text-xs font-medium text-gray-600">₩</span>
                                    </label>
                                  )}
                                </div>

                                {isSelected && hasDiscount && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <button type="button" onClick={() => toggleOverrideExpanded(student.user_id)}
                                      className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-1 px-1 py-1 rounded transition-colors">
                                      <span className="text-xs font-medium text-gray-700 cursor-pointer">{String(t('payments.amountOverride'))}</span>
                                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedOverrides.has(student.user_id) ? 'transform rotate-180' : ''}`} />
                                    </button>
                                    {expandedOverrides.has(student.user_id) && (
                                      <div className="mt-2 space-y-2">
                                        <div>
                                          <Label className="text-xs font-medium text-gray-700 mb-1">{t('payments.overrideAmount')}</Label>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium">₩</span>
                                            <Input type="text" placeholder="0"
                                              value={formatAmountWithCommas(paymentFormData.student_discount_overrides[student.user_id]?.amount || '')}
                                              onChange={(e) => {
                                                const numericValue = e.target.value.replace(/,/g, '')
                                                setPaymentFormData(prev => ({ ...prev, student_discount_overrides: { ...prev.student_discount_overrides, [student.user_id]: { ...prev.student_discount_overrides[student.user_id], amount: numericValue } } }))
                                              }}
                                              className="h-8 text-xs pl-6 pr-3 rounded border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary text-right"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-xs font-medium text-gray-700 mb-1">{t('payments.reason')}</Label>
                                          <Input placeholder={String(t('payments.reasonForOverridePlaceholder'))}
                                            value={paymentFormData.student_discount_overrides[student.user_id]?.reason || ''}
                                            onChange={(e) => {
                                              setPaymentFormData(prev => ({ ...prev, student_discount_overrides: { ...prev.student_discount_overrides, [student.user_id]: { ...prev.student_discount_overrides[student.user_id], reason: e.target.value } } }))
                                            }}
                                            className="h-8 text-xs border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {paymentFormData.payment_type === 'one_time' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.discountAmount')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                    <Input type="text" placeholder="0" className="h-10 pl-9"
                      value={formatAmountWithCommas(paymentFormData.discount_amount)}
                      onChange={(e) => { const numericValue = e.target.value.replace(/,/g, ''); setPaymentFormData(prev => ({ ...prev, discount_amount: numericValue })) }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.discountReason')}</Label>
                  <Input placeholder={String(t('payments.reasonForDiscountOptional'))} className="h-10"
                    value={paymentFormData.discount_reason}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, discount_reason: e.target.value }))}
                  />
                </div>

                {paymentFormData.discount_amount && parseFloat(paymentFormData.discount_amount) > 0 && paymentFormData.amount && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">{t('payments.finalPrice')}</span>
                      <span className="text-lg font-bold text-blue-900">
                        ₩{(parseFloat(paymentFormData.amount) - parseFloat(paymentFormData.discount_amount)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t('payments.dueDate')}
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <DateInput value={paymentFormData.due_date} onChange={(value) => setPaymentFormData(prev => ({ ...prev, due_date: value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paidDate')}</Label>
                  <DateInput value={paymentFormData.paid_at} onChange={(value) => setPaymentFormData(prev => ({ ...prev, paid_at: value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentMethod')}</Label>
                  <Select value={paymentFormData.payment_method} onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t('payments.selectPaymentMethodPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      <SelectItem value="cash">{t('payments.paymentMethods.cash')}</SelectItem>
                      <SelectItem value="card">{t('payments.paymentMethods.card')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('payments.paymentMethods.bankTransfer')}</SelectItem>
                      <SelectItem value="other">{t('payments.paymentMethods.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {paymentFormData.payment_type === 'one_time' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
                <Select value={paymentFormData.status} onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                    <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                    <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                    <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {paymentFormData.status === 'refunded' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('payments.refund')}</Label>
                <Input type="number" placeholder="0" className="h-10"
                  value={paymentFormData.refunded_amount}
                  onChange={(e) => setPaymentFormData(prev => ({ ...prev, refunded_amount: e.target.value }))}
                />
              </div>
            )}
          </form>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="flex-1 mr-3">
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleAddPayment}
            disabled={
              isCreating || isSaving || !paymentFormData.invoice_name ||
              (paymentFormData.payment_type === 'one_time' && (
                !paymentFormData.amount || !paymentFormData.due_date || paymentFormData.selected_students.length === 0 ||
                paymentFormData.selected_students.some(studentId => {
                  const discountOverride = paymentFormData.student_discount_overrides[studentId]
                  const overrideAmount = discountOverride?.enabled && discountOverride?.amount ? parseFloat(discountOverride.amount) : parseFloat(paymentFormData.amount || '0')
                  const baseAmount = parseFloat(paymentFormData.amount || '0')
                  return overrideAmount < 0 || overrideAmount > baseAmount
                })
              )) ||
              (paymentFormData.payment_type === 'recurring' && (
                !paymentFormData.recurring_template_id || paymentFormData.selected_students.length === 0
              ))
            }
            className="flex-1"
          >
            {isCreating ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('common.creating')}</>
            ) : (
              t('payments.addPayment')
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
