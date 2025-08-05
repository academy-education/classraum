"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Search,
  MoreHorizontal,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Plus,
  Eye,
  X,
  Calendar,
  Users,
  Edit,
  Trash2,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


interface Invoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  template_id?: string
  amount: number
  discount_amount: number
  final_amount: number
  discount_reason?: string
  due_date: string
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paid_at?: string
  payment_method?: string
  transaction_id?: string
  refunded_amount: number
  created_at: string
}

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

interface PaymentsPageProps {
  academyId: string
}

export function PaymentsPage({ academyId }: PaymentsPageProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPaymentPlansModal, setShowPaymentPlansModal] = useState(false)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false)
  const [showEditPlanModal, setShowEditPlanModal] = useState(false)
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [planSearchQuery, setPlanSearchQuery] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<PaymentTemplate | null>(null)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [students, setStudents] = useState<{ user_id: string; name: string; school_name?: string }[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [planFormData, setPlanFormData] = useState({
    name: '',
    amount: '',
    recurrence_type: 'monthly',
    day_of_month: '',
    day_of_week: '',
    start_date: '',
    end_date: ''
  })
  const [paymentFormData, setPaymentFormData] = useState({
    payment_type: 'one_time', // 'one_time' or 'recurring'
    recurring_template_id: '',
    selected_students: [] as string[],
    // Invoice fields
    amount: '',
    due_date: '',
    description: '',
    status: 'pending'
  })

  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    setStudentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          academy_id,
          phone,
          active,
          school_name,
          users (
            id,
            name
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Fetched students data:', data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentsData = data?.map((student: any) => ({
        user_id: student.user_id,
        name: student.users?.name || 'Unknown Student',
        school_name: student.school_name
      })) || []
      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      alert('Error loading students. Please check console for details.')
    }
    setStudentsLoading(false)
  }, [academyId])

  const fetchInvoices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          student_id,
          template_id,
          amount,
          discount_amount,
          final_amount,
          discount_reason,
          due_date,
          status,
          paid_at,
          payment_method,
          transaction_id,
          refunded_amount,
          created_at,
          students!inner(
            user_id,
            academy_id,
            users!inner(
              name,
              email
            )
          )
        `)
        .eq('students.academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoicesWithDetails = data?.map((invoice: any) => ({
        id: invoice.id,
        student_id: invoice.student_id,
        student_name: invoice.students?.users?.name || 'Unknown Student',
        student_email: invoice.students?.users?.email || 'Unknown Email',
        template_id: invoice.template_id,
        amount: invoice.amount,
        discount_amount: invoice.discount_amount,
        final_amount: invoice.final_amount,
        discount_reason: invoice.discount_reason,
        due_date: invoice.due_date,
        status: invoice.status,
        paid_at: invoice.paid_at,
        payment_method: invoice.payment_method,
        transaction_id: invoice.transaction_id,
        refunded_amount: invoice.refunded_amount,
        created_at: invoice.created_at
      })) || []

      setInvoices(invoicesWithDetails)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  useEffect(() => {
    if (academyId) {
      fetchInvoices()
      fetchStudents()
    }
  }, [academyId, fetchInvoices, fetchStudents])

  const fetchPaymentTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const { data, error } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('academy_id', academyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get student count for each template
      const templatesWithCounts = await Promise.all(
        (data || []).map(async (template) => {
          const { count } = await supabase
            .from('recurring_payment_template_students')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)
            .eq('is_paused', false)

          return {
            ...template,
            student_count: count || 0
          }
        })
      )

      setPaymentTemplates(templatesWithCounts)
    } catch (error) {
      console.error('Error fetching payment templates:', error)
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleViewPaymentPlans = () => {
    setShowPaymentPlansModal(true)
    fetchPaymentTemplates()
  }

  const handleEditTemplate = (template: PaymentTemplate) => {
    setEditingTemplate(template)
    setPlanFormData({
      name: template.name,
      amount: template.amount.toString(),
      recurrence_type: template.recurrence_type,
      day_of_month: template.day_of_month?.toString() || '',
      day_of_week: integerToDayOfWeek(template.day_of_week || null),
      start_date: template.start_date,
      end_date: template.end_date || ''
    })
    setShowEditPlanModal(true)
  }

  const handleDeleteTemplate = (template: PaymentTemplate) => {
    setTemplateToDelete(template)
    setShowDeletePlanModal(true)
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .update({ is_active: false })
        .eq('id', templateToDelete.id)

      if (error) throw error

      await fetchPaymentTemplates()
      setShowDeletePlanModal(false)
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Error deleting payment template:', error)
      alert('Error deleting payment plan')
    }
  }

  const resetPlanForm = () => {
    setPlanFormData({
      name: '',
      amount: '',
      recurrence_type: 'monthly',
      day_of_month: '',
      day_of_week: '',
      start_date: '',
      end_date: ''
    })
    setEditingTemplate(null)
    setActiveDatePicker(null)
  }

  const formatAmountWithCommas = (value: string) => {
    // Remove any non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '')
    
    // Split by decimal point
    const parts = numericValue.split('.')
    
    // Add commas to the integer part
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    
    // Return formatted value (limit to 2 decimal places)
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0]
  }

  const handleAmountChange = (value: string) => {
    // Remove commas for storage
    const numericValue = value.replace(/,/g, '')
    setPlanFormData(prev => ({ ...prev, amount: numericValue }))
  }

  // Convert day of week string to integer (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeekToInteger = (dayString: string): number | null => {
    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    }
    return dayMap[dayString.toLowerCase()] ?? null
  }

  // Convert day of week integer to string
  const integerToDayOfWeek = (dayInt: number | null): string => {
    const dayMap: { [key: number]: string } = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    }
    return dayInt !== null ? dayMap[dayInt] || '' : ''
  }

  // Add ordinal suffix to numbers (1st, 2nd, 3rd, 4th, etc.)
  const addOrdinalSuffix = (num: number): string => {
    const remainder10 = num % 10
    const remainder100 = num % 100
    
    if (remainder100 >= 11 && remainder100 <= 13) {
      return num + 'th'
    }
    
    switch (remainder10) {
      case 1:
        return num + 'st'
      case 2:
        return num + 'nd'
      case 3:
        return num + 'rd'
      default:
        return num + 'th'
    }
  }

  // Calculate the next due date based on recurrence pattern
  const calculateNextDueDate = (template: PaymentTemplate): string => {
    const today = new Date()
    const startDate = new Date(template.start_date)
    
    // If payment hasn't started yet, return start date
    if (startDate > today) {
      return template.start_date
    }

    // If payment has ended, return end date or indicate completion
    if (template.end_date && new Date(template.end_date) <= today) {
      return template.end_date
    }

    if (template.recurrence_type === 'monthly' && template.day_of_month) {
      const nextDue = new Date(today)
      
      // Set to the target day of current month
      nextDue.setDate(template.day_of_month)
      
      // If that day has already passed this month, move to next month
      if (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 1)
        nextDue.setDate(template.day_of_month)
      }
      
      // Handle months with fewer days (e.g., Feb 30th becomes Feb 28th/29th)
      if (nextDue.getDate() !== template.day_of_month) {
        nextDue.setDate(0) // Go to last day of previous month
      }
      
      return nextDue.toISOString().split('T')[0]
    }

    if (template.recurrence_type === 'weekly' && template.day_of_week !== null) {
      const nextDue = new Date(today)
      const targetDayOfWeek = template.day_of_week
      const currentDayOfWeek = today.getDay()
      
      // Calculate days until target day
      let daysUntilTarget = (targetDayOfWeek || 0) - currentDayOfWeek
      
      // If target day is today or has passed this week, move to next week
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }
      
      nextDue.setDate(today.getDate() + daysUntilTarget)
      return nextDue.toISOString().split('T')[0]
    }

    // Fallback to stored next_due_date
    return template.next_due_date
  }

  const handleAddPayment = async () => {
    if (!academyId || !paymentFormData.due_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      if (paymentFormData.payment_type === 'one_time') {
        // Validate one-time payment fields
        if (paymentFormData.selected_students.length === 0 || !paymentFormData.amount) {
          alert('Please select at least one student and enter an amount')
          return
        }

        // Create invoices for all selected students
        const invoiceAmount = parseInt(paymentFormData.amount)
        const invoices = paymentFormData.selected_students.map(studentId => ({
          student_id: studentId,
          amount: invoiceAmount,
          final_amount: invoiceAmount, // Same as amount for one-time payments
          due_date: paymentFormData.due_date,
          status: paymentFormData.status,
          discount_amount: 0
        }))

        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoices)

        if (invoiceError) throw invoiceError

        alert(`One-time payment created successfully for ${paymentFormData.selected_students.length} students!`)
      } else if (paymentFormData.payment_type === 'recurring') {
        // Validate recurring payment fields
        if (!paymentFormData.recurring_template_id || paymentFormData.selected_students.length === 0) {
          alert('Please select a payment plan and at least one student')
          return
        }

        // Get selected template details
        const selectedTemplate = paymentTemplates.find(t => t.id === paymentFormData.recurring_template_id)
        if (!selectedTemplate) {
          alert('Selected payment plan not found')
          return
        }

        // Create recurring_payment_template_students entries
        const templateStudentEntries = paymentFormData.selected_students.map(studentId => ({
          recurring_payment_template_id: paymentFormData.recurring_template_id,
          student_id: studentId,
          is_active: true
        }))

        const { error: templateStudentError } = await supabase
          .from('recurring_payment_template_students')
          .insert(templateStudentEntries)

        if (templateStudentError) throw templateStudentError

        // Create initial invoices for each selected student
        const initialInvoices = paymentFormData.selected_students.map(studentId => ({
          student_id: studentId,
          template_id: paymentFormData.recurring_template_id,
          amount: selectedTemplate.amount,
          final_amount: selectedTemplate.amount,
          due_date: paymentFormData.due_date,
          status: paymentFormData.status,
          discount_amount: 0
        }))

        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert(initialInvoices)

        if (invoiceError) throw invoiceError

        alert(`Recurring payment created successfully for ${paymentFormData.selected_students.length} students!`)
      }

      // Reset form and close modal
      setShowAddPaymentModal(false)
      setPaymentFormData({
        payment_type: 'one_time',
        recurring_template_id: '',
        selected_students: [],
        amount: '',
        due_date: '',
        description: '',
        status: 'pending'
      })
      
      // Refresh invoices list
      fetchInvoices()
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Error creating payment: ' + (error as Error).message)
    }
  }

  const handleAddPaymentPlan = async () => {
    if (!academyId || !planFormData.name || !planFormData.amount || !planFormData.start_date) {
      alert('Please fill in all required fields')
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      alert('Please select a day of the month for monthly billing')
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      alert('Please select a day of the week for weekly billing')
      return
    }

    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .insert([{
          academy_id: academyId,
          name: planFormData.name,
          amount: parseInt(planFormData.amount),
          recurrence_type: planFormData.recurrence_type,
          day_of_month: planFormData.recurrence_type === 'monthly' ? parseInt(planFormData.day_of_month) || null : null,
          day_of_week: planFormData.recurrence_type === 'weekly' ? dayOfWeekToInteger(planFormData.day_of_week) : null,
          start_date: planFormData.start_date,
          end_date: planFormData.end_date || null,
          next_due_date: planFormData.start_date,
          is_active: true
        }])

      if (error) {
        throw error
      }

      setShowAddPlanModal(false)
      resetPlanForm()
      fetchPaymentTemplates()
      alert('Payment plan created successfully!')
    } catch (error) {
      console.error('Error creating payment plan:', error)
      alert('Error creating payment plan: ' + (error as Error).message)
    }
  }

  const handleUpdatePaymentPlan = async () => {
    if (!editingTemplate || !planFormData.name || !planFormData.amount || !planFormData.start_date) {
      alert('Please fill in all required fields')
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      alert('Please select a day of the month for monthly billing')
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      alert('Please select a day of the week for weekly billing')
      return
    }

    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .update({
          name: planFormData.name,
          amount: parseInt(planFormData.amount),
          recurrence_type: planFormData.recurrence_type,
          day_of_month: planFormData.recurrence_type === 'monthly' ? parseInt(planFormData.day_of_month) || null : null,
          day_of_week: planFormData.recurrence_type === 'weekly' ? dayOfWeekToInteger(planFormData.day_of_week) : null,
          start_date: planFormData.start_date,
          end_date: planFormData.end_date || null
        })
        .eq('id', editingTemplate.id)

      if (error) {
        throw error
      }

      setShowEditPlanModal(false)
      resetPlanForm()
      fetchPaymentTemplates()
      alert('Payment plan updated successfully!')
    } catch (error) {
      console.error('Error updating payment plan:', error)
      alert('Error updating payment plan: ' + (error as Error).message)
    }
  }


  const DatePickerComponent = ({ 
    value, 
    onChange, 
    fieldId 
  }: { 
    value: string
    onChange: (value: string) => void
    fieldId: string
  }) => {
    const isOpen = activeDatePicker === fieldId
    const datePickerRef = useRef<HTMLDivElement>(null)
    
    const currentDate = value ? new Date(value) : new Date()
    const today = new Date()
    
    // Get current month and year for navigation
    const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
    const [viewYear, setViewYear] = useState(currentDate.getFullYear())

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setActiveDatePicker(null)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen])

    const formatDisplayDate = (dateString: string) => {
      if (!dateString) return 'Select date'
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay()
    }

    const selectDate = (day: number) => {
      const selectedDate = new Date(viewYear, viewMonth, day)
      const dateString = selectedDate.toISOString().split('T')[0]
      onChange(dateString)
      setActiveDatePicker(null)
    }

    const navigateMonth = (direction: number) => {
      let newMonth = viewMonth + direction
      let newYear = viewYear

      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }

      setViewMonth(newMonth)
      setViewYear(newYear)
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const daysInMonth = getDaysInMonth(viewMonth, viewYear)
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
    const selectedDate = value ? new Date(value) : null

    return (
      <div className="relative" ref={datePickerRef}>
        <button
          type="button"
          onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
          className={`w-full h-10 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
            isOpen ? 'border-primary' : 'border-border focus:border-primary'
          }`}
        >
          {formatDisplayDate(value)}
        </button>
        
        {isOpen && (
          <div className="absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0">
            {/* Header with month/year navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="font-medium text-gray-900">
                {monthNames[viewMonth]} {viewYear}
              </div>
              
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-8"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isSelected = selectedDate && 
                  selectedDate.getDate() === day && 
                  selectedDate.getMonth() === viewMonth && 
                  selectedDate.getFullYear() === viewYear
                const isToday = today.getDate() === day && 
                  today.getMonth() === viewMonth && 
                  today.getFullYear() === viewYear

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`h-8 w-8 text-sm rounded hover:bg-gray-100 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : isToday 
                        ? 'bg-gray-100 font-medium' 
                        : ''
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Today button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  const todayString = today.toISOString().split('T')[0]
                  onChange(todayString)
                  setActiveDatePicker(null)
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'refunded':
        return <RotateCcw className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredInvoices = invoices.filter(invoice => {
    if (!searchQuery) return true
    
    return (
      invoice.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500">Manage your payments.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={handleViewPaymentPlans}>
              <Eye className="w-4 h-4" />
              View Payment Plans
            </Button>
            <Button onClick={() => {
              setShowAddPaymentModal(true)
              fetchPaymentTemplates()
            }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Payment
            </Button>
          </div>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Table Skeleton */}
        <Card className="overflow-hidden">
          <div className="p-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <TableSkeleton />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500">Manage your payments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleViewPaymentPlans}>
            <Eye className="w-4 h-4" />
            View Payment Plans
          </Button>
          <Button onClick={() => {
            setShowAddPaymentModal(true)
            fetchPaymentTemplates()
          }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder="Search by status, email, or amount..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-4 font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900">Status</th>
                <th className="text-left p-4 font-medium text-gray-900">Email</th>
                <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                <th className="text-left p-4 font-medium text-gray-900"></th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="font-medium text-gray-900">{invoice.student_name}</div>
                      <div className="text-sm text-gray-500">{invoice.student_email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{formatCurrency(invoice.final_amount)}</div>
                    {invoice.discount_amount > 0 && (
                      <div className="text-sm text-gray-500">
                        Original: {formatCurrency(invoice.amount)}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" className="p-1">
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No payment records have been created yet.'}
            </p>
          </div>
        )}

        {/* Footer */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              0 of {filteredInvoices.length} row(s) selected.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Payment Plans Modal */}
      {showPaymentPlansModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Plans</h2>
                <p className="text-gray-500">Manage recurring payment templates</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Payment Plan
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPaymentPlansModal(false)}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Search Bar */}
              <div className="relative mb-6 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search payment plans..."
                  value={planSearchQuery}
                  onChange={(e) => setPlanSearchQuery(e.target.value)}
                  className="h-10 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
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
                    <Card key={template.id} className="p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1"
                            onClick={() => handleDeleteTemplate(template)}
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
                              `Monthly on the ${addOrdinalSuffix(template.day_of_month)}`
                            )}
                            {template.recurrence_type === 'weekly' && template.day_of_week !== null && (
                              `Weekly on ${integerToDayOfWeek(template.day_of_week || null).charAt(0).toUpperCase() + integerToDayOfWeek(template.day_of_week || null).slice(1)}`
                            )}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{template.student_count || 0} students enrolled</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Next due: {formatDate(calculateNextDueDate(template))}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Started: {formatDate(template.start_date)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {paymentTemplates.length === 0 && !templatesLoading && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payment plans found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first payment plan.</p>
                  <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" />
                    Add Payment Plan
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Payment Plan</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddPlanModal(false)
                  resetPlanForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Plan Name</Label>
                  <Input 
                    placeholder="e.g., Monthly Tuition" 
                    className="h-10"
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Amount</Label>
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
                  <Label className="text-sm font-medium text-foreground/80">Recurrence Type</Label>
                  <Select 
                    value={planFormData.recurrence_type} 
                    onValueChange={(value) => setPlanFormData(prev => ({ ...prev, recurrence_type: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {planFormData.recurrence_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Day of Month (1-31)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="31" 
                      placeholder="1" 
                      className="h-10"
                      value={planFormData.day_of_month}
                      onChange={(e) => setPlanFormData(prev => ({ ...prev, day_of_month: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">For months with fewer than 31 days, billing will occur on the last day of the month</p>
                  </div>
                )}

                {planFormData.recurrence_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Day of Week</Label>
                    <Select 
                      value={planFormData.day_of_week} 
                      onValueChange={(value) => setPlanFormData(prev => ({ ...prev, day_of_week: value }))}
                    >
                      <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                        <SelectValue placeholder="Select day of week" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Start Date</Label>
                  <DatePickerComponent
                    value={planFormData.start_date}
                    onChange={(value) => setPlanFormData(prev => ({ ...prev, start_date: value }))}
                    fieldId="add-start-date"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">End Date (Optional)</Label>
                  <DatePickerComponent
                    value={planFormData.end_date}
                    onChange={(value) => setPlanFormData(prev => ({ ...prev, end_date: value }))}
                    fieldId="add-end-date"
                  />
                </div>
              </form>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddPlanModal(false)
                  resetPlanForm()
                }}
                className="flex-1 mr-3"
              >
                Cancel
              </Button>
              <Button onClick={handleAddPaymentPlan} className="flex-1">
                Add Payment Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Plan Modal */}
      {showEditPlanModal && editingTemplate && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Payment Plan</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditPlanModal(false)
                  resetPlanForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Plan Name</Label>
                  <Input 
                    placeholder="e.g., Monthly Tuition" 
                    className="h-10"
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Amount</Label>
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
                  <Label className="text-sm font-medium text-foreground/80">Recurrence Type</Label>
                  <Select 
                    value={planFormData.recurrence_type} 
                    onValueChange={(value) => setPlanFormData(prev => ({ ...prev, recurrence_type: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {planFormData.recurrence_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Day of Month (1-31)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="31" 
                      placeholder="1" 
                      className="h-10"
                      value={planFormData.day_of_month}
                      onChange={(e) => setPlanFormData(prev => ({ ...prev, day_of_month: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500">For months with fewer than 31 days, billing will occur on the last day of the month</p>
                  </div>
                )}

                {planFormData.recurrence_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">Day of Week</Label>
                    <Select 
                      value={planFormData.day_of_week} 
                      onValueChange={(value) => setPlanFormData(prev => ({ ...prev, day_of_week: value }))}
                    >
                      <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                        <SelectValue placeholder="Select day of week" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Start Date</Label>
                  <DatePickerComponent
                    key={`edit-start-${editingTemplate?.id || 'new'}-${planFormData.start_date}`}
                    value={planFormData.start_date}
                    onChange={(value) => setPlanFormData(prev => ({ ...prev, start_date: value }))}
                    fieldId="edit-start-date"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">End Date (Optional)</Label>
                  <DatePickerComponent
                    key={`edit-end-${editingTemplate?.id || 'new'}-${planFormData.end_date}`}
                    value={planFormData.end_date}
                    onChange={(value) => setPlanFormData(prev => ({ ...prev, end_date: value }))}
                    fieldId="edit-end-date"
                  />
                </div>
              </form>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditPlanModal(false)
                  resetPlanForm()
                }}
                className="flex-1 mr-3"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePaymentPlan} className="flex-1">
                Update Payment Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Payment Plan Modal */}
      {showDeletePlanModal && templateToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delete Payment Plan</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeletePlanModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete the payment plan &quot;{templateToDelete.name}&quot;? 
                This will deactivate the plan and stop future billing. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeletePlanModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteTemplate}
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Payment</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAddPaymentModal(false)
                  setPaymentFormData({
                    payment_type: 'one_time',
                    recurring_template_id: '',
                    selected_students: [],
                    amount: '',
                    due_date: '',
                    description: '',
                    status: 'pending'
                  })
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Payment Type</Label>
                  <Select 
                    value={paymentFormData.payment_type} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_type: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentFormData.payment_type === 'recurring' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Payment Plan</Label>
                      <Select 
                        value={paymentFormData.recurring_template_id} 
                        onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, recurring_template_id: value }))}
                      >
                        <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                          <SelectValue placeholder="Select payment plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} - ₩{template.amount.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Students</Label>
                      <div className="border border-border rounded-lg bg-gray-50 p-4">
                        {studentsLoading ? (
                          <div className="text-center py-4">
                            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Loading students...</p>
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-4">
                            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No students available</p>
                          </div>
                        ) : (
                          <>
                            {/* Search Bar */}
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                type="text"
                                placeholder="Search students by name or school..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                              />
                            </div>
                            
                            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                              {students
                                .filter(student => {
                                  const studentName = student.name || ''
                                  const schoolName = student.school_name || ''
                                  const searchLower = studentSearchQuery.toLowerCase()
                                  return studentName.toLowerCase().includes(searchLower) || 
                                         schoolName.toLowerCase().includes(searchLower)
                                })
                                .map(student => (
                                  <div
                                      key={student.user_id}
                                    className={`p-2 cursor-pointer rounded hover:bg-gray-50 ${
                                      paymentFormData.selected_students.includes(student.user_id) 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : ''
                                    }`}
                                    onClick={() => {
                                      const updatedSelectedStudents = paymentFormData.selected_students.includes(student.user_id)
                                        ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                        : [...paymentFormData.selected_students, student.user_id];
                                      setPaymentFormData(prev => ({ ...prev, selected_students: updatedSelectedStudents }));
                                    }}
                                  >
                                    <div className="font-medium text-sm">{student.name}</div>
                                    <div className="text-xs text-gray-500">{student.school_name}</div>
                                        </div>
                                ))}
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
                      <Label className="text-sm font-medium text-foreground/80">Students</Label>
                      <div className="border border-border rounded-lg bg-gray-50 p-4">
                        {studentsLoading ? (
                          <div className="text-center py-4">
                            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Loading students...</p>
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-4">
                            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No students available</p>
                          </div>
                        ) : (
                          <>
                            {/* Search Bar */}
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                              <Input
                                type="text"
                                placeholder="Search students by name or school..."
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                                className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                              />
                            </div>
                            
                            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                              {students
                                .filter(student => {
                                  const studentName = student.name || ''
                                  const schoolName = student.school_name || ''
                                  const searchLower = studentSearchQuery.toLowerCase()
                                  return studentName.toLowerCase().includes(searchLower) || 
                                         schoolName.toLowerCase().includes(searchLower)
                                })
                                .map(student => (
                                  <div
                                      key={student.user_id}
                                    className={`p-2 cursor-pointer rounded hover:bg-gray-50 ${
                                      paymentFormData.selected_students.includes(student.user_id) 
                                        ? 'bg-blue-50 border border-blue-200' 
                                        : ''
                                    }`}
                                    onClick={() => {
                                      const updatedSelectedStudents = paymentFormData.selected_students.includes(student.user_id)
                                        ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                        : [...paymentFormData.selected_students, student.user_id];
                                      setPaymentFormData(prev => ({ ...prev, selected_students: updatedSelectedStudents }));
                                    }}
                                  >
                                    <div className="font-medium text-sm">{student.name}</div>
                                    <div className="text-xs text-gray-500">{student.school_name}</div>
                                        </div>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                        <Input 
                          type="text" 
                          placeholder="0" 
                          className="h-10 pl-9"
                          value={formatAmountWithCommas(paymentFormData.amount)}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/,/g, '')
                            setPaymentFormData(prev => ({ ...prev, amount: numericValue }))
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">Description</Label>
                      <Input 
                        placeholder="Payment description" 
                        className="h-10"
                        value={paymentFormData.description}
                        onChange={(e) => setPaymentFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Due Date</Label>
                  <DatePickerComponent
                    value={paymentFormData.due_date}
                    onChange={(value) => setPaymentFormData(prev => ({ ...prev, due_date: value }))}
                    fieldId="payment-due-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">Status</Label>
                  <Select 
                    value={paymentFormData.status} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddPaymentModal(false)
                  setPaymentFormData({
                    payment_type: 'one_time',
                    recurring_template_id: '',
                    selected_students: [],
                    amount: '',
                    due_date: '',
                    description: '',
                    status: 'pending'
                  })
                }}
                className="flex-1 mr-3"
              >
                Cancel
              </Button>
              <Button onClick={handleAddPayment} className="flex-1">
                Add Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}