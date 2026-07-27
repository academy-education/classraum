import { useState, useCallback, useEffect } from 'react'
import { db } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'

// Mirrors invoices_status_check.
const INVOICE_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const
type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

function toInvoiceStatus(v: string): InvoiceStatus {
  if ((INVOICE_STATUSES as readonly string[]).includes(v)) {
    return v as InvoiceStatus
  }
  console.warn(`Unexpected invoice status from DB: ${v}`)
  return 'pending'
}

// Mirrors recurring_payment_templates_recurrence_type_check.
const RECURRENCE_TYPES = ['monthly', 'weekly', 'semesterly'] as const
type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

function toRecurrenceType(v: string): RecurrenceType {
  if ((RECURRENCE_TYPES as readonly string[]).includes(v)) {
    return v as RecurrenceType
  }
  console.warn(`Unexpected recurrence_type from DB: ${v}`)
  return 'monthly'
}

interface Invoice {
  id: string
  student_id: string | null
  student_name: string
  student_email: string
  template_id: string | null
  invoice_name: string
  amount: number
  // Money columns are nullable in the DB; null means "not set", which is not
  // the same as zero, so it is preserved rather than defaulted.
  discount_amount: number | null
  final_amount: number
  discount_reason: string | null
  due_date: string
  status: InvoiceStatus
  paid_at: string | null
  payment_method: string | null
  transaction_id: string | null
  refunded_amount: number | null
  created_at: string
}

// Insert payloads: every NOT NULL column without a default is required here,
// and joined display fields (student_name/student_email, student_count) are
// excluded because they are not columns.
export interface NewInvoice {
  academy_id: string
  student_id: string
  invoice_name: string
  amount: number
  final_amount: number
  due_date: string
  // NOT NULL with no default — the caller must choose it.
  status: InvoiceStatus
  template_id?: string | null
  discount_amount?: number | null
  discount_reason?: string | null
  notes?: string | null
}

export interface NewPaymentTemplate {
  name: string
  amount: number
  recurrence_type: RecurrenceType
  next_due_date: string
  start_date: string
  day_of_month?: number | null
  day_of_week?: number | null
  interval_weeks?: number | null
  semester_months?: number | null
  end_date?: string | null
  is_active?: boolean
}

interface PaymentTemplate {
  id: string
  academy_id: string
  name: string
  amount: number
  recurrence_type: RecurrenceType
  day_of_month: number | null
  day_of_week: number | null
  interval_weeks: number | null
  semester_months: number | null
  next_due_date: string
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
  student_count?: number
}

