import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL, CACHE_KEYS } from '@/lib/queryCache'

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

export function usePaymentData(academyId: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentTemplates, setPaymentTemplates] = useState<PaymentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Fetch invoices with caching
  const fetchInvoices = useCallback(async () => {
    if (!academyId) return

    setLoading(true)
    try {
      const cacheKey = `invoices_${academyId}`
      let cachedInvoices = queryCache.get<Invoice[]>(cacheKey)

      if (!cachedInvoices) {
        const { data, error } = await supabase
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

        const invoicesWithStudentInfo = (data || []).map((invoice: any) => ({
          ...invoice,
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
    if (!academyId) return

    setTemplatesLoading(true)
    try {
      const cacheKey = `payment_templates_${academyId}`
      let cachedTemplates = queryCache.get<PaymentTemplate[]>(cacheKey)

      if (!cachedTemplates) {
        const { data, error } = await supabase
          .from('payment_templates')
          .select('*')
          .eq('academy_id', academyId)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Get student counts for each template
        const templatesWithCounts = await Promise.all(
          (data || []).map(async (template) => {
            const { count } = await supabase
              .from('recurring_payment_students')
              .select('*', { count: 'exact', head: true })
              .eq('template_id', template.id)
              .eq('status', 'active')

            return {
              ...template,
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

  // Create invoice
  const createInvoice = useCallback(async (invoiceData: Partial<Invoice>) => {
    try {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      const { error } = await supabase
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
  const createPaymentTemplate = useCallback(async (templateData: Partial<PaymentTemplate>) => {
    try {
      const { data, error } = await supabase
        .from('payment_templates')
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
      const { data, error } = await supabase
        .from('payment_templates')
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
      const { error } = await supabase
        .from('payment_templates')
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
      const updates: any = { status }
      
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString()
      }

      const { error } = await supabase
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