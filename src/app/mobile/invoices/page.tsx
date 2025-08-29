"use client"

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Receipt, 
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronRight
} from 'lucide-react'

interface Invoice {
  id: string
  amount: number
  status: string
  dueDate: string
  paidDate?: string
  description: string
  academyName: string
  paymentMethod?: string
  notes?: string
  created_at: string
}

export default function MobileInvoicesPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()

  const fetchAllInvoices = useCallback(async (): Promise<Invoice[]> => {
    if (!user?.userId) return []

    try {
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          final_amount,
          discount_amount,
          status,
          due_date,
          paid_at,
          payment_method,
          created_at,
          recurring_payment_templates(
            name
          ),
          students!inner(
            academy_id,
            academies!inner(
              name
            )
          )
        `)
        .eq('student_id', user.userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      interface SupabaseInvoice {
        id: string
        amount: number
        final_amount?: number
        discount_amount?: number
        status: string
        due_date: string
        paid_at?: string
        payment_method?: string
        created_at: string
        recurring_payment_templates?: {
          name: string
        }
        students?: {
          academy_id: string
          academies?: {
            name: string
          }
        }
        discount_reason?: string
        transaction_id?: string
      }

      const formattedInvoices: Invoice[] = invoicesData.map((invoice: SupabaseInvoice) => {
        return {
          id: invoice.id,
          amount: invoice.final_amount || invoice.amount,
          status: invoice.status,
          dueDate: invoice.due_date,
          paidDate: invoice.paid_at,
          description: invoice.recurring_payment_templates?.name || t('mobile.invoices.invoice'),
          academyName: invoice.students?.academies?.name || 'Academy',
          paymentMethod: invoice.payment_method,
          notes: invoice.discount_reason || invoice.transaction_id,
          created_at: invoice.created_at
        }
      })

      return formattedInvoices
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
  }, [user, t])

  // Progressive loading for all invoices
  const invoicesFetcher = useCallback(async () => {
    if (!user?.userId) return []
    return await fetchAllInvoices()
  }, [user, fetchAllInvoices])
  
  const {
    data: invoices = [],
    isLoading: loading,
    refetch: refetchInvoices
  } = useMobileData(
    'all-invoices',
    invoicesFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true
    }
  )

  const formatDateWithTranslation = (dateString: string): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const date = new Date(dateString)
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString(locale, options)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffHours < 1) {
      return t('mobile.notifications.justNow')
    } else if (diffHours < 24) {
      return t('mobile.notifications.hoursAgo', { count: diffHours })
    } else if (diffDays < 7) {
      return t('mobile.notifications.daysAgo', { count: diffDays })
    } else if (diffWeeks < 4) {
      return t('mobile.notifications.weeksAgo', { count: diffWeeks })
    } else {
      return t('mobile.notifications.monthsAgo', { count: diffMonths })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'refunded':
        return <RefreshCw className="w-5 h-5 text-blue-500" />
      default:
        return <Receipt className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Group invoices by status for easier browsing
  const groupedInvoices = {
    unpaid: (invoices || []).filter(i => ['pending', 'overdue', 'failed'].includes(i.status)),
    paid: (invoices || []).filter(i => i.status === 'paid'),
    refunded: (invoices || []).filter(i => i.status === 'refunded')
  }

  const totalUnpaid = groupedInvoices.unpaid.reduce((sum, invoice) => sum + invoice.amount, 0)
  const unpaidCount = groupedInvoices.unpaid.length

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              {t('mobile.invoices.allInvoices')}
            </h1>
            {unpaidCount > 0 && (
              <p className="text-sm text-red-600 mt-1">
                {t('mobile.invoices.unpaidSummary', { count: unpaidCount, amount: totalUnpaid.toLocaleString() })}
              </p>
            )}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchInvoices()}
          className="text-xs"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="space-y-4">
          {/* Unpaid Invoices Section */}
          {groupedInvoices.unpaid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t('mobile.invoices.unpaidInvoices')} ({groupedInvoices.unpaid.length})
              </h2>
              {groupedInvoices.unpaid.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className="p-4 transition-all cursor-pointer hover:bg-gray-50 border-l-4 border-l-red-500"
                  onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(invoice.status)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.description}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {invoice.academyName}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {t(`mobile.invoices.status.${invoice.status}`)}
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                              ₩{invoice.amount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {t('mobile.invoices.due')}: {formatDateWithTranslation(invoice.dueDate)} • {formatTimeAgo(invoice.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Paid Invoices Section */}
          {groupedInvoices.paid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {t('mobile.invoices.paidInvoices')} ({groupedInvoices.paid.length})
              </h2>
              {groupedInvoices.paid.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className="p-4 transition-all cursor-pointer hover:bg-gray-50 bg-green-50 border-l-4 border-l-green-500"
                  onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(invoice.status)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.description}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {invoice.academyName}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {t(`mobile.invoices.status.${invoice.status}`)}
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                              ₩{invoice.amount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {t('mobile.invoices.paidOn')}: {invoice.paidDate ? formatDateWithTranslation(invoice.paidDate) : '—'} • {formatTimeAgo(invoice.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Refunded Invoices Section */}
          {groupedInvoices.refunded.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {t('mobile.invoices.refundedInvoices')} ({groupedInvoices.refunded.length})
              </h2>
              {groupedInvoices.refunded.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className="p-4 transition-all cursor-pointer hover:bg-gray-50 bg-blue-50 border-l-4 border-l-blue-500"
                  onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(invoice.status)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {invoice.description}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {invoice.academyName}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {t(`mobile.invoices.status.${invoice.status}`)}
                            </span>
                            <span className="text-lg font-bold text-gray-900">
                              ₩{invoice.amount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(invoice.created_at)}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">{t('mobile.invoices.noInvoices')}</p>
          <p className="text-sm">{t('mobile.invoices.noInvoicesDescription')}</p>
        </Card>
      )}
    </div>
  )
}