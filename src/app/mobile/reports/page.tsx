"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ErrorState } from '@/components/ui/common/ErrorState'
import {
  Search,
  FileText,
  User,
  RefreshCw,
  CalendarDays,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ChevronRight
} from 'lucide-react'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useStableCallback } from '@/hooks/useStableCallback'

interface ReportData {
  id: string
  student_id: string
  student_name: string
  student_email: string
  report_name?: string
  start_date?: string
  end_date?: string
  status?: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
  created_at: string
  updated_at: string
  feedback?: string
  ai_feedback_enabled?: boolean
  ai_feedback_created_at?: string
  selected_subjects?: string[]
  selected_classrooms?: string[]
}

function MobileReportsPageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user, isAuthenticated, isInitializing } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const { effectiveUserId, isReady, isLoading: authLoading } = useEffectiveUserId()

  const [reports, setReports] = useState<ReportData[]>([])
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(() => {
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      return false
    }
    return true
  })
  const [searchQuery, setSearchQuery] = useState('')

  // Sort state for start date
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchReports = useStableCallback(async () => {
    if (!effectiveUserId || !isReady) {
      return
    }

    // PERFORMANCE: Check cache first (5-minute TTL)
    const cacheKey = `reports-${effectiveUserId}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setReports(parsed.reports || [])
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        return
      }
    } else {
    }

    try {
      setLoading(true)


      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Get student reports for the effective user (selected student for parents, current user for students)
      // Note: RPC doesn't support pagination/count, so we use direct query with pagination
      const allowedStatuses = ['Finished', 'Approved', 'Sent', 'Viewed']

      const query = supabase
        .from('student_reports')
        .select('*', { count: 'exact' })
        .eq('student_id', effectiveUserId)
        .in('status', allowedStatuses)
        .order('created_at', { ascending: false })

      // Apply pagination
      const { data: reportsData, error: reportsError, count } = await query.range(from, to)

      // Update total count
      setTotalCount(count || 0)


      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        setFetchError(new Error(reportsError.message || 'Failed to load reports'))
        return
      }
      setFetchError(null)

      if (!reportsData || reportsData.length === 0) {
        setReports([])
        // PERFORMANCE: Cache empty results too
        try {
          const dataToCache = { reports: [], totalCount: 0 }
          sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        } catch (cacheError) {
          console.warn('[Performance] Failed to cache empty reports:', cacheError)
        }
        return
      }

      // Get unique student IDs from reports
      const studentIds = [...new Set(reportsData.map((report: any) => report.student_id))]

      // Get student names and emails
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          user_id,
          users!students_user_id_fkey(name, email)
        `)
        .in('user_id', studentIds)

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        // Still show reports even if student names fail
      }

      // Create a map of student info
      const studentMap = new Map()
      if (studentsData) {
        studentsData.forEach(student => {
          studentMap.set(student.user_id, {
            name: (student.users as any)?.name || String(t('mobile.fallbacks.unknownStudent')),
            email: (student.users as any)?.email || ''
          })
        })
      }

      // Transform the data to match our interface
      const transformedReports = reportsData.map((report: any) => ({
        ...report,
        student_name: studentMap.get(report.student_id)?.name || String(t('mobile.fallbacks.unknownStudent')),
        student_email: studentMap.get(report.student_id)?.email || ''
      }))

      setReports(transformedReports)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          reports: transformedReports,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache reports:', cacheError)
      }
    } catch (error) {
      console.error('Error:', error)
      setFetchError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    // Invalidate cache before refreshing
    const cacheKey = `reports-${effectiveUserId}-page${currentPage}`
    sessionStorage.removeItem(cacheKey)
    sessionStorage.removeItem(`${cacheKey}-timestamp`)

    try {
      await fetchReports()
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


  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  useEffect(() => {
    if (effectiveUserId && isReady) {
      fetchReports()
    }
  }, [effectiveUserId, isReady, currentPage])

  // Client-side search filtering and sorting for displayed reports
  const filteredReports = (() => {
    const filtered = searchQuery
      ? reports.filter(report =>
          report.report_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.student_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : reports

    // Sort by start_date
    return filtered.sort((a, b) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : 0
      const bDate = b.start_date ? new Date(b.start_date).getTime() : 0
      return sortDirection === 'desc' ? bDate - aDate : aDate - bDate
    })
  })()

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const getStatusTranslation = (status?: string) => {
    const statusKey = status?.toLowerCase() || 'draft'
    return t(`mobile.reports.status.${statusKey}`) || status || String(t('mobile.fallbacks.draft'))
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-50 text-gray-700'
      case 'Finished': return 'bg-sky-50 text-sky-700'
      case 'Approved': return 'bg-emerald-50 text-emerald-700'
      case 'Sent': return 'bg-violet-50 text-violet-700'
      case 'Viewed': return 'bg-amber-50 text-amber-700'
      case 'Error': return 'bg-rose-50 text-rose-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  // Status-colored dot anchor — same pattern as the timeline rail on
  // session cards and home invoice cards.
  const getStatusDotColor = (status?: string) => {
    switch (status) {
      case 'Draft': return '#9ca3af'      // gray-400
      case 'Finished': return '#0ea5e9'   // sky-500
      case 'Approved': return '#10b981'   // emerald-500
      case 'Sent': return '#8b5cf6'       // violet-500
      case 'Viewed': return '#f59e0b'     // amber-500
      case 'Error': return '#f43f5e'      // rose-500
      default: return '#9ca3af'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: language === 'korean' ? 'long' : 'short',
      day: 'numeric'
    })
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Show loading skeleton ONLY when truly loading without data
  if (authLoading || (loading && reports.length === 0)) {
    return (
      <div className="p-4">
        {/* Show real header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('mobile.reports.title')}
          </h1>
        </div>

        {/* Show real search bar - exact same as loaded state */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={String(t('common.search'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Show skeleton for content only */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show message when user is not ready
  if (!isReady) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('mobile.reports.title')}
          </h1>
        </div>
        <Card>
          <EmptyState
            icon={FileText}
            title={String(!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies'))}
            size="sm"
          />
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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {t('mobile.reports.title')}
          </h1>

        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={String(t('common.search'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Button */}
        <div className="mb-4">
          <button
            onClick={() => {
              setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
            }}
            className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
              'border-primary text-primary bg-primary/5'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <div className="flex flex-col items-start">
              <span>{t('mobile.reports.sort.startDate')}</span>
            </div>
            {sortDirection === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Content */}
        {(loading && reports.length === 0) ? (
          <StaggeredListSkeleton items={4} variant="message" />
        ) : fetchError && reports.length === 0 ? (
          <Card>
            <ErrorState onRetry={() => { fetchReports() }} />
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title={String(searchQuery ? t('common.noResults') : t('mobile.reports.noReports'))}
              description={String(searchQuery ? t('mobile.assignments.tryDifferentSearch') : t('mobile.reports.noReportsDesc'))}
              size="sm"
            />
          </Card>
        ) : (
          <>
            <div className="space-y-2.5">
              {filteredReports.map((report) => (
                <Card
                  key={report.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => router.push(`/mobile/report/${report.id}`)}
                >
                  <div className="flex items-start gap-3">
                    {/* Status-color dot — matches sessions / invoice cards */}
                    <div className="flex flex-col items-center pt-1.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getStatusDotColor(report.status) }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top row: student name eyebrow + status pill */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500 truncate">
                          <User className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                          <span className="truncate">{report.student_name}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${getStatusColor(report.status)}`}>
                          {getStatusTranslation(report.status)}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="font-semibold text-base text-gray-900 mb-1 truncate">
                        {report.report_name || t('mobile.reports.untitledReport')}
                      </div>

                      {/* Period meta row */}
                      {report.start_date && report.end_date && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />
                          <span className="truncate">
                            {formatDate(report.start_date)} – {formatDate(report.end_date)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow — same position as sessions / invoice cards */}
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1.5" />
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {!searchQuery && totalPages > 1 && (
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

export default function MobileReportsPage() {
  return (
    <MobilePageErrorBoundary>
      <MobileReportsPageContent />
    </MobilePageErrorBoundary>
  )
}