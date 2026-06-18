"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { PaymentTabNavigation } from '@/components/ui/payments/PaymentTabNavigation'
import { PaymentStats } from '@/components/ui/payments/PaymentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, MoreHorizontal, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react'
import type { Invoice, PaymentTemplate } from '@/hooks/payments/usePaymentData'
import { NonFunctional } from './NonFunctional'

/**
 * Faithful Payments list view — uses the real PaymentTabNavigation +
 * PaymentStats components, then composes a simple invoice list with
 * real Card + Badge + Button primitives. The real PaymentsPage owns
 * many more concerns (filters, modals, pagination); this preserves the
 * key visual landmarks: tab navigation, hero stat cards, invoice rows
 * with status pills.
 */

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'inv-1', student_id: 's1', student_name: 'Alice Park', student_email: 'alice@example.com',
    amount: 320000, final_amount: 320000, status: 'paid',
    due_date: '2026-03-05', created_at: '2026-02-25',
  },
  {
    id: 'inv-2', student_id: 's2', student_name: 'Brian Cho', student_email: 'brian@example.com',
    amount: 280000, final_amount: 280000, status: 'pending',
    due_date: '2026-03-05', created_at: '2026-02-25',
  },
  {
    id: 'inv-3', student_id: 's3', student_name: 'Chloe Lim', student_email: 'chloe@example.com',
    amount: 350000, final_amount: 350000, status: 'overdue',
    due_date: '2026-03-01', created_at: '2026-02-20',
  },
  {
    id: 'inv-4', student_id: 's4', student_name: 'Daniel Han', student_email: 'daniel@example.com',
    amount: 200000, final_amount: 200000, status: 'pending',
    due_date: '2026-03-10', created_at: '2026-02-28',
  },
]

// Mirrors InvoiceTable.getStatusDisplay so the demo and real table use
// the same icons + color tokens for each status.
function statusDisplay(s: Invoice['status']) {
  switch (s) {
    case 'paid':
      return { icon: CheckCircle, text: 'Paid', className: 'text-green-600 bg-green-50' }
    case 'pending':
      return { icon: Clock, text: 'Pending', className: 'text-yellow-600 bg-yellow-50' }
    case 'overdue':
      return { icon: XCircle, text: 'Overdue', className: 'text-rose-600 bg-red-50' }
    case 'cancelled':
      return { icon: RotateCcw, text: 'Cancelled', className: 'text-gray-600 bg-gray-50' }
    default:
      return { icon: Clock, text: s, className: 'text-gray-600 bg-gray-50' }
  }
}

const SAMPLE_TEMPLATES: PaymentTemplate[] = [
  {
    id: 't1', name: 'Monthly Tuition', amount: 320000, recurrence_type: 'monthly',
    is_active: true, academy_id: 'a1', created_at: '2025-09-01', enrolled_students_count: 23,
  },
]

export function PaymentsListDemo() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'one_time' | 'recurring' | 'plans'>('one_time')

  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.payments')}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('payments.title')}</h1>
            <p className="text-gray-500 text-sm">{t('payments.description')}</p>
          </div>
          <Button size="sm" className="h-9">
            <Plus className="w-4 h-4" /> {t('payments.addPayment')}
          </Button>
        </div>

        <PaymentStats invoices={SAMPLE_INVOICES} templates={SAMPLE_TEMPLATES} />

        <div className="mt-6">
          <PaymentTabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            invoiceCounts={{ one_time: SAMPLE_INVOICES.length, recurring: 18, plans: 3 }}
          />
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 mt-4 mb-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
            <Input placeholder={String(t('payments.searchInvoices'))} className="h-9 pl-9 text-sm" />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-3.5 h-3.5" /> {t('common.filter')}
          </Button>
        </div>

        {/* Invoice list */}
        <Card className="!gap-0 !py-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">
            <div>Student</div>
            <div className="text-right">Amount</div>
            <div>Status</div>
            <div>Due</div>
            <div className="w-6" />
          </div>
          {SAMPLE_INVOICES.map(inv => {
            const sd = statusDisplay(inv.status)
            const Icon = sd.icon
            return (
              <div
                key={inv.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-b-0 text-sm hover:bg-gray-50"
              >
                <div>
                  <div className="text-gray-900 font-medium">{inv.student_name}</div>
                  <div className="text-xs text-gray-500">{inv.student_email}</div>
                </div>
                <div className="text-right text-gray-900 tabular-nums font-medium">
                  ₩ {inv.final_amount.toLocaleString()}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${sd.className}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {sd.text}
                </div>
                <div className="text-xs text-gray-500 tabular-nums">{inv.due_date}</div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            )
          })}
        </Card>
      </div>
    </NonFunctional>
  )
}
