"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { Bell, ArrowLeft, Check, X, RefreshCw } from 'lucide-react'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useMobileStore, useNotifications } from '@/stores/mobileStore'
import { useSyncMobileStore } from '@/hooks/useSyncLocalStorage'

interface Notification {
  id: string
  title: string
  message: string
  type: 'assignment' | 'grade' | 'alert' | 'session'
  read: boolean
  created_at: string
  db_id?: string  // Database ID if saved
}

interface DbNotification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  navigation_data?: {
    source_id?: string
  }
}


interface Assignment {
  id: string
  title: string
  classroom_session_id: string
}


function MobileNotificationsPageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const { effectiveUserId, isReady, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()
  const hasHydrated = useMobileStore(state => state._hasHydrated)
  const { notifications: zustandNotifications, setNotifications, setLoading: setZustandLoading } = useNotifications()

  // CRITICAL FIX: Initialize from sessionStorage synchronously to prevent skeleton flash
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined' || !effectiveUserId) return []

    try {
      const cacheKey = `notifications-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 30 * 1000 // 30 seconds

        if (timeDiff < cacheValidFor) {
          console.log('✅ [NotificationsPage] Using sessionStorage cached data on init')
          return JSON.parse(cachedData)
        }
      }
    } catch (error) {
      console.warn('[NotificationsPage] Failed to read sessionStorage:', error)
    }

    return []
  })

  const hasCachedNotifications = localNotifications.length > 0
  const shouldSuppressLoading = simpleTabDetection.isTrueTabReturn()

  const [loading, setLoading] = useState(() => {
    const shouldShowInitialLoading = !shouldSuppressLoading && !hasCachedNotifications
    return shouldShowInitialLoading
  })

  // Sync local state with Zustand when hydration completes
  useEffect(() => {
    if (hasHydrated && zustandNotifications.length > 0) {
      setLocalNotifications(zustandNotifications)
    }
  }, [hasHydrated, zustandNotifications])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchNotificationsOptimized = useCallback(async (): Promise<Notification[]> => {
    if (!effectiveUserId || !hasAcademyIds || academyIds.length === 0) return []

    // PERFORMANCE: Check cache first (30-second TTL)
    const cacheKey = `notifications-${effectiveUserId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 30 * 1000 // 30 seconds
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Notifications cache hit:', {
          notifications: parsed?.length || 0
        })
        return parsed
      } else {
        console.log('⏰ Notifications cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Notifications cache miss, fetching from database')
    }

    try {
      // Get authenticated session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        console.log('Notifications page: No authenticated session, returning empty notifications')
        return []
      }
      
      // First, fetch existing notifications from database
      const { data: dbNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.log('Error fetching notifications from database:', fetchError)
        // Continue without database notifications
      }
      
      const existingNotificationIds = new Set()
      const dbNotificationMap = new Map()
      
      if (dbNotifications) {
        dbNotifications.forEach((notif: DbNotification) => {
          // Store the unique identifier to avoid duplicates
          const sourceId = notif.navigation_data?.source_id
          const uniqueId = sourceId ? `${notif.type}-${sourceId}` : notif.id
          existingNotificationIds.add(uniqueId)
          dbNotificationMap.set(uniqueId, notif)
        })
      }
      
      // OPTIMIZATION: First get enrolled classrooms
      const { data: enrolledClassrooms } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms!inner(
            id,
            name,
            academy_id
          )
        `)
        .eq('student_id', effectiveUserId)
        .in('classrooms.academy_id', academyIds)
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        return []
      }
      
      const classroomIds = enrolledClassrooms.map(ec => ec.classroom_id)
      
      // OPTIMIZATION: Get sessions for enrolled classrooms
      const { data: sessions } = await supabase
        .from('classroom_sessions')
        .select('id, classroom_id, date, start_time')
        .in('classroom_id', classroomIds)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(100)
      
      if (!sessions || sessions.length === 0) {
        return []
      }
      
      const sessionIds = sessions.map(s => s.id)
      const classroomMap = new Map()
      enrolledClassrooms.forEach(ec => {
        classroomMap.set(ec.classroom_id, ec.classrooms)
      })
      
      // OPTIMIZATION: Parallel fetch with simplified queries
      const [assignmentNotifs, gradeNotifs, upcomingSessionNotifs] = await Promise.all([
        // Assignments (simplified)
        supabase
          .from('assignments')
          .select('id, title, due_date, created_at, classroom_session_id')
          .in('classroom_session_id', sessionIds)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(15),
        
        // Grades (simplified)
        supabase
          .from('assignment_grades')
          .select('id, assignment_id, score, updated_at')
          .eq('student_id', effectiveUserId)
          .not('score', 'is', null)
          .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false })
          .limit(15),
        
        // Upcoming sessions (simplified)
        supabase
          .from('classroom_sessions')
          .select('id, date, start_time, classroom_id')
          .in('classroom_id', classroomIds)
          .eq('status', 'scheduled')
          .gte('date', new Date().toISOString().split('T')[0])
          .lte('date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: true })
          .limit(10)
      ])
      
      // Get assignment details for grades
      const assignmentMap = new Map()
      if (gradeNotifs.data && gradeNotifs.data.length > 0) {
        const gradeAssignmentIds = gradeNotifs.data.map((g) => g.assignment_id)
        const { data: gradeAssignments } = await supabase
          .from('assignments')
          .select('id, title, classroom_session_id')
          .in('id', gradeAssignmentIds)
        
        if (gradeAssignments) {
          gradeAssignments.forEach((a: Assignment) => {
            assignmentMap.set(a.id, a)
          })
        }
      }
      
      const allNotifications: Notification[] = []
      const sessionMap = new Map()
      sessions.forEach((s) => {
        sessionMap.set(s.id, { ...s, classroom: classroomMap.get(s.classroom_id) })
      })
      
      // Process assignment notifications
      if (assignmentNotifs.data) {
        assignmentNotifs.data.forEach((assignment) => {
          const session = sessionMap.get(assignment.classroom_session_id)
          if (!session) return
          
          const dueDate = new Date(assignment.due_date)
          const now = new Date()
          const timeDiff = dueDate.getTime() - now.getTime()
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
          
          let message = ''
          if (daysDiff <= 1) {
            message = String(t('mobile.notifications.assignmentDueSoon', { title: assignment.title }))
          } else if (daysDiff <= 3) {
            message = String(t('mobile.notifications.assignmentDueIn', { title: assignment.title, days: daysDiff }))
          } else {
            message = String(t('mobile.notifications.newAssignmentCreated', { title: assignment.title }))
          }
          
          const uniqueId = `assignment-${assignment.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: String(t('mobile.notifications.newAssignment')),
            message,
            type: 'assignment',
            read: existingNotif?.is_read || false,
            created_at: assignment.created_at,
            db_id: existingNotif?.id
          })
        })
      }
      
      // Process grade notifications
      if (gradeNotifs.data) {
        gradeNotifs.data.forEach((gradeRecord) => {
          const assignment = assignmentMap.get(gradeRecord.assignment_id)
          if (!assignment) return
          
          const grade = typeof gradeRecord.score === 'number' ? `${gradeRecord.score}%` : gradeRecord.score
          const uniqueId = `grade-${gradeRecord.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: String(t('mobile.notifications.gradeUpdated')),
            message: String(t('mobile.notifications.assignmentGraded', {
              title: assignment.title,
              grade
            })),
            type: 'grade',
            read: existingNotif?.is_read || false,
            created_at: gradeRecord.updated_at,
            db_id: existingNotif?.id
          })
        })
      }
      
      // Process session reminder notifications
      if (upcomingSessionNotifs.data) {
        upcomingSessionNotifs.data.forEach((session) => {
          const classroom = classroomMap.get(session.classroom_id)
          if (!classroom) return
          
          const sessionDate = new Date(session.date + 'T' + session.start_time)
          const now = new Date()
          const timeDiff = sessionDate.getTime() - now.getTime()
          const hoursDiff = Math.ceil(timeDiff / (1000 * 3600))
          
          let message = ''
          if (hoursDiff <= 2 && hoursDiff > 0) {
            message = String(t('mobile.notifications.classStartingSoon', {
              className: classroom.name,
              hours: hoursDiff
            }))
          } else if (hoursDiff <= 24) {
            message = String(t('mobile.notifications.classScheduledTomorrow', {
              className: classroom.name
            }))
          } else {
            message = String(t('mobile.notifications.upcomingClass', {
              className: classroom.name,
              date: new Date(session.date).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US')
            }))
          }
          
          const uniqueId = `session-${session.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: String(t('mobile.notifications.classReminder')),
            message,
            type: 'session',
            read: existingNotif?.is_read || false,
            created_at: new Date(Date.now() - hoursDiff * 3600000).toISOString(),
            db_id: existingNotif?.id
          })
        })
      }
      
      // Sort all notifications by creation date (newest first)
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // PERFORMANCE: Cache the results before saving to database
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(allNotifications))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Notifications cached for 30 seconds')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache notifications:', cacheError)
      }

      // Save new notifications to database (those without db_id)
      if (session?.user?.id) {
        const newNotifications = allNotifications.filter(n => !n.db_id && !existingNotificationIds.has(n.id))
        
        
        if (newNotifications.length > 0) {
          try {
            // Insert notifications one by one to handle unique constraint violations gracefully
            const insertedNotifs = []
            
            for (const notif of newNotifications) {
              const notificationData = {
                user_id: session.user.id,
                title: notif.title,
                message: notif.message,
                type: (notif.type as string) === 'announcement' ? 'alert' : (notif.type as string) === 'reminder' ? 'session' : notif.type,
                is_read: false,
                navigation_data: { source_id: notif.id.split('-').slice(1).join('-') }
              }
              
              try {
                const { data: insertResult, error } = await supabase
                  .from('notifications')
                  .insert([notificationData])
                  .select()
                  .single()
                
                if (error) {
                  // Log full error for debugging
                  console.log(`Full error for ${notif.id}:`, JSON.stringify(error, null, 2))
                  
                  // Handle unique constraint violation (409 conflict)
                  if (error.code === '23505' || error.code === '409' || error.message?.includes('409') || error.message?.includes('conflict')) {
                    // Notification already exists, just skip it silently
                    console.log(`Notification ${notif.id} already exists, skipping silently`)
                    continue
                  } else {
                    console.error(`Error inserting notification ${notif.id}:`, error)
                  }
                } else if (insertResult) {
                  insertedNotifs.push(insertResult)
                  // Update the notification with its database ID
                  const notifToUpdate = allNotifications.find(n => n.id === notif.id)
                  if (notifToUpdate) {
                    notifToUpdate.db_id = insertResult.id
                  }
                }
              } catch (singleInsertError) {
                console.error(`Error inserting single notification ${notif.id}:`, singleInsertError)
              }
            }
            
            if (insertedNotifs.length > 0) {
              console.log('Successfully inserted notifications:', insertedNotifs.length)
            }
          } catch (insertError) {
            console.error('Error saving notifications to database:', insertError)
          }
        }
      } else {
        console.log('No authenticated session, skipping notification save to database')
      }
      
      return allNotifications
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, language, t])

  // Progressive loading for notifications
  const notificationsFetcher = useCallback(async () => {
    console.log('🔔 [Notifications] Fetcher called with:', {
      effectiveUserId,
      hasAcademyIds,
      academyIds: academyIds?.slice(0, 3),
      academyIdsLength: academyIds?.length,
      userRole: user?.role
    })

    if (!effectiveUserId) {
      console.log('❌ [Notifications] No effective user ID, returning empty array')
      return []
    }

    if (!hasAcademyIds) {
      console.log('❌ [Notifications] hasAcademyIds is false, returning empty array')
      return []
    }

    if (!academyIds || academyIds.length === 0) {
      console.log('❌ [Notifications] No academy IDs available, returning empty array')
      return []
    }

    try {
      console.log('🚀 [Notifications] Starting optimized fetch...')
      const result = await fetchNotificationsOptimized()
      console.log('✅ [Notifications] Fetch successful!', {
        notificationCount: result?.length || 0,
        firstNotification: result?.[0] ? {
          id: result[0].id,
          title: result[0].title,
          type: result[0].type
        } : null
      })
      return result || []
    } catch (error) {
      console.error('💥 [Notifications] Fetch error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Return empty array instead of throwing to prevent infinite loading
      return []
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, fetchNotificationsOptimized, user?.role])
  
  // Fetch and save to Zustand
  const refetchNotifications = useCallback(async (forceRefresh = false) => {
    if (!effectiveUserId || !hasAcademyIds || academyIds.length === 0) {
      setNotifications([])
      setLocalNotifications([])
      setLoading(false)
      simpleTabDetection.markAppLoaded()
      return
    }

    // Check sessionStorage first for persistence across page reloads
    if (!forceRefresh) {
      const cacheKey = `notifications-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 30 * 1000 // 30 seconds

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          console.log('✅ [Notifications] Using sessionStorage cached data')
          setLocalNotifications(parsed)
          setLoading(false)
          simpleTabDetection.markAppLoaded()
          return
        }
      }
    }

    try {
      // Only set loading to true if we don't have cached data
      if (!simpleTabDetection.isReturningToTab() && localNotifications.length === 0) {
        setLoading(true)
      }
      console.log('🔔 [Notifications] Starting fetch...')
      const result = await notificationsFetcher()
      console.log('✅ [Notifications] Fetch successful:', result)

      // Save to Zustand
      setNotifications(result || [])
      // Update local state
      setLocalNotifications(result || [])
    } catch (error) {
      console.error('❌ [Notifications] Fetch error:', error)
      setNotifications([])
      setLocalNotifications([])
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [notificationsFetcher, effectiveUserId, hasAcademyIds, academyIds, setNotifications, localNotifications.length])

  // Direct useEffect pattern like working pages
  useEffect(() => {
    if (effectiveUserId && hasAcademyIds && academyIds.length > 0) {
      refetchNotifications()
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, refetchNotifications])

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    // Invalidate cache before refreshing
    const cacheKey = `notifications-${effectiveUserId}`
    sessionStorage.removeItem(cacheKey)
    sessionStorage.removeItem(`${cacheKey}-timestamp`)
    console.log('[Performance] Notifications cache invalidated on pull-to-refresh')

    try {
      await refetchNotifications(true) // Force refresh on pull-to-refresh
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

  // Sync with local state for read/unread tracking
  useEffect(() => {
    if (zustandNotifications && Array.isArray(zustandNotifications) && zustandNotifications.length > 0) {
      setLocalNotifications(zustandNotifications)
    }
  }, [zustandNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id) {
        console.log('No authenticated session, cannot mark as read')
        // Still update local state for UI
        setLocalNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        )
        return
      }
      
      // Find the notification with its database ID
      const notification = localNotifications.find(n => n.id === notificationId)
      
      // Update in database if it has a db_id
      if (notification?.db_id) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.db_id)
          .eq('user_id', session.user.id) // Ensure we're updating our own notification
        
        if (error) {
          console.error('Error marking notification as read:', error)
        }
      } else if (notification) {
        // If no db_id, try to find it by user_id and source_id (handle both full and partial IDs)
        const sourceId = notificationId.split('-').slice(1).join('-')
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id)
          .or(`navigation_data->source_id.eq.${sourceId},navigation_data->source_id.eq.${sourceId.split('-')[0]}`)
        
        if (error) {
          console.error('Error marking notification as read by source:', error)
        }
      }
      
      // Update local state
      setLocalNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      )
      
      // Notify other components about the change
      window.dispatchEvent(new CustomEvent('notificationRead'))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.id) {
        // Update all notifications in database for this user
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', session.user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        
        if (error) {
          console.error('Error marking all notifications as read:', error)
        }
      } else {
        console.log('No authenticated session, cannot mark all as read')
      }
      
      // Update local state
      setLocalNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      )
      
      // Notify other components about the change
      window.dispatchEvent(new CustomEvent('notificationRead'))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string, read: boolean) => {
    const baseClasses = "w-2 h-2 rounded-full mt-1.5"
    switch (type) {
      case 'assignment':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-primary'}`}></div>
      case 'grade':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-green-500'}`}></div>
      case 'reminder':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-orange-500'}`}></div>
      case 'announcement':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-purple-500'}`}></div>
      default:
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-primary'}`}></div>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return t('mobile.notifications.justNow')
    } else if (diffHours < 24) {
      return t('mobile.notifications.hoursAgo', { count: diffHours })
    } else {
      return t('mobile.notifications.daysAgo', { count: diffDays })
    }
  }

  // Use localNotifications for UI to support read/unread tracking
  const allDisplayNotifications = localNotifications.length > 0 ? localNotifications : (zustandNotifications || [])
  const unreadCount = allDisplayNotifications ? allDisplayNotifications.filter(n => !n.read).length : 0

  // Client-side pagination
  const totalPages = Math.ceil(allDisplayNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayNotifications = allDisplayNotifications.slice(startIndex, endIndex)
  

  // Show loading skeleton while auth is loading
  if (authLoading) {
    return (
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
                <Bell className="w-6 h-6" />
                {t('mobile.notifications.title')}
              </h1>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled
            className="text-xs"
          >
            <Check className="w-4 h-4 mr-1" />
            {t('mobile.notifications.markAllRead')}
          </Button>
        </div>
        {/* Custom notification skeleton that matches actual cards */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                {/* Icon skeleton */}
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title skeleton */}
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                      {/* Message skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2 animate-pulse" />
                      {/* Time skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
                    </div>
                    {/* Mark as read button skeleton */}
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse ml-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }


  // Show loading skeleton while data is loading
  if (loading) {
    return (
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
                <Bell className="w-6 h-6" />
                {t('mobile.notifications.title')}
              </h1>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled
            className="text-xs"
          >
            <Check className="w-4 h-4 mr-1" />
            {t('mobile.notifications.markAllRead')}
          </Button>
        </div>
        {/* Custom notification skeleton that matches actual cards */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                {/* Icon skeleton */}
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title skeleton */}
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                      {/* Message skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2 animate-pulse" />
                      {/* Time skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
                    </div>
                    {/* Mark as read button skeleton */}
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse ml-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show loading skeleton on initial load (not on tab returns)
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <StaggeredListSkeleton items={5} />
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
              className={`w-5 h-5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
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
              <Bell className="w-6 h-6" />
              {t('mobile.notifications.title')}
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {t('mobile.notifications.unreadCount', { count: unreadCount })}
              </p>
            )}
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            className="text-xs"
          >
            <Check className="w-4 h-4 mr-1" />
            {t('mobile.notifications.markAllRead')}
          </Button>
        )}
      </div>

      {/* Notifications List - Only show skeleton if truly no data */}
      {(loading && localNotifications.length === 0) ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                {/* Icon skeleton */}
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title skeleton */}
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                      {/* Message skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-full mb-1 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-2 animate-pulse" />
                      {/* Time skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse" />
                    </div>
                    {/* Mark as read button skeleton */}
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse ml-2" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayNotifications.length > 0 ? (
        <div className="space-y-3">
          {displayNotifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 transition-all cursor-pointer ${notification.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type, notification.read)}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="p-1 ml-2"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : allDisplayNotifications.length === 0 ? (
        <Card className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Bell className="w-6 h-6 text-gray-300" />
            <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.notifications.noNotifications')}</div>
            <div className="text-gray-400 text-xs leading-tight">{t('mobile.notifications.allCaughtUp')}</div>
          </div>
        </Card>
      ) : null}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between px-2 py-3 border-t">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            {t('common.previous')}
          </Button>
          <span className="text-sm text-gray-700">
            {t('common.page')} {currentPage} / {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            variant="outline"
            size="sm"
          >
            {t('common.next')}
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}

export default function MobileNotificationsPage() {
  return (
    <MobilePageErrorBoundary>
      <MobileNotificationsPageContent />
    </MobilePageErrorBoundary>
  )
}