export function usePaymentData(academyId: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Fetch invoices with caching
  const fetchInvoices = useCallback(async () => {
    if (!academyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const cacheKey = `invoices_${academyId}`
      let cachedInvoices = queryCache.get<Invoice[]>(cacheKey)

      if (!cachedInvoices) {
        const { data, error } = await db
          .from('invoices')
          .select(`
            *,
            students!inner(
              users!inner(
                name,
                email
              )
            )
          `)
          .eq('students.academy_id', academyId)
          .order('created_at', { ascending: false })

        if (error) throw error

        const invoicesWithStudentInfo: Invoice[] = (data || []).map((invoice) => ({
          ...invoice,
          status: toInvoiceStatus(invoice.status),
          student_name: invoice.students?.users?.name || 'Unknown Student',
          student_email: invoice.students?.users?.email || ''
        }))

        cachedInvoices = invoicesWithStudentInfo
        queryCache.set(cacheKey, cachedInvoices, CACHE_TTL.SHORT) // 1 minute cache for invoices
      }

      setInvoices(cachedInvoices)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [academyId])

  // Fetch payment templates with caching
  const fetchPaymentTemplates = useCallback(async () => {
    if (!academyId) {
      setTemplatesLoading(false)
      return
    }

    setTemplatesLoading(true)
    try {
      const cacheKey = `payment_templates_${academyId}`
      let cachedTemplates = queryCache.get<PaymentTemplate[]>(cacheKey)

      if (!cachedTemplates) {
        const { data, error } = await db
          .from('recurring_payment_templates')
          .select('*')
          .eq('academy_id', academyId)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Get student counts for each template
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
              student_count: count || 0
            }
          })
        )

        cachedTemplates = templatesWithCounts
        queryCache.set(cacheKey, cachedTemplates, CACHE_TTL.MEDIUM) // 5 minute cache for templates
      }

      setPaymentTemplates(cachedTemplates)
    } catch (error) {
      console.error('Error fetching payment templates:', error)
      setPaymentTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [academyId])

  // Create invoice. The payload is spelled out rather than Partial<Invoice>:
  // student_name/student_email are joined display fields, not columns, and
  // academy_id/invoice_name/final_amount are NOT NULL with no default.
  const createInvoice = useCallback(async (invoiceData: NewInvoice) => {
    try {
      const { data, error } = await db
        .from('invoices')
        .insert([invoiceData])
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`invoices_${academyId}`)
      
      // Refresh data
      await fetchInvoices()
      
      return data[0]
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error
    }
  }, [academyId, fetchInvoices])

  // Update invoice
  const updateInvoice = useCallback(async (invoiceId: string, updates: Partial<Invoice>) => {
    try {
      const { data, error } = await db
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId)
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`invoices_${academyId}`)
      
      // Refresh data
      await fetchInvoices()
      
      return data[0]
    } catch (error) {
      console.error('Error updating invoice:', error)
      throw error
    }
  }, [academyId, fetchInvoices])

  // Delete invoice
  const deleteInvoice = useCallback(async (invoiceId: string) => {
    try {
      const { error } = await db
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`invoices_${academyId}`)
      
      // Refresh data
      await fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw error
    }
  }, [academyId, fetchInvoices])

  // Create payment template
  const createPaymentTemplate = useCallback(async (templateData: NewPaymentTemplate) => {
    try {
      const { data, error } = await db
        .from('recurring_payment_templates')
        .insert([{ ...templateData, academy_id: academyId }])
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`payment_templates_${academyId}`)
      
      // Refresh data
      await fetchPaymentTemplates()
      
      return data[0]
    } catch (error) {
      console.error('Error creating payment template:', error)
      throw error
    }
  }, [academyId, fetchPaymentTemplates])

  // Update payment template
  const updatePaymentTemplate = useCallback(async (templateId: string, updates: Partial<PaymentTemplate>) => {
    try {
      const { data, error } = await db
        .from('recurring_payment_templates')
        .update(updates)
        .eq('id', templateId)
        .select()

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`payment_templates_${academyId}`)
      
      // Refresh data
      await fetchPaymentTemplates()
      
      return data[0]
    } catch (error) {
      console.error('Error updating payment template:', error)
      throw error
    }
  }, [academyId, fetchPaymentTemplates])

  // Delete payment template
  const deletePaymentTemplate = useCallback(async (templateId: string) => {
    try {
      const { error } = await db
        .from('recurring_payment_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`payment_templates_${academyId}`)
      
      // Refresh data
      await fetchPaymentTemplates()
    } catch (error) {
      console.error('Error deleting payment template:', error)
      throw error
    }
  }, [academyId, fetchPaymentTemplates])

  // Bulk update invoice status
  const bulkUpdateInvoiceStatus = useCallback(async (invoiceIds: string[], status: string) => {
    try {
      const updates: Record<string, string> = { status }
      
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString()
      }

      const { error } = await db
        .from('invoices')
        .update(updates)
        .in('id', invoiceIds)

      if (error) throw error

      // Invalidate cache
      queryCache.invalidate(`invoices_${academyId}`)
      
      // Refresh data
      await fetchInvoices()
    } catch (error) {
      console.error('Error bulk updating invoices:', error)
      throw error
    }
  }, [academyId, fetchInvoices])

  // Initial data fetch
  useEffect(() => {
    if (academyId) {
      fetchInvoices()
      fetchPaymentTemplates()
    }
  }, [academyId, fetchInvoices, fetchPaymentTemplates])

  // Calculate invoice counts by type
  const invoiceCounts = {
    one_time: invoices.filter(invoice => !invoice.template_id).length,
    recurring: invoices.filter(invoice => invoice.template_id).length,
    plans: paymentTemplates.length
  }

  return {
    // Data
    invoices,
    paymentTemplates,
    invoiceCounts,
    
    // Loading states
    loading,
    templatesLoading,
    
    // Actions
    fetchInvoices,
    fetchPaymentTemplates,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    createPaymentTemplate,
    updatePaymentTemplate,
    deletePaymentTemplate,
    bulkUpdateInvoiceStatus
  }
}