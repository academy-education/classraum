"use client"

import { useEffect, useCallback, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useDashboardData } from '@/stores/mobileStore'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { Card } from '@/components/ui/card'
import { AnimatedStatSkeleton, RefreshLoadingIndicator, HomeSessionCardSkeleton, HomeInvoiceCardSkeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { Calendar, Clock, ClipboardList, ChevronRight, Receipt, RefreshCw, School, User } from 'lucide-react'

interface UpcomingSession {
  id: string
  className: string
  classroomColor: string
  time: string
  date: string
  teacherName: string
  academyName: string
}

interface Invoice {
  id: string
  amount: number
  status: string
  dueDate: string
  description: string
  academyName: string
}





interface AssignmentData {
  id: string
  due_date: string
  assignment_grades?: {
    student_id: string
    status: string
  }[]
}

interface GradeData {
  student_id: string
  status: string
}

export default function MobilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { setData } = useDashboardData()

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const formatTimeWithTranslation = useCallback((date: Date): string => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const hour12 = hours % 12 || 12
    const ampm = hours < 12 ? t('common.am') : t('common.pm')
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }, [t])

  const formatDateWithTranslation = useCallback((date: Date): string => {
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString(locale, options)
  }, [language])

  const fetchDashboardDataOptimized = useCallback(async () => {
    if (!user?.userId || !user?.academyIds || user.academyIds.length === 0) {
      return null
    }

    try {
      
      // Get today's date and next week for date filtering
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      console.log('=== DASHBOARD QUERY DEBUG ===')
      console.log('Today:', today)
      console.log('User ID:', user.userId)
      console.log('Academy IDs:', user.academyIds)
      console.log('User object:', user)
      
      // First, get the classrooms this student is enrolled in
      const { data: studentClassrooms } = await supabase
        .from('classroom_students')
        .select('classroom_id')
        .eq('student_id', user.userId)

      const classroomIds = studentClassrooms?.map(cs => cs.classroom_id) || []
      console.log('Student enrolled in classroom IDs:', classroomIds)

      if (classroomIds.length === 0) {
        console.log('Student not enrolled in any classrooms')
        return {
          todaysClassCount: 0,
          pendingAssignmentsCount: 0,
          upcomingSessions: [],
          invoices: [],
          lastUpdated: Date.now()
        }
      }

      // SIMPLIFIED: Get assignments directly using a raw approach
      // This bypasses all the complex join issues
      console.log('Calling RPC with params:', { student_id: user.userId, min_due_date: today })
      const { data: allAssignments, error: assignmentError } = await supabase
        .rpc('get_student_assignments', {
          student_id: user.userId,
          min_due_date: today
        })

      console.log('RPC assignments result:', allAssignments, 'error:', assignmentError)

      // If RPC returns empty but no error, let's debug further
      if (!assignmentError && (!allAssignments || allAssignments.length === 0)) {
        console.log('RPC returned empty, testing direct query for comparison...')
        const { data: directTest } = await supabase
          .from('assignments')
          .select('id, due_date, classroom_session_id')
          .eq('id', '5ddf7b02-cf8e-414d-82a3-3040936361cc')
        console.log('Direct assignment query test:', directTest)
      }

      // If RPC doesn't exist, fall back to direct query
      let assignmentsResult
      if (assignmentError) {
        console.log('RPC failed, using direct query fallback')
        // Direct query without complex joins
        assignmentsResult = await supabase
          .from('assignments')
          .select('id, due_date, classroom_session_id')
          .gte('due_date', today)
          .is('deleted_at', null)
      } else {
        assignmentsResult = { data: allAssignments, error: null }
      }

      // OPTIMIZATION: Combined query to get dashboard data
      const [
        todaySessionsResult,
        upcomingSessionsResult,
        invoicesResult
      ] = await Promise.all([
        // Query 1: Today's sessions count - Simplified with known classroom IDs
        supabase
          .from('classroom_sessions')
          .select('id')
          .eq('date', today)
          .eq('status', 'scheduled')
          .in('classroom_id', classroomIds),

        // Query 2: Upcoming sessions with all needed data including teacher names and academy info
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
              academies!inner(
                name
              )
            )
          `)
          .gte('date', today)
          .lte('date', nextWeek)
          .eq('status', 'scheduled')
          .in('classroom_id', classroomIds)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5),

        // Query 3: Get recent invoices for the student
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
        console.error('Error fetching today sessions:', todaySessionsResult.error)
        dashboardData.todaysClassCount = 0
      } else {
        console.log('Today sessions raw result:', todaySessionsResult.data)
        console.log('Today sessions count:', (todaySessionsResult.data || []).length)
        dashboardData.todaysClassCount = (todaySessionsResult.data || []).length
      }

      // Process upcoming sessions

      if (upcomingSessionsResult.error) {
        console.warn('Error fetching upcoming sessions:', upcomingSessionsResult.error)
        dashboardData.upcomingSessions = []
      } else {
        const sessions = upcomingSessionsResult.data || []

        // OPTIMIZATION: Use cached teacher names with batch fetching
        const teacherIds = Array.from(new Set(sessions.map((s) => {
          const classrooms = s.classrooms as Record<string, unknown> | Record<string, unknown>[]
          const teacherId = Array.isArray(classrooms) ? classrooms[0]?.teacher_id : classrooms?.teacher_id
          return teacherId
        }).filter(Boolean)))
        const teacherNamesMap = await getTeacherNamesWithCache(teacherIds as string[])


        const formattedSessions: UpcomingSession[] = sessions.map((session) => {
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
            
            // Handle both array and object formats for classrooms
            const classroom = Array.isArray(session.classrooms)
              ? (session.classrooms as any)?.[0]
              : (session.classrooms as any)
            const teacherName = teacherNamesMap.get(classroom?.teacher_id) || 'Unknown Teacher'
            // Extract academy name from nested academies structure
            let academyName = 'Academy'
            if (classroom?.academies) {
              const academies = classroom.academies
              if (Array.isArray(academies) && academies.length > 0) {
                academyName = academies[0]?.name || 'Academy'
              } else if (typeof academies === 'object' && academies?.name) {
                academyName = academies.name
              }
            }

            return {
              id: session.id,
              className: classroom?.name || 'Unknown Class',
              classroomColor: classroom?.color || '#3B82F6',
              time: `${formatTimeWithTranslation(sessionDate)} - ${formatTimeWithTranslation(endTime)}`,
              date: formatDateWithTranslation(sessionDate),
              teacherName,
              academyName
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
            
            // Handle both array and object formats for classrooms
            const classroom = Array.isArray(session.classrooms)
              ? (session.classrooms as any)?.[0]
              : (session.classrooms as any)
            const teacherName = teacherNamesMap.get(classroom?.teacher_id) || 'Unknown Teacher'
            // Extract academy name from nested academies structure
            let academyName = 'Academy'
            if (classroom?.academies) {
              const academies = classroom.academies
              if (Array.isArray(academies) && academies.length > 0) {
                academyName = academies[0]?.name || 'Academy'
              } else if (typeof academies === 'object' && academies?.name) {
                academyName = academies.name
              }
            }

            return {
              id: session.id,
              className: classroom?.name || 'Unknown Class',
              classroomColor: classroom?.color || '#3B82F6',
              time: fallbackTime,
              date: fallbackDate,
              teacherName,
              academyName
            }
          }
        })
        
        // Store the formatted sessions in the dashboard data
        dashboardData.upcomingSessions = formattedSessions

        // Process assignments - count pending assignments directly
        if (assignmentsResult.error) {
          console.error('Error fetching assignments:', assignmentsResult.error)
          dashboardData.pendingAssignmentsCount = 0
        } else {
          const assignments = assignmentsResult.data || []
          console.log('Assignments raw result:', assignments)

          if (assignments.length > 0) {
            // Get assignment grades for this student separately
            const assignmentIds = assignments.map((a: any) => a.id)
            const { data: grades } = await supabase
              .from('assignment_grades')
              .select('assignment_id, student_id, status')
              .in('assignment_id', assignmentIds)
              .eq('student_id', user.userId)

            console.log('Assignment grades for student:', grades)

            let pendingCount = 0
            assignments.forEach((assignment: {
              id: string
              due_date: string
              classroom_session_id: string
            }) => {
              // Find the grade record for this student
              const userGrade = grades?.find(
                (grade) => grade.assignment_id === assignment.id
              )

              // Count as pending if:
              // 1. No grade record exists (null status), OR
              // 2. Grade record exists with status 'pending'
              if (!userGrade || userGrade.status === 'pending') {
                pendingCount++
                console.log('Found pending assignment:', assignment.id, 'due:', assignment.due_date, 'status:', userGrade?.status || 'no grade record')
              }
            })

            console.log('Total pending assignments count:', pendingCount)
            dashboardData.pendingAssignmentsCount = pendingCount
          } else {
            console.log('No assignments found')
            dashboardData.pendingAssignmentsCount = 0
          }
        }

        // Process invoices
        if (invoicesResult.error) {
          console.warn('Error fetching invoices:', invoicesResult.error)
          dashboardData.invoices = []
        } else {
          const invoices = invoicesResult.data || []
          
          const formattedInvoices: Invoice[] = invoices.map((invoice) => {
            return {
              id: invoice.id,
              amount: invoice.final_amount || invoice.amount,
              status: invoice.status,
              dueDate: invoice.due_date,
              description: (invoice.recurring_payment_templates as Array<{name: string}>)?.[0]?.name || t('mobile.invoices.invoice'),
              academyName: (() => {
                const student = invoice.students as unknown as Record<string, unknown>
                if (student?.academies) {
                  const academies = student.academies
                  if (typeof academies === 'string') {
                    return academies
                  } else if (typeof academies === 'object' && academies && (academies as Record<string, unknown>).name) {
                    return String((academies as Record<string, unknown>).name)
                  } else if (Array.isArray(academies) && academies[0] && (academies[0] as Record<string, unknown>)?.name) {
                    return String((academies[0] as Record<string, unknown>).name)
                  }
                }
                return 'Academy'
              })()
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
  }, [user, t, formatTimeWithTranslation, formatDateWithTranslation])

  // Progressive loading for dashboard data
  const dashboardFetcher = useCallback(async () => {
    if (!user?.userId || !user?.academyIds || user.academyIds.length === 0) return null
    return await fetchDashboardDataOptimized()
  }, [user, fetchDashboardDataOptimized])
  
  const {
    data: dashboardData,
    isLoading,
    refetch: refetchDashboard
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

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)
    
    try {
      await refetchDashboard()
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

  // Use progressive loading data or fallbacks
  const upcomingSessions = dashboardData?.upcomingSessions || []
  const invoices = dashboardData?.invoices || []
  const todaysClassCount = dashboardData?.todaysClassCount || 0
  const pendingAssignmentsCount = dashboardData?.pendingAssignmentsCount || 0

  return (
    <div 
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <RefreshLoadingIndicator isVisible={isRefreshing && !pullDistance} />
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
            <AnimatedStatSkeleton />
            <AnimatedStatSkeleton />
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex flex-col justify-between h-20">
                <p className="text-sm text-gray-600">{t('mobile.home.todaysClasses')}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
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
            className="text-sm text-primary hover:text-primary/90"
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
                      <p className="text-base font-semibold text-gray-900 mb-1">{session.academyName || 'Loading...'}</p>
                      <div className="flex items-center gap-1 mb-1">
                        <School className="w-3 h-3 text-gray-400" />
                        <p className="text-sm text-gray-700">{session.className}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <User className="w-3 h-3 text-gray-400" />
                        <span>{session.teacherName}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{session.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Calendar className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.home.noUpcomingClasses')}</div>
              <div className="text-gray-400 text-xs leading-tight">{t('mobile.home.noUpcomingClassesDesc')}</div>
            </div>
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
            className="text-sm text-primary hover:text-primary/90"
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
                          invoice.status === 'refunded' ? 'bg-primary/10 text-primary' :
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
          <Card className="p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Receipt className="w-6 h-6 text-gray-300" />
              <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.home.noRecentInvoices')}</div>
              <div className="text-gray-400 text-xs leading-tight">{t('mobile.home.noRecentInvoicesDesc')}</div>
            </div>
          </Card>
        )}
      </div>
      </div>
    </div>
  )
}