"use client"

import { useState, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { InvoiceTable } from '@/components/ui/payments/InvoiceTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { getInvoices } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Faithful Payments page demo — mirrors payments-page.tsx (lines
 * 2238-2350): four inline Card stat tiles with icon chip + uppercase
 * label + tabular value, pill-style segmented tab control, then the
 * real InvoiceTable component. Translation keys + sample data flow
 * through the same code paths the live page uses.
 */

const formatCurrency = (n: number) => `₩${n.toLocaleString()}`

export function PaymentsListDemo() {
  const { t, language } = useTranslation()
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')
  const [search, setSearch] = useState('')

  const invoices = useMemo(() => getInvoices(language), [language])

  // Stat values derived from sample invoices so amounts make sense.
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.final_amount, 0)
  const pendingAmount = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.final_amount, 0)
  const activeTemplates = 1
  const monthlyRecurring = 320000 * 23

  const tabs: { id: typeof activeTab; labelKey: string }[] = [
    { id: 'one_time', labelKey: 'payments.oneTime' },
    { id: 'recurring', labelKey: 'payments.recurring' },
    { id: 'plans', labelKey: 'payments.paymentPlans' },
  ]

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        {/* Header */}
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

        {/* Stats — mirrors payments-page.tsx:2238 (Card + colored icon
            chip + uppercase label + tabular value). */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {t('payments.totalRevenue')}
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {formatCurrency(totalRevenue)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {t('payments.pendingAmount')}
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {formatCurrency(pendingAmount)}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {t('payments.activeTemplates')}
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {activeTemplates}
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {t('payments.monthlyRecurringRevenue')}
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {formatCurrency(monthlyRecurring)}
            </p>
          </Card>
        </div>

        {/* Tabs — pill-style segmented (matches payments-page.tsx:2305) */}
        <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                idx > 0 ? 'ml-1' : ''
              } ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

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
    </NonFunctional>
  )
}
