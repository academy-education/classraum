import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'

export interface Invoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  template_id?: string
  amount: number
  discount_amount?: number
  final_amount: number
  discount_reason?: string
  // Mirrors invoices_status_check: pending | paid | failed | refunded.
  // 'overdue' and 'cancelled' are NOT storable values — overdue is derived
  // from a pending invoice whose due_date has passed.
  status: InvoiceStatus
  due_date: string
  created_at: string
  paid_at?: string
  notes?: string
}

export const INVOICE_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export function toInvoiceStatus(v: string): InvoiceStatus {
  if ((INVOICE_STATUSES as readonly string[]).includes(v)) {
    return v as InvoiceStatus
  }
  console.warn(`Unexpected invoice status from DB: ${v}`)
  return 'pending'
}

// Mirrors recurring_payment_templates_recurrence_type_check.
export const RECURRENCE_TYPES = ['monthly', 'weekly', 'semesterly'] as const
export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

export function toRecurrenceType(v: string): RecurrenceType {
  if ((RECURRENCE_TYPES as readonly string[]).includes(v)) {
    return v as RecurrenceType
  }
  console.warn(`Unexpected recurrence_type from DB: ${v}`)
  return 'monthly'
}

export interface PaymentTemplate {
  id: string
  name: string
  amount: number
  recurrence_type: RecurrenceType
  is_active: boolean
  academy_id: string
  created_at: string
  enrolled_students_count?: number
}

export interface Student {
  user_id: string
  academy_id: string
  users: {
    name: string
    email: string
  }
  phone?: string
  active: boolean
}

export interface RecurringStudent {
  id: string
  template_id: string
  student_id: string
  student_name: string
  student_email: string
  template_name: string
  template_amount: number
  amount_override?: number
  final_amount: number
  // Mirrors recurring_payment_template_students status_check.
  status: 'active' | 'paused'
  template_active: boolean
  recurrence_type: string
}

