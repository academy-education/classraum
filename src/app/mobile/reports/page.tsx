"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Search,
  FileText,
  Download,
  Eye,
  User,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

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

export default function MobileReportsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user, isAuthenticated, isInitializing } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()

  // Get effective user ID - use selected student if parent, otherwise use current user
  const effectiveUserId = user?.role === 'parent' && selectedStudent ? selectedStudent.id : user?.userId

  // DEBUG: Log student selection changes
  useEffect(() => {
    console.log('🔍 [REPORTS DEBUG] Student Selection State:', {
      userRole: user?.role,
      userId: user?.userId,
      selectedStudent: selectedStudent,
      effectiveUserId: effectiveUserId,
      timestamp: new Date().toISOString()
    })
  }, [user?.role, user?.userId, selectedStudent, effectiveUserId])

  const [reports, setReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchReports = useCallback(async () => {
    if (!user || !isAuthenticated || !effectiveUserId) {
      console.log('🚫 [REPORTS DEBUG] Missing user data:', { user: !!user, isAuthenticated, effectiveUserId })
      return
    }

    try {
      setLoading(true)

      console.log('🔄 [REPORTS DEBUG] Starting fetchReports:', {
        effectiveUserId,
        userRole: user?.role,
        selectedStudent: selectedStudent?.name,
        timestamp: new Date().toISOString()
      })

      // Get student reports for the effective user (selected student for parents, current user for students)
      // FIXED: Use RPC to bypass RLS
      let { data: reportsData, error: reportsError } = await supabase
        .rpc('get_student_reports', {
          student_uuid: effectiveUserId
        })

      console.log('🔧 [REPORTS DEBUG] Using RPC function:', {
        rpc_function: 'get_student_reports',
        student_uuid: effectiveUserId,
        error: reportsError,
        result_count: reportsData?.length || 0
      })

      // Fallback to direct query if RPC fails
      if (reportsError || !reportsData || reportsData.length === 0) {
        console.log('🔄 [REPORTS DEBUG] RPC failed, trying direct query...')
        const { data: directReports, error: directError } = await supabase
          .from('student_reports')
          .select('*')
          .eq('student_id', effectiveUserId)
          .order('created_at', { ascending: false })
        reportsData = directReports
        reportsError = directError
      }

      console.log('📊 [REPORTS DEBUG] Reports query result:', {
        query: 'student_reports with student_id',
        student_id: effectiveUserId,
        result_count: reportsData?.length || 0,
        error: reportsError,
        reports: reportsData
      })

      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        return
      }

      if (!reportsData || reportsData.length === 0) {
        setReports([])
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
            name: (student.users as any)?.name || 'Unknown Student',
            email: (student.users as any)?.email || ''
          })
        })
      }

      // Transform the data to match our interface
      const transformedReports = reportsData.map((report: any) => ({
        ...report,
        student_name: studentMap.get(report.student_id)?.name || 'Unknown Student',
        student_email: studentMap.get(report.student_id)?.email || ''
      }))

      setReports(transformedReports)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [user, isAuthenticated, effectiveUserId])

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

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


  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const filteredReports = reports.filter(report => {
    // DEBUG: Log each report's status for debugging
    console.log('🔍 [REPORTS FILTER DEBUG] Report:', {
      id: report.id,
      name: report.report_name,
      status: report.status,
      student_name: report.student_name
    })

    // Only show reports that are not Draft or Error
    const allowedStatuses = ['Finished', 'Approved', 'Sent', 'Viewed']
    const matchesStatus = allowedStatuses.includes(report.status || '')

    const matchesSearch = report.report_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.student_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const shouldShow = matchesSearch && matchesStatus
    console.log('🔍 [REPORTS FILTER DEBUG] Should show:', shouldShow, 'matchesSearch:', matchesSearch, 'matchesStatus:', matchesStatus)

    return shouldShow
  })

  const getStatusTranslation = (status?: string) => {
    const statusKey = status?.toLowerCase() || 'draft'
    return t(`mobile.reports.status.${statusKey}`) || status || 'Draft'
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700'
      case 'Finished': return 'bg-blue-100 text-blue-700'
      case 'Approved': return 'bg-green-100 text-green-700'
      case 'Sent': return 'bg-purple-100 text-purple-700'
      case 'Viewed': return 'bg-orange-100 text-orange-700'
      case 'Error': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.reports.title')}
          </h1>

        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={String(t('common.search'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">{t('common.loading')}</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <FileText className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">
                {searchQuery ? t('common.noResults') : t('mobile.reports.noReports')}
              </div>
              <div className="text-gray-400 text-xs leading-tight">
                {searchQuery ? t('mobile.assignments.tryDifferentSearch') : t('mobile.reports.noReportsDesc')}
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <h3 className="font-medium text-gray-900 truncate">
                        {report.report_name || t('mobile.reports.untitledReport')}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{report.student_name}</span>
                      </div>
                    </div>

                    {report.start_date && report.end_date && (
                      <div className="text-sm text-gray-500 mb-2">
                        {t('mobile.reports.period')}: {formatDate(report.start_date)} - {formatDate(report.end_date)}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusTranslation(report.status)}
                      </span>

                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => router.push(`/mobile/report/${report.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-2">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}