"use client"

import { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Filter
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

function MobileInvoicesPageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'refunded'>('all')

  const fetchAllInvoices = useCallback(async (): Promise<Invoice[]> => {
    if (!effectiveUserId || !isReady) {
      console.log('[Invoices] Not ready: effectiveUserId=', !!effectiveUserId, 'isReady=', isReady)
      return []
    }

    try {
      console.log('[Invoices] Fetching invoices for student:', effectiveUserId)

      // Primary query with all joins
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
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[Invoices] Primary query failed:', error)
        // Fallback: Try simplified query without complex joins
        return await fetchInvoicesSimplified()
      }

      if (!invoicesData || invoicesData.length === 0) {
        console.log('[Invoices] No invoices found with primary query, trying fallback')
        return await fetchInvoicesSimplified()
      }

      const formattedInvoices: Invoice[] = invoicesData.map((invoice) => {
        return {
          id: invoice.id,
          amount: invoice.final_amount || invoice.amount || 0,
          status: invoice.status || 'pending',
          dueDate: invoice.due_date || '',
          paidDate: invoice.paid_at || null,
          description: getInvoiceDescription(invoice),
          academyName: getAcademyName(invoice),
          paymentMethod: invoice.payment_method || null,
          notes: '',
          created_at: invoice.created_at || new Date().toISOString()
        }
      })

      console.log('[Invoices] Successfully fetched', formattedInvoices.length, 'invoices')
      return formattedInvoices
    } catch (error) {
      console.error('[Invoices] Error in primary fetch:', error)
      // Try fallback approach
      try {
        return await fetchInvoicesSimplified()
      } catch (fallbackError) {
        console.error('[Invoices] Fallback fetch also failed:', fallbackError)
        return []
      }
    }
  }, [effectiveUserId, isReady, t])

  // Helper function to safely get invoice description
  const getInvoiceDescription = useCallback((invoice: any): string => {
    try {
      // Try to get from recurring payment templates
      const templates = invoice.recurring_payment_templates
      if (templates) {
        if (Array.isArray(templates) && templates.length > 0) {
          return templates[0]?.name || String(t('mobile.invoices.invoice'))
        } else if (typeof templates === 'object' && templates.name) {
          return templates.name
        }
      }
      return String(t('mobile.invoices.invoice'))
    } catch (error) {
      console.warn('[Invoices] Error getting description:', error)
      return String(t('mobile.invoices.invoice'))
    }
  }, [t])

  // Helper function to safely get academy name
  const getAcademyName = useCallback((invoice: any): string => {
    try {
      const student = invoice.students
      if (!student) return 'Academy'

      // Handle different possible structures
      let academies = null
      if (Array.isArray(student)) {
        academies = student[0]?.academies
      } else if (typeof student === 'object') {
        academies = student.academies
      }

      if (!academies) return 'Academy'

      // Handle academies structure
      if (typeof academies === 'string') {
        return academies
      } else if (typeof academies === 'object') {
        if (Array.isArray(academies) && academies.length > 0) {
          return academies[0]?.name || 'Academy'
        } else if (academies.name) {
          return String(academies.name)
        }
      }

      return 'Academy'
    } catch (error) {
      console.warn('[Invoices] Error getting academy name:', error)
      return 'Academy'
    }
  }, [])

  // Fallback fetch strategy with simplified queries
  const fetchInvoicesSimplified = useCallback(async (): Promise<Invoice[]> => {
    try {
      console.log('[Invoices] Using simplified fallback fetch')

      // Step 1: Get basic invoices without complex joins
      const { data: basicInvoices, error: invoiceError } = await supabase
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
          created_at
        `)
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: false })

      if (invoiceError) {
        console.error('[Invoices] Basic invoice query failed:', invoiceError)
        return []
      }

      if (!basicInvoices || basicInvoices.length === 0) {
        console.log('[Invoices] No invoices found for student')
        return []
      }

      // Step 2: Get student info to find academy
      const { data: studentData } = await supabase
        .from('students')
        .select('academy_id')
        .eq('user_id', effectiveUserId)
        .single()

      let academyName = 'Academy'
      if (studentData?.academy_id) {
        const { data: academyData } = await supabase
          .from('academies')
          .select('name')
          .eq('id', studentData.academy_id)
          .single()

        if (academyData?.name) {
          academyName = academyData.name
        }
      }

      // Step 3: Format the invoices
      const formattedInvoices: Invoice[] = basicInvoices.map((invoice) => ({
        id: invoice.id,
        amount: invoice.final_amount || invoice.amount || 0,
        status: invoice.status || 'pending',
        dueDate: invoice.due_date || '',
        paidDate: invoice.paid_at || null,
        description: String(t('mobile.invoices.invoice')),
        academyName,
        paymentMethod: invoice.payment_method || null,
        notes: '',
        created_at: invoice.created_at || new Date().toISOString()
      }))

      console.log('[Invoices] Simplified fetch successful:', formattedInvoices.length, 'invoices')
      return formattedInvoices
    } catch (error) {
      console.error('[Invoices] Simplified fetch failed:', error)
      return []
    }
  }, [effectiveUserId, t])

  // Progressive loading for all invoices
  const invoicesFetcher = useCallback(async () => {
    console.log('🚀 [Invoices] Fetcher called with:', {
      effectiveUserId,
      isReady,
      hasUser: !!user
    })

    if (!effectiveUserId) {
      console.log('⏳ [Invoices] No effective user ID, returning empty array')
      return []
    }

    if (!isReady) {
      console.log('🏫 [Invoices] Not ready (likely no academy IDs), returning empty array')
      return []
    }

    try {
      console.log('🔄 [Invoices] Starting fetch for user:', effectiveUserId)
      const result = await fetchAllInvoices()
      console.log('✅ [Invoices] Fetch successful, got', result?.length || 0, 'invoices')
      return result || []
    } catch (error) {
      console.error('❌ [Invoices] Fetch error:', error)
      // Return empty array instead of throwing to prevent infinite loading
      return []
    }
  }, [effectiveUserId, isReady, fetchAllInvoices])
  
  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [MobileInvoices] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })

  const refetchInvoices = useCallback(async () => {
    if (!effectiveUserId || !hasAcademyIds || academyIds.length === 0) {
      setInvoices([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('🧾 [Invoices] Starting direct fetch...')
      const result = await invoicesFetcher()
      console.log('✅ [Invoices] Direct fetch successful:', result)
      setInvoices(result || [])
    } catch (error) {
      console.error('❌ [Invoices] Direct fetch error:', error)
      setInvoices([])
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [invoicesFetcher, effectiveUserId, hasAcademyIds, academyIds])

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (effectiveUserId && hasAcademyIds && academyIds.length > 0) {
      refetchInvoices()
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, refetchInvoices])

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
        return <RefreshCw className="w-5 h-5 text-primary" />
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
        return 'bg-primary/10 text-primary'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      await refetchInvoices()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
      simpleTabDetection.markAppLoaded()
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

  // Group invoices by status for easier browsing
  const allGroupedInvoices = {
    unpaid: (invoices || []).filter(i => ['pending', 'overdue', 'failed'].includes(i.status)),
    paid: (invoices || []).filter(i => i.status === 'paid'),
    refunded: (invoices || []).filter(i => i.status === 'refunded')
  }

  // Apply status filter
  const groupedInvoices = statusFilter === 'all' ? allGroupedInvoices : {
    unpaid: statusFilter === 'unpaid' ? allGroupedInvoices.unpaid : [],
    paid: statusFilter === 'paid' ? allGroupedInvoices.paid : [],
    refunded: statusFilter === 'refunded' ? allGroupedInvoices.refunded : []
  }

  const totalUnpaid = groupedInvoices.unpaid.reduce((sum, invoice) => sum + invoice.amount, 0)
  const unpaidCount = groupedInvoices.unpaid.length

  // Show loading skeleton while auth is loading
  if (authLoading) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          {/* Header - same as loaded state */}
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
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('common.refresh')}
            </Button>
          </div>

          {/* Status Filter Buttons - same as loaded state */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">{t('common.filter')}:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { key: 'all', label: t('mobile.invoices.filter.all') },
                { key: 'unpaid', label: t('mobile.invoices.filter.unpaid') },
                { key: 'paid', label: t('mobile.invoices.filter.paid') },
                { key: 'refunded', label: t('mobile.invoices.filter.refunded') }
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={filter.key === 'all' ? "default" : "outline"}
                  size="sm"
                  disabled
                  className="flex-shrink-0 text-xs"
                >
                  {filter.label} (0)
                </Button>
              ))}
            </div>
          </div>

          {/* Skeleton content */}
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </MobilePageErrorBoundary>
    )
  }

  // Show message when user is not ready
  if (!isReady) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.invoices.title')}
            </h1>
          </div>
          <Card className="p-6 text-center">
            <div className="space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-gray-600">
                {!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies')}
              </p>
            </div>
          </Card>
        </div>
      </MobilePageErrorBoundary>
    )
  }

  // Show loading skeleton while data is loading
  if (loading) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          {/* Header - same as loaded state */}
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
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {t('common.refresh')}
            </Button>
          </div>

          {/* Status Filter Buttons - same as loaded state */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">{t('common.filter')}:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { key: 'all', label: t('mobile.invoices.filter.all') },
                { key: 'unpaid', label: t('mobile.invoices.filter.unpaid') },
                { key: 'paid', label: t('mobile.invoices.filter.paid') },
                { key: 'refunded', label: t('mobile.invoices.filter.refunded') }
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={filter.key === 'all' ? "default" : "outline"}
                  size="sm"
                  disabled
                  className="flex-shrink-0 text-xs"
                >
                  {filter.label} (0)
                </Button>
              ))}
            </div>
          </div>

          {/* Skeleton content */}
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </MobilePageErrorBoundary>
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

      {/* Status Filter Buttons */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600">{t('common.filter')}:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: t('mobile.invoices.filter.all'), count: allGroupedInvoices.unpaid.length + allGroupedInvoices.paid.length + allGroupedInvoices.refunded.length },
            { key: 'unpaid', label: t('mobile.invoices.filter.unpaid'), count: allGroupedInvoices.unpaid.length },
            { key: 'paid', label: t('mobile.invoices.filter.paid'), count: allGroupedInvoices.paid.length },
            { key: 'refunded', label: t('mobile.invoices.filter.refunded'), count: allGroupedInvoices.refunded.length }
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={statusFilter === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
              className="flex-shrink-0 text-xs"
            >
              {filter.label} ({filter.count})
            </Button>
          ))}
        </div>
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
              <h2 className="text-lg font-semibold text-primary/80 flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                {t('mobile.invoices.refundedInvoices')} ({groupedInvoices.refunded.length})
              </h2>
              {groupedInvoices.refunded.map((invoice) => (
                <Card 
                  key={invoice.id} 
                  className="p-4 transition-all cursor-pointer hover:bg-gray-50 bg-primary/5 border-l-4 border-l-primary"
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
        <Card className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Receipt className="w-6 h-6 text-gray-300" />
            <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.invoices.noInvoices')}</div>
            <div className="text-gray-400 text-xs leading-tight">{t('mobile.invoices.noInvoicesDescription')}</div>
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}

export default function MobileInvoicesPage() {
  return (
    <MobilePageErrorBoundary>
      <MobileInvoicesPageContent />
    </MobilePageErrorBoundary>
  )
}