export const usePaymentData = (academyId: string) => {
  const { t } = useTranslation()
  
  // State
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [templates, setTemplates] = useState<PaymentTemplate[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [recurringStudents, setRecurringStudents] = useState<RecurringStudent[]>([])
  
  // Loading states
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [recurringStudentsLoading, setRecurringStudentsLoading] = useState(false)

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    
    setStudentsLoading(true)
    try {
      const { data, error } = await db
        .from('students')
        .select(`
          user_id,
          academy_id,
          phone,
          active,
          users!inner(
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)
        .order('users.name')

      if (error) throw error
      // students.user_id -> users is a to-one FK, so the embed is a single
      // object, never an array.
      const transformedStudents: Student[] = (data || []).map((student) => ({
        user_id: student.user_id,
        academy_id: student.academy_id,
        phone: student.phone ?? undefined,
        // Guaranteed by the .eq('active', true) filter on this same query.
        active: student.active!,
        users: {
          name: student.users?.name || '',
          email: student.users?.email || ''
        }
      }))
      setStudents(transformedStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setStudentsLoading(false)
    }
  }, [academyId])

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!academyId) return
    
    setInvoicesLoading(true)
    try {
      const { data: invoiceData, error } = await db
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get student details for each invoice
      const invoicesWithDetails = await Promise.all(
        (invoiceData || []).map(async (invoice) => {
          try {
            // invoices.student_id is nullable; such a row has no student to
            // resolve, so it cannot belong to this academy's list.
            if (!invoice.student_id) return null

            const { data: studentData } = await db
              .from('students')
              .select(`
                user_id,
                academy_id,
                users!inner(
                  name,
                  email
                )
              `)
              .eq('user_id', invoice.student_id)
              .single()

            // Only include invoices for this academy
            if (studentData?.academy_id !== academyId) {
              return null
            }

            return {
              id: invoice.id,
              student_id: invoice.student_id,
              student_name: studentData?.users?.name || String(t('payments.unknownStudent')),
              student_email: studentData?.users?.email || String(t('payments.unknownEmail')),
              template_id: invoice.template_id ?? undefined,
              amount: invoice.amount,
              discount_amount: invoice.discount_amount ?? undefined,
              final_amount: invoice.final_amount,
              discount_reason: invoice.discount_reason ?? undefined,
              status: toInvoiceStatus(invoice.status),
              due_date: invoice.due_date,
              created_at: invoice.created_at,
              // The column is paid_at; there is no payment_date column.
              paid_at: invoice.paid_at ?? undefined,
              notes: invoice.notes ?? undefined
            }
          } catch (error) {
            console.error('Error fetching student details for invoice:', invoice.id, error)
            return null
          }
        })
      )

      // Filter out null values
      const validInvoices = invoicesWithDetails.filter(invoice => invoice !== null)
      setInvoices(validInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setInvoicesLoading(false)
    }
  }, [academyId, t])

  // Fetch recurring students
  const fetchRecurringStudents = useCallback(async () => {
    if (!academyId) return
    
    setRecurringStudentsLoading(true)
    try {
      // Get recurring payment template students for this academy
      // Join through recurring_payment_templates (which has academy_id) instead of students
      // because student_record_id FK may be NULL
      const { data: recurringData, error: recurringError } = await db
        .from('recurring_payment_template_students')
        .select(`
          *,
          recurring_payment_templates!inner(academy_id)
        `)
        .eq('recurring_payment_templates.academy_id', academyId)

      if (recurringError) {
        console.error('Error fetching recurring payment template students:', recurringError)
        throw recurringError
      }

      if (!recurringData || recurringData.length === 0) {
        setRecurringStudents([])
        return
      }

      // Get all student and template IDs, filtering out nulls/undefined
      const studentIds = recurringData
        .map((item) => item.student_id)
        .filter(id => id != null)
      const templateIds = recurringData
        .map((item) => item.template_id)
        .filter(id => id != null)

      // If no IDs to fetch, return empty array
      if (studentIds.length === 0 || templateIds.length === 0) {
        setRecurringStudents([])
        return
      }

      // Fetch all students and templates in two queries instead of 2N queries
      const [studentsResult, templatesResult] = await Promise.all([
        db
          .from('students')
          .select(`
            user_id,
            academy_id,
            users!inner(
              id,
              name,
              email
            )
          `)
          .in('user_id', studentIds)
          .eq('academy_id', academyId),
        db
          .from('recurring_payment_templates')
          .select('id, name, amount, recurrence_type, is_active, academy_id')
          .in('id', templateIds)
          .eq('academy_id', academyId)
      ])

      // Check for meaningful errors only
      const hasActualStudentsError = studentsResult.error && 
        studentsResult.error.message && 
        studentsResult.error.message.trim().length > 0
      
      const hasActualTemplatesError = templatesResult.error && 
        templatesResult.error.message && 
        templatesResult.error.message.trim().length > 0

      if (hasActualStudentsError || hasActualTemplatesError) {
        if (hasActualStudentsError) {
          console.error('Actual error fetching students:', studentsResult.error.message)
        }
        if (hasActualTemplatesError) {
          console.error('Actual error fetching templates:', templatesResult.error.message)
        }
        setRecurringStudents([])
        return
      }

      // Create lookup maps for O(1) access
      const studentsMap = new Map(studentsResult.data?.map(s => [s.user_id, s]) || [])
      const templatesMap = new Map(templatesResult.data?.map(t => [t.id, t]) || [])

      // Format the data using the lookup maps
      const formattedData = recurringData.map((item): RecurringStudent | null => {
        const studentData = studentsMap.get(item.student_id)
        const templateData = templatesMap.get(item.template_id)

        // Skip if either student or template is not found
        if (!studentData || !templateData) {
          return null
        }

        return {
          id: item.id,
          template_id: item.template_id,
          student_id: item.student_id,
          student_name: studentData.users.name || String(t('payments.unknownStudent')),
          student_email: studentData.users.email || String(t('payments.unknownEmail')),
          template_name: templateData.name || String(t('payments.template')),
          template_amount: templateData.amount || 0,
          amount_override: item.amount_override ?? undefined,
          final_amount: item.amount_override || templateData.amount || 0,
          // status_check allows only 'active' | 'paused'; NULL means active.
          status: item.status === 'paused' ? 'paused' : 'active',
          template_active: templateData.is_active,
          recurrence_type: templateData.recurrence_type
        }
      })

      // Filter out null values
      const validData = formattedData.filter(item => item !== null)
      setRecurringStudents(validData)
    } catch (error) {
      console.error('Error fetching recurring students:', error)
    } finally {
      setRecurringStudentsLoading(false)
    }
  }, [academyId, t])

  // Fetch payment templates
  const fetchPaymentTemplates = useCallback(async () => {
    if (!academyId) return
    
    setTemplatesLoading(true)
    try {
      const { data, error } = await db
        .from('recurring_payment_templates')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get enrolled student counts for each template
      const templatesWithCounts = await Promise.all(
        (data || []).map(async (template) => {
          const { count } = await db
            .from('recurring_payment_template_students')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)
            .eq('status', 'active')

          return {
            ...template,
            recurrence_type: toRecurrenceType(template.recurrence_type),
            enrolled_students_count: count || 0
          }
        })
      )

      setTemplates(templatesWithCounts)
    } catch (error) {
      console.error('Error fetching payment templates:', error)
    } finally {
      setTemplatesLoading(false)
    }
  }, [academyId])

  // Initialize data
  useEffect(() => {
    if (academyId) {
      Promise.all([
        fetchStudents(),
        fetchInvoices(),
        fetchRecurringStudents(),
        fetchPaymentTemplates()
      ])
    }
  }, [academyId, fetchStudents, fetchInvoices, fetchRecurringStudents, fetchPaymentTemplates])

  // Refresh functions
  const refreshInvoices = useCallback(() => fetchInvoices(), [fetchInvoices])
  const refreshStudents = useCallback(() => fetchStudents(), [fetchStudents])
  const refreshRecurringStudents = useCallback(() => fetchRecurringStudents(), [fetchRecurringStudents])
  const refreshTemplates = useCallback(() => fetchPaymentTemplates(), [fetchPaymentTemplates])

  const refreshAll = useCallback(() => {
    Promise.all([
      fetchStudents(),
      fetchInvoices(),
      fetchRecurringStudents(),
      fetchPaymentTemplates()
    ])
  }, [fetchStudents, fetchInvoices, fetchRecurringStudents, fetchPaymentTemplates])

  // Loading states
  const isLoading = invoicesLoading || templatesLoading || studentsLoading || recurringStudentsLoading

  return {
    // Data
    invoices,
    templates,
    students,
    recurringStudents,
    
    // Loading states
    isLoading,
    invoicesLoading,
    templatesLoading,
    studentsLoading,
    recurringStudentsLoading,
    
    // Refresh functions
    refreshInvoices,
    refreshStudents,
    refreshRecurringStudents,
    refreshTemplates,
    refreshAll,
    
    // Individual fetch functions (for manual triggering)
    fetchStudents,
    fetchInvoices,
    fetchRecurringStudents,
    fetchPaymentTemplates
  }
}