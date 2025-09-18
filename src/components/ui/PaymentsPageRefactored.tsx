"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePaymentData } from '@/hooks/usePaymentData'

// Import extracted components
import { PaymentTabNavigation } from './payments/PaymentTabNavigation'
import { InvoiceTable } from './payments/InvoiceTable'
import { AddPaymentModal } from './payments/AddPaymentModal'
import { EditPaymentModal } from './payments/EditPaymentModal'
import { PaymentPlansModal } from './payments/PaymentPlansModal'

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

interface PaymentsPageProps {
  academyId: string
}

export function PaymentsPageRefactored({ academyId }: PaymentsPageProps) {
  const { t } = useTranslation()
  
  // Use custom hook for data management
  const {
    invoices,
    paymentTemplates,
    invoiceCounts,
    loading,
    templatesLoading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    updatePaymentTemplate,
    deletePaymentTemplate,
    bulkUpdateInvoiceStatus
  } = usePaymentData(academyId)

  // Suppress unused variable warning
  void paymentTemplates
  void templatesLoading

  // UI state
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false)
  const [showPaymentPlansModal, setShowPaymentPlansModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)

  // Memoized filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      if (activeTab === 'one_time') {
        return !invoice.template_id
      } else if (activeTab === 'recurring') {
        return !!invoice.template_id
      }
      return false
    })
  }, [invoices, activeTab])

  // Memoized handlers
  const handleAddPayment = React.useCallback(async (paymentData: {
    paymentType: string
    selectedStudents: { id: string }[]
    amount: number
    discountAmount: number
    dueDate: string
  }) => {
    try {
      if (paymentData.paymentType === 'one_time') {
        // Create one-time payments for selected students
        const promises = paymentData.selectedStudents.map((student) => 
          createInvoice({
            student_id: student.id,
            amount: paymentData.amount,
            discount_amount: paymentData.discountAmount,
            final_amount: paymentData.amount - paymentData.discountAmount,
            discount_reason: undefined,
            due_date: paymentData.dueDate,
            status: 'pending'
          })
        )
        await Promise.all(promises)
      } else {
        // Handle recurring payment creation
        // This would involve creating recurring payment records
        // Implementation depends on your recurring payment structure
        console.log('Creating recurring payments:', paymentData)
      }
    } catch (error) {
      console.error('Error creating payment:', error)
    }
  }, [createInvoice])

  const handleEditPayment = React.useCallback(async (invoiceData: Partial<Invoice>) => {
    if (!invoiceData.id) return
    
    try {
      await updateInvoice(invoiceData.id, invoiceData)
      setEditingInvoice(null)
    } catch (error) {
      console.error('Error updating payment:', error)
    }
  }, [updateInvoice])

  const handleDeletePayment = React.useCallback(async (invoice: Invoice) => {
    if (confirm(String(t('payments.confirmDelete')))) {
      try {
        await deleteInvoice(invoice.id)
      } catch (error) {
        console.error('Error deleting payment:', error)
      }
    }
  }, [deleteInvoice, t])

  const handleBulkStatusUpdate = React.useCallback(async (invoiceIds: string[], status: string) => {
    try {
      await bulkUpdateInvoiceStatus(invoiceIds, status)
    } catch (error) {
      console.error('Error updating payment status:', error)
    }
  }, [bulkUpdateInvoiceStatus])

  const handleEditInvoiceClick = React.useCallback((invoice: Invoice) => {
    setEditingInvoice(invoice)
    setShowEditPaymentModal(true)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('payments.title')}</h1>
          <p className="text-gray-600">{t('payments.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentPlansModal(true)} variant="outline">
            {t('payments.managePlans')}
          </Button>
          <Button onClick={() => setShowAddPaymentModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('payments.addPayment')}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <PaymentTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        invoiceCounts={invoiceCounts}
      />

      {/* Content based on active tab */}
      {activeTab === 'plans' ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">{t('payments.paymentPlansManagement')}</h3>
          <p className="text-gray-600 mb-4">{t('payments.paymentPlansDescription')}</p>
          <Button onClick={() => setShowPaymentPlansModal(true)}>
            {t('payments.managePlans')}
          </Button>
        </div>
      ) : (
        <InvoiceTable
          invoices={filteredInvoices}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEditInvoice={handleEditInvoiceClick}
          onDeleteInvoice={handleDeletePayment}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          showBulkActions={true}
        />
      )}

      {/* Modals */}
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSave={handleAddPayment}
        academyId={academyId}
        paymentTemplates={paymentTemplates}
      />

      <EditPaymentModal
        isOpen={showEditPaymentModal}
        onClose={() => {
          setShowEditPaymentModal(false)
          setEditingInvoice(null)
        }}
        onSave={handleEditPayment}
        invoice={editingInvoice}
      />

      <PaymentPlansModal
        isOpen={showPaymentPlansModal}
        onClose={() => setShowPaymentPlansModal(false)}
        onAddPlan={() => {
          // Handle add plan - would open AddPaymentPlanModal
          console.log('Add plan clicked')
        }}
        onEditPlan={(template) => {
          // Handle edit plan - would open EditPaymentPlanModal
          console.log('Edit plan clicked:', template)
        }}
        onDeletePlan={async (template) => {
          if (confirm(String(t('payments.confirmDeletePlan')))) {
            try {
              await deletePaymentTemplate(template.id)
            } catch (error) {
              console.error('Error deleting template:', error)
            }
          }
        }}
        onTogglePlan={async (template) => {
          try {
            await updatePaymentTemplate(template.id, { 
              is_active: !template.is_active 
            })
          } catch (error) {
            console.error('Error toggling template:', error)
          }
        }}
        onViewPayments={(template) => {
          // Handle view payments for template
          console.log('View payments for template:', template)
        }}
        paymentTemplates={paymentTemplates}
        loading={templatesLoading}
      />
    </div>
  )
}