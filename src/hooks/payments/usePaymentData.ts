import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  created_at: string
  payment_date?: string
  notes?: string
}

export interface PaymentTemplate {
  id: string
  name: string
  amount: number
  recurrence_type: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
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
  status: 'active' | 'paused' | 'inactive'
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
      const { data, error } = await supabase
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
      setStudents(data || [])
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
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get student details for each invoice
      const invoicesWithDetails = await Promise.all(
        (invoiceData || []).map(async (invoice: any) => {
          try {
            const { data: studentData } = await supabase
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
              student_name: studentData?.users?.name || t('payments.unknownStudent'),
              student_email: studentData?.users?.email || t('payments.unknownEmail'),
              template_id: invoice.template_id,
              amount: invoice.amount,
              discount_amount: invoice.discount_amount,
              final_amount: invoice.final_amount,
              discount_reason: invoice.discount_reason,
              status: invoice.status,
              due_date: invoice.due_date,
              created_at: invoice.created_at,
              payment_date: invoice.payment_date,
              notes: invoice.notes
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
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_payment_template_students')
        .select(`
          *,
          students!inner(academy_id)
        `)
        .eq('students.academy_id', academyId)

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
        .map((item: any) => item.student_id)
        .filter(id => id != null)
      const templateIds = recurringData
        .map((item: any) => item.template_id)
        .filter(id => id != null)

      // If no IDs to fetch, return empty array
      if (studentIds.length === 0 || templateIds.length === 0) {
        setRecurringStudents([])
        return
      }

      // Fetch all students and templates in two queries instead of 2N queries
      const [studentsResult, templatesResult] = await Promise.all([
        supabase
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
        supabase
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
      const formattedData = recurringData.map((item: any) => {
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
          student_name: studentData.users?.name || t('payments.unknownStudent'),
          student_email: studentData.users?.email || t('payments.unknownEmail'),
          template_name: templateData.name || t('payments.template'),
          template_amount: templateData.amount || 0,
          amount_override: item.amount_override,
          final_amount: item.amount_override || templateData.amount || 0,
          status: item.status,
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
      const { data, error } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get enrolled student counts for each template
      const templatesWithCounts = await Promise.all(
        (data || []).map(async (template) => {
          const { count } = await supabase
            .from('recurring_payment_template_students')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id)
            .eq('status', 'active')

          return {
            ...template,
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