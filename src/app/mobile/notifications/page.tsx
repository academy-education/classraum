"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { Button } from '@/components/ui/button'
import { MobileBackButton } from '@/components/ui/mobile/MobileBackButton'
import { StaggeredListSkeleton } from '@/components/ui/skeleton'
import { Bell, Check, X, RefreshCw } from '@/app/mobile/study/_shared/icons'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useMobileStore, useNotifications } from '@/stores/mobileStore'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'
import { augmentLocalizedTimeParams } from '@/lib/notification-format'

interface NotificationNavData {
  page?: string
  source_id?: string
  filters?: Record<string, string>
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'assignment' | 'grade' | 'alert' | 'session'
  read: boolean
  created_at: string
  db_id?: string  // Database ID if saved
  /** Routing hint — used by the notification → destination handler so a
   *  push for "Math grade posted" lands on that grade's session/assignment
   *  instead of a 1700-row list. Populated for both synthesized rows
   *  (built from local `source_id`) and DB rows (read straight from the
   *  `navigation_data` column). */
  navigation_data?: NotificationNavData
}

interface DbNotification {
  id: string
  type: string
  title: string | null
  message: string | null
  is_read: boolean
  created_at: string
  navigation_data?: NotificationNavData | null
  title_key?: string | null
  message_key?: string | null
  title_params?: Record<string, unknown> | null
  message_params?: Record<string, unknown> | null
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
  const { effectiveUserId, isLoading: authLoading, hasAcademyIds, academyIds } = useEffectiveUserId()
  const hasHydrated = useMobileStore(state => state._hasHydrated)
  const { notifications: zustandNotifications, setNotifications } = useNotifications()

  // CRITICAL FIX: Initialize from sessionStorage synchronously to prevent skeleton flash
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined' || !effectiveUserId) return []

