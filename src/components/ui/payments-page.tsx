"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
import { useTranslation } from '@/hooks/useTranslation'


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
  const { t, language, loading: translationLoading } = useTranslation()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPaymentPlansModal, setShowPaymentPlansModal] = useState(false)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false)
  const [showEditPlanModal, setShowEditPlanModal] = useState(false)
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [showDeleteRecurringModal, setShowDeleteRecurringModal] = useState(false)
  const [recurringToDelete, setRecurringToDelete] = useState<any>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDiscountAmount, setEditDiscountAmount] = useState('')
  const [editDiscountReason, setEditDiscountReason] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editStatus, setEditStatus] = useState('pending')
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('')
  const [editRefundedAmount, setEditRefundedAmount] = useState('')
  const [showEditRecurringModal, setShowEditRecurringModal] = useState(false)
  const [editingRecurringStudent, setEditingRecurringStudent] = useState<any>(null)
  const [hasAmountOverride, setHasAmountOverride] = useState(false)
  const [recurringOverrideAmount, setRecurringOverrideAmount] = useState('')
  const [recurringStatus, setRecurringStatus] = useState('active')
  const [showTemplatePaymentsModal, setShowTemplatePaymentsModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PaymentTemplate | null>(null)
  const [templatePayments, setTemplatePayments] = useState<Invoice[]>([])
  const [templatePaymentsLoading, setTemplatePaymentsLoading] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<string | null>(null)
  const [recurringStudents, setRecurringStudents] = useState<any[]>([])
  const [recurringStudentsLoading, setRecurringStudentsLoading] = useState(false)
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [planSearchQuery, setPlanSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')
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
    status: 'pending',
    discount_amount: '',
    discount_reason: '',
    paid_at: '',
    payment_method: '',
    refunded_amount: '',
    // Individual amount overrides for recurring payments
    student_amount_overrides: {} as { [studentId: string]: { enabled: boolean; amount: string } },
    // Individual discount overrides for one-time payments
    student_discount_overrides: {} as { [studentId: string]: { enabled: boolean; amount: string; reason: string } }
  })

  // Sorting and filtering state - separate for each tab
  const [oneTimeSortField, setOneTimeSortField] = useState<string | null>(null)
  const [oneTimeSortDirection, setOneTimeSortDirection] = useState<'asc' | 'desc'>('asc')
  const [oneTimeStatusFilter, setOneTimeStatusFilter] = useState<string>('all')
  const [showOneTimeStatusFilter, setShowOneTimeStatusFilter] = useState(false)
  
  const [recurringSortField, setRecurringSortField] = useState<string | null>(null)
  const [recurringSortDirection, setRecurringSortDirection] = useState<'asc' | 'desc'>('asc')
  const [recurringStatusFilter, setRecurringStatusFilter] = useState<string>('all')
  const [showRecurringStatusFilter, setShowRecurringStatusFilter] = useState(false)
  const [templateStatusFilter, setTemplateStatusFilter] = useState<string>('all')
  const [showTemplateStatusFilter, setShowTemplateStatusFilter] = useState(false)
  const [templateSortField, setTemplateSortField] = useState<string | null>(null)
  const [templateSortDirection, setTemplateSortDirection] = useState<'asc' | 'desc'>('asc')
  const [templateMethodFilter, setTemplateMethodFilter] = useState<string>('all')
  const [showTemplateMethodFilter, setShowTemplateMethodFilter] = useState(false)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const methodFilterRef = useRef<HTMLDivElement>(null)

  // Selection state - separate for each tab
  const [selectedOneTimeInvoices, setSelectedOneTimeInvoices] = useState<Set<string>>(new Set())
  const [selectedRecurringStudents, setSelectedRecurringStudents] = useState<Set<string>>(new Set())
  const [selectedTemplatePayments, setSelectedTemplatePayments] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('pending')
  const [templateBulkStatus, setTemplateBulkStatus] = useState<string>('pending')
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Close status filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node) &&
          methodFilterRef.current && !methodFilterRef.current.contains(event.target as Node)) {
        setShowOneTimeStatusFilter(false)
        setShowRecurringStatusFilter(false)
        setShowTemplateStatusFilter(false)
        setShowTemplateMethodFilter(false)
      }
    }

    if (showOneTimeStatusFilter || showRecurringStatusFilter || showTemplateStatusFilter || showTemplateMethodFilter) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOneTimeStatusFilter, showRecurringStatusFilter])

  // Clear selections when switching tabs
  useEffect(() => {
    setSelectedOneTimeInvoices(new Set())
    setSelectedRecurringStudents(new Set())
    // Set appropriate default bulk status for each tab
    if (activeTab === 'one_time') {
      setBulkStatus('pending')
    } else if (activeTab === 'recurring') {
      setBulkStatus('active')
    }
  }, [activeTab])

  // Template payment sorting function
  const handleTemplateSort = (field: string) => {
    if (templateSortField === field) {
      setTemplateSortDirection(templateSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setTemplateSortField(field)
      setTemplateSortDirection('asc')
    }
  }

  // Function to render sort icon for template payments
  const renderTemplateSortIcon = (field: string) => {
    const isActiveField = templateSortField === field
    const isAscending = isActiveField && templateSortDirection === 'asc'
    const isDescending = isActiveField && templateSortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Up arrow */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        {/* Down arrow */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  // Selection helper functions
  const handleSelectAllOneTime = (checked: boolean, filteredData: Invoice[]) => {
    if (checked) {
      const allIds = new Set(filteredData.map(invoice => invoice.id))
      setSelectedOneTimeInvoices(allIds)
    } else {
      setSelectedOneTimeInvoices(new Set())
    }
  }

  const handleSelectAllRecurring = (checked: boolean, filteredData: any[]) => {
    if (checked) {
      const allIds = new Set(filteredData.map(student => student.id))
      setSelectedRecurringStudents(allIds)
    } else {
      setSelectedRecurringStudents(new Set())
    }
  }

  const handleSelectOneTimeInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedOneTimeInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedOneTimeInvoices(newSelected)
  }

  const handleSelectRecurringStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecurringStudents)
    if (checked) {
      newSelected.add(studentId)
    } else {
      newSelected.delete(studentId)
    }
    setSelectedRecurringStudents(newSelected)
  }

  const handleSelectAllTemplatePayments = (checked: boolean, filteredData: Invoice[]) => {
    if (checked) {
      const allIds = new Set(filteredData.map(payment => payment.id))
      setSelectedTemplatePayments(allIds)
    } else {
      setSelectedTemplatePayments(new Set())
    }
  }

  const handleSelectTemplatePayment = (paymentId: string, checked: boolean) => {
    const newSelected = new Set(selectedTemplatePayments)
    if (checked) {
      newSelected.add(paymentId)
    } else {
      newSelected.delete(paymentId)
    }
    setSelectedTemplatePayments(newSelected)
  }

  const handleBulkStatusUpdate = async () => {
    if (activeTab === 'one_time') {
      const selectedIds = Array.from(selectedOneTimeInvoices)
      
      if (selectedIds.length === 0) return

      try {
        // Update invoice statuses
        const { error } = await supabase
          .from('invoices')
          .update({ status: bulkStatus })
          .in('id', selectedIds)
        
        if (error) throw error
        
        // Refresh data
        fetchInvoices()
        setSelectedOneTimeInvoices(new Set())
      } catch (error) {
        console.error('Error updating bulk status:', error)
      }
    } else if (activeTab === 'recurring') {
      const selectedIds = Array.from(selectedRecurringStudents)
      
      if (selectedIds.length === 0) return

      try {
        // Update recurring student statuses
        const { error } = await supabase
          .from('recurring_payment_template_students')
          .update({ status: bulkStatus })
          .in('id', selectedIds)
        
        if (error) throw error
        
        // Refresh data
        fetchRecurringStudents()
        setSelectedRecurringStudents(new Set())
      } catch (error) {
        console.error('Error updating recurring students bulk status:', error)
      }
    }
  }

  const handleTemplateBulkStatusUpdate = async () => {
    const selectedIds = Array.from(selectedTemplatePayments)
    
    if (selectedIds.length === 0) return

    try {
      // Update template payment statuses
      const { error } = await supabase
        .from('invoices')
        .update({ status: templateBulkStatus })
        .in('id', selectedIds)
      
      if (error) throw error
      
      // Refresh template payments data
      if (selectedTemplate) {
        fetchTemplatePayments(selectedTemplate.id)
      }
      setSelectedTemplatePayments(new Set())
    } catch (error) {
      console.error('Error updating template payment bulk status:', error)
    }
  }

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
        name: student.users?.name || t('payments.unknownStudent'),
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
        student_name: invoice.students?.users?.name || t('payments.unknownStudent'),
        student_email: invoice.students?.users?.email || t('payments.unknownEmail'),
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

  const fetchRecurringStudents = useCallback(async () => {
    if (!academyId) return
    
    setRecurringStudentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('recurring_payment_template_students')
        .select(`
          id,
          template_id,
          student_id,
          amount_override,
          status,
          students!inner(
            user_id,
            academy_id,
            users!inner(
              name,
              email
            )
          ),
          recurring_payment_templates!inner(
            name,
            amount,
            recurrence_type,
            is_active,
            academy_id
          )
        `)
        .eq('students.academy_id', academyId)

      if (error) throw error

      const formattedData = data?.map((item: any) => ({
        id: item.id,
        template_id: item.template_id,
        student_id: item.student_id,
        student_name: item.students?.users?.name,
        student_email: item.students?.users?.email,
        template_name: item.recurring_payment_templates?.name,
        template_amount: item.recurring_payment_templates?.amount,
        amount_override: item.amount_override,
        final_amount: item.amount_override || item.recurring_payment_templates?.amount,
        status: item.status,
        template_active: item.recurring_payment_templates?.is_active,
        recurrence_type: item.recurring_payment_templates?.recurrence_type
      })) || []

      console.log('Fetched recurring students:', formattedData)
      setRecurringStudents(formattedData)
    } catch (error) {
      console.error('Error fetching recurring students:', error)
    } finally {
      setRecurringStudentsLoading(false)
    }
  }, [academyId])

  useEffect(() => {
    if (academyId) {
      fetchInvoices()
      fetchStudents()
      fetchRecurringStudents()
    }
  }, [academyId, fetchInvoices, fetchStudents, fetchRecurringStudents])

  // Refs for dropdown buttons
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId || openInvoiceDropdownId) {
        const target = event.target as Element
        // Don't close if clicking inside a dropdown
        if (target && target.closest('.dropdown-menu')) {
          return
        }
        // Don't close if clicking on the dropdown button itself
        const clickedButton = Object.values(dropdownButtonRefs.current).some(
          ref => ref && ref.contains(target)
        )
        if (clickedButton) {
          return
        }
        console.log('Closing dropdown due to outside click')
        setOpenDropdownId(null)
        setOpenInvoiceDropdownId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId, openInvoiceDropdownId])

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
            .eq('status', 'active')

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

  const handleDeleteInvoiceClick = (invoice: Invoice) => {
    setInvoiceToDelete(invoice)
    setShowDeleteInvoiceModal(true)
    setOpenInvoiceDropdownId(null)
  }

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return

    try {
      const { error } = await supabase
        .from('payment_invoices')
        .delete()
        .eq('id', invoiceToDelete.id)

      if (error) throw error

      // Remove from local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id))
      
      setShowDeleteInvoiceModal(false)
      setInvoiceToDelete(null)
      
      alert('Payment deleted successfully!')
    } catch (error: any) {
      alert('Error deleting payment: ' + error.message)
    }
  }

  const handleDeleteRecurringClick = (student: any) => {
    setRecurringToDelete(student)
    setShowDeleteRecurringModal(true)
    setOpenDropdownId(null)
  }

  const confirmDeleteRecurring = async () => {
    if (!recurringToDelete) return

    try {
      const { error } = await supabase
        .from('recurring_payment_students')
        .delete()
        .eq('id', recurringToDelete.id)

      if (error) throw error

      // Remove from local state
      setRecurringStudents(prev => prev.filter(student => student.id !== recurringToDelete.id))
      
      setShowDeleteRecurringModal(false)
      setRecurringToDelete(null)
      
      alert('Recurring payment subscription deleted successfully!')
    } catch (error: any) {
      alert('Error deleting recurring payment: ' + error.message)
    }
  }

  const handleViewStudentPayments = async (studentId: string, templateId: string, studentName: string, templateName: string) => {
    console.log('handleViewStudentPayments called with:', { studentId, templateId, studentName, templateName })
    
    try {
      // Fetch the template info
      const { data: template, error: templateError } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      console.log('Template fetch result:', { template, templateError })
      if (templateError) throw templateError
      
      setSelectedTemplate(template)
      setShowTemplatePaymentsModal(true)
      setTemplatePaymentsLoading(true)
      
      console.log('Modal should be showing now, fetching invoices...')
      
      // Fetch all invoices for this specific student in this template
      const { data: invoices, error: invoicesError } = await supabase
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
        .eq('template_id', templateId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      console.log('Invoices fetch result:', { invoices, invoicesError, count: invoices?.length })
      if (invoicesError) throw invoicesError

      const formattedInvoices = invoices?.map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        student_name: item.students?.users?.name,
        student_email: item.students?.users?.email,
        template_id: item.template_id,
        amount: item.amount,
        discount_amount: item.discount_amount || 0,
        final_amount: item.final_amount,
        discount_reason: item.discount_reason,
        due_date: item.due_date,
        status: item.status,
        paid_at: item.paid_at,
        payment_method: item.payment_method,
        transaction_id: item.transaction_id,
        refunded_amount: item.refunded_amount || 0,
        created_at: item.created_at
      })) || []

      console.log('Formatted invoices:', formattedInvoices)
      setTemplatePayments(formattedInvoices)
    } catch (error) {
      console.error('Error fetching student payments:', error)
      alert('Error loading payment history: ' + (error as Error).message)
    } finally {
      setTemplatePaymentsLoading(false)
    }
  }

  const handleViewTemplatePayments = async (templateId: string, templateName?: string) => {
    // First fetch the template info
    try {
      const { data: template, error: templateError } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) throw templateError
      
      setSelectedTemplate(template)
      setShowTemplatePaymentsModal(true)
      setTemplatePaymentsLoading(true)
      
      // Fetch all students enrolled in this template
      const { data: templateStudents, error: studentsError } = await supabase
        .from('recurring_payment_template_students')
        .select(`
          student_id,
          amount_override,
          status,
          students!inner(
            user_id,
            academy_id,
            users!inner(
              name,
              email
            )
          )
        `)
        .eq('template_id', templateId)

      if (studentsError) throw studentsError

      // Fetch all invoices for this template
      const { data: invoices, error: invoicesError } = await supabase
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
          created_at
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      // Combine student enrollment data with their invoices
      const combinedData: any[] = []
      
      templateStudents?.forEach((templateStudent: any) => {
        const studentInvoices = invoices?.filter(
          (invoice: any) => invoice.student_id === templateStudent.student_id
        ) || []

        if (studentInvoices.length > 0) {
          // Add all invoices for this student
          studentInvoices.forEach((invoice: any) => {
            combinedData.push({
              id: invoice.id,
              student_id: invoice.student_id,
              student_name: templateStudent.students?.users?.name,
              student_email: templateStudent.students?.users?.email,
              template_id: invoice.template_id,
              amount: invoice.amount,
              discount_amount: invoice.discount_amount || 0,
              final_amount: invoice.final_amount,
              discount_reason: invoice.discount_reason,
              due_date: invoice.due_date,
              status: invoice.status,
              paid_at: invoice.paid_at,
              payment_method: invoice.payment_method,
              transaction_id: invoice.transaction_id,
              refunded_amount: invoice.refunded_amount || 0,
              created_at: invoice.created_at,
              amount_override: templateStudent.amount_override,
              status: templateStudent.status
            })
          })
        } else {
          // Student is enrolled but has no invoices yet
          combinedData.push({
            id: `no-invoice-${templateStudent.student_id}`,
            student_id: templateStudent.student_id,
            student_name: templateStudent.students?.users?.name,
            student_email: templateStudent.students?.users?.email,
            template_id: templateId,
            amount: templateStudent.amount_override || template.amount,
            discount_amount: 0,
            final_amount: templateStudent.amount_override || template.amount,
            discount_reason: null,
            due_date: null,
            status: 'not_generated',
            paid_at: null,
            payment_method: null,
            transaction_id: null,
            refunded_amount: 0,
            created_at: null,
            amount_override: templateStudent.amount_override,
            status: templateStudent.status
          })
        }
      })

      // Sort by created_at (nulls last) then by student name
      combinedData.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        if (a.created_at && !b.created_at) return -1
        if (!a.created_at && b.created_at) return 1
        return (a.student_name || '').localeCompare(b.student_name || '')
      })

      setTemplatePayments(combinedData)
    } catch (error) {
      console.error('Error fetching template payments:', error)
      alert('Error loading payment history')
    } finally {
      setTemplatePaymentsLoading(false)
    }
  }

  const handlePauseResumeTemplate = async (templateId: string, currentlyActive: boolean) => {
    try {
      const action = currentlyActive ? 'pause' : 'resume'
      
      const response = await fetch('/api/payments/recurring/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          templateId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update template')
      }

      alert(`Payment plan ${action}d successfully`)
      await fetchPaymentTemplates()
      
    } catch (error) {
      console.error(`Error ${currentlyActive ? 'pausing' : 'resuming'} template:`, error)
      alert(`Error ${currentlyActive ? 'pausing' : 'resuming'} payment plan: ` + (error as Error).message)
    }
  }

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      const response = await fetch('/api/payments/recurring/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deactivate',
          templateId: templateToDelete.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete template')
      }

      await fetchPaymentTemplates()
      setShowDeletePlanModal(false)
      setTemplateToDelete(null)
      alert('Payment plan deleted successfully')
      
    } catch (error) {
      console.error('Error deleting payment template:', error)
      alert('Error deleting payment plan: ' + (error as Error).message)
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
    if (!academyId) {
      alert(t('errors.fillRequiredFields'))
      return
    }

    // For one-time payments, due date is required
    if (paymentFormData.payment_type === 'one_time' && !paymentFormData.due_date) {
      alert('Please select a due date for one-time payments')
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
        const baseAmount = parseInt(paymentFormData.amount)
        const refundedAmount = paymentFormData.refunded_amount ? parseInt(paymentFormData.refunded_amount) : 0
        
        const invoices = paymentFormData.selected_students.map(studentId => {
          // Get student-specific discount if enabled
          const discountOverride = paymentFormData.student_discount_overrides[studentId]
          const discountAmount = discountOverride?.enabled && discountOverride?.amount 
            ? parseInt(discountOverride.amount) 
            : 0
          const discountReason = discountOverride?.enabled && discountOverride?.reason 
            ? discountOverride.reason 
            : null
          
          const finalAmount = baseAmount - discountAmount
          
          return {
            student_id: studentId,
            amount: baseAmount,
            final_amount: finalAmount,
            due_date: paymentFormData.due_date,
            status: paymentFormData.status,
            discount_amount: discountAmount,
            discount_reason: discountReason,
            paid_at: paymentFormData.paid_at || null,
            payment_method: paymentFormData.payment_method || null,
            refunded_amount: refundedAmount
          }
        })

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
        const templateStudentEntries = paymentFormData.selected_students.map(studentId => {
          const studentOverride = paymentFormData.student_amount_overrides[studentId]
          return {
            template_id: paymentFormData.recurring_template_id,
            student_id: studentId,
            amount_override: studentOverride?.enabled && studentOverride?.amount 
              ? parseFloat(studentOverride.amount) 
              : null,
            status: 'active'
          }
        })

        const { error: templateStudentError } = await supabase
          .from('recurring_payment_template_students')
          .insert(templateStudentEntries)

        if (templateStudentError) throw templateStudentError

        // Create initial invoices for each selected student with individual amounts
        const templateDueDate = calculateNextDueDate(selectedTemplate)
        const initialInvoices = paymentFormData.selected_students.map(studentId => {
          const studentOverride = paymentFormData.student_amount_overrides[studentId]
          const baseAmount = studentOverride?.enabled && studentOverride?.amount 
            ? parseFloat(studentOverride.amount) 
            : selectedTemplate.amount
          const discountAmount = paymentFormData.discount_amount ? parseInt(paymentFormData.discount_amount) : 0
          const refundedAmount = paymentFormData.refunded_amount ? parseInt(paymentFormData.refunded_amount) : 0
          const finalAmount = baseAmount - discountAmount

          return {
            student_id: studentId,
            template_id: paymentFormData.recurring_template_id,
            amount: baseAmount,
            final_amount: finalAmount,
            due_date: templateDueDate,
            status: paymentFormData.status,
            discount_amount: discountAmount,
            discount_reason: paymentFormData.discount_reason || null,
            paid_at: paymentFormData.paid_at || null,
            payment_method: paymentFormData.payment_method || null,
            refunded_amount: refundedAmount
          }
        })

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
        status: 'pending',
        discount_amount: '',
        discount_reason: '',
        paid_at: '',
        payment_method: '',
        refunded_amount: '',
        student_amount_overrides: {},
        student_discount_overrides: {}
      })
      
      // Refresh invoices list
      fetchInvoices()
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('Error creating payment: ' + (error as Error).message)
    }
  }

  const handleEditPayment = async () => {
    if (!editingInvoice) return

    try {
      // Parse amounts (remove commas)
      const amount = parseInt(editAmount.replace(/,/g, '')) || 0
      const discountAmount = parseInt(editDiscountAmount.replace(/,/g, '')) || 0
      const refundedAmount = parseInt(editRefundedAmount.replace(/,/g, '')) || 0
      const finalAmount = amount - discountAmount

      // Prepare update data
      const updateData = {
        amount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        discount_reason: editDiscountReason || null,
        due_date: editDueDate,
        status: editStatus,
        paid_at: editPaidAt || null,
        payment_method: editPaymentMethod || null,
        refunded_amount: refundedAmount
      }

      // Update the invoice in the database
      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', editingInvoice.id)

      if (error) throw error

      alert('Payment updated successfully!')
      
      // Close modal and reset form
      setShowEditPaymentModal(false)
      setEditingInvoice(null)
      setEditAmount('')
      setEditDiscountAmount('')
      setEditDiscountReason('')
      setEditDueDate('')
      setEditStatus('pending')
      setEditPaidAt('')
      setEditPaymentMethod('')
      setEditRefundedAmount('')

      // Refresh invoices list
      fetchInvoices()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Error updating payment: ' + (error as Error).message)
    }
  }

  const handleEditRecurringPayment = async () => {
    if (!editingRecurringStudent) return

    try {
      // Prepare update data
      const updateData = {
        amount_override: hasAmountOverride 
          ? parseInt(recurringOverrideAmount.replace(/,/g, '')) || null
          : null,
        status: recurringStatus
      }

      // Update the recurring_payment_template_students record
      const { error } = await supabase
        .from('recurring_payment_template_students')
        .update(updateData)
        .eq('id', editingRecurringStudent.id)

      if (error) throw error

      alert('Recurring payment updated successfully!')
      
      // Close modal and reset form
      setShowEditRecurringModal(false)
      setEditingRecurringStudent(null)
      setHasAmountOverride(false)
      setRecurringOverrideAmount('')
      setRecurringStatus('active')

      // Refresh recurring students list
      fetchRecurringStudents()
    } catch (error) {
      console.error('Error updating recurring payment:', error)
      alert('Error updating recurring payment: ' + (error as Error).message)
    }
  }

  const handleAddPaymentPlan = async () => {
    if (!academyId || !planFormData.name || !planFormData.amount || !planFormData.start_date) {
      alert(t('errors.fillRequiredFields'))
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      alert(t('payments.selectDayOfMonth'))
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      alert(t('payments.selectDayOfWeek'))
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
      alert(t('errors.fillRequiredFields'))
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      alert(t('payments.selectDayOfMonth'))
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      alert(t('payments.selectDayOfWeek'))
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
      if (!dateString) return t('reports.selectDate')
      
      const date = new Date(dateString)
      
      if (language === 'korean') {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const weekday = date.getDay()
        const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
        
        return `${year}년 ${month}월 ${day}일 (${weekdayNames[weekday]})`
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
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
                        ? 'bg-primary/10 text-primary font-medium' 
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
                {t('assignments.today')}
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
      case 'not_generated':
        return 'bg-gray-100 text-gray-600'
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
      case 'not_generated':
        return <Users className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount)
  }

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString)
      
      // If translations are still loading, return a fallback
      if (translationLoading) {
        return date.toLocaleDateString()
      }
      
      if (language === 'korean') {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        
        return `${year}년 ${month}월 ${day}일`
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    }
  }, [language, translationLoading])

  // Sorting function - tab-specific
  const handleSort = (field: string) => {
    if (activeTab === 'one_time') {
      if (oneTimeSortField === field) {
        setOneTimeSortDirection(oneTimeSortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setOneTimeSortField(field)
        setOneTimeSortDirection('asc')
      }
    } else {
      if (recurringSortField === field) {
        setRecurringSortDirection(recurringSortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        setRecurringSortField(field)
        setRecurringSortDirection('asc')
      }
    }
  }

  // Function to render sort icon based on current state
  const renderSortIcon = (field: string) => {
    const currentSortField = activeTab === 'one_time' ? oneTimeSortField : recurringSortField
    const currentSortDirection = activeTab === 'one_time' ? oneTimeSortDirection : recurringSortDirection
    
    const isActiveField = currentSortField === field
    const isAscending = isActiveField && currentSortDirection === 'asc'
    const isDescending = isActiveField && currentSortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Up arrow */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        {/* Down arrow */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  // Filter and sort invoices for one-time tab
  const filteredInvoices = invoices
    .filter(invoice => {
      // First filter by search query
      let matchesSearch = true
      if (searchQuery) {
        matchesSearch = (
          invoice.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      // Filter by status
      let matchesStatus = true
      if (oneTimeStatusFilter !== 'all') {
        matchesStatus = invoice.status === oneTimeStatusFilter
      }
      
      // Then filter by active tab
      let matchesTab = true
      switch (activeTab) {
        case 'one_time':
          matchesTab = !invoice.template_id
          break
        case 'recurring':
          // Recurring tab will show recurring students, not invoices
          matchesTab = false
          break
        case 'plans':
          // Plans tab will show different content (templates), not invoices
          matchesTab = false
          break
      }
      
      return matchesSearch && matchesStatus && matchesTab
    })
    .sort((a, b) => {
      if (!oneTimeSortField) return 0
      
      let aValue = ''
      let bValue = ''
      
      switch (oneTimeSortField) {
        case 'student':
          aValue = a.student_name || ''
          bValue = b.student_name || ''
          break
        case 'amount':
          return oneTimeSortDirection === 'asc' 
            ? (a.final_amount || a.amount || 0) - (b.final_amount || b.amount || 0)
            : (b.final_amount || b.amount || 0) - (a.final_amount || a.amount || 0)
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        default:
          return 0
      }
      
      const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      return oneTimeSortDirection === 'asc' ? result : -result
    })

  // Filter and sort recurring students
  const filteredRecurringStudents = recurringStudents
    .filter(student => {
      // Filter by search query for recurring students
      let matchesSearch = true
      if (searchQuery) {
        matchesSearch = (
          student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.template_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      // Filter by status
      let matchesStatus = true
      if (recurringStatusFilter !== 'all') {
        matchesStatus = student.status === recurringStatusFilter
      }
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (!recurringSortField) return 0
      
      let aValue = ''
      let bValue = ''
      
      switch (recurringSortField) {
        case 'student':
          aValue = a.student_name || ''
          bValue = b.student_name || ''
          break
        case 'template':
          aValue = a.template_name || ''
          bValue = b.template_name || ''
          break
        case 'amount':
          return recurringSortDirection === 'asc' 
            ? (a.amount_override || a.template_amount || 0) - (b.amount_override || b.template_amount || 0)
            : (b.amount_override || b.template_amount || 0) - (a.amount_override || a.template_amount || 0)
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        default:
          return 0
      }
      
      const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      return recurringSortDirection === 'asc' ? result : -result
    })

  console.log('Filtered recurring students for rendering:', filteredRecurringStudents)
  console.log('Current activeTab:', activeTab)
  console.log('recurringStudentsLoading:', recurringStudentsLoading)

  const TableSkeleton = ({ tableType = 'one_time' }: { tableType?: 'one_time' | 'recurring' | 'template' }) => {
    const getColumns = () => {
      switch (tableType) {
        case 'recurring':
          return [
            { width: 'w-4', label: 'checkbox' },
            { width: 'w-32', label: 'student', twoLine: true },
            { width: 'w-24', label: 'template' },
            { width: 'w-20', label: 'amount' },
            { width: 'w-16', label: 'status' },
            { width: 'w-8', label: 'actions' }
          ]
        case 'template':
          return [
            { width: 'w-4', label: 'checkbox' },
            { width: 'w-28', label: 'student', twoLine: true },
            { width: 'w-20', label: 'amount' },
            { width: 'w-24', label: 'due_date' },
            { width: 'w-24', label: 'paid_date' },
            { width: 'w-16', label: 'method' },
            { width: 'w-16', label: 'status' },
            { width: 'w-8', label: 'actions' }
          ]
        default: // one_time
          return [
            { width: 'w-4', label: 'checkbox' },
            { width: 'w-32', label: 'student', twoLine: true },
            { width: 'w-20', label: 'amount' },
            { width: 'w-24', label: 'due_date' },
            { width: 'w-24', label: 'paid_date' },
            { width: 'w-16', label: 'status' },
            { width: 'w-8', label: 'actions' }
          ]
      }
    }

    const columns = getColumns()

    return (
      <div className="animate-pulse">
        <div className="overflow-x-auto min-h-[640px] flex flex-col">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {columns.map((col, i) => (
                  <th key={i} className="text-left p-4">
                    <div className={`h-4 bg-gray-300 rounded ${col.width}`}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((col, j) => (
                    <td key={j} className="p-4">
                      {col.twoLine ? (
                        <div className="space-y-1">
                          <div className={`h-4 bg-gray-200 rounded ${col.width}`}></div>
                          <div className={`h-3 bg-gray-200 rounded w-36`}></div>
                        </div>
                      ) : (
                        <div className={`h-3 bg-gray-200 rounded ${col.width}`}></div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading || translationLoading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
            <p className="text-gray-500">{t('payments.description')}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={handleViewPaymentPlans}>
              <Eye className="w-4 h-4" />
{t('payments.viewPaymentPlans')}
            </Button>
            <Button onClick={() => {
              setShowAddPaymentModal(true)
              fetchPaymentTemplates()
            }} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
{t('payments.addPayment')}
            </Button>
          </div>
        </div>
        
        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        {/* Table Skeleton */}
        <Card className="overflow-hidden">
          <TableSkeleton />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-500">{t('payments.description')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => {
            setShowAddPaymentModal(true)
            fetchPaymentTemplates()
          }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
{t('payments.addPayment')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('one_time')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'one_time'
              ? 'bg-primary/10 text-primary border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {t('payments.oneTime')}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'recurring'
              ? 'bg-primary/10 text-primary border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {t('payments.recurring')}
        </button>
        <button
          onClick={() => {
            setActiveTab('plans')
            fetchPaymentTemplates()
          }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'plans'
              ? 'bg-primary/10 text-primary border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          {t('payments.paymentPlans')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'plans' ? (
        /* Payment Plans Tab */
        <div className="space-y-6">
          {/* Recurring Payments Status */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900">{t('payments.automatedRecurringPayments')}</h3>
                <p className="text-xs text-blue-700 mt-1">
                  {t('payments.systemAutoGeneratesInvoices')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/payments/recurring/generate')
                      const result = await response.json()
                      
                      const statusMessage = [
                        `📋 Active Templates: ${result.totalActiveTemplates}`,
                        `⏳ Ready Today: ${result.templatesReady}`,
                        result.nextExecutionDate 
                          ? `📅 Next Due: ${result.nextExecutionDate} (${result.daysUntilNextRun} days)`
                          : '📅 No upcoming payments',
                        '',
                        result.templates.upcoming.length > 0 
                          ? `Upcoming: ${result.templates.upcoming.slice(0, 3).map((t: any) => `${t.name} (${t.days_until_due}d)`).join(', ')}`
                          : 'No upcoming templates'
                      ].join('\n')

                      alert(statusMessage)
                    } catch (error) {
                      alert('Error checking status: ' + (error as Error).message)
                    }
                  }}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {t('payments.checkStatus')}
                </Button>
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {t('payments.nextRun')}: {t('payments.daily900AM')}
                </div>
              </div>
            </div>
          </Card>

          {/* Search Bar for Plans */}
          <div className="flex items-center justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder={t('payments.searchPaymentPlans')}
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="h-10 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
              />
            </div>
            <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2 ml-4">
              <Plus className="w-4 h-4" />
{t('payments.addPayment')} Plan
            </Button>
          </div>

          {/* Payment Plans Grid */}
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
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          template.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.is_active ? t('common.active') : 'Paused'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1"
                        onClick={() => handleEditTemplate(template)}
                        title={t('payments.editTemplate')}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1"
                        onClick={() => handlePauseResumeTemplate(template.id, template.is_active)}
                        title={template.is_active ? t('payments.pauseAllPayments') : t('payments.resumeAllPayments')}
                      >
                        {template.is_active ? (
                          <XCircle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1"
                        onClick={() => handleDeleteTemplate(template)}
                        title={t('payments.deleteTemplate')}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noPaymentPlans')}</h3>
              <p className="text-gray-600 mb-4">{t('payments.getStartedFirstPaymentPlan')}</p>
              <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2 mx-auto">
                <Plus className="w-4 h-4" />
  {t('payments.addPayment')} Plan
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Payments Table for All, One-time, and Recurring tabs */
        <div>
          {/* Search Bar */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder={t('payments.searchByStatusEmailAmount')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
            />
          </div>

          {/* Bulk Actions Menu */}
          {((activeTab === 'one_time' && selectedOneTimeInvoices.size > 0) || 
            (activeTab === 'recurring' && selectedRecurringStudents.size > 0)) && (
            <Card className="mb-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">
                    {activeTab === 'one_time' 
                      ? t('payments.selected', { count: selectedOneTimeInvoices.size })
                      : t('payments.selected', { count: selectedRecurringStudents.size })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeTab === 'one_time') {
                        setSelectedOneTimeInvoices(new Set())
                      } else {
                        setSelectedRecurringStudents(new Set())
                      }
                    }}
                  >
                    {t('payments.clearSelection')}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder={t('common.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTab === 'one_time' ? (
                        <>
                          <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                          <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                          <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                          <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="active">{t('common.active')}</SelectItem>
                          <SelectItem value="paused">{t('payments.paused')}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleBulkStatusUpdate} className="bg-primary text-white">
                    {t('common.apply')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Payments Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto min-h-[640px] flex flex-col">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300"
                          checked={activeTab === 'one_time' 
                            ? filteredInvoices.length > 0 && selectedOneTimeInvoices.size === filteredInvoices.length
                            : filteredRecurringStudents.length > 0 && selectedRecurringStudents.size === filteredRecurringStudents.length}
                          onChange={(e) => {
                            if (activeTab === 'one_time') {
                              handleSelectAllOneTime(e.target.checked, filteredInvoices)
                            } else {
                              handleSelectAllRecurring(e.target.checked, filteredRecurringStudents)
                            }
                          }}
                        />
                      </div>
                    </th>
                    {activeTab === 'recurring' ? (
                      <>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('common.student')}
                            <button onClick={() => handleSort('student')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('student')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('payments.template')}
                            <button onClick={() => handleSort('template')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('template')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('payments.amount')}
                            <button onClick={() => handleSort('amount')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('amount')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2 relative">
                            {t('common.status')}
                            <div className="relative z-20" ref={statusFilterRef}>
                              <button
                                onClick={() => activeTab === 'recurring' ? setShowRecurringStatusFilter(!showRecurringStatusFilter) : setShowOneTimeStatusFilter(!showOneTimeStatusFilter)}
                                className={`flex items-center ${
                                  (activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) !== 'all' 
                                    ? 'text-primary' 
                                    : 'text-gray-400 hover:text-primary'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                              </button>
                              
                              {activeTab === 'recurring' && showRecurringStatusFilter && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                  <button
                                    onClick={() => {
                                      setRecurringStatusFilter('all')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('common.all')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecurringStatusFilter('active')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('common.active')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecurringStatusFilter('paused')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'paused' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.paused')}
                                  </button>
                                </div>
                              )}
                              {activeTab === 'one_time' && showOneTimeStatusFilter && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                  <button
                                    onClick={() => {
                                      setOneTimeStatusFilter('all')
                                      setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${oneTimeStatusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('common.all')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOneTimeStatusFilter('pending')
                                      setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${oneTimeStatusFilter === 'pending' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.pending')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOneTimeStatusFilter('paid')
                                      setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${oneTimeStatusFilter === 'paid' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.paid')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOneTimeStatusFilter('failed')
                                      setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${oneTimeStatusFilter === 'failed' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.failed')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOneTimeStatusFilter('refunded')
                                      setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${oneTimeStatusFilter === 'refunded' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.refunded')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900"></th>
                      </>
                    ) : (
                      <>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('common.student')}
                            <button onClick={() => handleSort('student')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('student')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('payments.amount')}
                            <button onClick={() => handleSort('amount')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('amount')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('payments.dueDate')}
                            <button onClick={() => handleSort('due_date')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('due_date')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {t('payments.paidDate')}
                            <button onClick={() => handleSort('paid_at')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('paid_at')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2 relative">
                            {t('common.status')}
                            <div className="relative z-20" ref={statusFilterRef}>
                              <button
                                onClick={() => activeTab === 'recurring' ? setShowRecurringStatusFilter(!showRecurringStatusFilter) : setShowOneTimeStatusFilter(!showOneTimeStatusFilter)}
                                className={`flex items-center ${
                                  (activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) !== 'all' 
                                    ? 'text-primary' 
                                    : 'text-gray-400 hover:text-primary'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                              </button>
                              
                              {((activeTab === 'recurring' && showRecurringStatusFilter) || (activeTab === 'one_time' && showOneTimeStatusFilter)) && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-[9999]">
                                  <button
                                    onClick={() => {
                                      activeTab === 'recurring' ? setRecurringStatusFilter('all') : setOneTimeStatusFilter('all')
                                      activeTab === 'recurring' ? setShowRecurringStatusFilter(false) : setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${(activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('common.all')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      activeTab === 'recurring' ? setRecurringStatusFilter('pending') : setOneTimeStatusFilter('pending')
                                      activeTab === 'recurring' ? setShowRecurringStatusFilter(false) : setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${(activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'pending' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.pending')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      activeTab === 'recurring' ? setRecurringStatusFilter('paid') : setOneTimeStatusFilter('paid')
                                      activeTab === 'recurring' ? setShowRecurringStatusFilter(false) : setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${(activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'paid' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.paid')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      activeTab === 'recurring' ? setRecurringStatusFilter('overdue') : setOneTimeStatusFilter('overdue')
                                      activeTab === 'recurring' ? setShowRecurringStatusFilter(false) : setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${(activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'overdue' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.overdue')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      activeTab === 'recurring' ? setRecurringStatusFilter('cancelled') : setOneTimeStatusFilter('cancelled')
                                      activeTab === 'recurring' ? setShowRecurringStatusFilter(false) : setShowOneTimeStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${(activeTab === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'cancelled' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.cancelled')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="text-left p-4 font-medium text-gray-900"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'recurring' ? (
                    /* Recurring Students Rows */
                    recurringStudentsLoading ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2">{t('payments.loadingRecurringStudents')}</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRecurringStudents.length > 0 ? (
                      filteredRecurringStudents.map((student) => {
                        console.log('Rendering student row:', student)
                        return (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedRecurringStudents.has(student.id)}
                            onChange={(e) => handleSelectRecurringStudent(student.id, e.target.checked)}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-900">{student.student_name}</div>
                            <div className="text-sm text-gray-500">{student.student_email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-900">{student.template_name}</div>
                            <div className="text-sm text-gray-500 capitalize">{student.recurrence_type}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{formatCurrency(student.final_amount)}</div>
                          {student.amount_override && (
                            <div className="text-sm text-gray-500 line-through">
                              {formatCurrency(student.template_amount)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {student.status === 'active' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-yellow-600" />
                            )}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              student.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {student.status}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-1"
                              ref={(el) => { dropdownButtonRefs.current[`recurring-${student.id}`] = el }}
                              onClick={() => {
                                console.log('Triple dot clicked for student:', student.id)
                                console.log('Current openDropdownId:', openDropdownId)
                                setOpenDropdownId(openDropdownId === student.id ? null : student.id)
                              }}
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </Button>
                            
                            {openDropdownId === student.id && (
                              <div 
                                className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                                style={{ zIndex: 9999 }}
                                onClick={(e) => {
                                  console.log('Dropdown div clicked')
                                  e.stopPropagation()
                                }}
                              >
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    console.log('Button onClick fired!')
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('About to call handleViewStudentPayments...')
                                    handleViewStudentPayments(student.student_id, student.template_id, student.student_name, student.template_name)
                                    setOpenDropdownId(null)
                                  }}
                                  onMouseDown={(e) => {
                                    console.log('Button onMouseDown fired!')
                                  }}
                                  onMouseUp={(e) => {
                                    console.log('Button onMouseUp fired!')
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                  View All Payments
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    console.log('Edit recurring student button onClick fired!')
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('About to open edit modal for recurring student:', student.id)
                                    setEditingRecurringStudent(student)
                                    setHasAmountOverride(student.amount_override !== null)
                                    setRecurringOverrideAmount(formatAmountWithCommas(student.amount_override?.toString() || student.template_amount?.toString() || '0'))
                                    setRecurringStatus(student.status)
                                    setShowEditRecurringModal(true)
                                    setOpenDropdownId(null)
                                  }}
                                  onMouseDown={(e) => {
                                    console.log('Edit recurring button onMouseDown fired!')
                                  }}
                                  onMouseUp={(e) => {
                                    console.log('Edit recurring button onMouseUp fired!')
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                  {t('common.edit')}
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteRecurringClick(student)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('common.delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center">
                            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noRecurringStudents')}</h3>
                            <p className="text-gray-600">
                              {searchQuery ? t('common.tryAdjustingSearch') : t('payments.noStudentsEnrolledRecurring')}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  ) : (
                    /* Invoice Rows for One-time tab */
                    filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300"
                            checked={selectedOneTimeInvoices.has(invoice.id)}
                            onChange={(e) => handleSelectOneTimeInvoice(invoice.id, e.target.checked)}
                          />
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
                            <div className="text-sm text-gray-500 line-through">
                              {formatCurrency(invoice.amount)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-700">
                            {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-700">
                            {invoice.paid_at ? formatDate(invoice.paid_at) : '-'}
                          </div>
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
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="p-1"
                              ref={(el) => { dropdownButtonRefs.current[`invoice-${invoice.id}`] = el }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenInvoiceDropdownId(openInvoiceDropdownId === invoice.id ? null : invoice.id)
                              }}
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-600" />
                            </Button>
                            
                            {openInvoiceDropdownId === invoice.id && (
                              <div 
                                className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                                style={{ zIndex: 9999 }}
                                onClick={(e) => {
                                  console.log('Dropdown div clicked')
                                  e.stopPropagation()
                                }}
                              >
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    console.log('Edit button onClick fired!')
                                    e.preventDefault()
                                    e.stopPropagation()
                                    console.log('About to open edit modal for invoice:', invoice.id)
                                    setEditingInvoice(invoice)
                                    setEditAmount(formatAmountWithCommas(invoice.amount.toString()))
                                    setEditDiscountAmount(formatAmountWithCommas(invoice.discount_amount?.toString() || '0'))
                                    setEditDiscountReason(invoice.discount_reason || '')
                                    setEditDueDate(invoice.due_date)
                                    setEditStatus(invoice.status)
                                    setEditPaidAt(invoice.paid_at || '')
                                    setEditPaymentMethod(invoice.payment_method || '')
                                    setEditRefundedAmount(formatAmountWithCommas(invoice.refunded_amount?.toString() || '0'))
                                    setShowEditPaymentModal(true)
                                    setOpenInvoiceDropdownId(null)
                                  }}
                                  onMouseDown={(e) => {
                                    console.log('Edit button onMouseDown fired!')
                                  }}
                                  onMouseUp={(e) => {
                                    console.log('Edit button onMouseUp fired!')
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                  {t('common.edit')}
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDeleteInvoiceClick(invoice)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t('common.delete')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <div className="flex flex-col items-center">
                            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noPayments')}</h3>
                            <p className="text-gray-600">
                              {searchQuery ? t('common.tryAdjustingSearch') : t('payments.noPaymentRecordsCreated')}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>


            {/* Footer */}
            {activeTab === 'recurring' ? (
              filteredRecurringStudents.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {t('payments.rowsSelected', { selected: 0, total: filteredRecurringStudents.length })}
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
              )
            ) : (
              filteredInvoices.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    {t('payments.rowsSelected', { selected: 0, total: filteredInvoices.length })}
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
              )
            )}
          </Card>
        </div>
      )}

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
    {t('payments.addPayment')} Plan
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
                  placeholder={t('payments.searchPaymentPlans')}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payment plans found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first payment plan.</p>
                  <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" />
      {t('payments.addPayment')} Plan
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
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.amount')}</Label>
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
                      <SelectItem value="monthly">{t('payments.monthly')}</SelectItem>
                      <SelectItem value="weekly">{t('payments.weekly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {planFormData.recurrence_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.dayOfMonth')}</Label>
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
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.dayOfWeek')}</Label>
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
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.startDate')}</Label>
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
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddPaymentPlan} className="flex-1">
  {t('payments.addPayment')} Plan
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
              <h2 className="text-xl font-bold text-gray-900">{t('payments.editPaymentPlan')}</h2>
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
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.amount')}</Label>
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
                      <SelectItem value="monthly">{t('payments.monthly')}</SelectItem>
                      <SelectItem value="weekly">{t('payments.weekly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {planFormData.recurrence_type === 'monthly' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.dayOfMonth')}</Label>
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
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.dayOfWeek')}</Label>
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
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.startDate')}</Label>
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
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditPlanModal(false)
                  resetPlanForm()
                }}
                className="flex-1 mr-3"
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdatePaymentPlan} className="flex-1">
                {t('payments.updatePaymentPlan')}
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
              <h2 className="text-xl font-bold text-gray-900">{t('payments.deletePaymentPlan')}</h2>
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
                {t('payments.deletePaymentPlanConfirm', { planName: templateToDelete.name })}
                {t('payments.deletePaymentPlanWarning')}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeletePlanModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteTemplate}
                  className="flex-1"
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Invoice Confirmation Modal */}
      {showDeleteInvoiceModal && invoiceToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('payments.deletePayment')}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteInvoiceModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {t('payments.deletePaymentConfirm', { studentName: invoiceToDelete.student_name })}
                {t('common.actionCannotBeUndone')}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteInvoiceModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteInvoice}
                  className="flex-1"
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Recurring Payment Confirmation Modal */}
      {showDeleteRecurringModal && recurringToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('payments.deleteRecurringPayment')}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteRecurringModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {t('payments.deleteRecurringPaymentConfirm', { studentName: recurringToDelete.student_name })}
                {t('payments.deleteRecurringPaymentWarning')}
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteRecurringModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeleteRecurring}
                  className="flex-1"
                >
                  {t('common.delete')}
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
              <h2 className="text-xl font-bold text-gray-900">{t('payments.addPayment')}</h2>
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
                    status: 'pending',
                    discount_amount: '',
                    discount_reason: '',
                    paid_at: '',
                    payment_method: '',
                    refunded_amount: '',
                    student_amount_overrides: {},
                    student_discount_overrides: {}
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
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentType')}</Label>
                  <Select 
                    value={paymentFormData.payment_type} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_type: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">{t('payments.oneTime')}</SelectItem>
                      <SelectItem value="recurring">{t('payments.recurring')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentFormData.payment_type === 'recurring' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentPlan')}</Label>
                      <Select 
                        value={paymentFormData.recurring_template_id} 
                        onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, recurring_template_id: value }))}
                      >
                        <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                          <SelectValue placeholder={t('payments.selectPaymentPlan')} />
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

                    {/* Payment Plan Information */}
                    {paymentFormData.recurring_template_id && (
                      <div className="space-y-2">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          {(() => {
                            const selectedTemplate = paymentTemplates.find(t => t.id === paymentFormData.recurring_template_id)
                            if (!selectedTemplate) return null

                            const getRecurrenceText = () => {
                              if (selectedTemplate.recurrence_type === 'monthly') {
                                return `Monthly on the ${selectedTemplate.day_of_month}${getOrdinalSuffix(selectedTemplate.day_of_month || 1)}`
                              } else if (selectedTemplate.recurrence_type === 'weekly') {
                                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                                return `Weekly on ${days[selectedTemplate.day_of_week || 0]}`
                              }
                              return selectedTemplate.recurrence_type
                            }

                            const getOrdinalSuffix = (num: number) => {
                              const j = num % 10
                              const k = num % 100
                              if (j === 1 && k !== 11) return 'st'
                              if (j === 2 && k !== 12) return 'nd' 
                              if (j === 3 && k !== 13) return 'rd'
                              return 'th'
                            }

                            return (
                              <div className="space-y-2">
                                <h4 className="font-medium text-blue-900">{selectedTemplate.name}</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-blue-700 font-medium">{t('payments.amount')}:</span>
                                    <p className="text-blue-800">₩{selectedTemplate.amount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <span className="text-blue-700 font-medium">{t('payments.schedule')}:</span>
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
                      <Label className="text-sm font-medium text-foreground/80">{t('common.students')}</Label>
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
                                    className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md transition-colors"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={paymentFormData.selected_students.includes(student.user_id)}
                                        onChange={() => {
                                          const isSelected = paymentFormData.selected_students.includes(student.user_id)
                                          const updatedSelectedStudents = isSelected
                                            ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                            : [...paymentFormData.selected_students, student.user_id];
                                          
                                          // Clean up amount overrides when deselecting students
                                          const updatedOverrides = { ...paymentFormData.student_amount_overrides }
                                          if (isSelected) {
                                            delete updatedOverrides[student.user_id]
                                          }
                                          
                                          setPaymentFormData(prev => ({ 
                                            ...prev, 
                                            selected_students: updatedSelectedStudents,
                                            student_amount_overrides: updatedOverrides
                                          }));
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {student.name}
                                          </span>
                                          {student.school_name && (
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                              {student.school_name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                    
                                    {/* Amount Override Checkbox - only show if student is selected */}
                                    {paymentFormData.selected_students.includes(student.user_id) && (
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={paymentFormData.student_amount_overrides[student.user_id]?.enabled || false}
                                          onChange={(e) => {
                                            setPaymentFormData(prev => ({
                                              ...prev,
                                              student_amount_overrides: {
                                                ...prev.student_amount_overrides,
                                                [student.user_id]: {
                                                  enabled: e.target.checked,
                                                  amount: e.target.checked ? (prev.student_amount_overrides[student.user_id]?.amount || '') : ''
                                                }
                                              }
                                            }))
                                          }}
                                          className="w-3 h-3 text-blue-600 border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                        />
                                        <span className="text-xs text-gray-600">₩</span>
                                      </label>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                        
                        {paymentFormData.selected_students.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            <p className="text-xs text-gray-600">
                              {t('payments.studentsSelected', { count: paymentFormData.selected_students.length })}
                            </p>
                            
                            {/* Amount Override Section - Only show if any student has override enabled */}
                            {Object.values(paymentFormData.student_amount_overrides).some(override => override.enabled) && (
                              <div className="space-y-2">
                                <Label className="text-xs text-gray-700 font-medium">{t('payments.amountOverride')}</Label>
                                <div className="space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                  {paymentFormData.selected_students
                                    .filter(studentId => paymentFormData.student_amount_overrides[studentId]?.enabled)
                                    .map(studentId => {
                                      const student = students.find(s => s.user_id === studentId)
                                      const override = paymentFormData.student_amount_overrides[studentId]
                                      
                                      return (
                                        <div key={studentId} className="bg-white/50 rounded-md p-3 border border-gray-200">
                                          <div className="flex items-center gap-3">
                                            <div className="min-w-0 flex-1">
                                              <span className="text-xs font-medium text-gray-900 block truncate">
                                                {student?.name || t('payments.unknownStudent')}
                                              </span>
                                              {student?.school_name && (
                                                <span className="text-xs text-gray-500">
                                                  {student.school_name}
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="flex-shrink-0">
                                              <div className="relative">
                                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium">₩</span>
                                                <Input
                                                  type="text"
                                                  placeholder="0"
                                                  value={formatAmountWithCommas(override.amount)}
                                                  onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/,/g, '')
                                                    setPaymentFormData(prev => ({
                                                      ...prev,
                                                      student_amount_overrides: {
                                                        ...prev.student_amount_overrides,
                                                        [studentId]: {
                                                          enabled: true,
                                                          amount: numericValue
                                                        }
                                                      }
                                                    }))
                                                  }}
                                                  className="h-7 text-xs rounded border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 pl-7 pr-3 w-32 text-right"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {paymentFormData.payment_type === 'one_time' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">{t('common.students')}</Label>
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
                                    className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md transition-colors"
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={paymentFormData.selected_students.includes(student.user_id)}
                                        onChange={() => {
                                          const isSelected = paymentFormData.selected_students.includes(student.user_id)
                                          const updatedSelectedStudents = isSelected
                                            ? paymentFormData.selected_students.filter(id => id !== student.user_id)
                                            : [...paymentFormData.selected_students, student.user_id];
                                          
                                          // Clean up amount overrides and discount overrides when deselecting students
                                          const updatedAmountOverrides = { ...paymentFormData.student_amount_overrides }
                                          const updatedDiscountOverrides = { ...paymentFormData.student_discount_overrides }
                                          if (isSelected) {
                                            delete updatedAmountOverrides[student.user_id]
                                            delete updatedDiscountOverrides[student.user_id]
                                          }
                                          
                                          setPaymentFormData(prev => ({ 
                                            ...prev, 
                                            selected_students: updatedSelectedStudents,
                                            student_amount_overrides: updatedAmountOverrides,
                                            student_discount_overrides: updatedDiscountOverrides
                                          }));
                                        }}
                                        className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-gray-900 truncate">
                                            {student.name}
                                          </span>
                                          {student.school_name && (
                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                              {student.school_name}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </label>
                                    
                                    {/* Discount Checkbox - only show if student is selected */}
                                    {paymentFormData.selected_students.includes(student.user_id) && (
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={paymentFormData.student_discount_overrides[student.user_id]?.enabled || false}
                                          onChange={(e) => {
                                            setPaymentFormData(prev => ({
                                              ...prev,
                                              student_discount_overrides: {
                                                ...prev.student_discount_overrides,
                                                [student.user_id]: {
                                                  enabled: e.target.checked,
                                                  amount: e.target.checked ? (prev.student_discount_overrides[student.user_id]?.amount || '') : '',
                                                  reason: e.target.checked ? (prev.student_discount_overrides[student.user_id]?.reason || '') : ''
                                                }
                                              }
                                            }))
                                          }}
                                          className="w-3 h-3 text-blue-600 border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                        />
                                        <span className="text-xs text-gray-600">₩</span>
                                      </label>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                        
                        {paymentFormData.selected_students.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            <p className="text-xs text-gray-600">
                              {t('payments.studentsSelected', { count: paymentFormData.selected_students.length })}
                            </p>
                            
                            {/* Discount Override Section - Only show if any student has discount enabled */}
                            {Object.values(paymentFormData.student_discount_overrides).some(override => override.enabled) && (
                              <div className="space-y-2">
                                <Label className="text-xs text-gray-700 font-medium">{t('payments.discountAmount')}</Label>
                                <div className="space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                                  {paymentFormData.selected_students
                                    .filter(studentId => paymentFormData.student_discount_overrides[studentId]?.enabled)
                                    .map(studentId => {
                                      const student = students.find(s => s.user_id === studentId)
                                      const override = paymentFormData.student_discount_overrides[studentId]
                                      
                                      return (
                                        <div key={studentId} className="bg-white/50 rounded-md p-3 border border-gray-200 space-y-2">
                                          <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                              <span className="text-xs font-medium text-gray-900 block truncate">
                                                {student?.name || t('payments.unknownStudent')}
                                              </span>
                                              {student?.school_name && (
                                                <span className="text-xs text-gray-500">
                                                  {student.school_name}
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="flex-shrink-0">
                                              <div className="relative">
                                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium">₩</span>
                                                <Input
                                                  type="text"
                                                  placeholder="0"
                                                  value={formatAmountWithCommas(override?.amount || '')}
                                                  onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/,/g, '')
                                                    setPaymentFormData(prev => ({
                                                      ...prev,
                                                      student_discount_overrides: {
                                                        ...prev.student_discount_overrides,
                                                        [studentId]: {
                                                          ...prev.student_discount_overrides[studentId],
                                                          amount: numericValue
                                                        }
                                                      }
                                                    }))
                                                  }}
                                                  className="h-8 w-32 pl-6 text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-0 text-right"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <Input
                                            placeholder={t('payments.reasonForDiscountPlaceholder')}
                                            value={override?.reason || ''}
                                            onChange={(e) => {
                                              setPaymentFormData(prev => ({
                                                ...prev,
                                                student_discount_overrides: {
                                                  ...prev.student_discount_overrides,
                                                  [studentId]: {
                                                    ...prev.student_discount_overrides[studentId],
                                                    reason: e.target.value
                                                  }
                                                }
                                              }))
                                            }}
                                            className="h-8 w-full text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-0"
                                          />
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground/80">{t('payments.amount')}</Label>
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
                        placeholder={t('payments.paymentDescriptionPlaceholder')} 
                        className="h-10"
                        value={paymentFormData.description}
                        onChange={(e) => setPaymentFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {paymentFormData.payment_type === 'one_time' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.dueDate')}</Label>
                    <DatePickerComponent
                      value={paymentFormData.due_date}
                      onChange={(value) => setPaymentFormData(prev => ({ ...prev, due_date: value }))}
                      fieldId="payment-due-date"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
                  <Select 
                    value={paymentFormData.status} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                      <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                      <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                      <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paidDate')}</Label>
                  <DatePickerComponent
                    value={paymentFormData.paid_at}
                    onChange={(value) => setPaymentFormData(prev => ({ ...prev, paid_at: value }))}
                    fieldId="payment-paid-at"
                    placeholder={t('payments.selectPaidDateOptional')}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentMethod')}</Label>
                  <Select 
                    value={paymentFormData.payment_method} 
                    onValueChange={(value) => setPaymentFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t('payments.selectPaymentMethodPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t('payments.paymentMethods.cash')}</SelectItem>
                      <SelectItem value="card">{t('payments.paymentMethods.card')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('payments.paymentMethods.bankTransfer')}</SelectItem>
                      <SelectItem value="other">{t('payments.paymentMethods.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentFormData.status === 'refunded' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.refund')}</Label>
                    <Input 
                      type="number"
                      placeholder="0" 
                      className="h-10"
                      value={paymentFormData.refunded_amount}
                      onChange={(e) => setPaymentFormData(prev => ({ ...prev, refunded_amount: e.target.value }))}
                    />
                  </div>
                )}
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
                    status: 'pending',
                    discount_amount: '',
                    discount_reason: '',
                    paid_at: '',
                    payment_method: '',
                    refunded_amount: '',
                    student_amount_overrides: {},
                    student_discount_overrides: {}
                  })
                }}
                className="flex-1 mr-3"
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAddPayment} className="flex-1">
  {t('payments.addPayment')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPaymentModal && editingInvoice && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('payments.editPayment')}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditPaymentModal(false)
                  setEditingInvoice(null)
                  setEditAmount('')
                  setEditDiscountAmount('')
                  setEditDiscountReason('')
                  setEditDueDate('')
                  setEditStatus('pending')
                  setEditPaidAt('')
                  setEditPaymentMethod('')
                  setEditRefundedAmount('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('common.student')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900">{editingInvoice.student_name}</div>
                    <div className="text-sm text-gray-500">{editingInvoice.student_email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.amount')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                    <Input 
                      type="text" 
                      placeholder="0" 
                      className="h-10 pl-9"
                      value={editAmount}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/,/g, '')
                        setEditAmount(formatAmountWithCommas(numericValue))
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.discountAmount')}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                    <Input 
                      type="text" 
                      placeholder="0" 
                      className="h-10 pl-9"
                      value={editDiscountAmount}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/,/g, '')
                        setEditDiscountAmount(formatAmountWithCommas(numericValue))
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.discountReason')}</Label>
                  <Input 
                    placeholder={t('payments.discountReasonPlaceholder')} 
                    className="h-10"
                    value={editDiscountReason}
                    onChange={(e) => setEditDiscountReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.dueDate')}</Label>
                  <DatePickerComponent
                    value={editDueDate}
                    onChange={(value) => setEditDueDate(value)}
                    fieldId="edit-payment-due-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
                  <Select value={editStatus} onValueChange={(value) => setEditStatus(value)}>
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                      <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                      <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                      <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paidDate')}</Label>
                  <DatePickerComponent
                    value={editPaidAt}
                    onChange={(value) => setEditPaidAt(value)}
                    fieldId="edit-payment-paid-at"
                    placeholder={t('payments.selectPaidDateOptional')}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentMethod')}</Label>
                  <Select value={editPaymentMethod} onValueChange={(value) => setEditPaymentMethod(value)}>
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={t('payments.selectPaymentMethodPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="cash">{t('payments.paymentMethods.cash')}</SelectItem>
                      <SelectItem value="card">{t('payments.paymentMethods.card')}</SelectItem>
                      <SelectItem value="bank_transfer">{t('payments.paymentMethods.bankTransfer')}</SelectItem>
                      <SelectItem value="other">{t('payments.paymentMethods.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editStatus === 'refunded' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">{t('payments.refund')}</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                      <Input 
                        type="text" 
                        placeholder="0" 
                        className="h-10 pl-9"
                        value={editRefundedAmount}
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/,/g, '')
                          setEditRefundedAmount(formatAmountWithCommas(numericValue))
                        }}
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditPaymentModal(false)
                  setEditingInvoice(null)
                  setEditAmount('')
                  setEditDiscountAmount('')
                  setEditDiscountReason('')
                  setEditDueDate('')
                  setEditStatus('pending')
                  setEditPaidAt('')
                  setEditPaymentMethod('')
                  setEditRefundedAmount('')
                }}
                className="flex-1 mr-3"
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEditPayment} className="flex-1">
                {t('common.saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Recurring Payment Student Modal */}
      {showEditRecurringModal && editingRecurringStudent && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('payments.editRecurringPayment')}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditRecurringModal(false)
                  setEditingRecurringStudent(null)
                  setHasAmountOverride(false)
                  setRecurringOverrideAmount('')
                  setRecurringStatus('active')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('common.student')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900">{editingRecurringStudent.student_name}</div>
                    <div className="text-sm text-gray-500">{editingRecurringStudent.student_email}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.paymentTemplate')}</Label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="font-medium text-gray-900">{editingRecurringStudent.template_name}</div>
                    <div className="text-sm text-gray-500">
                      {t('payments.baseAmount')}: {formatCurrency(editingRecurringStudent.template_amount)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('payments.customAmount')}</Label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hasAmountOverride}
                        onChange={(e) => setHasAmountOverride(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t('payments.overrideDefaultAmount')}</span>
                    </label>
                    
                    {hasAmountOverride && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium">₩</span>
                        <Input 
                          type="text" 
                          placeholder="0" 
                          className="h-10 pl-9"
                          value={recurringOverrideAmount}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/,/g, '')
                            setRecurringOverrideAmount(formatAmountWithCommas(numericValue))
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{t('common.status')}</Label>
                  <Select value={recurringStatus} onValueChange={(value) => setRecurringStatus(value)}>
                    <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('common.active')}</SelectItem>
                      <SelectItem value="paused">{t('payments.paused')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditRecurringModal(false)
                  setEditingRecurringStudent(null)
                  setHasAmountOverride(false)
                  setRecurringOverrideAmount('')
                  setRecurringStatus('active')
                }}
                className="flex-1 mr-3"
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEditRecurringPayment} className="flex-1">
                {t('common.saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Payments Modal */}
      {showTemplatePaymentsModal && selectedTemplate && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('payments.paymentHistory')}</h2>
                <p className="text-gray-500">{t('payments.studentPaymentsForTemplate', { templateName: selectedTemplate.name })}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowTemplatePaymentsModal(false)
                  setSelectedTemplate(null)
                  setTemplatePayments([])
                  setSelectedTemplatePayments(new Set())
                  setTemplateStatusFilter('all')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* Template Summary */}
              <Card className="mb-6 p-4 bg-blue-50 border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t('payments.template')}</div>
                    <div className="text-lg font-bold text-blue-800">{selectedTemplate.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t('payments.amount')}</div>
                    <div className="text-lg font-bold text-blue-800">{formatCurrency(selectedTemplate.amount)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t('payments.recurrence')}</div>
                    <div className="text-lg font-bold text-blue-800 capitalize">{selectedTemplate.recurrence_type}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">{t('common.status')}</div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      selectedTemplate.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTemplate.is_active ? t('common.active') : t('payments.paused')}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Bulk Actions Menu for Payment History */}
              {selectedTemplatePayments.size > 0 && (
                <Card className="mb-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700">
                        {t('payments.selected', { count: selectedTemplatePayments.size })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplatePayments(new Set())}
                      >
                        {t('payments.clearSelection')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={templateBulkStatus} onValueChange={setTemplateBulkStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('common.status')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                          <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                          <SelectItem value="failed">{t('payments.failed')}</SelectItem>
                          <SelectItem value="refunded">{t('payments.refunded')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleTemplateBulkStatusUpdate} className="bg-primary text-white">
                        {t('common.apply')}
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Payments Table */}
              {templatePaymentsLoading ? (
                <Card className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </Card>
              ) : (
                <>
                  {templatePayments.length > 0 ? (
                    <Card>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    checked={(() => {
                                      const filteredPayments = templatePayments
                                        .filter(payment => templateStatusFilter === 'all' || payment.status === templateStatusFilter)
                                      return filteredPayments.length > 0 && selectedTemplatePayments.size === filteredPayments.length
                                    })()}
                                    onChange={(e) => {
                                      const filteredPayments = templatePayments
                                        .filter(payment => templateStatusFilter === 'all' || payment.status === templateStatusFilter)
                                      handleSelectAllTemplatePayments(e.target.checked, filteredPayments)
                                    }}
                                  />
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {t('common.student')}
                                  <button onClick={() => handleTemplateSort('student')} className="text-gray-400 hover:text-primary">
                                    {renderTemplateSortIcon('student')}
                                  </button>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {t('payments.amount')}
                                  <button onClick={() => handleTemplateSort('amount')} className="text-gray-400 hover:text-primary">
                                    {renderTemplateSortIcon('amount')}
                                  </button>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {t('payments.dueDate')}
                                  <button onClick={() => handleTemplateSort('due_date')} className="text-gray-400 hover:text-primary">
                                    {renderTemplateSortIcon('due_date')}
                                  </button>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2">
                                  {t('payments.paidDate')}
                                  <button onClick={() => handleTemplateSort('paid_date')} className="text-gray-400 hover:text-primary">
                                    {renderTemplateSortIcon('paid_date')}
                                  </button>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2 relative">
                                  {t('payments.method')}
                                  <div className="relative z-20" ref={methodFilterRef}>
                                    <button
                                      onClick={() => setShowTemplateMethodFilter(!showTemplateMethodFilter)}
                                      className={`flex items-center ${
                                        templateMethodFilter !== 'all' 
                                          ? 'text-primary' 
                                          : 'text-gray-400 hover:text-primary'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                      </svg>
                                    </button>
                                    
                                    {showTemplateMethodFilter && (
                                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                        <button
                                          onClick={() => {
                                            setTemplateMethodFilter('all')
                                            setShowTemplateMethodFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateMethodFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('common.all')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateMethodFilter('card')
                                            setShowTemplateMethodFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateMethodFilter === 'card' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.paymentMethods.card')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateMethodFilter('bank_transfer')
                                            setShowTemplateMethodFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateMethodFilter === 'bank_transfer' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.paymentMethods.bankTransfer')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateMethodFilter('cash')
                                            setShowTemplateMethodFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateMethodFilter === 'cash' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.paymentMethods.cash')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900">
                                <div className="flex items-center gap-2 relative">
                                  {t('common.status')}
                                  <div className="relative z-20" ref={statusFilterRef}>
                                    <button
                                      onClick={() => setShowTemplateStatusFilter(!showTemplateStatusFilter)}
                                      className={`flex items-center ${
                                        templateStatusFilter !== 'all' 
                                          ? 'text-primary' 
                                          : 'text-gray-400 hover:text-primary'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                      </svg>
                                    </button>
                                    
                                    {showTemplateStatusFilter && (
                                      <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                                        <button
                                          onClick={() => {
                                            setTemplateStatusFilter('all')
                                            setShowTemplateStatusFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('common.all')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateStatusFilter('pending')
                                            setShowTemplateStatusFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === 'pending' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.pending')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateStatusFilter('paid')
                                            setShowTemplateStatusFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === 'paid' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.paid')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateStatusFilter('failed')
                                            setShowTemplateStatusFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === 'failed' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.failed')}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setTemplateStatusFilter('refunded')
                                            setShowTemplateStatusFilter(false)
                                          }}
                                          className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${templateStatusFilter === 'refunded' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                        >
                                          {t('payments.refunded')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </th>
                              <th className="text-left p-4 font-medium text-gray-900"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {templatePayments
                              .filter(payment => {
                                const matchesStatus = templateStatusFilter === 'all' || payment.status === templateStatusFilter
                                const matchesMethod = templateMethodFilter === 'all' || payment.payment_method === templateMethodFilter
                                return matchesStatus && matchesMethod
                              })
                              .sort((a, b) => {
                                if (!templateSortField) return 0
                                
                                let aValue = ''
                                let bValue = ''
                                
                                switch (templateSortField) {
                                  case 'student':
                                    aValue = a.student_name || ''
                                    bValue = b.student_name || ''
                                    break
                                  case 'amount':
                                    return templateSortDirection === 'asc' 
                                      ? (a.final_amount || 0) - (b.final_amount || 0)
                                      : (b.final_amount || 0) - (a.final_amount || 0)
                                  case 'due_date':
                                    return templateSortDirection === 'asc'
                                      ? new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime()
                                      : new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime()
                                  case 'paid_date':
                                    return templateSortDirection === 'asc'
                                      ? new Date(a.paid_at || '').getTime() - new Date(b.paid_at || '').getTime()
                                      : new Date(b.paid_at || '').getTime() - new Date(a.paid_at || '').getTime()
                                  default:
                                    return 0
                                }
                                
                                const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
                                return templateSortDirection === 'asc' ? result : -result
                              })
                              .map((payment) => (
                              <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-4">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300"
                                    checked={selectedTemplatePayments.has(payment.id)}
                                    onChange={(e) => handleSelectTemplatePayment(payment.id, e.target.checked)}
                                  />
                                </td>
                                <td className="p-4">
                                  <div>
                                    <div className="font-medium text-gray-900">{payment.student_name}</div>
                                    <div className="text-sm text-gray-500">{payment.student_email}</div>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="font-medium text-gray-900">{formatCurrency(payment.final_amount)}</div>
                                  {payment.discount_amount > 0 && (
                                    <div className="text-sm text-gray-500 line-through">
                                      {formatCurrency(payment.amount)}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                  {payment.due_date ? formatDate(payment.due_date) : '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                  {payment.paid_at ? formatDate(payment.paid_at) : '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                  {payment.payment_method || '-'}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(payment.status)}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(payment.status)}`}>
                                      {payment.status === 'not_generated' ? t('payments.enrolled') : payment.status}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="relative">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="p-1"
                                      ref={(el) => { dropdownButtonRefs.current[`template-${payment.id}`] = el }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenInvoiceDropdownId(openInvoiceDropdownId === payment.id ? null : payment.id)
                                      }}
                                    >
                                      <MoreHorizontal className="w-4 h-4 text-gray-600" />
                                    </Button>
                                    
                                    {openInvoiceDropdownId === payment.id && (
                                      <div 
                                        className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                                        style={{ zIndex: 9999 }}
                                        onClick={(e) => {
                                          console.log('Dropdown div clicked')
                                          e.stopPropagation()
                                        }}
                                      >
                                        <button
                                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                          onClick={(e) => {
                                            console.log('Edit payment history button onClick fired!')
                                            e.preventDefault()
                                            e.stopPropagation()
                                            console.log('About to open edit modal for payment:', payment.id)
                                            setEditingInvoice(payment)
                                            setEditAmount(formatAmountWithCommas(payment.amount.toString()))
                                            setEditDiscountAmount(formatAmountWithCommas(payment.discount_amount?.toString() || '0'))
                                            setEditDiscountReason(payment.discount_reason || '')
                                            setEditDueDate(payment.due_date)
                                            setEditStatus(payment.status)
                                            setEditPaidAt(payment.paid_at || '')
                                            setEditPaymentMethod(payment.payment_method || '')
                                            setEditRefundedAmount(formatAmountWithCommas(payment.refunded_amount?.toString() || '0'))
                                            setShowEditPaymentModal(true)
                                            setOpenInvoiceDropdownId(null)
                                          }}
                                          onMouseDown={(e) => {
                                            console.log('Edit payment history button onMouseDown fired!')
                                          }}
                                          onMouseUp={(e) => {
                                            console.log('Edit payment history button onMouseUp fired!')
                                          }}
                                        >
                                          <Edit className="w-4 h-4" />
                                          {t('common.edit')}
                                        </button>
                                        <button
                                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            handleDeleteInvoiceClick(payment)
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          {t('common.delete')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-12 text-center">
                      <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('payments.noPayments')}</h3>
                      <p className="text-gray-600">{t('payments.noInvoicesGeneratedYet')}</p>
                    </Card>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t('payments.paymentsFound', { count: templatePayments.length })}
              </div>
              <Button 
                onClick={() => {
                  setShowTemplatePaymentsModal(false)
                  setSelectedTemplate(null)
                  setTemplatePayments([])
                  setSelectedTemplatePayments(new Set())
                  setTemplateStatusFilter('all')
                }}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}