"use client"

import { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeParams } from '@/hooks/useSafeParams'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Receipt, 
  Calendar, 
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  DollarSign,
  RefreshCw
} from 'lucide-react'

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
      const { data: invoiceData, error: invoiceError } = await supabase
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
      console.log('Invoice data structure:', JSON.stringify(invoiceData, null, 2))

      const formattedInvoice: InvoiceDetails = {
        id: invoiceData.id,
        amount: invoiceData.amount,
        finalAmount: invoiceData.final_amount || invoiceData.amount,
        discountAmount: invoiceData.discount_amount || 0,
        status: invoiceData.status,
        dueDate: invoiceData.due_date,
        description: studentName, // Will be translated in the UI component
        studentName: studentName,
        academyName,
        paymentMethod: invoiceData.payment_method,
        notes: invoiceData.discount_reason || invoiceData.transaction_id
      }

      return formattedInvoice
    } catch (error) {
      // Log invoice fetch error for debugging
      if (error && typeof error === 'object' && 'message' in error) {
        console.log('Invoice fetch failed:', (error as Error).message)
      }
      return null
    }
  }, [invoiceId, user])
  
  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [InvoiceDetails] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })

  const refetchInvoice = useCallback(async () => {
    if (!invoiceId || !user?.userId) {
      setInvoice(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🧾 [Invoice] Starting fetch for:', invoiceId)
      const result = await invoiceFetcher()
      console.log('✅ [Invoice] Fetch successful:', result)
      setInvoice(result)
    } catch (error) {
      console.error('❌ [Invoice] Fetch error:', error)
      setInvoice(null)
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [invoiceId, user?.userId, invoiceFetcher])

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (invoiceId && user?.userId) {
      refetchInvoice()
    }
  }, [invoiceId, user?.userId, refetchInvoice])


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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />
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
      default:
        return 'bg-gray-100 text-gray-800'
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
    return (
      <div className="p-4">
        {/* Real Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.invoices.title')}
            </h1>
          </div>
        </div>

        {/* Skeleton Content */}
        <div className="space-y-6">
          {/* Invoice Status Card Skeleton */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="text-right">
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Invoice Details Section Skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            
            <div className="space-y-3">
              {/* Student Card Skeleton */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Due Date Card Skeleton */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Payment Method Card Skeleton */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.invoices.title')}
          </h1>
        </div>
        <Card className="p-6">
          <div className="text-center">
            <p className="text-gray-500">{t('mobile.invoices.notFound')}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div 
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
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
      
      <div style={{ transform: `translateY(${pullDistance}px)` }} className="transition-transform">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.invoices.title')}
          </h1>
          <p className="text-sm text-gray-600">{invoice.academyName}</p>
          <p className="text-xs text-gray-500">{t('mobile.invoices.invoiceFor')} {invoice.description} • {t('mobile.invoices.invoiceNumber')}{invoice.id.slice(0, 8)}</p>
        </div>
      </div>


      {/* Invoice Status Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {getStatusIcon(invoice.status)}
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                {t(`mobile.invoices.status.${invoice.status}`) || invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">₩{invoice.amount.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Invoice Details */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('mobile.invoices.invoiceInformation')}</h3>
        
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.invoices.student')}</p>
                <p className="text-sm text-gray-600">{invoice.studentName}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('mobile.invoices.dueDate')}</p>
                <p className="text-sm text-gray-600">{formatDateWithTranslation(invoice.dueDate)}</p>
              </div>
            </div>
          </Card>

          {invoice.paidDate && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('mobile.invoices.paidDate')}</p>
                  <p className="text-sm text-gray-600">{formatDateWithTranslation(invoice.paidDate)}</p>
                </div>
              </div>
            </Card>
          )}

          {invoice.paymentMethod && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('mobile.invoices.paymentMethod')}</p>
                  <p className="text-sm text-gray-600">{t(`mobile.invoices.paymentMethods.${invoice.paymentMethod}`) || invoice.paymentMethod}</p>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <Card className="p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">{t('mobile.invoices.notes')}</h4>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        </Card>
      )}

      {/* Actions */}
      {invoice.status === 'paid' && (
        <div className="flex gap-3">
          <Button className="flex-1" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('mobile.invoices.downloadReceipt')}
          </Button>
        </div>
      )}

      {/* Make Payment Section */}
      {(invoice.status === 'pending' || invoice.status === 'overdue') && (
        <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary mr-2" />
              <h4 className="text-lg font-semibold text-primary">{t('mobile.invoices.makePayment')}</h4>
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
              <CreditCard className="w-4 h-4 mr-2" />
              {t('mobile.invoices.payNow')} ₩{invoice.amount.toLocaleString()}
            </Button>
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}