    try {
      const cacheKey = `notifications-${effectiveUserId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes (matching other hooks)

        if (timeDiff < cacheValidFor) {
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
  const [fetchError, setFetchError] = useState<Error | null>(null)

  // Sync local state with Zustand when hydration completes
  useEffect(() => {
    if (hasHydrated && zustandNotifications.length > 0) {
      setLocalNotifications(zustandNotifications)
    }
  }, [hasHydrated, zustandNotifications])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Tab filter — categorizes notifications by type
  type TabKey = 'all' | 'assignment' | 'grade' | 'session' | 'alert'
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchNotificationsOptimized = useCallback(async (): Promise<Notification[]> => {
    if (!effectiveUserId) return []

    // NOTE: We deliberately do NOT short-circuit on a sessionStorage cache here.
    // The outer `refetchNotifications` already caches at the page level for
    // 30s and gates initial mount; gating again inside the fetcher meant
    // freshly-created trigger rows were invisible for up to 5 minutes after
    // login. The cache below (write-only) still seeds the next refetch's
    // page-level cache so tab navigation stays instant.
    const cacheKey = `notifications-${effectiveUserId}`

    try {
      // Get authenticated session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) {
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
      
      const allNotifications: Notification[] = []

      // Classroom-derived notifications (assignments, grades, upcoming
      // sessions) only exist for academy members. Study-only students
      // skip straight to the DB-notification merge below — previously
      // the early returns in this block dropped their study
      // notifications entirely, leaving the page permanently empty.
      if (hasAcademyIds && academyIds.length > 0) await (async () => {
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
        return
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
        return
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
            db_id: existingNotif?.id,
            navigation_data: {
              page: 'assignment',
              source_id: assignment.id,
              filters: {
                assignmentId: assignment.id,
                sessionId: assignment.classroom_session_id,
              },
            },
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
            db_id: existingNotif?.id,
            navigation_data: {
              page: 'grade',
              source_id: gradeRecord.id,
              filters: {
                assignmentId: assignment.id,
                sessionId: assignment.classroom_session_id,
              },
            },
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
            db_id: existingNotif?.id,
            navigation_data: {
              page: 'session',
              source_id: session.id,
              filters: { sessionId: session.id },
            },
          })
        })
      }
      
      })()

      // Append DB notifications that the synthesizer doesn't cover.
      // Triggers + crons populate `notifications` for: session.cancelled,
      // session.rescheduled, session reminders, assignment.due, assignment.overdue,
      // payment.due, payment.overdue, attendance changes, etc. Without this
      // merge, those rows live in the DB but are silently dropped from the UI.
      const synthesizedDbIds = new Set(
        allNotifications.map(n => n.db_id).filter(Boolean) as string[]
      )

      if (dbNotifications) {
        dbNotifications.forEach((notif: DbNotification) => {
          if (synthesizedDbIds.has(notif.id)) return

          const lang = language === 'korean' ? 'korean' : 'english'
          const titleParams = (notif.title_params || {}) as Record<string, string | number>
          // Inject locale-formatted {when} / {oldWhen} / {newWhen} from raw
          // ISO fields stored by the trigger (e.g. "2026-05-07" + "09:00").
          const messageParams = augmentLocalizedTimeParams(notif.message_params, lang)
          const renderedTitle = notif.title_key
            ? String(t(notif.title_key, titleParams))
            : (notif.title || '')
          const renderedMessage = notif.message_key
            ? String(t(notif.message_key, messageParams))
            : (notif.message || '')

          // Map DB type → UI type (UI Notification union: assignment | grade | alert | session)
          const rawType = notif.type as string
          const uiType: Notification['type'] =
            rawType === 'session' ? 'session'
            : rawType === 'grade' ? 'grade'
            : rawType === 'assignment' ? 'assignment'
            : 'alert'

          allNotifications.push({
            id: notif.id,
            title: renderedTitle,
            message: renderedMessage,
            type: uiType,
            read: !!notif.is_read,
            created_at: notif.created_at,
            db_id: notif.id,
            // Carry the trigger's navigation_data through so the routing
            // handler can land the user on the specific item (session,
            // invoice, report) instead of the section's list page.
            navigation_data: notif.navigation_data || undefined,
          })
        })
      }

      // Sort all notifications by creation date (newest first)
      allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // PERFORMANCE: Cache the results before saving to database
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(allNotifications))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
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
                  
                  // Handle unique constraint violation (409 conflict)
                  if (error.code === '23505' || error.code === '409' || error.message?.includes('409') || error.message?.includes('conflict')) {
                    // Notification already exists, just skip it silently
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
            }
          } catch (insertError) {
            console.error('Error saving notifications to database:', insertError)
          }
        }
      }
      
      return allNotifications
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, language, t])

  // Progressive loading for notifications
  const notificationsFetcher = useCallback(async () => {

    if (!effectiveUserId) {
      return []
    }

    try {
      const result = await fetchNotificationsOptimized()
      return result || []
    } catch (error) {
      console.error('💥 [Notifications] Fetch error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Return empty array instead of throwing to prevent infinite loading
      return []
    }
  }, [effectiveUserId, hasAcademyIds, academyIds, user?.role])
  
  // Fetch and save to Zustand
  const refetchNotifications = useStableCallback(async (forceRefresh = false) => {
    if (!effectiveUserId) {
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
      const result = await notificationsFetcher()

      // Save to Zustand
      setNotifications(result || [])
      // Update local state
      setLocalNotifications(result || [])
      setFetchError(null)
    } catch (error) {
      console.error('❌ [Notifications] Fetch error:', error)
      // Preserve stale data on screen so the user doesn't lose context.
      // The list "going empty" on a transient network blip would also
      // make the bell badge count look wrong relative to the page.
      setFetchError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  })

  // Direct useEffect pattern like working pages.
  // Force-refresh on every mount so the page reflects DB triggers immediately
  // (the bell badge reads the table directly, so without this the two counts
  // diverge whenever a new notification lands while a stale cache is alive).
  useEffect(() => {
    if (effectiveUserId) {
      // Bust the bell badge's separate sessionStorage cache so its unread
      // count re-syncs with the page's count on the next render.
      try {
        const bellKey = `mobile-notifications-${effectiveUserId}`
        sessionStorage.removeItem(bellKey)
        sessionStorage.removeItem(`${bellKey}-timestamp`)
      } catch {
        // sessionStorage unavailable — non-fatal
      }
      refetchNotifications(true)
    }
  }, [effectiveUserId, hasAcademyIds, academyIds])

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    // Invalidate cache before refreshing
    const cacheKey = `notifications-${effectiveUserId}`
    sessionStorage.removeItem(cacheKey)
    sessionStorage.removeItem(`${cacheKey}-timestamp`)

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

  // Reset to page 1 whenever the tab changes — otherwise switching to a tab
  // with fewer items than the current page leaves the list looking empty.
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Tick every 30 seconds so relative timestamps ("3분 전") increment without
  // requiring a manual refresh. Cheap: one setState per tick, no network.
  const [, setNowTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNowTick(n => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const markAsRead = async (notificationId: string, shouldNavigate: boolean = false) => {
    try {
      // Get current auth session
      const { data: { session } } = await supabase.auth.getSession()

      // Find the notification first
      const notification = localNotifications.find(n => n.id === notificationId)

      // Calculate updated notifications first
      const updated = localNotifications.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true }
          : notif
      )

      // Update local state immediately for better UX
      setLocalNotifications(updated)

      // CRITICAL FIX: Update Zustand store to prevent sync overwriting local state
      setNotifications(updated)

      // PERFORMANCE: Update cache with new state
      if (effectiveUserId) {
        const cacheKey = `notifications-${effectiveUserId}`
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(updated))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        } catch (cacheError) {
          console.warn('[Performance] Failed to update notification cache:', cacheError)
        }
      }

      // Notify other components about the change
      window.dispatchEvent(new CustomEvent('notificationRead'))

      // Navigate if requested
      if (shouldNavigate && notification) {
        handleNotificationNavigation(notification)
      }

      // Update database in background
      if (!session?.user?.id) {
        return
      }

      // Update in database if it has a db_id
      if (notification?.db_id) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', notification.db_id)
          .eq('user_id', session.user.id)

        if (error) {
          console.error('Error marking notification as read:', error)
        }
      } else if (notification) {
        // If no db_id, try to find and update by user_id and source_id
        const sourceId = notificationId.split('-').slice(1).join('-')

        // First try to find the notification
        const { data: existingNotifs, error: findError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', session.user.id)
          .contains('navigation_data', { source_id: sourceId })
          .limit(1)

        if (findError) {
          console.error('Error finding notification:', findError)
          return
        }

        // If found, update it
        if (existingNotifs && existingNotifs.length > 0) {
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq('id', existingNotifs[0].id)

          if (updateError) {
            console.error('Error updating notification:', updateError)
          }
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationNavigation = (notification: Notification) => {
    // Prefer the trigger-supplied `navigation_data` (page + filters) over
    // the bare type — gives us specific deep links instead of dumping the
    // user on a category list. Falls back to type-based section landing
    // when the data isn't there (older synthesized rows, alerts, etc.).
    const data = notification.navigation_data
    const filters = data?.filters || {}
    const page = data?.page

    // 1. Specific-item deep links — only when the destination has a
    //    real per-item page on mobile.
    // Study test-ready notifications carry page:'study-session' — their
    // sessionId is a STUDY session, not an academy class session, so
    // this must win before the generic sessionId branch below.
    if (page === 'study-session' && filters.sessionId) {
      router.push(`/mobile/study/session/${filters.sessionId}`)
      return
    }
    if (filters.sessionId) {
      router.push(`/mobile/session/${filters.sessionId}`)
      return
    }
    if (filters.reportId) {
      router.push(`/mobile/report/${filters.reportId}`)
      return
    }
    if (filters.invoiceId) {
      router.push(`/mobile/invoice/${filters.invoiceId}`)
      return
    }

    // 2. Page-based fallback — use the page tag from the trigger.
    //    Maps manager-app names ("payments", "attendance") to the
    //    parent/student mobile equivalents.
    if (page) {
      const mobileRouteByPage: Record<string, string> = {
        session: '/mobile/schedule',
        sessions: '/mobile/schedule',
        attendance: '/mobile/schedule',
        assignment: '/mobile/assignments',
        assignments: '/mobile/assignments',
        grade: '/mobile/assignments',
        report: '/mobile/reports',
        reports: '/mobile/reports',
        payments: '/mobile/invoices',
        invoice: '/mobile/invoices',
        invoices: '/mobile/invoices',
        announcements: '/mobile/announcements',
      }
      const route = mobileRouteByPage[page]
      if (route) {
        router.push(route)
        return
      }
    }

    // 3. Final fallback — type-based, matches the original behavior.
    switch (notification.type) {
      case 'assignment':
      case 'grade':
        router.push('/mobile/assignments')
        break
      case 'session':
        router.push('/mobile/schedule')
        break
      case 'alert':
        router.push('/mobile/announcements')
        break
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
      }

      // Calculate updated notifications first
      const updated = localNotifications.map(notification => ({ ...notification, read: true }))

      // Update local state
      setLocalNotifications(updated)

      // CRITICAL FIX: Update Zustand store to prevent sync overwriting local state
      setNotifications(updated)

      // PERFORMANCE: Update cache with new state
      if (effectiveUserId) {
        const cacheKey = `notifications-${effectiveUserId}`
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(updated))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        } catch (cacheError) {
          console.warn('[Performance] Failed to update notification cache:', cacheError)
        }
      }

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
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-emerald-500'}`}></div>
      case 'reminder':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-amber-500'}`}></div>
      case 'announcement':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-violet-500'}`}></div>
      default:
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-primary'}`}></div>
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = Math.max(0, now.getTime() - date.getTime())
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) {
      return t('mobile.notifications.justNow')
    } else if (diffMinutes < 60) {
      return t('mobile.notifications.minutesAgo', { count: diffMinutes })
    } else if (diffHours < 24) {
      return t('mobile.notifications.hoursAgo', { count: diffHours })
    } else {
      return t('mobile.notifications.daysAgo', { count: diffDays })
    }
  }

  // Use localNotifications for UI to support read/unread tracking
  const allDisplayNotifications = localNotifications.length > 0 ? localNotifications : (zustandNotifications || [])
  const unreadCount = allDisplayNotifications ? allDisplayNotifications.filter(n => !n.read).length : 0

  // Per-tab counts (built from the full set, not the filtered/paged subset).
  const tabCounts = {
    all: allDisplayNotifications.length,
    assignment: allDisplayNotifications.filter(n => n.type === 'assignment').length,
    grade: allDisplayNotifications.filter(n => n.type === 'grade').length,
    session: allDisplayNotifications.filter(n => n.type === 'session').length,
    alert: allDisplayNotifications.filter(n => n.type === 'alert').length,
  }

  // Apply tab filter before pagination so each tab paginates independently.
  const filteredNotifications = activeTab === 'all'
    ? allDisplayNotifications
    : allDisplayNotifications.filter(n => n.type === activeTab)

  // Client-side pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayNotifications = filteredNotifications.slice(startIndex, endIndex)
  

  // Show loading skeleton while auth is loading
  if (authLoading) {
    return (
      <div className="p-4">
        {/* Header - same as loaded state */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MobileBackButton />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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
            <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
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
            <MobileBackButton />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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
            <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
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
        <StaggeredListSkeleton items={5} variant="notification" />
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MobileBackButton />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
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

      {/* Type filter tabs */}
      {allDisplayNotifications.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {([
            { key: 'all', label: t('mobile.notifications.tabs.all') },
            { key: 'assignment', label: t('mobile.notifications.tabs.assignment') },
            { key: 'grade', label: t('mobile.notifications.tabs.grade') },
            { key: 'session', label: t('mobile.notifications.tabs.session') },
            { key: 'alert', label: t('mobile.notifications.tabs.alert') },
          ] as const).map(tab => {
            const count = tabCounts[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {String(tab.label)}
                <span className={`ml-1.5 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Notifications List - Only show skeleton if truly no data */}
      {(loading && localNotifications.length === 0) ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
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
              className={`p-4 transition-all cursor-pointer ${notification.read ? 'bg-gray-50/50' : 'bg-primary/5 border-l-4 border-l-primary'}`}
              onClick={() => markAsRead(notification.id, true)}
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
                          markAsRead(notification.id, false)
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
      ) : fetchError && allDisplayNotifications.length === 0 ? (
        // Fetch failed AND nothing cached — show retry instead of the
        // "all caught up" empty state which would lie to the user about
        // their actual notification state.
        <Card>
          <ErrorState size="sm" onRetry={() => { refetchNotifications(true) }} />
        </Card>
      ) : allDisplayNotifications.length === 0 ? (
        <Card className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Bell className="w-6 h-6 text-gray-300" />
            <div className="text-gray-500 font-medium text-sm leading-tight">{t('mobile.notifications.noNotifications')}</div>
            <div className="text-gray-400 text-xs leading-tight">{t('mobile.notifications.allCaughtUp')}</div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Bell className="w-6 h-6 text-gray-300" />
            <div className="text-gray-500 font-medium text-sm leading-tight">
              {String(t('mobile.notifications.noNotificationsInTab'))}
            </div>
          </div>
        </Card>
      )}

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