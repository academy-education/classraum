"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useDashboardData } from '@/stores/mobileStore'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { Card } from '@/components/ui/card'
import { StatSkeleton, HomeSessionCardSkeleton, HomeInvoiceCardSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, ClipboardList, ChevronRight, Receipt } from 'lucide-react'

interface UpcomingSession {
  id: string
  className: string
  classroomColor: string
  time: string
  date: string
  teacherName: string
}

interface Invoice {
  id: string
  amount: number
  status: string
  dueDate: string
  description: string
  academyName: string
}

export default function MobilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { setData } = useDashboardData()

  // Progressive loading for dashboard data
  const dashboardFetcher = useCallback(async () => {
    if (!user?.userId || !user?.academyId) return null
    return await fetchDashboardDataOptimized()
  }, [user, language])
  
  const {
    data: dashboardData,
    isLoading
  } = useMobileData(
    'mobile-dashboard',
    dashboardFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true,
      refreshInterval: 30000 // 30 seconds
    }
  )
  
  // Update Zustand store when data is fetched
  useEffect(() => {
    if (dashboardData) {
      setData(dashboardData)
    }
  }, [dashboardData, setData])

  // Use progressive loading data or fallbacks
  const upcomingSessions = dashboardData?.upcomingSessions || []
  const invoices = dashboardData?.invoices || []
  const todaysClassCount = dashboardData?.todaysClassCount || 0
  const pendingAssignmentsCount = dashboardData?.pendingAssignmentsCount || 0

  const formatTimeWithTranslation = (date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const formatDateWithTranslation = (date: Date): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString(locale, options)
  }

  const fetchDashboardDataOptimized = async () => {
    if (!user?.userId || !user?.academyId) {
      return null
    }
    
    try {
      
      // Get today's date and next week for date filtering
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // OPTIMIZATION: Single combined query to get all dashboard data at once
      // This replaces 4+ sequential queries with 4 parallel queries
      const [
        todaySessionsResult,
        upcomingSessionsResult, 
        assignmentsResult,
        invoicesResult
      ] = await Promise.all([
        // Query 1: Today's sessions count
        supabase
          .from('classroom_sessions')
          .select(`
            id,
            classrooms!inner(
              id,
              academy_id,
              classroom_students!inner(student_id)
            )
          `)
          .eq('date', today)
          .eq('status', 'scheduled')
          .eq('classrooms.academy_id', user.academyId)
          .eq('classrooms.classroom_students.student_id', user.userId),

        // Query 2: Upcoming sessions with all needed data including teacher names
        supabase
          .from('classroom_sessions')
          .select(`
            id,
            date,
            start_time,
            end_time,
            classrooms!inner(
              id,
              name,
              color,
              academy_id,
              teacher_id,
              classroom_students!inner(student_id)
            )
          `)
          .gte('date', today)
          .lte('date', nextWeek)
          .eq('status', 'scheduled')
          .eq('classrooms.academy_id', user.academyId)
          .eq('classrooms.classroom_students.student_id', user.userId)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5),

        // Query 3: Get student's assignments and grades in one query
        supabase
          .from('classroom_students')
          .select(`
            classroom_id,
            classrooms!inner(
              id,
              academy_id,
              classroom_sessions!inner(
                id,
                assignments!inner(
                  id,
                  due_date,
                  assignment_grades(
                    student_id,
                    status
                  )
                )
              )
            )
          `)
          .eq('student_id', user.userId)
          .eq('classrooms.academy_id', user.academyId),

        // Query 4: Get recent invoices for the student
        supabase
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
            academy_id,
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
          .limit(5)
      ])

      // Initialize dashboard data object
      const dashboardData = {
        todaysClassCount: 0,
        pendingAssignmentsCount: 0,
        upcomingSessions: [] as UpcomingSession[],
        invoices: [] as Invoice[],
        lastUpdated: Date.now()
      }

      // Process today's sessions count
      if (todaySessionsResult.error) {
        console.warn('Error fetching today sessions:', todaySessionsResult.error)
        dashboardData.todaysClassCount = 0
      } else {
        dashboardData.todaysClassCount = (todaySessionsResult.data || []).length
      }

      // Process upcoming sessions
      if (upcomingSessionsResult.error) {
        console.warn('Error fetching upcoming sessions:', upcomingSessionsResult.error)
        dashboardData.upcomingSessions = []
      } else {
        const sessions = upcomingSessionsResult.data || []
        
        // OPTIMIZATION: Use cached teacher names with batch fetching
        const teacherIds = [...new Set(sessions.map((s: any) => s.classrooms?.teacher_id).filter(Boolean))]
        const teacherNamesMap = await getTeacherNamesWithCache(teacherIds)

        const formattedSessions: UpcomingSession[] = sessions.map((session: any) => {
          try {
            // Validate required fields first
            if (!session.date || !session.start_time || !session.end_time) {
              throw new Error('Missing required date/time fields')
            }
            
            const sessionDate = new Date(session.date + 'T' + session.start_time)
            const endTime = new Date(session.date + 'T' + session.end_time)
            
            // Check if dates are valid
            if (isNaN(sessionDate.getTime()) || isNaN(endTime.getTime())) {
              throw new Error('Invalid date/time values')
            }
            
            const teacherName = teacherNamesMap.get(session.classrooms?.teacher_id) || 'Unknown Teacher'
            
            return {
              id: session.id,
              className: session.classrooms?.name || 'Unknown Class',
              classroomColor: session.classrooms?.color || '#3B82F6',
              time: `${formatTimeWithTranslation(sessionDate)} - ${formatTimeWithTranslation(endTime)}`,
              date: formatDateWithTranslation(sessionDate),
              teacherName
            }
          } catch (dateError) {
            console.warn('Error formatting session date:', dateError, 'Session data:', session)
            
            // Fallback to basic time formatting if translation fails
            let fallbackTime = 'Time TBD'
            let fallbackDate = session.date || 'Date TBD'
            
            try {
              if (session.start_time && session.end_time) {
                // Simple fallback formatting
                fallbackTime = `${session.start_time.slice(0, 5)} - ${session.end_time.slice(0, 5)}`
              }
              if (session.date) {
                fallbackDate = new Date(session.date).toLocaleDateString()
              }
            } catch (fallbackError) {
              console.warn('Fallback formatting also failed:', fallbackError)
            }
            
            const teacherName = teacherNamesMap.get(session.classrooms?.teacher_id) || 'Unknown Teacher'
            
            return {
              id: session.id,
              className: session.classrooms?.name || 'Unknown Class',
              classroomColor: session.classrooms?.color || '#3B82F6',
              time: fallbackTime,
              date: fallbackDate,
              teacherName
            }
          }
        })
        
        // Store the formatted sessions in the dashboard data
        dashboardData.upcomingSessions = formattedSessions

        // Process assignments - count pending assignments from the combined query
        if (assignmentsResult.error) {
          console.warn('Error fetching assignments:', assignmentsResult.error)
          dashboardData.pendingAssignmentsCount = 0
        } else {
          let pendingCount = 0
          const studentClassrooms = assignmentsResult.data || []
          
          studentClassrooms.forEach((classroomStudent: any) => {
            const sessions = classroomStudent.classrooms?.classroom_sessions || []
            sessions.forEach((session: any) => {
              const assignments = session.assignments || []
              assignments.forEach((assignment: any) => {
                // Only count assignments due today or later
                if (assignment.due_date >= today) {
                  const userGrade = assignment.assignment_grades?.find(
                    (grade: any) => grade.student_id === user.userId
                  )
                  // Count as pending if no grade or status is not_submitted
                  if (!userGrade || userGrade.status === 'not_submitted') {
                    pendingCount++
                  }
                }
              })
            })
          })
          
          dashboardData.pendingAssignmentsCount = pendingCount
        }

        // Process invoices
        if (invoicesResult.error) {
          console.warn('Error fetching invoices:', invoicesResult.error)
          dashboardData.invoices = []
        } else {
          const invoices = invoicesResult.data || []
          
          const formattedInvoices: Invoice[] = invoices.map((invoice: any) => {
            return {
              id: invoice.id,
              amount: invoice.final_amount || invoice.amount,
              status: invoice.status,
              dueDate: invoice.due_date,
              description: invoice.recurring_payment_templates?.name || t('mobile.invoices.invoice'),
              academyName: invoice.students?.academies?.name || 'Academy'
            }
          })
          
          dashboardData.invoices = formattedInvoices
        }

        // Return the fetched data
        return dashboardData
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      return {
        todaysClassCount: 0,
        pendingAssignmentsCount: 0,
        upcomingSessions: [],
        invoices: [],
        lastUpdated: Date.now()
      }
    }
  }

  return (
    <div className="p-4">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('mobile.home.welcome')}, {user?.userName}!
        </h1>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex flex-col justify-between h-20">
                <p className="text-sm text-gray-600">{t('mobile.home.todaysClasses')}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  <p className="text-2xl font-bold">{todaysClassCount}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex flex-col justify-between h-20">
                <p className="text-sm text-gray-600">{t('mobile.home.pendingAssignments')}</p>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-orange-500" />
                  <p className="text-2xl font-bold">{pendingAssignmentsCount}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Upcoming Classes Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('mobile.home.upcomingClasses')}
          </h2>
          <button 
            onClick={() => router.push('/mobile/schedule')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {t('mobile.home.viewAll')}
          </button>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <HomeSessionCardSkeleton key={i} />
            ))}
          </div>
        ) : upcomingSessions.length > 0 ? (
          <div className="space-y-2">
            {upcomingSessions.map((session) => (
              <Card key={session.id} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/session/${session.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: session.classroomColor }}
                    />
                    <div>
                      <p className="font-medium">{session.className}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{session.date}</span>
                        <span>•</span>
                        <span>{session.time}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center text-gray-500">
            {t('mobile.home.noUpcomingClasses')}
          </Card>
        )}
      </div>

      {/* Recent Invoices Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('mobile.home.recentInvoices')}
          </h2>
          <button 
            onClick={() => router.push('/mobile/invoices')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {t('mobile.home.viewAll')}
          </button>
        </div>
        
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <HomeInvoiceCardSkeleton key={i} />
            ))}
          </div>
        ) : invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="p-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push(`/mobile/invoice/${invoice.id}`)}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-gray-500">{invoice.academyName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <span>{t('mobile.invoices.due')} {formatDateWithTranslation(new Date(invoice.dueDate))}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">₩{invoice.amount.toLocaleString()}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'failed' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'refunded' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t(`mobile.invoices.status.${invoice.status}`) || invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center text-gray-500">
            {t('mobile.home.noRecentInvoices')}
          </Card>
        )}
      </div>

    </div>
  )
}