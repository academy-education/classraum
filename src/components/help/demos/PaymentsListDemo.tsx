"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { PaymentTabNavigation } from '@/components/ui/payments/PaymentTabNavigation'
import { PaymentStats } from '@/components/ui/payments/PaymentStats'
import { InvoiceTable } from '@/components/ui/payments/InvoiceTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { PaymentTemplate } from '@/hooks/payments/usePaymentData'
import { getInvoices } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Faithful Payments page demo — uses the real PaymentStats,
 * PaymentTabNavigation, and InvoiceTable components from the live page.
 * Sample data flows through the same components, so the visual layout
 * (columns, header sort affordances, status pills, search bar) is
 * identical to /payments.
 *
 * Sample invoices come from getInvoices(language) so names + invoice
 * labels swap with the user's language.
 */

const SAMPLE_TEMPLATES: PaymentTemplate[] = [
  {
    id: 't1', name: 'Monthly Tuition', amount: 320000, recurrence_type: 'monthly',
    is_active: true, academy_id: 'a1', created_at: '2025-09-01', enrolled_students_count: 23,
  },
]

export function PaymentsListDemo() {
  const { t, language } = useTranslation()
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')
  const [search, setSearch] = useState('')

  const invoices = useMemo(() => getInvoices(language), [language])

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        {/* Header — matches the real payments-page.tsx */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">
              {t('eyebrows.payments')}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('payments.title')}</h1>
            <p className="text-gray-500 text-sm">{t('payments.description')}</p>
          </div>
          <Button size="sm" className="h-9">
            <Plus className="w-4 h-4" /> {t('payments.addPayment')}
          </Button>
        </div>

        <PaymentStats invoices={invoices} templates={SAMPLE_TEMPLATES} />

        <div className="mt-6">
          <PaymentTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="mt-4">
          {/* InvoiceTable defines its own internal Invoice type with a
              status set ('pending' | 'paid' | 'failed' | 'refunded')
              that diverges from usePaymentData's Invoice
              ('pending' | 'paid' | 'overdue' | 'cancelled'). PaymentStats
              takes the latter, InvoiceTable the former — neither imports
              from the other. The cast is a known boundary, not a guess. */}
          <InvoiceTable
            invoices={invoices as unknown as Parameters<typeof InvoiceTable>[0]['invoices']}
            loading={false}
            searchQuery={search}
            onSearchChange={setSearch}
            onEditInvoice={() => undefined}
            onDeleteInvoice={() => undefined}
            onBulkStatusUpdate={() => undefined}
            showBulkActions
          />
        </div>
      </div>
    </NonFunctional>
  )
}
