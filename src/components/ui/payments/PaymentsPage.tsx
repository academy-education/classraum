"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

// Import sub-components (to be created)
import { PaymentsList } from './PaymentsList'
import { PaymentFilters } from './PaymentFilters'
import { PaymentModal } from './PaymentModal'
import { PaymentStats } from './PaymentStats'

// Import types
import {
  Invoice,
  PaymentTemplate,
  Student,
  RecurringStudent,
  PaymentTab,
  PaymentsPageProps,
  PaymentFilters as FilterState,
  PaymentModalState,
  BulkAction
} from './types'

export function PaymentsPage({ academyId }: PaymentsPageProps) {
  const { t, loading: translationLoading } = useTranslation()
  
  // Main state
  const [activeTab, setActiveTab] = useState<PaymentTab>('one_time')
  const [loading, setLoading] = useState(true)
  
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [templates, setTemplates] = useState<PaymentTemplate[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [recurringStudents, setRecurringStudents] = useState<RecurringStudent[]>([])
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    statusFilter: 'all',
    sortField: 'created_at',
    sortDirection: 'desc'
  })
  
  // Modal state
  const [modalState, setModalState] = useState<PaymentModalState>({
    isOpen: false,
    mode: 'add',
    data: null
  })
  
  // Bulk action state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionsLoading, setBulkActionsLoading] = useState(false)

  // Data fetching functions
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get student details for each invoice
      const invoicesWithStudents = await Promise.all(
        (data || []).map(async (invoice) => {
          const { data: studentData } = await supabase
            .from('students')
            .select('name, email')
            .eq('id', invoice.student_id)
            .single()

          return {
            ...invoice,
            student_name: studentData?.name || 'Unknown',
            student_email: studentData?.email || ''
          }
        })
      )

      setInvoices(invoicesWithStudents)
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_payment_templates')
        .select('*')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }, [academyId])

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, email')
        .eq('academy_id', academyId)
        .order('name')

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }, [academyId])

  const fetchRecurringStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recurring_payment_template_students')
        .select('*')
        .eq('academy_id', academyId)

      if (error) throw error

      // Get additional details for each recurring student
      const formattedStudents = await Promise.all(
        (data || []).map(async (item) => {
          const [studentData, templateData] = await Promise.all([
            supabase
              .from('students')
              .select('name, email')
              .eq('id', item.student_id)
              .single(),
            supabase
              .from('recurring_payment_templates')
              .select('name, amount')
              .eq('id', item.template_id)
              .single()
          ])

          return {
            ...item,
            student_name: studentData.data?.name || 'Unknown',
            student_email: studentData.data?.email || '',
            template_name: templateData.data?.name || 'Unknown',
            template_amount: templateData.data?.amount || 0
          }
        })
      )

      setRecurringStudents(formattedStudents)
    } catch (error) {
      console.error('Error fetching recurring students:', error)
    }
  }, [academyId])

  // Initialize data
  useEffect(() => {
    if (academyId) {
      Promise.all([
        fetchInvoices(),
        fetchStudents(),
        fetchRecurringStudents(),
        fetchTemplates()
      ])
    }
  }, [academyId, fetchInvoices, fetchStudents, fetchRecurringStudents, fetchTemplates])

  // Event handlers
  const handleAddPayment = () => {
    setModalState({
      isOpen: true,
      mode: 'add',
      data: null
    })
  }

  const handleEditPayment = (invoice: Invoice) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      data: invoice
    })
  }

  const handleBulkAction = async (action: BulkAction) => {
    setBulkActionsLoading(true)
    try {
      switch (action.type) {
        case 'status_update':
          // Handle bulk status update
          break
        case 'delete':
          // Handle bulk delete
          break
        case 'export':
          // Handle export
          break
      }
    } catch (error) {
      console.error('Bulk action error:', error)
    } finally {
      setBulkActionsLoading(false)
    }
  }

  const handleModalClose = () => {
    setModalState({
      isOpen: false,
      mode: 'add',
      data: null
    })
  }

  const handleModalSave = async (data: any) => {
    // Handle save logic
    await fetchInvoices() // Refresh data
    handleModalClose()
  }

  // Loading state
  if (loading || translationLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
          <p className="text-gray-500">{t('payments.description')}</p>
        </div>
        <Button onClick={handleAddPayment} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('payments.addPayment')}
        </Button>
      </div>

      {/* Stats Dashboard */}
      <PaymentStats 
        invoices={invoices}
        templates={templates}
        activeTab={activeTab}
      />

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        {(['one_time', 'recurring', 'plans'] as PaymentTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-primary/10 text-primary border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {t(`payments.${tab}`)}
          </button>
        ))}
      </div>

      {/* Filters */}
      <PaymentFilters
        filters={filters}
        onFiltersChange={setFilters}
        activeTab={activeTab}
        selectedIds={selectedIds}
        onBulkAction={handleBulkAction}
        bulkActionsLoading={bulkActionsLoading}
      />

      {/* Content */}
      <PaymentsList
        activeTab={activeTab}
        invoices={invoices}
        templates={templates}
        recurringStudents={recurringStudents}
        filters={filters}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onEdit={handleEditPayment}
        onRefresh={fetchInvoices}
      />

      {/* Modal */}
      <PaymentModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        data={modalState.data}
        students={students}
        templates={templates}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  )
}