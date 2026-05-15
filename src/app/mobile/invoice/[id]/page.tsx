"use client"

import { useCallback, useState, useRef, useEffect } from 'react'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Button } from '@/components/ui/button'
import { InvoiceDetailSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft,
  Receipt,
  Calendar,
  CreditCard,
  CheckCircle,
  DollarSign,
  RefreshCw,
  User
} from 'lucide-react'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

interface InvoiceDetails {
  id: string
  amount: number
  finalAmount: number
  discountAmount: number
  status: string
  dueDate: string
  paidDate?: string
  description: string
  studentName: string
  academyName: string
  paymentMethod?: string
  notes?: string
}

export default function MobileInvoiceDetailsPage() {
  const router = useRouter()
  const params = useSafeParams()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()

  const invoiceId = params?.id || ''

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Progressive loading for invoice details
  const invoiceFetcher = useCallback(async () => {
    if (!invoiceId || !user?.userId) return null
    
    try {
      // Get invoice with academy details
      const { data: invoiceData, error: invoiceError} = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          final_amount,
          discount_amount,
          discount_reason,
          status,
          due_date,
          student_id,
          payment_method,
          transaction_id,
          invoice_name,
          recurring_payment_templates(
            name
          ),
          students!inner(
            user_id,
            name:users!inner(name),
            academy_id,
            academies!inner(name)
          )
        `)
        .eq('id', invoiceId)
        .single()

      let academyName = 'Academy'
      let studentName = 'Student'
      
      if (invoiceData?.students) {
        const student = invoiceData.students as unknown as Record<string, unknown>
        
        // Extract student name - try different possible structures
        if ((student as Record<string, unknown>)?.name) {
          const name = (student as Record<string, unknown>).name
          if (typeof name === 'string') {
            studentName = name
          } else if (typeof name === 'object' && name && (name as Record<string, unknown>).name) {
            studentName = (name as Record<string, unknown>).name as string
          } else if (Array.isArray(name) && name[0] && (name[0] as Record<string, unknown>)?.name) {
            studentName = (name[0] as Record<string, unknown>).name as string
          }
        }
        
        // Extract academy name - try different possible structures  
        if ((student as Record<string, unknown>)?.academies) {
          const academies = (student as Record<string, unknown>).academies
          if (typeof academies === 'string') {
            academyName = academies
          } else if (typeof academies === 'object' && academies && (academies as Record<string, unknown>).name) {
            academyName = (academies as Record<string, unknown>).name as string
          } else if (Array.isArray(academies) && academies[0] && (academies[0] as Record<string, unknown>)?.name) {
            academyName = (academies[0] as Record<string, unknown>).name as string
          }
        }
      }

      if (invoiceError) throw invoiceError

      // Debug: Log the actual data structure to understand the format

      // Get invoice description from invoice_name or template name
      let invoiceDescription = studentName
      if (invoiceData.invoice_name) {
        invoiceDescription = invoiceData.invoice_name
      } else if (invoiceData.recurring_payment_templates) {
        // supabase joined-relation shape varies — single FK can come back as
        // either an array or an object depending on inferred cardinality.
        // Cast to the union and let the runtime check pick the right branch.
        const templates = invoiceData.recurring_payment_templates as
          | { name?: string }
          | { name?: string }[]
        if (Array.isArray(templates) && templates.length > 0 && templates[0]?.name) {
          invoiceDescription = templates[0].name
        } else if (!Array.isArray(templates) && templates.name) {
          invoiceDescription = templates.name
        }
      }

      const formattedInvoice: InvoiceDetails = {
        id: invoiceData.id,
        amount: invoiceData.amount,
        finalAmount: invoiceData.final_amount || invoiceData.amount,
        discountAmount: invoiceData.discount_amount || 0,
        status: invoiceData.status,
        dueDate: invoiceData.due_date,
        description: invoiceDescription,
        studentName: studentName,
        academyName,
        paymentMethod: invoiceData.payment_method,
        notes: invoiceData.discount_reason || invoiceData.transaction_id
      }

      return formattedInvoice
    } catch (error) {
      // Log invoice fetch error for debugging
      if (error && typeof error === 'object' && 'message' in error) {
      }
      return null
    }
  }, [invoiceId, user])
  
  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      return false
    }
    return true
  })

  const refetchInvoice = useStableCallback(async () => {
    if (!invoiceId || !user?.userId) {
      setInvoice(null)
      setLoading(false)
      return
    }

    try {
      if (!simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      const result = await invoiceFetcher()
      setInvoice(result)
    } catch (error) {
      console.error('❌ [Invoice] Fetch error:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (invoiceId && user?.userId) {
      refetchInvoice()
    }
  }, [invoiceId, user?.userId])


  const formatDateWithTranslation = (dateString: string): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const date = new Date(dateString)
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return date.toLocaleDateString(locale, options)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700'
      case 'pending':
        return 'bg-amber-50 text-amber-700'
      case 'overdue':
      case 'failed':
        return 'bg-rose-50 text-rose-700'
      case 'refunded':
        return 'bg-violet-50 text-violet-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  // Status-color dot — same palette as the home invoice card hero anchor
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981'    // emerald-500
      case 'pending': return '#f59e0b' // amber-500
      case 'overdue':
      case 'failed': return '#f43f5e'  // rose-500
      case 'refunded': return '#8b5cf6' // violet-500
      default: return '#9ca3af'        // gray-400
    }
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      await refetchInvoice()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  if (loading) {
    return <InvoiceDetailSkeleton />
  }

  if (!invoice) {
    return (
      <div className="p-4 space-y-6">
        {/* Top bar — back button only, matches session detail */}
        <div className="px-1 py-1">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label={String(t('common.back') || 'Back')}
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500">{t('mobile.invoices.notFound')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      {...(MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      })}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <div style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }} className="transition-transform">
      {/* Top bar — back button only, matches session detail */}
      <div className="px-1 py-1 mb-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white ring-1 ring-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label={String(t('common.back') || 'Back')}
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Hero strip — status-color dot + eyebrow + title + meta + status pill */}
      <div className="mb-6 px-1">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getStatusDotColor(invoice.status) }}
          />
          <Eyebrow as="span">
            {invoice.academyName}
          </Eyebrow>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 leading-tight">
          {invoice.description}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {t('mobile.invoices.invoiceNumber')}{invoice.id.slice(0, 8).toUpperCase()}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}>
            {t(`mobile.invoices.status.${invoice.status}`) || invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Amount card — invoice-unique focal element, same chrome as other cards */}
      <Card className="p-5 mb-6">
        <Eyebrow className="mb-1">
          {t('mobile.invoices.amount')}
        </Eyebrow>
        <p className="text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
          ₩{invoice.amount.toLocaleString()}
        </p>
      </Card>

      {/* Invoice Details — single panel with divide-y, matches session pattern (icon+label LEFT, value RIGHT) */}
      <div className="mb-6">
        <Eyebrow className="mb-2 px-1">
          {t('mobile.invoices.invoiceInformation')}
        </Eyebrow>
        <Card className="divide-y divide-gray-100 py-0 gap-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
              <span className="text-sm text-gray-700">{t('mobile.invoices.student')}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate ml-3">{invoice.studentName}</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
              <span className="text-sm text-gray-700">{t('mobile.invoices.dueDate')}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate ml-3">{formatDateWithTranslation(invoice.dueDate)}</span>
          </div>
          {invoice.paidDate && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                <span className="text-sm text-gray-700">{t('mobile.invoices.paidDate')}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 truncate ml-3">{formatDateWithTranslation(invoice.paidDate)}</span>
            </div>
          )}
          {invoice.paymentMethod && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
                <span className="text-sm text-gray-700">{t('mobile.invoices.paymentMethod')}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 truncate ml-3">{t(`mobile.invoices.paymentMethods.${invoice.paymentMethod}`) || invoice.paymentMethod}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Notes — matches session notes pattern */}
      {invoice.notes && (
        <div className="mb-6">
          <Eyebrow className="mb-2 px-1">
            {t('mobile.invoices.notes')}
          </Eyebrow>
          <Card className="p-4">
            <p className="text-sm text-gray-700 leading-relaxed">{invoice.notes}</p>
          </Card>
        </div>
      )}

      {/* Receipt download intentionally not rendered — the underlying
          endpoint isn't wired yet. A non-functional button on the
          highest-trust screen (a payment confirmation) does more harm
          than just leaving it out. Restore this block once the receipt
          PDF / hosted PortOne URL is reachable from invoice.transaction_id. */}

      {/* Make Payment Section — kept distinct since it's the page's primary action */}
      {(invoice.status === 'pending' || invoice.status === 'overdue') && (
        <Card className="p-5 mb-6 bg-primary/5 ring-primary/20">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" strokeWidth={1.75} />
              <h4 className="text-base font-semibold text-primary">{t('mobile.invoices.makePayment')}</h4>
            </div>
            <p className="text-sm text-primary/80">
              {invoice.status === 'overdue'
                ? t('mobile.invoices.paymentOverdue')
                : t('mobile.invoices.paymentDue')}
            </p>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => router.push(`/mobile/invoice/${invoice.id}/pay`)}
            >
              <CreditCard className="w-4 h-4 mr-2" strokeWidth={1.75} />
              {t('mobile.invoices.payNow')} ₩{invoice.amount.toLocaleString()}
            </Button>
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}