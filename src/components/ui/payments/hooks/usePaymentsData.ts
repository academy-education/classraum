"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'

// ---- Interfaces (also used by payments-page.tsx and other consumers) ----

export interface Invoice {
  id: string
  student_id: string
  student_name: string
  student_email: string
  template_id?: string
  invoice_name?: string
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

export interface PaymentTemplate {
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
  status: string
  template_active: boolean
  recurrence_type: 'monthly' | 'weekly'
}

// ---- Cache invalidation (standalone export, used by other pages) ----

export const invalidatePaymentsCache = (academyId: string) => {
  // Clear all page caches for this academy (payments-academyId-page1, page2, etc.)
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`payments-${academyId}-page`) ||
        key.includes(`payments-${academyId}-page`) ||
        key.startsWith(`payment-templates-${academyId}`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })
}

// ---- Student type used in the hook ----

export interface PaymentsStudent {
  id: string
  user_id: string
  name: string
  school_name?: string
  email?: string
  phone?: string
  family_name?: string
  parent_names?: string[]
}

// ---- The hook ----

const itemsPerPage = 10

export function usePaymentsData(academyId: string, activeTab: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Aggregate totals (all invoices, not just current page)
  const [allTimeRevenue, setAllTimeRevenue] = useState(0)
  const [allTimePending, setAllTimePending] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [recurringStudents, setRecurringStudents] = useState<RecurringStudent[]>([])
  const [recurringStudentsLoading, setRecurringStudentsLoading] = useState(false)
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [students, setStudents] = useState<PaymentsStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  // --- Fetch functions ---

  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    setStudentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          phone,
          school_name,
          users!inner(
            id,
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      // Get family information for all students
      const studentUserIds = data?.map((s: any) => s.user_id) || []
      const { data: familyData } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          families!inner(
            id,
            name
          )
        `)
        .in('user_id', studentUserIds)

      // Get parent names for each family
      const familyIds = [...new Set(familyData?.map((fm: any) => fm.families.id) || [])]
      const { data: parentData } = await supabase
        .from('family_members')
        .select(`
          family_id,
          users!inner(
            name
          )
        `)
        .eq('role', 'parent')
        .in('family_id', familyIds)

      // Build a map of user_id to family info
      const familyMap = new Map()
      familyData?.forEach((fm: any) => {
        const parents = parentData?.filter((p: any) => p.family_id === fm.families.id).map((p: any) => p.users.name) || []
        familyMap.set(fm.user_id, {
          family_name: fm.families.name,
          parent_names: parents
        })
      })

      const studentsData = data?.map((student: any) => {
        const familyInfo = familyMap.get(student.user_id) || {}
        return {
          id: student.users.id,
          user_id: student.user_id,
          name: student.users.name || 'Unknown Student',
          school_name: student.school_name,
          phone: student.phone,
          email: student.users.email,
          family_name: familyInfo.family_name,
          parent_names: familyInfo.parent_names
        }
      }) || []

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
    setStudentsLoading(false)
  }, [academyId])

  const fetchInvoices = useCallback(async () => {
    // Add missing academyId validation (critical fix)
    if (!academyId) {
      console.error('fetchInvoices: No academyId provided')
      // Keep loading state - skeleton will continue to show
      return
    }

    // PERFORMANCE: Check cache first (1-minute TTL for payments - financial data)
    const cacheKey = `payments-${academyId}-${activeTab}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 1 * 60 * 1000 // 1 minute TTL for financial accuracy
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setInvoices(parsed.invoices)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        return parsed.invoices
      }
    }

    try {
      // ACADEMY ISOLATION: Fetch invoices that belong exclusively to this academy

      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Build query with tab-specific filtering
      let query = supabase
        .from('invoices')
        .select(`
          id,
          student_id,
          template_id,
          invoice_name,
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
          academy_id
        `, { count: 'exact' })
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      // Apply tab-specific filters at database level for correct pagination
      if (activeTab === 'one_time') {
        query = query.is('template_id', null)
      } else if (activeTab === 'recurring') {
        query = query.not('template_id', 'is', null)
      }

      const { data: invoiceData, error: invoiceError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)


      // Update total count
      setTotalCount(count || 0)

      // Fetch aggregate totals for ALL invoices (not just current page)
      // This runs in parallel with the main query for the current tab
      const fetchAggregates = async () => {
        try {
          // Get total paid amount
          const { data: paidData } = await supabase
            .from('invoices')
            .select('final_amount')
            .eq('academy_id', academyId)
            .eq('status', 'paid')
            .is('deleted_at', null)

          // Get total pending amount
          const { data: pendingData } = await supabase
            .from('invoices')
            .select('final_amount')
            .eq('academy_id', academyId)
            .eq('status', 'pending')
            .is('deleted_at', null)

          const totalPaid = paidData?.reduce((sum, inv) => sum + (inv.final_amount || 0), 0) || 0
          const totalPending = pendingData?.reduce((sum, inv) => sum + (inv.final_amount || 0), 0) || 0

          setAllTimeRevenue(totalPaid)
          setAllTimePending(totalPending)
        } catch (err) {
          console.error('Error fetching aggregate totals:', err)
        }
      }
      fetchAggregates()

      if (invoiceError) {
        console.error('fetchInvoices: Database error:', invoiceError)
        throw invoiceError
      }

      // SECURITY VALIDATION: Ensure all returned invoices belong exclusively to this academy
      const invalidInvoices = invoiceData?.filter(invoice =>
        invoice.academy_id !== academyId
      ) || []

      if (invalidInvoices.length > 0) {
        console.error('fetchInvoices: CRITICAL SECURITY BREACH - Found invoices from wrong academy:', invalidInvoices)
        setInvoices([])
        return
      }

      if (!invoiceData || invoiceData.length === 0) {
        setInvoices([])
        return
      }

      // Get unique student IDs to fetch their information
      const studentIds = [...new Set(invoiceData.map(invoice => invoice.student_id))]

      // Fetch student data separately with proper join to users table
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          user_id,
          users(
            name,
            email
          )
        `)
        .in('user_id', studentIds)

      if (studentsError) {
        console.error('fetchInvoices: Error fetching student data:', studentsError)
        // Continue with unknown student data rather than failing completely
      }

      // Create a map for quick student lookup
      const studentMap = new Map()
      if (studentsData) {
        studentsData.forEach((student: Record<string, unknown>) => {
          const users = student.users as { name?: string; email?: string } | null
          studentMap.set(student.user_id, {
            name: users?.name || 'Unknown Student',
            email: users?.email || 'Unknown Email'
          })
        })
      }

      // Map the invoice data with student information
      const validInvoices = invoiceData.map((invoice: Record<string, unknown>) => {
        const studentInfo = studentMap.get(invoice.student_id) || {
          name: 'Unknown Student',
          email: 'Unknown Email'
        }
        const studentName = studentInfo.name
        const studentEmail = studentInfo.email

        return {
          id: invoice.id as string,
          student_id: invoice.student_id as string,
          student_name: studentName,
          student_email: studentEmail,
          template_id: invoice.template_id as string || undefined,
          invoice_name: invoice.invoice_name as string || undefined,
          amount: invoice.amount as number,
          discount_amount: (invoice.discount_amount as number) || 0,
          final_amount: (invoice.final_amount || invoice.amount) as number,
          discount_reason: invoice.discount_reason as string || undefined,
          due_date: invoice.due_date as string,
          status: invoice.status as "failed" | "pending" | "paid" | "refunded",
          paid_at: invoice.paid_at as string || undefined,
          payment_method: invoice.payment_method as string || undefined,
          transaction_id: invoice.transaction_id as string || undefined,
          refunded_amount: (invoice.refunded_amount as number) || 0,
          created_at: invoice.created_at as string
        }
      })

      setInvoices(validInvoices)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          invoices: validInvoices,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache payments:', cacheError)
      }
    } catch (error) {
      console.error('fetchInvoices: Error fetching invoices for academy', academyId, ':', error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [academyId, currentPage, activeTab])

  const fetchRecurringStudents = useCallback(async () => {
    if (!academyId) return

    setRecurringStudentsLoading(true)
    try {
      // Get recurring payment template students for this academy
      // Join through recurring_payment_templates (which has academy_id) instead of students
      // because student_record_id FK may be NULL
      const { data: recurringData, error: recurringError } = await supabase
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
        .map((item: { student_id: string }) => item.student_id)
        .filter(id => id != null)
      const templateIds = recurringData
        .map((item: { template_id: string }) => item.template_id)
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
          .is('deleted_at', null)
      ])


      // Simply ignore empty/null errors and proceed with the data
      // Supabase sometimes returns empty error objects that aren't real errors
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
      const formattedData = recurringData.map((item: {
        id: string;
        template_id: string;
        student_id: string;
        amount_override?: number;
        status: string;
      }) => {
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
          student_name: ((studentData.users as unknown as Record<string, unknown>)?.name as string) || 'Unknown Student',
          student_email: ((studentData.users as unknown as Record<string, unknown>)?.email as string) || 'Unknown Email',
          template_name: templateData.name || 'Template',
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
  }, [academyId])

  const fetchPaymentTemplates = useCallback(async () => {
    // Add missing academyId validation
    if (!academyId) {
      console.warn('fetchPaymentTemplates: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return
    }

    // PERFORMANCE: Check cache first (valid for 5 minutes - templates don't change often)
    const cacheKey = `payment-templates-${academyId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setPaymentTemplates(parsed)
        setTemplatesLoading(false)
        return
      }
    }

    setTemplatesLoading(true)
    try {

      const { data, error } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchPaymentTemplates: Database error:', error)
        throw error
      }

      // Enhanced validation: ensure all templates belong to the correct academy
      let validatedData = data
      if (validatedData && validatedData.length > 0) {
        const invalidTemplates = validatedData.filter(template => template.academy_id !== academyId)
        if (invalidTemplates.length > 0) {
          console.error('fetchPaymentTemplates: Found templates from wrong academy (critical security issue):', invalidTemplates)
          // Filter out invalid templates for security
          validatedData = validatedData.filter(template => template.academy_id === academyId)
        }
      }

      // Get student count for each template
      const templatesWithCounts = await Promise.all(
        (validatedData || []).map(async (template) => {
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

      // PERFORMANCE: Cache the templates
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(templatesWithCounts))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache payment templates:', cacheError)
      }
    } catch (error) {
      console.error('fetchPaymentTemplates: Error fetching payment templates for academy', academyId, ':', error)
      setPaymentTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [academyId])

  // CRITICAL: Clear all payment-related state when academyId changes to prevent cross-academy data contamination
  useEffect(() => {
    // Immediately clear all data to prevent stale cross-academy data display
    setInvoices([])
    setStudents([])
    setRecurringStudents([])
    setPaymentTemplates([])

    // Reset all loading states
    setStudentsLoading(true)
    setRecurringStudentsLoading(true)
    setTemplatesLoading(true)
  }, [academyId])

  // Main data fetching effect
  useEffect(() => {
    if (!academyId) return

    // Check if page was refreshed - clear caches to get fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `payments-${academyId}-${activeTab}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 1 * 60 * 1000 // 1 minute

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setInvoices(parsed.invoices)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        setInitialized(true)
        // Still load secondary data in background
        fetchStudents()
        fetchRecurringStudents()
        fetchPaymentTemplates()
        return // Skip fetchInvoices - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    setInitialized(true)
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }
    fetchInvoices()
    fetchStudents()
    fetchRecurringStudents()
    fetchPaymentTemplates()
  }, [academyId, currentPage, activeTab, fetchInvoices, fetchStudents, fetchRecurringStudents, fetchPaymentTemplates])

  // Convenience function to refetch all data
  const refetchAll = useCallback(() => {
    invalidatePaymentsCache(academyId)
    fetchInvoices()
    fetchStudents()
    fetchRecurringStudents()
    fetchPaymentTemplates()
  }, [academyId, fetchInvoices, fetchStudents, fetchRecurringStudents, fetchPaymentTemplates])

  return {
    invoices,
    setInvoices,
    recurringStudents,
    setRecurringStudents,
    paymentTemplates,
    setPaymentTemplates,
    students,
    loading,
    initialized,
    totalCount,
    allTimeRevenue,
    allTimePending,
    currentPage,
    setCurrentPage,
    recurringStudentsLoading,
    templatesLoading,
    studentsLoading,
    fetchInvoices,
    fetchRecurringStudents,
    fetchPaymentTemplates,
    fetchStudents,
    refetchAll,
  }
}
