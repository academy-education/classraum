"use client"

import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useMobileStore } from '@/stores/mobileStore'
import { Card } from '@/components/ui/card'
import { Eyebrow } from '@/components/ui/eyebrow'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MobileBackButton } from '@/components/ui/mobile/MobileBackButton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CardSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useStableCallback } from '@/hooks/useStableCallback'
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronRight,
  Filter,
  School
} from 'lucide-react'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

interface Invoice {
  id: string
  amount: number
  status: string
  dueDate: string
  paidDate?: string
  description: string
  academyName: string
  academyId?: string
  paymentMethod?: string
  notes?: string
  created_at: string
}

function MobileInvoicesPageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Status filter state — default to 'unpaid'. Parents open this screen
  // to PAY something; defaulting to 'all' interleaves paid history with
  // unpaid bills and forces them to filter on every visit. The "All / Paid /
  // Refunded" tabs are still right there for browsing history.
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'refunded'>('unpaid')
  const [selectedAcademyId, setSelectedAcademyId] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  // Get Zustand hydration status
  const _hasHydrated = useMobileStore(state => state._hasHydrated)

  const fetchAllInvoices = useCallback(async (): Promise<Invoice[]> => {
    if (!effectiveUserId) {
      return []
    }

    // PERFORMANCE: Check cache first (2-minute TTL)
    const cacheKey = `invoices-${effectiveUserId}-page${currentPage}-status${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setTotalCount(parsed.totalCount || 0)
        return parsed.invoices
      }
    } else {
    }

    try {

      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Build query with status filter
      let query = supabase
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
          invoice_name,
          recurring_payment_templates(
            name
          ),
          students!inner(
            academy_id,
            academies!inner(
              name
            )
          )
        `, { count: 'exact' })
        .eq('student_id', effectiveUserId)
        .is('deleted_at', null)

      // Apply status filter
      if (statusFilter === 'unpaid') {
        query = query.in('status', ['pending', 'overdue', 'failed'])
      } else if (statusFilter === 'paid') {
        query = query.eq('status', 'paid')
      } else if (statusFilter === 'refunded') {
        query = query.eq('status', 'refunded')
      }

      // Apply ordering and pagination
      const { data: invoicesData, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      // Update total count
      setTotalCount(count || 0)

      if (error) {
        console.warn('[Invoices] Primary query failed:', error)
        // Fallback: Try simplified query without complex joins
        return await fetchInvoicesSimplified()
      }

      if (!invoicesData || invoicesData.length === 0) {
        return await fetchInvoicesSimplified()
      }

      const formattedInvoices: Invoice[] = invoicesData.map((invoice) => {
        // Extract academy_id from invoice structure. supabase joined-relation
        // shape varies: single FK can come back as object or array depending
        // on inferred cardinality, so we handle both at runtime.
        let academyId: string | undefined
        const student = invoice.students as
          | { academy_id?: string }
          | { academy_id?: string }[]
          | null
          | undefined
        if (student) {
          if (Array.isArray(student)) {
            academyId = student[0]?.academy_id
          } else {
            academyId = student.academy_id
          }
        }
        return {
          id: invoice.id,
          amount: invoice.final_amount || invoice.amount || 0,
          status: invoice.status || 'pending',
          dueDate: invoice.due_date || '',
          paidDate: invoice.paid_at || null,
          description: getInvoiceDescription(invoice),
          academyName: getAcademyName(invoice),
          academyId,
          paymentMethod: invoice.payment_method || null,
          notes: '',
          created_at: invoice.created_at || new Date().toISOString()
        }
      })

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          invoices: formattedInvoices,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache invoices:', cacheError)
      }

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
  }, [effectiveUserId, currentPage, statusFilter, itemsPerPage])

  // Helper function to safely get invoice description
  const getInvoiceDescription = useCallback((invoice: any): string => {
    try {
      // First, check if there's an invoice_name field (highest priority)
      if (invoice.invoice_name) {
        return invoice.invoice_name
      }

      // Otherwise, try to get from recurring payment templates
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
      if (!student) return String(t('mobile.fallbacks.academy'))

      // Handle different possible structures
      let academies = null
      if (Array.isArray(student)) {
        academies = student[0]?.academies
      } else if (typeof student === 'object') {
        academies = student.academies
      }

      if (!academies) return String(t('mobile.fallbacks.academy'))

      // Handle academies structure
      if (typeof academies === 'string') {
        return academies
      } else if (typeof academies === 'object') {
        if (Array.isArray(academies) && academies.length > 0) {
          return academies[0]?.name || String(t('mobile.fallbacks.academy'))
        } else if (academies.name) {
          return String(academies.name)
        }
      }

      return String(t('mobile.fallbacks.academy'))
    } catch (error) {
      console.warn('[Invoices] Error getting academy name:', error)
      return String(t('mobile.fallbacks.academy'))
    }
  }, [t])

  // Fallback fetch strategy with simplified queries
  const fetchInvoicesSimplified = useCallback(async (): Promise<Invoice[]> => {
    try {

      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Step 1: Build query with status filter and pagination
      let query = supabase
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
        `, { count: 'exact' })
        .eq('student_id', effectiveUserId)
        .is('deleted_at', null)

      // Apply status filter
      if (statusFilter === 'unpaid') {
        query = query.in('status', ['pending', 'overdue', 'failed'])
      } else if (statusFilter === 'paid') {
        query = query.eq('status', 'paid')
      } else if (statusFilter === 'refunded') {
        query = query.eq('status', 'refunded')
      }

      // Apply ordering and pagination
      const { data: basicInvoices, error: invoiceError, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      // Update total count
      setTotalCount(count || 0)

      if (invoiceError) {
        console.error('[Invoices] Basic invoice query failed:', invoiceError)
        return []
      }

      if (!basicInvoices || basicInvoices.length === 0) {
        return []
      }

      // Step 2: Get student info to find academy
      const { data: studentData } = await supabase
        .from('students')
        .select('academy_id')
        .eq('user_id', effectiveUserId)
        .single()

      let academyName = String(t('mobile.fallbacks.academy'))
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

      return formattedInvoices
    } catch (error) {
      console.error('[Invoices] Simplified fetch failed:', error)
      return []
    }
  }, [effectiveUserId, currentPage, statusFilter, itemsPerPage, t])

  // Progressive loading for all invoices
  const invoicesFetcher = useCallback(async () => {

    if (!effectiveUserId) {
      return []
    }

    if (!isReady) {
      return []
    }

    try {
      const result = await fetchAllInvoices()
      return result || []
    } catch (error) {
      console.error('❌ [Invoices] Fetch error:', error)
      // Return empty array instead of throwing to prevent infinite loading
      return []
    }
  }, [effectiveUserId, fetchAllInvoices])
  
  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  // Replace useMobileData with direct useEffect pattern like working pages
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      return false
    }
    return true
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  // Error state — payment data has to distinguish "no bills due" from
  // "failed to load." A silent empty list on fetch failure is the worst
  // possible UX here: parents think they're caught up when they're not.
  const [fetchError, setFetchError] = useState<Error | null>(null)

  const refetchInvoices = useStableCallback(async () => {
    if (!effectiveUserId || !hasAcademyIds || academyIds.length === 0) {
      setInvoices([])
      setLoading(false)
      return
    }

    // Check cache first before setting loading state
    const cacheKey = `invoices-${effectiveUserId}-page${currentPage}-status${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    const hasValidCache = cachedData && cachedTimestamp &&
      (Date.now() - parseInt(cachedTimestamp)) < (2 * 60 * 1000)

    try {
      // Only show loading skeleton on initial load without cache, not on filter changes
      if (!hasValidCache && isInitialLoad && !simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      const result = await invoicesFetcher()
      setInvoices(result || [])
      setFetchError(null)
    } catch (error) {
      console.error('❌ [Invoices] Direct fetch error:', error)
      // Keep any existing invoices on screen (stale-while-error) so the
      // user doesn't lose the data they were already looking at, but
      // surface the error so they know the refresh didn't take.
      setFetchError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (effectiveUserId && hasAcademyIds && academyIds.length > 0) {
      refetchInvoices()
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, statusFilter, currentPage])

  // Get unique academies from invoices for multi-academy filter dropdown
  const uniqueAcademies = useMemo(() => {
    const academyMap = new Map<string, { id: string; name: string }>()
    invoices.forEach((invoice: Invoice) => {
      if (invoice.academyId && invoice.academyName && !academyMap.has(invoice.academyId)) {
        academyMap.set(invoice.academyId, { id: invoice.academyId, name: invoice.academyName })
      }
    })
    return Array.from(academyMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [invoices])

  // Filter invoices based on selected academy
  const filteredInvoices = useMemo(() => {
    if (selectedAcademyId === 'all') {
      return invoices
    }
    return invoices.filter((invoice: Invoice) => invoice.academyId === selectedAcademyId)
  }, [invoices, selectedAcademyId])

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
        return <CheckCircle className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
      case 'refunded':
        return <RefreshCw className="w-5 h-5 text-primary" strokeWidth={1.75} />
      default:
        return <Receipt className="w-5 h-5 text-gray-500" strokeWidth={1.75} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700'
      case 'pending':
        return 'bg-amber-50 text-amber-700'
      case 'overdue':
        return 'bg-rose-50 text-rose-700'
      case 'failed':
        return 'bg-rose-50 text-rose-700'
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

    // Invalidate cache before refreshing
    const cacheKey = `invoices-${effectiveUserId}-page${currentPage}-status${statusFilter}`
    sessionStorage.removeItem(cacheKey)
    sessionStorage.removeItem(`${cacheKey}-timestamp`)

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

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  // Show loading skeleton while auth is loading
  if (authLoading) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          {/* Header - same as loaded state */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MobileBackButton />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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
                  {filter.label}
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


  // Show loading skeleton ONLY when truly loading without data
  if (loading && invoices.length === 0) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          {/* Header - same as loaded state */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MobileBackButton />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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
                  {filter.label}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MobileBackButton />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              {t('mobile.invoices.allInvoices')}
            </h1>
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

      {/* Academy Filter - Only show if user has multiple academies */}
      {uniqueAcademies.length > 1 && (
        <div className="mb-4">
          <Card className="p-0 overflow-hidden">
            <Select
              value={selectedAcademyId}
              onValueChange={setSelectedAcademyId}
            >
              <SelectTrigger className="w-full h-auto px-5 py-6 border-0 shadow-none bg-transparent rounded-none hover:bg-gray-50 transition-colors [&>svg]:hidden">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <School className="w-4 h-4 text-sky-700" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <Eyebrow className="mb-0.5">
                      {t('mobile.home.academy')}
                    </Eyebrow>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      <SelectValue />
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={2} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mobile.assignments.grades.allAcademies')}</SelectItem>
                {uniqueAcademies.map(academy => (
                  <SelectItem key={academy.id} value={academy.id}>
                    {academy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>
        </div>
      )}

      {/* Status Filter Buttons */}
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
              variant={statusFilter === filter.key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.key as typeof statusFilter)}
              className="flex-shrink-0 text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Inline error banner — shown when the fetch failed but we still
          have stale invoices to display. Replaces the silent-failure
          pattern where the list just stopped updating. */}
      {fetchError && invoices.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 mb-3">
          <ErrorState
            size="sm"
            onRetry={() => { refetchInvoices() }}
          />
        </Card>
      )}

      {/* Invoices List */}
      {(loading && invoices.length === 0) ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : fetchError && invoices.length === 0 ? (
        // Full-page error when there's nothing cached to fall back to.
        // Critical: do NOT show the "all paid up" empty state here — a
        // network failure on the unpaid filter would otherwise read as
        // "you're caught up" when the user might actually owe money.
        <Card>
          <ErrorState onRetry={() => { refetchInvoices() }} />
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <EmptyState
            icon={Receipt}
            // When the user is on the (default) Unpaid filter and the list is
            // empty, celebrate caught-up status rather than the generic
            // "no invoices" message — that scenario means everything is paid,
            // which is the good outcome.
            title={String(
              statusFilter === 'unpaid'
                ? t('mobile.invoices.allPaidUp')
                : t('mobile.invoices.noInvoices')
            )}
            description={String(
              statusFilter === 'unpaid'
                ? t('mobile.invoices.allPaidUpDescription')
                : t('mobile.invoices.noInvoicesDescription')
            )}
            size="sm"
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {filteredInvoices.map((invoice) => {
              const isUnpaid = ['pending', 'overdue', 'failed'].includes(invoice.status)
              return (
                <Card
                  key={invoice.id}
                  className={`p-4 transition-all cursor-pointer hover:bg-gray-50 ${
                    invoice.status === 'overdue' || invoice.status === 'failed'
                      ? 'border-l-4 border-l-rose-400'
                      : invoice.status === 'pending'
                      ? 'border-l-4 border-l-amber-400'
                      : ''
                  }`}
                  onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon chip */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      invoice.status === 'paid' ? 'bg-emerald-50' :
                      invoice.status === 'pending' ? 'bg-amber-50' :
                      invoice.status === 'overdue' || invoice.status === 'failed' ? 'bg-rose-50' :
                      invoice.status === 'refunded' ? 'bg-primary/10' :
                      'bg-gray-50'
                    }`}>
                      {getStatusIcon(invoice.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {invoice.description}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {invoice.academyName}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1.5" />
                      </div>

                      <div className="flex items-center justify-between gap-3 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(invoice.status)}`}>
                          {t(`mobile.invoices.status.${invoice.status}`)}
                        </span>
                        <span className="text-base font-semibold text-gray-900 tabular-nums">
                          ₩{invoice.amount.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        {invoice.status === 'paid' && invoice.paidDate
                          ? `${t('mobile.invoices.paidOn')} ${formatDateWithTranslation(invoice.paidDate)}`
                          : `${t('mobile.invoices.due')} ${formatDateWithTranslation(invoice.dueDate)}`
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between px-2 py-3">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                {t('pagination.previous')}
              </Button>
              <span className="text-sm text-gray-700">
                {t('pagination.page')} {currentPage} / {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                variant="outline"
                size="sm"
              >
                {t('pagination.next')}
              </Button>
            </div>
          )}
        </>
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