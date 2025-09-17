import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import type { Invoice, PaymentTemplate } from './usePaymentData'

export interface PaymentActionsState {
  loading: boolean
  submitting: boolean
  deleting: Set<string>
  bulkActionLoading: boolean
}

export interface CreateInvoiceData {
  student_id: string
  amount: number
  due_date: string
  description?: string
  academy_id: string
}

export interface UpdateInvoiceData {
  amount?: number
  due_date?: string
  description?: string
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
}

export interface CreateTemplateData {
  name: string
  amount: number
  billing_cycle: 'monthly' | 'weekly' | 'yearly'
  description?: string
  academy_id: string
}

export interface UpdateTemplateData {
  name?: string
  amount?: number
  billing_cycle?: 'monthly' | 'weekly' | 'yearly'
  description?: string
  is_active?: boolean
}

export const usePaymentActions = () => {
  const { t } = useTranslation()
  const { toast } = useToast()
  
  const [state, setState] = useState<PaymentActionsState>({
    loading: false,
    submitting: false,
    deleting: new Set(),
    bulkActionLoading: false
  })

  // Helper to update state
  const updateState = (updates: Partial<PaymentActionsState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  // Invoice CRUD Operations
  const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice | null> => {
    updateState({ submitting: true })
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          ...invoiceData,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: String(t('payments.success.invoiceCreated')),
        description: String(t('payments.success.invoiceCreatedDesc'))
      })

      return data
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast({
        title: String(t('payments.errors.createFailed')),
        description: String(t('payments.errors.createFailedDesc')),
        variant: 'destructive'
      })
      return null
    } finally {
      updateState({ submitting: false })
    }
  }

  const updateInvoice = async (invoiceId: string, updates: UpdateInvoiceData): Promise<boolean> => {
    updateState({ submitting: true })
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast({
        title: String(t('payments.success.invoiceUpdated')),
        description: String(t('payments.success.invoiceUpdatedDesc'))
      })

      return true
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast({
        title: String(t('payments.errors.updateFailed')),
        description: String(t('payments.errors.updateFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ submitting: false })
    }
  }

  const deleteInvoice = async (invoiceId: string): Promise<boolean> => {
    const newDeleting = new Set(state.deleting)
    newDeleting.add(invoiceId)
    updateState({ deleting: newDeleting })
    
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error

      toast({
        title: String(t('payments.success.invoiceDeleted')),
        description: String(t('payments.success.invoiceDeletedDesc'))
      })

      return true
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast({
        title: String(t('payments.errors.deleteFailed')),
        description: String(t('payments.errors.deleteFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      const newDeleting = new Set(state.deleting)
      newDeleting.delete(invoiceId)
      updateState({ deleting: newDeleting })
    }
  }

  // Template CRUD Operations
  const createTemplate = async (templateData: CreateTemplateData): Promise<PaymentTemplate | null> => {
    updateState({ submitting: true })
    
    try {
      const { data, error } = await supabase
        .from('recurring_payment_templates')
        .insert([{
          ...templateData,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      toast({
        title: String(t('payments.success.templateCreated')),
        description: String(t('payments.success.templateCreatedDesc'))
      })

      return data
    } catch (error) {
      console.error('Error creating template:', error)
      toast({
        title: String(t('payments.errors.createFailed')),
        description: String(t('payments.errors.createFailedDesc')),
        variant: 'destructive'
      })
      return null
    } finally {
      updateState({ submitting: false })
    }
  }

  const updateTemplate = async (templateId: string, updates: UpdateTemplateData): Promise<boolean> => {
    updateState({ submitting: true })
    
    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (error) throw error

      toast({
        title: String(t('payments.success.templateUpdated')),
        description: String(t('payments.success.templateUpdatedDesc'))
      })

      return true
    } catch (error) {
      console.error('Error updating template:', error)
      toast({
        title: String(t('payments.errors.updateFailed')),
        description: String(t('payments.errors.updateFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ submitting: false })
    }
  }

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    const newDeleting = new Set(state.deleting)
    newDeleting.add(templateId)
    updateState({ deleting: newDeleting })
    
    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      toast({
        title: String(t('payments.success.templateDeleted')),
        description: String(t('payments.success.templateDeletedDesc'))
      })

      return true
    } catch (error) {
      console.error('Error deleting template:', error)
      toast({
        title: String(t('payments.errors.deleteFailed')),
        description: String(t('payments.errors.deleteFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      const newDeleting = new Set(state.deleting)
      newDeleting.delete(templateId)
      updateState({ deleting: newDeleting })
    }
  }

  // Bulk Operations
  const bulkUpdateInvoiceStatus = async (invoiceIds: string[], status: UpdateInvoiceData['status']): Promise<boolean> => {
    updateState({ bulkActionLoading: true })
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', invoiceIds)

      if (error) throw error

      toast({
        title: String(t('payments.success.bulkUpdate')),
        description: String(t('payments.success.bulkUpdateDesc', { count: invoiceIds.length }))
      })

      return true
    } catch (error) {
      console.error('Error bulk updating invoices:', error)
      toast({
        title: String(t('payments.errors.bulkUpdateFailed')),
        description: String(t('payments.errors.bulkUpdateFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ bulkActionLoading: false })
    }
  }

  const bulkDeleteInvoices = async (invoiceIds: string[]): Promise<boolean> => {
    updateState({ bulkActionLoading: true })
    
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .in('id', invoiceIds)

      if (error) throw error

      toast({
        title: String(t('payments.success.bulkDelete')),
        description: String(t('payments.success.bulkDeleteDesc', { count: invoiceIds.length }))
      })

      return true
    } catch (error) {
      console.error('Error bulk deleting invoices:', error)
      toast({
        title: String(t('payments.errors.bulkDeleteFailed')),
        description: String(t('payments.errors.bulkDeleteFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ bulkActionLoading: false })
    }
  }

  const bulkToggleTemplateStatus = async (templateIds: string[], isActive: boolean): Promise<boolean> => {
    updateState({ bulkActionLoading: true })
    
    try {
      const { error } = await supabase
        .from('recurring_payment_templates')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .in('id', templateIds)

      if (error) throw error

      const actionKey = isActive ? 'activate' : 'deactivate'
      toast({
        title: String(t(`payments.success.bulkTemplate${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}`)),
        description: String(t(`payments.success.bulkTemplate${actionKey.charAt(0).toUpperCase() + actionKey.slice(1)}Desc`, { count: templateIds.length }))
      })

      return true
    } catch (error) {
      console.error('Error bulk updating templates:', error)
      toast({
        title: String(t('payments.errors.bulkUpdateFailed')),
        description: String(t('payments.errors.bulkUpdateFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ bulkActionLoading: false })
    }
  }

  // Send reminders
  const sendPaymentReminder = async (invoiceId: string): Promise<boolean> => {
    updateState({ submitting: true })
    
    try {
      // This would typically call an email service or notification system
      // For now, we'll simulate the action and update the invoice
      const { error } = await supabase
        .from('invoices')
        .update({ 
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (error) throw error

      toast({
        title: String(t('payments.success.reminderSent')),
        description: String(t('payments.success.reminderSentDesc'))
      })

      return true
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: String(t('payments.errors.reminderFailed')),
        description: String(t('payments.errors.reminderFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ submitting: false })
    }
  }

  const bulkSendReminders = async (invoiceIds: string[]): Promise<boolean> => {
    updateState({ bulkActionLoading: true })
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', invoiceIds)

      if (error) throw error

      toast({
        title: String(t('payments.success.bulkReminders')),
        description: String(t('payments.success.bulkRemindersDesc', { count: invoiceIds.length }))
      })

      return true
    } catch (error) {
      console.error('Error sending bulk reminders:', error)
      toast({
        title: String(t('payments.errors.bulkRemindersFailed')),
        description: String(t('payments.errors.bulkRemindersFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ bulkActionLoading: false })
    }
  }

  // Export functionality
  const exportData = async (data: Record<string, unknown>[], filename: string): Promise<boolean> => {
    updateState({ bulkActionLoading: true })
    
    try {
      // Convert data to CSV format
      if (data.length === 0) {
        toast({
          title: String(t('payments.errors.noDataToExport')),
          description: String(t('payments.errors.noDataToExportDesc')),
          variant: 'destructive'
        })
        return false
      }

      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: String(t('payments.success.dataExported')),
        description: String(t('payments.success.dataExportedDesc'))
      })

      return true
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: String(t('payments.errors.exportFailed')),
        description: String(t('payments.errors.exportFailedDesc')),
        variant: 'destructive'
      })
      return false
    } finally {
      updateState({ bulkActionLoading: false })
    }
  }

  return {
    // State
    ...state,
    
    // Invoice operations
    createInvoice,
    updateInvoice,
    deleteInvoice,
    
    // Template operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    
    // Bulk operations
    bulkUpdateInvoiceStatus,
    bulkDeleteInvoices,
    bulkToggleTemplateStatus,
    
    // Communication
    sendPaymentReminder,
    bulkSendReminders,
    
    // Export
    exportData
  }
}

export default usePaymentActions