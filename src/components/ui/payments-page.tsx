"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useListPageShortcuts } from '@/hooks/useListPageShortcuts'
import { SearchKbdHint } from '@/components/ui/search-kbd-hint'
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
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BulkActionBar, DashboardCard, TableCheckbox } from '@/components/ui/dashboard'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { showSuccessToast, showErrorToast } from '@/stores'
import {
  usePaymentsData,
  invalidatePaymentsCache,
  type Invoice,
  type PaymentTemplate,
  type RecurringStudent,
} from '@/components/ui/payments/hooks/usePaymentsData'
// Modals are conditionally rendered (`{showXxxModal && <XxxModal ... />}`),
// so dynamic-import them — the ~2,300 lines of modal JSX + their
// ModalShell/Select/DateInput dep trees only load when the user opens one.
// `emptyPaymentFormData` lives in a tiny standalone module so importing it
// statically (the page holds form state in useState) doesn't drag the
// 690-line AddPaymentModal back into the eager bundle.
import dynamic from 'next/dynamic'
import { emptyPaymentFormData } from '@/components/ui/payments/payment-form-data'

const ViewPlansModal = dynamic(() => import('@/components/ui/payments/modals/ViewPlansModal').then(m => m.ViewPlansModal), { ssr: false })
const AddPlanModal = dynamic(() => import('@/components/ui/payments/modals/AddPlanModal').then(m => m.AddPlanModal), { ssr: false })
const EditPlanModal = dynamic(() => import('@/components/ui/payments/modals/EditPlanModal').then(m => m.EditPlanModal), { ssr: false })
const DeleteInvoiceModal = dynamic(() => import('@/components/ui/payments/modals/DeleteConfirmModals').then(m => m.DeleteInvoiceModal), { ssr: false })
const DeleteRecurringModal = dynamic(() => import('@/components/ui/payments/modals/DeleteConfirmModals').then(m => m.DeleteRecurringModal), { ssr: false })
const BulkDeleteModal = dynamic(() => import('@/components/ui/payments/modals/DeleteConfirmModals').then(m => m.BulkDeleteModal), { ssr: false })
const DeletePlanModal = dynamic(() => import('@/components/ui/payments/modals/DeleteConfirmModals').then(m => m.DeletePlanModal), { ssr: false })
const PausePlanModal = dynamic(() => import('@/components/ui/payments/modals/DeleteConfirmModals').then(m => m.PausePlanModal), { ssr: false })
const EditRecurringStudentModal = dynamic(() => import('@/components/ui/payments/modals/EditRecurringStudentModal').then(m => m.EditRecurringStudentModal), { ssr: false })
const ViewPaymentModal = dynamic(() => import('@/components/ui/payments/modals/ViewPaymentModal').then(m => m.ViewPaymentModal), { ssr: false })
const AddPaymentModal = dynamic(() => import('@/components/ui/payments/modals/AddPaymentModal').then(m => m.AddPaymentModal), { ssr: false })
const EditPaymentModal = dynamic(() => import('@/components/ui/payments/modals/EditPaymentModal').then(m => m.EditPaymentModal), { ssr: false })
const TemplatePaymentsModal = dynamic(() => import('@/components/ui/payments/modals/TemplatePaymentsModal').then(m => m.TemplatePaymentsModal), { ssr: false })

// Re-export for consumers that import from this file
export { invalidatePaymentsCache }

const itemsPerPage = 10

interface PaymentsPageProps {
  academyId: string
}

