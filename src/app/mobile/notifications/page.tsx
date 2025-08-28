"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMobileData } from '@/hooks/useProgressiveLoading'
import { getTeacherNamesWithCache } from '@/utils/mobileCache'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NotificationSkeleton } from '@/components/ui/skeleton'
import { Bell, ArrowLeft, Check, X } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: 'assignment' | 'grade' | 'announcement' | 'reminder'
  read: boolean
  created_at: string
  db_id?: string  // Database ID if saved
}

export default function MobileNotificationsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([])

  // Progressive loading for notifications
  const notificationsFetcher = useCallback(async () => {
    if (!user?.userId || !user?.academyId) return []
    return await fetchNotificationsOptimized()
  }, [user, language, t])
  
  const {
    data: notifications = [],
    isLoading: loading,
    refetch: refetchNotifications
  } = useMobileData(
    'mobile-notifications',
    notificationsFetcher,
    {
      immediate: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      backgroundRefresh: true,
      refreshInterval: 60000 // 1 minute
    }
  )

  // Sync with local state for read/unread tracking
  useEffect(() => {
    if (notifications && Array.isArray(notifications) && notifications.length > 0) {
      setLocalNotifications(notifications)
    }
  }, [notifications])

  const fetchNotificationsOptimized = async (): Promise<Notification[]> => {
    if (!user?.userId || !user?.academyId) return []
    
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
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.log('Error fetching notifications from database:', fetchError)
        // Continue without database notifications
      }
      
      const existingNotificationIds = new Set()
      const dbNotificationMap = new Map()
      
      if (dbNotifications) {
        dbNotifications.forEach((notif: any) => {
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
        .eq('student_id', user.userId)
        .eq('classrooms.academy_id', user.academyId)
      
      if (!enrolledClassrooms || enrolledClassrooms.length === 0) {
        return []
      }
      
      const classroomIds = enrolledClassrooms.map(ec => ec.classroom_id)
      
      // OPTIMIZATION: Get sessions for enrolled classrooms
      const { data: sessions } = await supabase
        .from('classroom_sessions')
        .select('id, classroom_id, date, start_time')
        .in('classroom_id', classroomIds)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
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
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(15),
        
        // Grades (simplified)
        supabase
          .from('assignment_grades')
          .select('id, assignment_id, score, updated_at')
          .eq('student_id', user.userId)
          .not('score', 'is', null)
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
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
      let assignmentMap = new Map()
      if (gradeNotifs.data && gradeNotifs.data.length > 0) {
        const gradeAssignmentIds = gradeNotifs.data.map((g: any) => g.assignment_id)
        const { data: gradeAssignments } = await supabase
          .from('assignments')
          .select('id, title, classroom_session_id')
          .in('id', gradeAssignmentIds)
        
        if (gradeAssignments) {
          gradeAssignments.forEach((a: any) => {
            assignmentMap.set(a.id, a)
          })
        }
      }
      
      const allNotifications: Notification[] = []
      const sessionMap = new Map()
      sessions.forEach((s: any) => {
        sessionMap.set(s.id, { ...s, classroom: classroomMap.get(s.classroom_id) })
      })
      
      // Process assignment notifications
      if (assignmentNotifs.data) {
        assignmentNotifs.data.forEach((assignment: any) => {
          const session = sessionMap.get(assignment.classroom_session_id)
          if (!session) return
          
          const dueDate = new Date(assignment.due_date)
          const now = new Date()
          const timeDiff = dueDate.getTime() - now.getTime()
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
          
          let message = ''
          if (daysDiff <= 1) {
            message = t('mobile.notifications.assignmentDueSoon', { title: assignment.title })
          } else if (daysDiff <= 3) {
            message = t('mobile.notifications.assignmentDueIn', { title: assignment.title, days: daysDiff })
          } else {
            message = t('mobile.notifications.newAssignmentCreated', { title: assignment.title })
          }
          
          const uniqueId = `assignment-${assignment.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: t('mobile.notifications.newAssignment'),
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
        gradeNotifs.data.forEach((gradeRecord: any) => {
          const assignment = assignmentMap.get(gradeRecord.assignment_id)
          if (!assignment) return
          
          const grade = typeof gradeRecord.score === 'number' ? `${gradeRecord.score}%` : gradeRecord.score
          const uniqueId = `grade-${gradeRecord.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: t('mobile.notifications.gradeUpdated'),
            message: t('mobile.notifications.assignmentGraded', { 
              title: assignment.title, 
              grade 
            }),
            type: 'grade',
            read: existingNotif?.is_read || false,
            created_at: gradeRecord.updated_at,
            db_id: existingNotif?.id
          })
        })
      }
      
      // Process session reminder notifications
      if (upcomingSessionNotifs.data) {
        upcomingSessionNotifs.data.forEach((session: any) => {
          const classroom = classroomMap.get(session.classroom_id)
          if (!classroom) return
          
          const sessionDate = new Date(session.date + 'T' + session.start_time)
          const now = new Date()
          const timeDiff = sessionDate.getTime() - now.getTime()
          const hoursDiff = Math.ceil(timeDiff / (1000 * 3600))
          
          let message = ''
          if (hoursDiff <= 2 && hoursDiff > 0) {
            message = t('mobile.notifications.classStartingSoon', { 
              className: classroom.name,
              hours: hoursDiff
            })
          } else if (hoursDiff <= 24) {
            message = t('mobile.notifications.classScheduledTomorrow', { 
              className: classroom.name 
            })
          } else {
            message = t('mobile.notifications.upcomingClass', { 
              className: classroom.name,
              date: new Date(session.date).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US')
            })
          }
          
          const uniqueId = `session-${session.id}`
          const existingNotif = dbNotificationMap.get(uniqueId)
          
          allNotifications.push({
            id: uniqueId,
            title: t('mobile.notifications.classReminder'),
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
                type: notif.type,
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
                  if (error.code === '23505' || error.code === 409 || error.message?.includes('409') || error.message?.includes('conflict')) {
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
  }

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
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        
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
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-blue-500'}`}></div>
      case 'grade':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-green-500'}`}></div>
      case 'reminder':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-orange-500'}`}></div>
      case 'announcement':
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-purple-500'}`}></div>
      default:
        return <div className={`${baseClasses} ${read ? 'bg-gray-400' : 'bg-blue-500'}`}></div>
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
  const displayNotifications = localNotifications.length > 0 ? localNotifications : (notifications || [])
  const unreadCount = displayNotifications ? displayNotifications.filter(n => !n.read).length : 0
  

  return (
    <div className="p-4">
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

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <NotificationSkeleton key={i} />
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
      ) : (
        <Card className="p-8 text-center text-gray-500">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">{t('mobile.notifications.noNotifications')}</p>
          <p className="text-sm">{t('mobile.notifications.allCaughtUp')}</p>
        </Card>
      )}
    </div>
  )
}