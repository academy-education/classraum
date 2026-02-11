"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Search, Plus, Minus } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Student {
  id: string
  name: string
  email: string
  school_name?: string
}

interface PaymentTemplate {
  id: string
  name: string
  amount: number
}

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (paymentData: {
    paymentType: string
    invoiceName: string
    selectedStudents: Student[]
    amount: number
    discountAmount: number
    dueDate: string
    description?: string
    templateId?: string
  }) => void
  academyId: string
  paymentTemplates: PaymentTemplate[]
}

export function AddPaymentModal({ 
  isOpen, 
  onClose, 
  onSave, 
  academyId,
  paymentTemplates 
}: AddPaymentModalProps) {
  const { t } = useTranslation()
  
  // Form state
  const [paymentType, setPaymentType] = useState('one_time')
  const [invoiceName, setInvoiceName] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [amount, setAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [templateId, setTemplateId] = useState('')
  
  // Students data
  const [students, setStudents] = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  
  // Individual overrides for recurring payments
  const [individualOverrides, setIndividualOverrides] = useState<Record<string, {
    hasAmountOverride: boolean
    overrideAmount: string
  }>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentType('one_time')
      setInvoiceName('')
      setSelectedStudents([])
      setSearchQuery('')
      setAmount('')
      setDiscountAmount('')
      setDiscountReason('')
      setDueDate(new Date().toISOString().split('T')[0])
      setTemplateId('')
      setIndividualOverrides({})
    }
  }, [isOpen])

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    
    setLoadingStudents(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          users!inner(
            name,
            email
          ),
          school_name
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) throw error

      const studentsData = (data || []).map((student: Record<string, unknown>) => ({
        id: student.id as string,
        name: ((student.users as Record<string, unknown>)?.name as string) || 'Unknown Student',
        email: ((student.users as Record<string, unknown>)?.email as string) || '',
        school_name: student.school_name as string
      }))

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }, [academyId])

  useEffect(() => {
    if (isOpen) {
      fetchStudents()
    }
  }, [isOpen, fetchStudents])

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.school_name && student.school_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Handle student selection
  const handleStudentToggle = (student: Student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id)
      if (isSelected) {
        // Remove student and their override
        setIndividualOverrides(overrides => {
          const newOverrides = { ...overrides }
          delete newOverrides[student.id]
          return newOverrides
        })
        return prev.filter(s => s.id !== student.id)
      } else {
        return [...prev, student]
      }
    })
  }

  // Handle individual override toggle
  const handleOverrideToggle = (studentId: string) => {
    setIndividualOverrides(prev => ({
      ...prev,
      [studentId]: {
        hasAmountOverride: !prev[studentId]?.hasAmountOverride,
        overrideAmount: prev[studentId]?.overrideAmount || ''
      }
    }))
  }

  // Handle override amount change
  const handleOverrideAmountChange = (studentId: string, value: string) => {
    setIndividualOverrides(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        overrideAmount: value
      }
    }))
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!invoiceName.trim()) {
      alert(t('payments.enterInvoiceName'))
      return
    }

    if (selectedStudents.length === 0) {
      alert(t('payments.selectStudents'))
      return
    }

    if (paymentType === 'one_time' && !amount) {
      alert(t('payments.enterAmount'))
      return
    }

    if (paymentType === 'recurring' && !templateId) {
      alert(t('payments.selectTemplate'))
      return
    }

    if (!dueDate) {
      alert(t('payments.selectDueDate'))
      return
    }

    const paymentData = {
      paymentType,
      invoiceName: invoiceName.trim(),
      selectedStudents,
      amount: parseFloat(amount) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      discountReason,
      dueDate,
      templateId,
      individualOverrides
    }

    await onSave(paymentData)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{t('payments.addPayment')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* Payment Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('payments.paymentType')}
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentType"
                  value="one_time"
                  checked={paymentType === 'one_time'}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="mr-2"
                />
                {t('payments.oneTimePayment')}
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentType"
                  value="recurring"
                  checked={paymentType === 'recurring'}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="mr-2"
                />
                {t('payments.recurringPayment')}
              </label>
            </div>
          </div>

          {/* Invoice Name */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('payments.invoiceName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={invoiceName}
              onChange={(e) => setInvoiceName(e.target.value)}
              placeholder={String(t('payments.invoiceNamePlaceholder'))}
              required
            />
          </div>

          {/* Template Selection for Recurring */}
          {paymentType === 'recurring' && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('payments.selectTemplate')}
              </Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('payments.selectTemplatePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {paymentTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - ₩{template.amount.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount for One-time */}
          {paymentType === 'one_time' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('payments.amount')}
                </Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {t('payments.discountAmount')}
                </Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('payments.dueDate')}
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Student Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('payments.selectStudents')} ({selectedStudents.length})
            </Label>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <Input
                placeholder={String(t('payments.searchStudents'))}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Student List */}
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {loadingStudents ? (
                <div className="p-4 text-center">{t('common.loading')}</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {t('payments.noStudentsFound')}
                </div>
              ) : (
                filteredStudents.map(student => (
                  <div key={student.id} className="border-b last:border-b-0">
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedStudents.some(s => s.id === student.id)}
                          onChange={() => handleStudentToggle(student)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                          {student.school_name && (
                            <div className="text-xs text-gray-400">{student.school_name}</div>
                          )}
                        </div>
                      </div>

                      {/* Individual Override for Recurring */}
                      {paymentType === 'recurring' && selectedStudents.some(s => s.id === student.id) && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOverrideToggle(student.id)}
                          >
                            {individualOverrides[student.id]?.hasAmountOverride ? (
                              <Minus className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            {t('payments.override')}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Override Amount Input */}
                    {paymentType === 'recurring' && 
                     selectedStudents.some(s => s.id === student.id) && 
                     individualOverrides[student.id]?.hasAmountOverride && (
                      <div className="px-3 pb-3">
                        <Input
                          type="number"
                          placeholder={String(t('payments.overrideAmount'))}
                          value={individualOverrides[student.id]?.overrideAmount || ''}
                          onChange={(e) => handleOverrideAmountChange(student.id, e.target.value)}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {t('payments.createPayment')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}