export function PaymentsPage({ academyId }: PaymentsPageProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [showPaymentPlansModal, setShowPaymentPlansModal] = useState(false)
  const [showAddPlanModal, setShowAddPlanModal] = useState(false)
  const [showEditPlanModal, setShowEditPlanModal] = useState(false)
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [showPauseResumeModal, setShowPauseResumeModal] = useState(false)
  const [templateToPauseResume, setTemplateToPauseResume] = useState<PaymentTemplate | null>(null)
  const [showDeleteInvoiceModal, setShowDeleteInvoiceModal] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [showDeleteRecurringModal, setShowDeleteRecurringModal] = useState(false)
  const [recurringToDelete, setRecurringToDelete] = useState<RecurringStudent | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [showViewPaymentModal, setShowViewPaymentModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [editInvoiceName, setEditInvoiceName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDiscountAmount, setEditDiscountAmount] = useState('')
  const [editDiscountReason, setEditDiscountReason] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editStatus, setEditStatus] = useState('pending')
  const [editPaidAt, setEditPaidAt] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('')
  const [editRefundedAmount, setEditRefundedAmount] = useState('')
  const [showEditRecurringModal, setShowEditRecurringModal] = useState(false)
  const [editingRecurringStudent, setEditingRecurringStudent] = useState<RecurringStudent | null>(null)
  const [hasAmountOverride, setHasAmountOverride] = useState(false)
  const [recurringOverrideAmount, setRecurringOverrideAmount] = useState('')
  const [recurringStatus, setRecurringStatus] = useState('active')
  const [showTemplatePaymentsModal, setShowTemplatePaymentsModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PaymentTemplate | null>(null)
  const [templatePayments, setTemplatePayments] = useState<Invoice[]>([])
  const [templatePaymentsLoading, setTemplatePaymentsLoading] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const [openInvoiceDropdownId, setOpenInvoiceDropdownId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')

  // Data fetching hook - all state and fetch logic extracted
  const {
    invoices, setInvoices,
    recurringStudents, setRecurringStudents,
    paymentTemplates, setPaymentTemplates,
    students,
    loading,
    invoicesLoading,
    initialized,
    totalCount,
    allTimeRevenue,
    allTimePending,
    currentPage, setCurrentPage,
    recurringStudentsLoading,
    templatesLoading,
    studentsLoading,
    fetchInvoices,
    fetchRecurringStudents,
    fetchPaymentTemplates,
    fetchStudents,
  } = usePaymentsData(academyId, activeTab)

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const [planSearchQuery, setPlanSearchQuery] = useState('')
  const [editingTemplate, setEditingTemplate] = useState<PaymentTemplate | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<PaymentTemplate | null>(null)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set())
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
    // Individual amount overrides for recurring payments
    student_amount_overrides: {} as { [studentId: string]: { enabled: boolean; amount: string; reason?: string } },
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
  const recurringStatusFilterRef = useRef<HTMLDivElement>(null)
  const oneTimeStatusFilterRef = useRef<HTMLDivElement>(null)
  const templateStatusFilterRef = useRef<HTMLDivElement>(null)
  const methodFilterRef = useRef<HTMLDivElement>(null)

  // Selection state - separate for each tab
  const [selectedOneTimeInvoices, setSelectedOneTimeInvoices] = useState<Set<string>>(new Set())
  const [selectedRecurringStudents, setSelectedRecurringStudents] = useState<Set<string>>(new Set())
  const [selectedTemplatePayments, setSelectedTemplatePayments] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>('pending')
  const [templateBulkStatus, setTemplateBulkStatus] = useState<string>('pending')
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  // const [, setShowBulkActions] = useState(false) // Unused variable - commented out to fix ESLint warning

  // Loading states for form submissions
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Close status filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Close one-time status filter if clicking outside
      if (showOneTimeStatusFilter && oneTimeStatusFilterRef.current && !oneTimeStatusFilterRef.current.contains(target)) {
        setShowOneTimeStatusFilter(false)
      }

      // Close recurring status filter if clicking outside
      if (showRecurringStatusFilter && recurringStatusFilterRef.current && !recurringStatusFilterRef.current.contains(target)) {
        setShowRecurringStatusFilter(false)
      }

      // Close template status filter if clicking outside
      if (showTemplateStatusFilter && templateStatusFilterRef.current && !templateStatusFilterRef.current.contains(target)) {
        setShowTemplateStatusFilter(false)
      }

      // Close method filter if clicking outside
      if (showTemplateMethodFilter && methodFilterRef.current && !methodFilterRef.current.contains(target)) {
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
  }, [showOneTimeStatusFilter, showRecurringStatusFilter, showTemplateMethodFilter, showTemplateStatusFilter])

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

  // Manager keyboard shortcuts: `/` → search, `n` → new payment, `Esc` → clear selections.
  useListPageShortcuts({
    searchInputRef,
    onCreate: () => setShowAddPaymentModal(true),
    isCreateBlocked: showAddPaymentModal,
    onEscape: (selectedOneTimeInvoices.size > 0 || selectedRecurringStudents.size > 0)
      ? () => {
          setSelectedOneTimeInvoices(new Set())
          setSelectedRecurringStudents(new Set())
        }
      : undefined,
  })

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

  const handleSelectAllRecurring = useCallback((checked: boolean, filteredData: RecurringStudent[]) => {
    if (checked) {
      const allIds = new Set(filteredData.map(student => student.id))
      setSelectedRecurringStudents(allIds)
    } else {
      setSelectedRecurringStudents(new Set())
    }
  }, [])
  
  // Mark function as used

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

  const handleBulkStatusUpdate = async (statusOverride?: string) => {
    const status = statusOverride ?? bulkStatus
    if (activeTab === 'one_time') {
      const selectedIds = Array.from(selectedOneTimeInvoices)

      if (selectedIds.length === 0) return

      try {
        // Update invoice statuses
        const { error } = await supabase
          .from('invoices')
          .update({ status })
          .in('id', selectedIds)

        if (error) throw error

        // Refresh data
        fetchInvoices()
        setSelectedOneTimeInvoices(new Set())
      } catch (error) {
        console.error('Error updating bulk status:', error)
        showErrorToast(t('payments.errorUpdatingStatus') as string)
      }
    } else if (activeTab === 'recurring') {
      const selectedIds = Array.from(selectedRecurringStudents)

      if (selectedIds.length === 0) return

      try {
        // Update recurring student statuses
        const { error } = await supabase
          .from('recurring_payment_template_students')
          .update({ status })
          .in('id', selectedIds)

        if (error) throw error

        // Refresh data
        fetchRecurringStudents()
        setSelectedRecurringStudents(new Set())
      } catch (error) {
        console.error('Error updating recurring students bulk status:', error)
        showErrorToast(t('payments.errorUpdatingStatus') as string)
      }
    }
  }

  const handleBulkDeleteClick = () => {
    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = async () => {
    if (activeTab === 'one_time') {
      const selectedIds = Array.from(selectedOneTimeInvoices)

      if (selectedIds.length === 0) return

      try {
        // Soft delete: Set deleted_at timestamp
        const { error } = await supabase
          .from('invoices')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', selectedIds)

        if (error) throw error

        showSuccessToast(t('payments.invoicesDeletedSuccessfully', { count: selectedIds.length }) as string)

        // Invalidate cache and refresh data
        invalidatePaymentsCache(academyId)
        await fetchInvoices()

        // Clear selection
        setSelectedOneTimeInvoices(new Set())
        setShowBulkDeleteModal(false)
      } catch (error) {
        console.error('Error deleting invoices:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        showErrorToast(t('payments.errorDeletingPayments') as string)
      }
    } else if (activeTab === 'recurring') {
      const selectedIds = Array.from(selectedRecurringStudents)

      if (selectedIds.length === 0) return

      try {
        // Get the student_id and template_id for each enrollment before deleting
        const enrollmentsToDelete = recurringStudents.filter(s => selectedIds.includes(s.id))

        // Soft-delete pending invoices for each enrollment
        for (const enrollment of enrollmentsToDelete) {
          await supabase
            .from('invoices')
            .update({ deleted_at: new Date().toISOString() })
            .eq('student_id', enrollment.student_id)
            .eq('template_id', enrollment.template_id)
            .eq('status', 'pending')
            .is('deleted_at', null)
        }

        // Delete recurring payment enrollments
        const { error } = await supabase
          .from('recurring_payment_template_students')
          .delete()
          .in('id', selectedIds)

        if (error) throw error

        showSuccessToast(t('payments.recurringPaymentsDeletedSuccessfully', { count: selectedIds.length }) as string)

        // Invalidate cache and refresh data
        invalidatePaymentsCache(academyId)
        await fetchRecurringStudents()
        await fetchInvoices()

        // Clear selection
        setSelectedRecurringStudents(new Set())
        setShowBulkDeleteModal(false)
      } catch (error) {
        console.error('Error deleting recurring payments:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        showErrorToast(t('payments.errorDeletingPayments') as string)
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

      // Update local template payments state to reflect the status change
      setTemplatePayments(prev => prev.map(payment =>
        selectedIds.includes(payment.id)
          ? { ...payment, status: templateBulkStatus as "failed" | "pending" | "paid" | "refunded" }
          : payment
      ))
      setSelectedTemplatePayments(new Set())
    } catch (error) {
      console.error('Error updating template payment bulk status:', error)
    }
  }

  // fetchStudents, fetchInvoices, fetchRecurringStudents, fetchPaymentTemplates
  // are now provided by usePaymentsData hook


  // Refs for dropdown buttons
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLElement | null }>({})

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
        setOpenDropdownId(null)
        setOpenInvoiceDropdownId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId, openInvoiceDropdownId])


  // Unused function - commented out to fix ESLint warning
  // const handleViewPaymentPlans = useCallback(() => {
  //   setShowPaymentPlansModal(true)
  //   fetchPaymentTemplates()
  // }, [fetchPaymentTemplates])

  const handleEditTemplate = (template: PaymentTemplate) => {
    setEditingTemplate(template)
    setPlanFormData({
      name: template.name,
      amount: template.amount.toString(),
      recurrence_type: template.recurrence_type,
      day_of_month: template.day_of_month?.toString() || '',
      day_of_week: integerToDayOfWeekEn(template.day_of_week ?? null),
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
      // Soft delete: Set deleted_at timestamp instead of hard delete
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', invoiceToDelete.id)

      if (error) throw error

      // Remove from local state
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id))

      // Invalidate cache and refresh
      invalidatePaymentsCache(academyId)

      setShowDeleteInvoiceModal(false)
      setInvoiceToDelete(null)

      showSuccessToast(t('payments.paymentDeletedSuccessfully') as string)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      showErrorToast(t('payments.errorDeletingPayment') as string)
    }
  }

  // Unused function - commented out to fix ESLint warning
  // const handleDeleteRecurringClick = useCallback((student: RecurringStudent) => {
  //   setRecurringToDelete(student)
  //   setShowDeleteRecurringModal(true)
  //   setOpenDropdownId(null)
  // }, [])

  const confirmDeleteRecurring = async () => {
    if (!recurringToDelete) return

    try {
      // Also soft-delete any pending invoices for this student+template
      await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('student_id', recurringToDelete.student_id)
        .eq('template_id', recurringToDelete.template_id)
        .eq('status', 'pending')
        .is('deleted_at', null)

      const { error } = await supabase
        .from('recurring_payment_template_students')
        .delete()
        .eq('id', recurringToDelete.id)

      if (error) throw error

      // Remove from local state
      setRecurringStudents(prev => prev.filter(student => student.id !== recurringToDelete.id))

      setShowDeleteRecurringModal(false)
      setRecurringToDelete(null)

      // Refresh invoices and aggregates since we deleted pending invoices
      invalidatePaymentsCache(academyId)
      await fetchInvoices()

      showSuccessToast(t('payments.recurringPaymentDeletedSuccessfully') as string)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showErrorToast(t('payments.errorDeletingRecurringPayment') as string)
    }
  }

  const handleViewStudentPayments = async (studentId: string, templateId: string, studentName: string, templateName: string) => {
    
    try {
      // Fetch the template info
      const { data: template, error: templateError } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single()

      if (templateError) throw templateError
      
      setSelectedTemplate(template)
      setShowTemplatePaymentsModal(true)
      setTemplatePaymentsLoading(true)
      
      
      // Fetch all invoices for this specific student in this template WITH academy filtering for security
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
          academy_id,
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
        .eq('academy_id', academyId)  // SECURITY: Add academy filtering
        .eq('students.academy_id', academyId)  // SECURITY: Double-check through student relationship
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      const formattedInvoices = invoices?.map((item: Record<string, unknown>) => ({
        id: item.id as string,
        student_id: item.student_id as string,
        student_name: ((item.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string || 'Unknown',
        student_email: ((item.students as Record<string, unknown>)?.users as Record<string, unknown>)?.email as string || 'unknown@example.com',
        template_id: item.template_id as string,
        amount: item.amount as number,
        discount_amount: (item.discount_amount as number) || 0,
        final_amount: item.final_amount as number,
        discount_reason: item.discount_reason as string,
        due_date: item.due_date as string,
        status: item.status as "failed" | "pending" | "paid" | "refunded",
        paid_at: item.paid_at as string,
        payment_method: item.payment_method as string,
        transaction_id: item.transaction_id as string,
        refunded_amount: (item.refunded_amount as number) || 0,
        created_at: item.created_at as string
      })) || []

      setTemplatePayments(formattedInvoices)
    } catch (error) {
      console.error('Error fetching student payments:', error)
      toast({ title: t('payments.errorLoadingPaymentHistory') as string, description: (error as Error).message, variant: 'destructive' })
    } finally {
      setTemplatePaymentsLoading(false)
    }
  }

  // Unused function - commented out to fix ESLint warning
  // const handleViewTemplatePayments = useCallback(async (templateId: string) => {
  //   // First fetch the template info
  //   try {
  //     const { data: template, error: templateError } = await supabase
  //       .from('recurring_payment_templates')
  //       .select('*')
  //       .eq('id', templateId)
  //       .single()
  //
  //     if (templateError) throw templateError
  //     
  //     setSelectedTemplate(template)
  //     setShowTemplatePaymentsModal(true)
  //     setTemplatePaymentsLoading(true)
  //     
  //     // Fetch all students enrolled in this template
  //     const { data: templateStudents, error: studentsError } = await supabase
  //       .from('recurring_payment_template_students')
  //       .select(`
  //         student_id,
  //         amount_override,
  //         status,
  //         students!inner(
  //           user_id,
  //           academy_id,
  //           users!inner(
  //             name,
  //             email
  //           )
  //         )
  //       `)
  //       .eq('template_id', templateId)
  //
  //     if (studentsError) throw studentsError
  //
  //     // Fetch all invoices for this template
  //     const { data: invoices, error: invoicesError } = await supabase
  //       .from('invoices')
  //       .select(`
  //         id,
  //         student_id,
  //         template_id,
  //         amount,
  //         discount_amount,
  //         final_amount,
  //         discount_reason,
  //         due_date,
  //         status,
  //         paid_at,
  //         payment_method,
  //         transaction_id,
  //         refunded_amount,
  //         created_at
  //       `)
  //       .eq('template_id', templateId)
  //       .order('created_at', { ascending: false })
  //
  //     if (invoicesError) throw invoicesError
  //
  //     // Combine student enrollment data with their invoices
  //     const combinedData: Invoice[] = []
  //     
  //     templateStudents?.forEach((templateStudent: Record<string, unknown>) => {
  //       const studentInvoices = invoices?.filter(
  //         (invoice: { student_id: string }) => invoice.student_id === templateStudent.student_id
  //       ) || []
  //
  //       if (studentInvoices.length > 0) {
  //         // Add all invoices for this student
  //         studentInvoices.forEach((invoice: {
  //           id: string;
  //           student_id: string;
  //           template_id?: string;
  //           amount: number;
  //           discount_amount?: number;
  //           final_amount: number;
  //           discount_reason?: string;
  //           due_date: string;
  //           status: string;
  //           paid_at?: string;
  //           payment_method?: string;
  //           transaction_id?: string;
  //           refunded_amount?: number;
  //           created_at: string;
  //         }) => {
  //           combinedData.push({
  //             id: invoice.id,
  //             student_id: invoice.student_id,
  //             student_name: ((templateStudent.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string,
  //             student_email: ((templateStudent.students as Record<string, unknown>)?.users as Record<string, unknown>)?.email as string,
  //             template_id: invoice.template_id,
  //             amount: invoice.amount,
  //             discount_amount: invoice.discount_amount || 0,
  //             final_amount: invoice.final_amount,
  //             discount_reason: invoice.discount_reason,
  //             due_date: invoice.due_date,
  //             status: invoice.status as "failed" | "pending" | "paid" | "refunded",
  //             paid_at: invoice.paid_at,
  //             payment_method: invoice.payment_method,
  //             transaction_id: invoice.transaction_id,
  //             refunded_amount: invoice.refunded_amount || 0,
  //             created_at: invoice.created_at
  //           })
  //         })
  //       } else {
  //         // Student is enrolled but has no invoices yet
  //         combinedData.push({
  //           id: `no-invoice-${templateStudent.student_id as string}`,
  //           student_id: templateStudent.student_id as string,
  //           student_name: ((templateStudent.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string,
  //           student_email: ((templateStudent.students as Record<string, unknown>)?.users as Record<string, unknown>)?.email as string,
  //           template_id: templateId,
  //           amount: (templateStudent.amount_override as number) || template.amount,
  //           discount_amount: 0,
  //           final_amount: (templateStudent.amount_override as number) || template.amount,
  //           discount_reason: undefined,
  //           due_date: '',
  //           status: 'pending' as "failed" | "pending" | "paid" | "refunded",
  //           paid_at: undefined,
  //           payment_method: undefined,
  //           transaction_id: undefined,
  //           refunded_amount: 0,
  //           created_at: new Date().toISOString()
  //         })
  //       }
  //     })
  //
  //     // Sort by created_at (nulls last) then by student name
  //     combinedData.sort((a, b) => {
  //       if (a.created_at && b.created_at) {
  //         return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  //       }
  //       if (a.created_at && !b.created_at) return -1
  //       if (!a.created_at && b.created_at) return 1
  //       return (a.student_name || '').localeCompare(b.student_name || '')
  //     })
  //
  //     setTemplatePayments(combinedData)
  //   } catch (error) {
  //     console.error('Error fetching template payments:', error)
  //     alert(t('payments.errorLoadingPaymentHistory'))
  //   } finally {
  //     setTemplatePaymentsLoading(false)
  //   }
  // }, [t])

  const handlePauseResumeTemplate = async (templateId: string, currentlyActive: boolean) => {
    try {
      
      const { error } = await supabase
        .from('recurring_payment_templates')
        .update({ is_active: !currentlyActive })
        .eq('id', templateId)
        .is('deleted_at', null)

      if (error) {
        throw new Error(error.message || String(t('payments.failedToUpdateTemplate')))
      }

      showSuccessToast(String(currentlyActive ? t('payments.paymentPlanPausedSuccessfully') : t('payments.paymentPlanResumedSuccessfully')))
      invalidatePaymentsCache(academyId)
      await fetchPaymentTemplates()
      
    } catch (error) {
      console.error(`Error ${currentlyActive ? 'pausing' : 'resuming'} template:`, error)
      toast({ title: (currentlyActive ? t('payments.errorPausingPaymentPlan') : t('payments.errorResumingPaymentPlan')) as string, description: (error as Error).message, variant: 'destructive' })
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
        throw new Error(result.message || t('payments.failedToDeleteTemplate'))
      }

      invalidatePaymentsCache(academyId)
      await fetchPaymentTemplates()
      setShowDeletePlanModal(false)
      setTemplateToDelete(null)
      showSuccessToast(t('payments.paymentPlanDeletedSuccessfully') as string)

    } catch (error) {
      console.error('Error deleting payment template:', error)
      showErrorToast(t('payments.errorDeletingPaymentPlan') as string)
    }
  }

  const toggleOverrideExpanded = (studentId: string) => {
    setExpandedOverrides(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  const toggleSelectAllStudents = () => {
    const filteredStudentIds = students
      .filter(student => {
        const studentName = student.name || ''
        const schoolName = student.school_name || ''
        const searchLower = studentSearchQuery.toLowerCase()
        return studentName.toLowerCase().includes(searchLower) ||
               schoolName.toLowerCase().includes(searchLower)
      })
      .map(student => student.user_id)

    // Check if all filtered students are selected
    const allSelected = filteredStudentIds.every(id =>
      paymentFormData.selected_students.includes(id)
    )

    if (allSelected) {
      // Deselect all filtered students
      setPaymentFormData(prev => ({
        ...prev,
        selected_students: prev.selected_students.filter(
          id => !filteredStudentIds.includes(id)
        )
      }))
    } else {
      // Select all filtered students (merge with existing selections)
      const newSelections = [...paymentFormData.selected_students]
      filteredStudentIds.forEach(id => {
        if (!newSelections.includes(id)) {
          newSelections.push(id)
        }
      })
      setPaymentFormData(prev => ({
        ...prev,
        selected_students: newSelections
      }))
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

  // Convert day of week integer to string (for display purposes)
  const integerToDayOfWeek = (dayInt: number | null): string => {
    const dayMap: { [key: number]: string } = {
      0: '일',
      1: '월',
      2: '화',
      3: '수',
      4: '목',
      5: '금',
      6: '토'
    }
    return dayInt !== null ? dayMap[dayInt] || '' : ''
  }

  // Convert day of week integer to English string (for form fields)
  const integerToDayOfWeekEn = (dayInt: number | null): string => {
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
  const addOrdinalSuffix = useCallback((num: number): string => {
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
  }, [])
  
  // Mark function as used

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
      showErrorToast(t('errors.fillRequiredFields') as string)
      return
    }

    // Validate invoice name is provided
    if (!paymentFormData.invoice_name || paymentFormData.invoice_name.trim() === '') {
      showErrorToast(t('errors.fillRequiredFields') as string)
      return
    }

    // For one-time payments, due date is required
    if (paymentFormData.payment_type === 'one_time' && !paymentFormData.due_date) {
      showErrorToast(t('payments.selectDueDateOneTime') as string)
      return
    }

    setIsCreating(true)
    try {
      if (paymentFormData.payment_type === 'one_time') {
        // Validate one-time payment fields
        if (paymentFormData.selected_students.length === 0 || !paymentFormData.amount) {
          showErrorToast(t('payments.selectStudentAndAmount') as string)
          return
        }

        // Create invoices for all selected students
        const baseAmount = parseInt(paymentFormData.amount, 10) || 0
        const refundedAmount = paymentFormData.refunded_amount ? parseInt(paymentFormData.refunded_amount, 10) || 0 : 0

        // Validate all discounts before creating invoices
        for (const studentId of paymentFormData.selected_students) {
          const discountOverride = paymentFormData.student_discount_overrides[studentId]
          const overrideAmount = discountOverride?.enabled && discountOverride?.amount
            ? parseInt(discountOverride.amount, 10) || 0
            : baseAmount
          const finalAmount = overrideAmount

          // Validate that final amount is not negative or greater than base amount
          if (finalAmount < 0) {
            showErrorToast(t('payments.discountCannotExceedAmount') as string)
            setIsCreating(false)
            return
          }
          if (finalAmount > baseAmount) {
            showErrorToast(t('payments.overrideCannotExceedAmount') as string)
            setIsCreating(false)
            return
          }
        }

        const invoices = paymentFormData.selected_students.map(studentId => {
          // Get student-specific total amount override if enabled
          const discountOverride = paymentFormData.student_discount_overrides[studentId]
          const overrideAmount = discountOverride?.enabled && discountOverride?.amount
            ? parseInt(discountOverride.amount, 10) || 0
            : baseAmount
          const discountReason = discountOverride?.enabled && discountOverride?.reason
            ? discountOverride.reason
            : null

          const finalAmount = overrideAmount
          const discountAmount = baseAmount - overrideAmount

          return {
            student_id: studentId,
            invoice_name: paymentFormData.invoice_name,
            amount: baseAmount,
            final_amount: finalAmount,
            due_date: paymentFormData.due_date,
            status: paymentFormData.status,
            discount_amount: discountAmount,
            discount_reason: discountReason,
            paid_at: paymentFormData.paid_at || null,
            payment_method: paymentFormData.payment_method || null,
            refunded_amount: refundedAmount,
            academy_id: academyId
          }
        })

        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert(invoices)

        if (invoiceError) throw invoiceError

        showSuccessToast(t('payments.oneTimePaymentCreatedSuccessfully', { count: paymentFormData.selected_students.length }) as string)

        // Invalidate cache and refresh the invoices data
        invalidatePaymentsCache(academyId)
        await fetchInvoices()
      } else if (paymentFormData.payment_type === 'recurring') {
        // Validate recurring payment fields
        if (!paymentFormData.recurring_template_id || paymentFormData.selected_students.length === 0) {
          showErrorToast(t('payments.selectPlanAndStudent') as string)
          return
        }

        // Get selected template details
        const selectedTemplate = paymentTemplates.find(t => t.id === paymentFormData.recurring_template_id)
        if (!selectedTemplate) {
          showErrorToast(t('payments.planNotFound') as string)
          return
        }

        // Look up student record IDs for the selected students
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, user_id')
          .in('user_id', paymentFormData.selected_students)
          .eq('academy_id', academyId)
        const studentRecordMap = new Map(studentRecords?.map(s => [s.user_id, s.id]) || [])

        // Create recurring_payment_template_students entries
        const templateStudentEntries = paymentFormData.selected_students.map(studentId => {
          const studentOverride = paymentFormData.student_amount_overrides[studentId]
          return {
            template_id: paymentFormData.recurring_template_id,
            student_id: studentId,
            student_record_id: studentRecordMap.get(studentId) || null,
            amount_override: studentOverride?.enabled && studentOverride?.amount
              ? parseFloat(studentOverride.amount)
              : null,
            status: 'active'
          }
        })

        const { error: templateStudentError } = await supabase
          .from('recurring_payment_template_students')
          .upsert(templateStudentEntries, { onConflict: 'template_id,student_id' })

        if (templateStudentError) throw templateStudentError

        // Create initial invoices for each selected student with individual amounts
        // First check for existing pending invoices to avoid duplicates
        const templateDueDate = calculateNextDueDate(selectedTemplate)
        const { data: existingInvoices } = await supabase
          .from('invoices')
          .select('student_id')
          .eq('template_id', paymentFormData.recurring_template_id)
          .eq('due_date', templateDueDate)
          .eq('academy_id', academyId)
          .is('deleted_at', null)
          .in('student_id', paymentFormData.selected_students)

        const existingStudentIds = new Set(existingInvoices?.map(i => i.student_id) || [])
        const newStudents = paymentFormData.selected_students.filter(id => !existingStudentIds.has(id))

        if (newStudents.length > 0) {
          const initialInvoices = newStudents.map(studentId => {
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
              invoice_name: paymentFormData.invoice_name,
              amount: baseAmount,
              final_amount: finalAmount,
              due_date: templateDueDate,
              status: paymentFormData.status,
              discount_amount: discountAmount,
              discount_reason: paymentFormData.discount_reason || null,
              paid_at: paymentFormData.paid_at || null,
              payment_method: paymentFormData.payment_method || null,
              refunded_amount: refundedAmount,
              academy_id: academyId
            }
          })

          const { error: invoiceError } = await supabase
            .from('invoices')
            .insert(initialInvoices)

          if (invoiceError) throw invoiceError
        }

        showSuccessToast(t('payments.recurringPaymentCreatedSuccessfully', { count: paymentFormData.selected_students.length }) as string)

        // Invalidate cache and refresh the data
        invalidatePaymentsCache(academyId)
        await fetchInvoices()
        await fetchRecurringStudents()
      }

      // Reset form and close modal
      setShowAddPaymentModal(false)
      setPaymentFormData({
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
      })
      
      // Refresh invoices list
      fetchInvoices()
    } catch (error) {
      console.error('Error creating payment:', error)
      showErrorToast(t('payments.errorCreatingPayment') as string)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditPayment = async () => {
    if (!editingInvoice) return

    setIsSaving(true)
    try {
      // Parse amounts (remove commas)
      const amount = parseInt(editAmount.replace(/,/g, '')) || 0
      const discountAmount = parseInt(editDiscountAmount.replace(/,/g, '')) || 0
      const refundedAmount = parseInt(editRefundedAmount.replace(/,/g, '')) || 0
      const finalAmount = amount - discountAmount

      // Prepare update data
      const updateData = {
        invoice_name: editInvoiceName,
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

      showSuccessToast(t('payments.paymentUpdatedSuccessfully') as string)

      // Invalidate cache before closing modal
      invalidatePaymentsCache(academyId)

      // Close modal and reset form
      setShowEditPaymentModal(false)
      setEditingInvoice(null)
      setEditInvoiceName('')
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
      showErrorToast(t('payments.errorUpdatingPayment') as string)
    } finally {
      setIsSaving(false)
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

      showSuccessToast(t('payments.recurringPaymentUpdatedSuccessfully') as string)

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
      toast({ title: t('payments.errorUpdatingRecurringPayment') as string, description: (error as Error).message, variant: 'destructive' })
    }
  }

  const handleAddPaymentPlan = async () => {
    if (!academyId || !planFormData.name || !planFormData.amount || !planFormData.start_date) {
      showErrorToast(t('errors.fillRequiredFields') as string)
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      showErrorToast(t('payments.selectDayOfMonth') as string)
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      showErrorToast(t('payments.selectDayOfWeek') as string)
      return
    }

    setIsCreating(true)
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
      invalidatePaymentsCache(academyId)
      fetchPaymentTemplates()
      showSuccessToast(t('payments.paymentPlanCreatedSuccessfully') as string)
    } catch (error) {
      console.error('Error creating payment plan:', error)
      showErrorToast(t('payments.errorCreatingPaymentPlan') as string)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdatePaymentPlan = async () => {
    if (!editingTemplate || !planFormData.name || !planFormData.amount || !planFormData.start_date) {
      showErrorToast(t('errors.fillRequiredFields') as string)
      return
    }

    // Additional validation for recurrence-specific fields
    if (planFormData.recurrence_type === 'monthly' && !planFormData.day_of_month) {
      showErrorToast(t('payments.selectDayOfMonth') as string)
      return
    }

    if (planFormData.recurrence_type === 'weekly' && !planFormData.day_of_week) {
      showErrorToast(t('payments.selectDayOfWeek') as string)
      return
    }

    setIsSaving(true)
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
        .is('deleted_at', null)

      if (error) {
        throw error
      }

      setShowEditPlanModal(false)
      resetPlanForm()
      invalidatePaymentsCache(academyId)
      fetchPaymentTemplates()
      showSuccessToast(t('payments.paymentPlanUpdatedSuccessfully') as string)
    } catch (error) {
      console.error('Error updating payment plan:', error)
      showErrorToast(t('payments.errorUpdatingPaymentPlan') as string)
    } finally {
      setIsSaving(false)
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

    // Parse date string as local date to avoid timezone issues
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date()
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    const currentDate = value ? parseLocalDate(value) : new Date()
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

      const date = parseLocalDate(dateString)
      const locale = language === 'korean' ? 'ko-KR' : 'en-US'

      return date.toLocaleDateString(locale, {
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
      // Format as YYYY-MM-DD in local timezone instead of UTC
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dayStr = String(selectedDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${dayStr}`
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

    const monthNames = language === 'korean' ? [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ] : [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const dayNames = language === 'korean' ? 
      ['일', '월', '화', '수', '목', '금', '토'] : 
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const daysInMonth = getDaysInMonth(viewMonth, viewYear)
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
    const selectedDate = value ? parseLocalDate(value) : null

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
          <div className="absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 max-w-[90vw] left-0" style={{ zIndex: 9999 }}>
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
                {t('dashboard.today')}
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
        return 'bg-emerald-50 text-emerald-700'
      case 'pending':
        return 'bg-amber-50 text-amber-700'
      case 'failed':
        return 'bg-rose-50 text-rose-700'
      case 'refunded':
        return 'bg-sky-50 text-sky-700'
      case 'not_generated':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-600" />
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
      
      // Translations are now always available
      
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
  }, [language, ])

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
  const filteredInvoices = useMemo(() => invoices
    .filter(invoice => {
      // First filter by search query
      let matchesSearch = true
      if (searchQuery) {
        matchesSearch = !!(
          invoice.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.invoice_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      // Filter by status (use appropriate filter based on tab)
      let matchesStatus = true
      if (activeTab === 'recurring') {
        if (recurringStatusFilter !== 'all') {
          matchesStatus = invoice.status === recurringStatusFilter
        }
      } else {
        if (oneTimeStatusFilter !== 'all') {
          matchesStatus = invoice.status === oneTimeStatusFilter
        }
      }

      // Note: Tab filtering is now done at database level for correct pagination
      // No need to filter by template_id here since the query already handles it

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Use appropriate sort field and direction based on active tab
      const sortField = activeTab === 'recurring' ? recurringSortField : oneTimeSortField
      const sortDirection = activeTab === 'recurring' ? recurringSortDirection : oneTimeSortDirection
      
      if (!sortField) return 0
      
      let aValue = ''
      let bValue = ''
      
      switch (sortField) {
        case 'student':
          aValue = a.student_name || ''
          bValue = b.student_name || ''
          break
        case 'amount':
          return sortDirection === 'asc' 
            ? (a.final_amount || a.amount || 0) - (b.final_amount || b.amount || 0)
            : (b.final_amount || b.amount || 0) - (a.final_amount || a.amount || 0)
        case 'status':
          aValue = a.status || ''
          bValue = b.status || ''
          break
        case 'due_date':
          aValue = a.due_date || ''
          bValue = b.due_date || ''
          break
        case 'paid_at':
          aValue = a.paid_at || ''
          bValue = b.paid_at || ''
          break
        default:
          return 0
      }
      
      const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      return sortDirection === 'asc' ? result : -result
    }), [invoices, searchQuery, activeTab, recurringStatusFilter, oneTimeStatusFilter, oneTimeSortField, oneTimeSortDirection, recurringSortField, recurringSortDirection])

  // Filter and sort recurring students
  const filteredRecurringStudents = useMemo(() => recurringStudents
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
    }), [recurringStudents, searchQuery, recurringStatusFilter, recurringSortField, recurringSortDirection])

  // Memoized filtered students for recurring payment modal
  const filteredRecurringModalStudents = useMemo(() => students
    .filter(student => {
      const studentName = student.name || ''
      const schoolName = student.school_name || ''
      const searchLower = studentSearchQuery.toLowerCase()
      const matchesSearch = studentName.toLowerCase().includes(searchLower) ||
                           schoolName.toLowerCase().includes(searchLower)

      if (paymentFormData.payment_type === 'recurring' && paymentFormData.recurring_template_id) {
        const hasExistingEnrollment = recurringStudents.some(
          enrollment => enrollment.template_id === paymentFormData.recurring_template_id &&
                       enrollment.student_id === student.user_id
        )
        return matchesSearch && !hasExistingEnrollment
      }

      return matchesSearch
    }), [students, studentSearchQuery, paymentFormData.payment_type, paymentFormData.recurring_template_id, recurringStudents])

  // Memoized filtered students for one-time payment modal
  const filteredOneTimeModalStudents = useMemo(() => students
    .filter(student => {
      const studentName = student.name || ''
      const schoolName = student.school_name || ''
      const searchLower = studentSearchQuery.toLowerCase()
      return studentName.toLowerCase().includes(searchLower) ||
             schoolName.toLowerCase().includes(searchLower)
    }), [students, studentSearchQuery])

  // Calculate display count based on active tab
  // Since we now filter at database level, always use totalCount from server
  // Only use filteredInvoices.length if there's an active search/status filter that requires client-side filtering
  const hasClientSideFilters = searchQuery || oneTimeStatusFilter !== 'all' || recurringStatusFilter !== 'all'
  const displayCount = hasClientSideFilters
    ? filteredInvoices.length
    : totalCount

  // Matches the rendered stat card layout (icon chip + tiny eyebrow label + big number)
  const StatCardSkeleton = ({ delay = 0 }: { delay?: number }) => (
    <Card className="p-5 animate-pulse" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gray-100" />
        <div className="h-3 w-28 bg-gray-200 rounded" />
      </div>
      <div className="h-8 sm:h-9 w-32 bg-gray-200 rounded" />
    </Card>
  )

  const TabsSkeleton = () => (
    <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`px-4 py-2 ${i > 0 ? 'ml-1' : ''}`}>
          <div className="h-5 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
  )

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
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50/60">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="text-left p-3 sm:p-4">
                    <div className={`h-3 bg-gray-200 rounded ${col.width}`}></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...Array(10)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, j) => (
                    <td key={j} className="p-3 sm:p-4">
                      <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7 + j * 3) % 30)}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  // Check if academyId is available after all hooks are called
  if (!academyId) {
    console.error('PaymentsPage: No academyId provided')
    return <div>{String(t('common.loading'))}</div>
  }

  if (loading ) {
    return (
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.payments")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("payments.title")}</h1>
            <p className="text-gray-500">{t("payments.description")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton delay={0} />
          <StatCardSkeleton delay={100} />
          <StatCardSkeleton delay={200} />
          <StatCardSkeleton delay={300} />
        </div>
        
        {/* Tabs Skeleton */}
        <TabsSkeleton />
        
        {/* Search Bar Skeleton */}
        <div className="flex flex-wrap gap-4 mb-4 animate-pulse">
          <div className="relative flex-1 min-w-[180px] sm:min-w-[250px] sm:max-w-md">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.payments')}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-500">{t('payments.description')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => {
              setShowAddPaymentModal(true)
              fetchPaymentTemplates()
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            data-new-payment
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
{t('payments.addPayment')}
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Revenue */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('payments.totalRevenue')}</p>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(allTimeRevenue)}
          </p>
        </Card>

        {/* Pending Payments */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('payments.pendingAmount')}</p>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(allTimePending)}
          </p>
        </Card>

        {/* Active Templates */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('payments.activeTemplates')}</p>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
            {paymentTemplates.filter(t => t.is_active).length}
          </p>
        </Card>

        {/* Monthly Recurring Revenue */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">{t('payments.monthlyRecurringRevenue')}</p>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(
              paymentTemplates
                .filter(t => t.is_active && t.recurrence_type === 'monthly')
                .reduce((sum, t) => sum + (t.amount * (t.student_count || 0)), 0)
            )}
          </p>
        </Card>
      </div>

      {/* Tabs — pill-style segmented control matching the archive page. */}
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
        <button
          onClick={() => setActiveTab('one_time')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'one_time'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('payments.oneTime')}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ml-1 ${
            activeTab === 'recurring'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t('payments.recurring')}
        </button>
        <button
          onClick={() => {
            setActiveTab('plans')
            fetchPaymentTemplates()
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ml-1 ${
            activeTab === 'plans'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
          <Card className="p-4 bg-sky-50 border-sky-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-sky-900">{t('payments.automatedRecurringPayments')}</h3>
                <p className="text-xs text-blue-700 mt-1">
                  {t('payments.systemAutoGeneratesInvoices')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {t('payments.nextRun')}: {t('payments.daily900AM')}
                </div>
              </div>
            </div>
          </Card>

          {/* Search Bar for Plans */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
              <Input
                type="text"
                placeholder={String(t('payments.searchPaymentPlans'))}
                value={planSearchQuery}
                onChange={(e) => setPlanSearchQuery(e.target.value)}
                className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
              />
            </div>
            <Button onClick={() => setShowAddPlanModal(true)} className="flex items-center gap-2 ml-4">
              <Plus className="w-4 h-4" />
{t('payments.addPaymentPlan')}
            </Button>
          </div>

          {/* Payment Plans Grid — uses shared DashboardCard for visual consistency
              with sessions / assignments / classrooms / attendance card views. */}
          {templatesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="!gap-0 !py-0 overflow-hidden flex flex-col h-full">
                  <div className="h-1 w-full bg-gray-200" />
                  <div className="p-4 sm:p-5 flex flex-col flex-1 animate-pulse">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                        <div className="h-5 w-3/4 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded" />
                      </div>
                      <div className="flex gap-1">
                        <div className="h-7 w-7 bg-gray-200 rounded" />
                        <div className="h-7 w-7 bg-gray-200 rounded" />
                        <div className="h-7 w-7 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 my-3 py-3 border-y border-gray-100">
                      <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                      <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                      <div className="space-y-1.5"><div className="h-2 w-12 bg-gray-200 rounded" /><div className="h-4 w-10 bg-gray-200 rounded" /></div>
                    </div>
                    <div className="h-3 w-2/3 bg-gray-200 rounded mb-3" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paymentTemplates
                .filter(template =>
                  !planSearchQuery ||
                  template.name.toLowerCase().includes(planSearchQuery.toLowerCase()) ||
                  template.recurrence_type.toLowerCase().includes(planSearchQuery.toLowerCase())
                )
                .map((template) => {
                  const scheduleLabel =
                    template.recurrence_type === 'monthly' && template.day_of_month
                      ? (language === 'korean' ? `매월 ${template.day_of_month}일` : `Monthly · day ${template.day_of_month}`)
                      : template.recurrence_type === 'weekly' && template.day_of_week !== null
                        ? (language === 'korean'
                            ? `매주 ${integerToDayOfWeek(template.day_of_week ?? null)}요일`
                            : `Weekly · ${integerToDayOfWeek(template.day_of_week ?? null)}`)
                        : template.recurrence_type
                  return (
                    <DashboardCard
                      key={template.id}
                      paused={!template.is_active}
                      accentColor={template.is_active ? '#10b981' : '#9ca3af'}
                      statusLabel={template.is_active ? t('common.active') : t('payments.paused')}
                      statusToneClass={template.is_active ? 'text-emerald-600' : 'text-gray-500'}
                      title={template.name}
                      subtitle={
                        <>
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                          <span>{scheduleLabel}</span>
                        </>
                      }
                      actions={
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                            onClick={() => handleEditTemplate(template)}
                            title={String(t('payments.editTemplate'))}
                          >
                            <Edit className="w-4 h-4" strokeWidth={1.75} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                            onClick={() => {
                              setTemplateToPauseResume(template)
                              setShowPauseResumeModal(true)
                            }}
                            title={String(template.is_active ? t('payments.pausePaymentPlan') : t('payments.resumePaymentPlan'))}
                          >
                            {template.is_active ? (
                              <XCircle className="w-4 h-4 text-amber-600" strokeWidth={1.75} />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteTemplate(template)}
                            title={String(t('payments.deleteTemplate'))}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                          </Button>
                        </>
                      }
                      metrics={[
                        {
                          label: t('payments.amount') as string,
                          value: `₩${template.amount.toLocaleString()}`,
                        },
                        {
                          label: t('payments.students') as string,
                          value: String(template.student_count || 0),
                        },
                        {
                          label: t('payments.nextDue') as string,
                          value: formatDate(calculateNextDueDate(template)),
                        },
                      ]}
                      meta={
                        <div className="flex items-start gap-1.5">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                          <span>{t('payments.started')}: {formatDate(template.start_date)}</span>
                        </div>
                      }
                    />
                  )
                })}
            </div>
          )}

          {paymentTemplates.length === 0 && !templatesLoading && (
            <EmptyState
              icon={Calendar}
              title={String(t('payments.noPaymentPlans'))}
              description={String(t('payments.getStartedFirstPaymentPlan'))}
              actionLabel={String(t('payments.addPaymentPlan'))}
              onAction={() => setShowAddPlanModal(true)}
            />
          )}
        </div>
      ) : (
        /* Payments Table for All, One-time, and Recurring tabs */
        <div>
          {/* Search Bar */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={String(t('payments.searchByStatusEmailAmount'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 pr-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
            />
              <SearchKbdHint />
          </div>

          {/* Bulk Actions Bar — uses shared BulkActionBar primitive for visual consistency
              with sessions / assignments / classrooms / attendance pages. */}
          {((activeTab === 'one_time' && selectedOneTimeInvoices.size > 0) ||
            (activeTab === 'recurring' && selectedRecurringStudents.size > 0)) && (
            <div className="mb-4">
              <BulkActionBar
                selectedCount={activeTab === 'one_time' ? selectedOneTimeInvoices.size : selectedRecurringStudents.size}
                onClear={() => {
                  if (activeTab === 'one_time') {
                    setSelectedOneTimeInvoices(new Set())
                  } else {
                    setSelectedRecurringStudents(new Set())
                  }
                }}
              >
                <Select
                  value=""
                  onValueChange={(value) => {
                    setBulkStatus(value)
                    handleBulkStatusUpdate(value)
                  }}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[140px] rounded-md border border-border bg-white text-sm shadow-sm focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder={String(t('payments.bulkSetStatus'))} />
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
                >
                  {t('common.delete')}
                </Button>
              </BulkActionBar>
            </div>
          )}

          {/* Payments Table — chrome matches DataTable used by sessions / assignments / classrooms / attendance */}
          <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto min-h-[640px] flex flex-col">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50/60">
                  <tr>
                    <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 whitespace-nowrap w-10">
                      {(() => {
                        const total = activeTab === 'recurring' ? filteredRecurringStudents.length : filteredInvoices.length
                        const selectedCount = activeTab === 'recurring' ? selectedRecurringStudents.size : selectedOneTimeInvoices.size
                        const allSelected = total > 0 && selectedCount === total
                        const someSelected = selectedCount > 0 && selectedCount < total
                        return (
                          <TableCheckbox
                            checked={allSelected}
                            indeterminate={someSelected}
                            ariaLabel={String(t('common.selectAll') || 'Select all')}
                            onChange={() => {
                              if (activeTab === 'recurring') {
                                handleSelectAllRecurring(!allSelected, filteredRecurringStudents)
                              } else {
                                handleSelectAllOneTime(!allSelected, filteredInvoices)
                              }
                            }}
                          />
                        )
                      })()}
                    </th>
                    {activeTab === 'recurring' ? (
                      <>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[150px]">
                          <div className="flex items-center gap-2">
                            {t('common.roles.student')}
                            <button onClick={() => handleSort('student')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('student')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center gap-2">
                            {t('payments.template')}
                            <button onClick={() => handleSort('template')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('template')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center gap-2">
                            {t('payments.amount')}
                            <button onClick={() => handleSort('amount')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('amount')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          <div className="flex items-center gap-2 relative">
                            {t('common.status')}
                            <div className="relative z-20" ref={recurringStatusFilterRef}>
                              <button
                                onClick={() => (activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? setShowRecurringStatusFilter(!showRecurringStatusFilter) : setShowOneTimeStatusFilter(!showOneTimeStatusFilter)}
                                className={`flex items-center ${
                                  ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) !== 'all'
                                    ? 'text-primary'
                                    : 'text-gray-400 hover:text-primary'
                                }`}
                              >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                              </button>

                              {activeTab === 'recurring' && showRecurringStatusFilter && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50 normal-case tracking-normal font-normal">
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
                                      setRecurringStatusFilter('pending')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'pending' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.pending')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecurringStatusFilter('paid')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'paid' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.paid')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRecurringStatusFilter('overdue')
                                      setShowRecurringStatusFilter(false)
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${recurringStatusFilter === 'overdue' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.overdue')}
                                  </button>
                                </div>
                              )}
                              {(activeTab as 'one_time' | 'recurring' | 'plans') === 'one_time' && showOneTimeStatusFilter && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50 normal-case tracking-normal font-normal">
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
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"></th>
                      </>
                    ) : (
                      <>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[150px]">
                          <div className="flex items-center gap-2">
                            {t('common.roles.student')}
                            <button onClick={() => handleSort('student')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('student')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center gap-2">
                            {t('payments.invoiceName')}
                            <button onClick={() => handleSort('invoice_name')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('invoice_name')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center gap-2">
                            {t('payments.amount')}
                            <button onClick={() => handleSort('amount')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('amount')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center gap-2">
                            {t('payments.dueDate')}
                            <button onClick={() => handleSort('due_date')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('due_date')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center gap-2">
                            {t('payments.paidDate')}
                            <button onClick={() => handleSort('paid_at')} className="text-gray-400 hover:text-primary">
                              {renderSortIcon('paid_at')}
                            </button>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
                          <div className="flex items-center gap-2 relative">
                            {t('common.status')}
                            <div className="relative z-20" ref={oneTimeStatusFilterRef}>
                              <button
                                onClick={() => (activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? setShowRecurringStatusFilter(!showRecurringStatusFilter) : setShowOneTimeStatusFilter(!showOneTimeStatusFilter)}
                                className={`flex items-center ${
                                  ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) !== 'all'
                                    ? 'text-primary'
                                    : 'text-gray-400 hover:text-primary'
                                }`}
                              >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                              </button>

                              {(((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' && showRecurringStatusFilter) || ((activeTab as 'one_time' | 'recurring' | 'plans') === 'one_time' && showOneTimeStatusFilter)) && (
                                <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-[9999] normal-case tracking-normal font-normal">
                                  <button
                                    onClick={() => {
                                      if ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring') {
                                        setRecurringStatusFilter('all');
                                        setShowRecurringStatusFilter(false);
                                      } else {
                                        setOneTimeStatusFilter('all');
                                        setShowOneTimeStatusFilter(false);
                                      }
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('common.all')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring') {
                                        setRecurringStatusFilter('pending');
                                        setShowRecurringStatusFilter(false);
                                      } else {
                                        setOneTimeStatusFilter('pending');
                                        setShowOneTimeStatusFilter(false);
                                      }
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'pending' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.pending')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring') {
                                        setRecurringStatusFilter('paid');
                                        setShowRecurringStatusFilter(false);
                                      } else {
                                        setOneTimeStatusFilter('paid');
                                        setShowOneTimeStatusFilter(false);
                                      }
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'paid' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.paid')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring') {
                                        setRecurringStatusFilter('overdue');
                                        setShowRecurringStatusFilter(false);
                                      } else {
                                        setOneTimeStatusFilter('overdue');
                                        setShowOneTimeStatusFilter(false);
                                      }
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'overdue' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.overdue')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if ((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring') {
                                        setRecurringStatusFilter('cancelled');
                                        setShowRecurringStatusFilter(false);
                                      } else {
                                        setOneTimeStatusFilter('cancelled');
                                        setShowOneTimeStatusFilter(false);
                                      }
                                    }}
                                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${((activeTab as 'one_time' | 'recurring' | 'plans') === 'recurring' ? recurringStatusFilter : oneTimeStatusFilter) === 'cancelled' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                                  >
                                    {t('payments.cancelled')}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTab === 'recurring' ? (
                    /* Recurring Students Rows */
                    recurringStudentsLoading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={`recurring-skeleton-${i}`} className="animate-pulse">
                          {[...Array(5)].map((_, j) => (
                            <td key={j} className="p-3 sm:p-4">
                              <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7 + j * 3) % 30)}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredRecurringStudents.length > 0 ? (
                      filteredRecurringStudents.map((recurringStudent) => {
                        return (
                      <tr key={recurringStudent.id} className={cn(
                        'transition-colors',
                        selectedRecurringStudents.has(recurringStudent.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
                      )}>
                        <td className="p-3 sm:p-4">
                          <TableCheckbox
                            checked={selectedRecurringStudents.has(recurringStudent.id)}
                            ariaLabel={String(t('common.selectRow') || 'Select row')}
                            onChange={() => handleSelectRecurringStudent(recurringStudent.id, !selectedRecurringStudents.has(recurringStudent.id))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3 sm:p-4">
                          <div>
                            <div className="text-sm sm:text-base font-medium text-gray-900">{recurringStudent.student_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{recurringStudent.student_email}</div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div>
                            <div className="text-sm sm:text-base font-medium text-gray-900">{recurringStudent.template_name}</div>
                            <div className="text-xs sm:text-sm text-gray-500">{t(`payments.${recurringStudent.recurrence_type}`)}</div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div>
                            {recurringStudent.amount_override ? (
                              <div>
                                <div className="text-sm sm:text-base font-medium text-gray-900">
                                  {formatCurrency(recurringStudent.amount_override)}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-500 line-through">
                                  {formatCurrency(recurringStudent.template_amount)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm sm:text-base font-medium text-gray-900">
                                {formatCurrency(recurringStudent.template_amount)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <div className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                              recurringStudent.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                              recurringStudent.status === 'paused' ? 'bg-amber-50 text-amber-700' :
                              'bg-gray-50 text-gray-700'
                            }`}>
                              {t(`payments.${recurringStudent.status}`)}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="relative" ref={(el) => { dropdownButtonRefs.current[recurringStudent.id] = el }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setOpenInvoiceDropdownId(openInvoiceDropdownId === recurringStudent.id ? null : recurringStudent.id)}
                              className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            >
                              <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            </Button>
                            {openInvoiceDropdownId === recurringStudent.id && (
                              <div className="dropdown-menu absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[150px] z-50">
                                <button
                                  onClick={() => {
                                    handleViewStudentPayments(
                                      recurringStudent.student_id,
                                      recurringStudent.template_id,
                                      recurringStudent.student_name,
                                      recurringStudent.template_name
                                    )
                                    setOpenInvoiceDropdownId(null)
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    {t('common.view')}
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRecurringStudent(recurringStudent)
                                    setHasAmountOverride(!!recurringStudent.amount_override)
                                    setRecurringOverrideAmount(recurringStudent.amount_override?.toString() || '')
                                    setRecurringStatus(recurringStudent.status)
                                    setShowEditRecurringModal(true)
                                    setOpenInvoiceDropdownId(null)
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <Edit className="w-4 h-4" />
                                    {t('common.edit')}
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setRecurringToDelete(recurringStudent)
                                    setShowDeleteRecurringModal(true)
                                    setOpenInvoiceDropdownId(null)
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-gray-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <Trash2 className="w-4 h-4 text-rose-600" />
                                    {t('common.delete')}
                                  </div>
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
                        <td colSpan={7}>
                          <EmptyState
                            icon={Users}
                            title={String(t('payments.noRecurringStudents'))}
                            description={searchQuery ? String(t('common.tryAdjustingSearch')) : String(t('payments.noStudentsEnrolledRecurring'))}
                          />
                        </td>
                      </tr>
                    )
                  ) : invoicesLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={`onetime-skeleton-${i}`} className="animate-pulse">
                        {[...Array(7)].map((_, j) => (
                          <td key={j} className="p-3 sm:p-4">
                            <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7 + j * 3) % 30)}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    /* Invoice Rows for One-time tab */
                    filteredInvoices.length > 0 ? filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className={cn(
                        'transition-colors',
                        selectedOneTimeInvoices.has(invoice.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
                      )}>
                        <td className="p-4">
                          <TableCheckbox
                            checked={selectedOneTimeInvoices.has(invoice.id)}
                            ariaLabel={String(t('common.selectRow') || 'Select row')}
                            onChange={() => handleSelectOneTimeInvoice(invoice.id, !selectedOneTimeInvoices.has(invoice.id))}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-900">{invoice.student_name}</div>
                            <div className="text-sm text-gray-500">{invoice.student_email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-700">
                            {invoice.invoice_name || '-'}
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
                              {t(`payments.${invoice.status}`)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 text-gray-500 hover:text-gray-700"
                              ref={(el) => { dropdownButtonRefs.current[`invoice-${invoice.id}`] = el }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenInvoiceDropdownId(openInvoiceDropdownId === invoice.id ? null : invoice.id)
                              }}
                            >
                              <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            </Button>
                            
                            {openInvoiceDropdownId === invoice.id && (
                              <div 
                                className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-xl ring-1 ring-gray-100 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.10)] py-1 min-w-[160px]"
                                style={{ zIndex: 9999 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setViewingInvoice(invoice)
                                    setShowViewPaymentModal(true)
                                    setOpenInvoiceDropdownId(null)
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                  {t('common.view')}
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setEditingInvoice(invoice)
                                    setEditInvoiceName(invoice.invoice_name || '')
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
                                  onMouseDown={() => {
                                  }}
                                  onMouseUp={() => {
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                  {t('common.edit')}
                                </button>
                                <button
                                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-rose-600"
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
                        <td colSpan={7}>
                          <EmptyState
                            icon={DollarSign}
                            title={String(t('payments.noPayments'))}
                            description={searchQuery ? String(t('common.tryAdjustingSearch')) : String(t('payments.noPaymentRecordsCreated'))}
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {displayCount > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    {t("payments.pagination.previous")}
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayCount / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(displayCount / itemsPerPage)}
                    variant="outline"
                  >
                    {t("payments.pagination.next")}
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {t("payments.pagination.showing")}
                      <span className="font-medium"> {Math.min(((currentPage - 1) * itemsPerPage) + 1, displayCount)} </span>
                      {t("payments.pagination.to")}
                      <span className="font-medium"> {Math.min(currentPage * itemsPerPage, displayCount)} </span>
                      {t("payments.pagination.of")}
                      <span className="font-medium"> {displayCount} </span>
                      {t("payments.pagination.payments")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                    >
                      {t("payments.pagination.previous")}
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(displayCount / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(displayCount / itemsPerPage)}
                      variant="outline"
                    >
                      {t("payments.pagination.next")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
          </div>
        </div>
      )}

      {/* View Payment Plans Modal */}
      <ViewPlansModal
        isOpen={showPaymentPlansModal}
        onClose={() => setShowPaymentPlansModal(false)}
        paymentTemplates={paymentTemplates}
        templatesLoading={templatesLoading}
        planSearchQuery={planSearchQuery}
        setPlanSearchQuery={setPlanSearchQuery}
        onAddPlan={() => setShowAddPlanModal(true)}
        onEditTemplate={handleEditTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        calculateNextDueDate={calculateNextDueDate}
        integerToDayOfWeek={integerToDayOfWeek}
      />

      {/* Add Payment Plan Modal */}
      <AddPlanModal
        isOpen={showAddPlanModal}
        onClose={() => { setShowAddPlanModal(false); resetPlanForm(); }}
        planFormData={planFormData}
        setPlanFormData={setPlanFormData}
        formatAmountWithCommas={formatAmountWithCommas}
        handleAmountChange={handleAmountChange}
        onSubmit={handleAddPaymentPlan}
        isCreating={isCreating}
        isSaving={isSaving}
        DatePickerComponent={DatePickerComponent}
      />

      {/* Edit Payment Plan Modal */}
      <EditPlanModal
        isOpen={showEditPlanModal}
        onClose={() => { setShowEditPlanModal(false); resetPlanForm(); }}
        editingTemplate={editingTemplate}
        planFormData={planFormData}
        setPlanFormData={setPlanFormData}
        formatAmountWithCommas={formatAmountWithCommas}
        handleAmountChange={handleAmountChange}
        onSubmit={handleUpdatePaymentPlan}
        isCreating={isCreating}
        isSaving={isSaving}
        DatePickerComponent={DatePickerComponent}
      />

      {/* Delete Plan Modal */}
      <DeletePlanModal
        isOpen={showDeletePlanModal && !!templateToDelete}
        onClose={() => setShowDeletePlanModal(false)}
        templateToDelete={templateToDelete}
        onConfirm={confirmDeleteTemplate}
      />

      {/* Pause/Resume Plan Modal */}
      <PausePlanModal
        isOpen={showPauseResumeModal && !!templateToPauseResume}
        onClose={() => setShowPauseResumeModal(false)}
        templateToPauseResume={templateToPauseResume}
        onConfirm={() => {
          if (templateToPauseResume) {
            handlePauseResumeTemplate(templateToPauseResume.id, templateToPauseResume.is_active)
          }
          setShowPauseResumeModal(false)
        }}
      />

      {/* Delete Invoice Modal */}
      <DeleteInvoiceModal
        isOpen={showDeleteInvoiceModal && !!invoiceToDelete}
        onClose={() => setShowDeleteInvoiceModal(false)}
        invoiceToDelete={invoiceToDelete}
        onConfirm={confirmDeleteInvoice}
      />

      {/* Delete Recurring Modal */}
      <DeleteRecurringModal
        isOpen={showDeleteRecurringModal && !!recurringToDelete}
        onClose={() => setShowDeleteRecurringModal(false)}
        recurringToDelete={recurringToDelete}
        onConfirm={confirmDeleteRecurring}
      />

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        activeTab={activeTab}
        selectedOneTimeCount={selectedOneTimeInvoices.size}
        selectedRecurringCount={selectedRecurringStudents.size}
        onConfirm={confirmBulkDelete}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={() => {
          setShowAddPaymentModal(false)
          setPaymentFormData(emptyPaymentFormData)
        }}
        paymentFormData={paymentFormData}
        setPaymentFormData={setPaymentFormData}
        students={students}
        studentsLoading={studentsLoading}
        paymentTemplates={paymentTemplates}
        recurringStudents={recurringStudents}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        expandedOverrides={expandedOverrides}
        toggleOverrideExpanded={toggleOverrideExpanded}
        toggleSelectAllStudents={toggleSelectAllStudents}
        hoveredStudent={hoveredStudent}
        setHoveredStudent={setHoveredStudent}
        tooltipPosition={tooltipPosition}
        setTooltipPosition={setTooltipPosition}
        formatAmountWithCommas={formatAmountWithCommas}
        formatDate={formatDate}
        handleAddPayment={handleAddPayment}
        isCreating={isCreating}
        isSaving={isSaving}
        filteredRecurringModalStudents={filteredRecurringModalStudents}
        filteredOneTimeModalStudents={filteredOneTimeModalStudents}
      />

      {/* Edit Payment Modal */}
      <EditPaymentModal
        isOpen={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false)
          setEditingInvoice(null)
          setEditInvoiceName('')
          setEditAmount('')
          setEditDiscountAmount('')
          setEditDiscountReason('')
          setEditDueDate('')
          setEditStatus('pending')
          setEditPaidAt('')
          setEditPaymentMethod('')
          setEditRefundedAmount('')
        }}
        editingInvoice={editingInvoice}
        editInvoiceName={editInvoiceName}
        setEditInvoiceName={setEditInvoiceName}
        editAmount={editAmount}
        setEditAmount={setEditAmount}
        editDiscountAmount={editDiscountAmount}
        setEditDiscountAmount={setEditDiscountAmount}
        editDiscountReason={editDiscountReason}
        setEditDiscountReason={setEditDiscountReason}
        editDueDate={editDueDate}
        setEditDueDate={setEditDueDate}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        editPaidAt={editPaidAt}
        setEditPaidAt={setEditPaidAt}
        editPaymentMethod={editPaymentMethod}
        setEditPaymentMethod={setEditPaymentMethod}
        editRefundedAmount={editRefundedAmount}
        setEditRefundedAmount={setEditRefundedAmount}
        formatAmountWithCommas={formatAmountWithCommas}
        handleEditPayment={handleEditPayment}
        isCreating={isCreating}
        isSaving={isSaving}
      />

      {/* Edit Recurring Payment Student Modal */}
      <EditRecurringStudentModal
        isOpen={showEditRecurringModal}
        onClose={() => {
          setShowEditRecurringModal(false)
          setEditingRecurringStudent(null)
          setHasAmountOverride(false)
          setRecurringOverrideAmount('')
          setRecurringStatus('active')
        }}
        editingRecurringStudent={editingRecurringStudent}
        hasAmountOverride={hasAmountOverride}
        setHasAmountOverride={setHasAmountOverride}
        recurringOverrideAmount={recurringOverrideAmount}
        setRecurringOverrideAmount={setRecurringOverrideAmount}
        recurringStatus={recurringStatus}
        setRecurringStatus={setRecurringStatus}
        formatAmountWithCommas={formatAmountWithCommas}
        formatCurrency={formatCurrency}
        onSubmit={handleEditRecurringPayment}
      />

      {/* View Payment Modal */}
      <ViewPaymentModal
        isOpen={showViewPaymentModal}
        onClose={() => {
          setShowViewPaymentModal(false)
          setViewingInvoice(null)
        }}
        viewingInvoice={viewingInvoice}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
      />

      {/* Template Payments Modal */}
      <TemplatePaymentsModal
        isOpen={showTemplatePaymentsModal}
        onClose={() => {
          setShowTemplatePaymentsModal(false)
          setSelectedTemplate(null)
          setTemplatePayments([])
          setSelectedTemplatePayments(new Set())
          setTemplateStatusFilter('all')
        }}
        selectedTemplate={selectedTemplate}
        templatePayments={templatePayments}
        templatePaymentsLoading={templatePaymentsLoading}
        selectedTemplatePayments={selectedTemplatePayments}
        setSelectedTemplatePayments={setSelectedTemplatePayments}
        templateBulkStatus={templateBulkStatus}
        setTemplateBulkStatus={setTemplateBulkStatus}
        handleTemplateBulkStatusUpdate={handleTemplateBulkStatusUpdate}
        handleSelectAllTemplatePayments={handleSelectAllTemplatePayments}
        handleSelectTemplatePayment={handleSelectTemplatePayment}
        templateStatusFilter={templateStatusFilter}
        setTemplateStatusFilter={setTemplateStatusFilter}
        showTemplateStatusFilter={showTemplateStatusFilter}
        setShowTemplateStatusFilter={setShowTemplateStatusFilter}
        templateMethodFilter={templateMethodFilter}
        setTemplateMethodFilter={setTemplateMethodFilter}
        showTemplateMethodFilter={showTemplateMethodFilter}
        setShowTemplateMethodFilter={setShowTemplateMethodFilter}
        templateSortField={templateSortField}
        templateSortDirection={templateSortDirection}
        handleTemplateSort={handleTemplateSort}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusColor={getStatusColor}
        getStatusIcon={getStatusIcon}
        openInvoiceDropdownId={openInvoiceDropdownId}
        setOpenInvoiceDropdownId={setOpenInvoiceDropdownId}
        dropdownButtonRefs={dropdownButtonRefs}
        setEditingInvoice={setEditingInvoice}
        setEditInvoiceName={setEditInvoiceName}
        setEditAmount={setEditAmount}
        setEditDiscountAmount={setEditDiscountAmount}
        setEditDiscountReason={setEditDiscountReason}
        setEditDueDate={setEditDueDate}
        setEditStatus={setEditStatus}
        setEditPaidAt={setEditPaidAt}
        setEditPaymentMethod={setEditPaymentMethod}
        setEditRefundedAmount={setEditRefundedAmount}
        setShowEditPaymentModal={setShowEditPaymentModal}
        handleDeleteInvoiceClick={handleDeleteInvoiceClick}
        formatAmountWithCommas={formatAmountWithCommas}
        templateStatusFilterRef={templateStatusFilterRef}
        methodFilterRef={methodFilterRef}
      />
    </div>
  )
}