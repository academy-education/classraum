"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { translateNotificationContent, NotificationParams } from '@/lib/notifications'
import { languages } from '@/locales'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Bell,
  X,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  BookOpen
} from 'lucide-react'

// Cache invalidation helper for notifications
export const invalidateNotificationCache = (userId: string) => {
  const cacheKey = `notifications-${userId}`
  sessionStorage.removeItem(cacheKey)
  sessionStorage.removeItem(`${cacheKey}-timestamp`)
  console.log('[Performance] Notification cache invalidated for user:', userId)
}

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  title_key?: string
  message_key?: string
  title_params?: NotificationParams
  message_params?: NotificationParams
  type: string
  is_read: boolean
  navigation_data?: {
    page?: string
    filters?: {
      classroomId?: string
      sessionId?: string
      studentId?: string
    }
    action?: string
  }
  created_at: string
  updated_at: string
}

interface NotificationDropdownProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onNavigateToNotifications: () => void
  onNotificationClick?: (notification: Notification) => void
  bellButtonRef?: React.RefObject<HTMLButtonElement>
}

export function NotificationDropdown({
  userId,
  isOpen,
  onClose,
  onNavigateToNotifications,
  onNotificationClick,
  bellButtonRef
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { t, language } = useTranslation()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Defensive check: ensure t function is defined
  const translate = (key: string) => {
    if (typeof t === 'function') {
      const result = t(key)
      console.log('[NotificationDropdown] Translation debug:', {
        key,
        result,
        language,
        typeofT: typeof t,
        resultType: typeof result,
        isArray: Array.isArray(result)
      })
      // If translation returns the key itself, it means translation failed
      if (result === key) {
        console.error(`[NotificationDropdown] Translation FAILED for key: ${key}, language: ${language}`)
      }
      return result
    }
    console.error('[NotificationDropdown] Translation function not initialized')
    return key
  }

  // Get translated notification content
  const getNotificationContent = (notification: Notification) => {
    if (notification.title_key && notification.message_key) {
      const translations = languages[language]
      return translateNotificationContent(
        notification.title_key,
        notification.message_key,
        notification.title_params || {},
        notification.message_params || {},
        translations,
        notification.title,
        notification.message,
        language
      )
    }
    // Fallback to original title/message for legacy notifications
    return {
      title: notification.title,
      message: notification.message
    }
  }

  // Fetch recent notifications (last 6)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    // PERFORMANCE: Check cache first (30 second TTL for notifications)
    const cacheKey = `notifications-${userId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 30 * 1000 // 30 seconds TTL (notifications should be fresh)
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Notification cache hit:', {
          notifications: parsed.length || 0
        })
        setNotifications(parsed)
        setLoading(false)
        return
      } else {
        console.log('⏰ Notification cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Notification cache miss, fetching from database')
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error

      setNotifications(data || [])

      // PERFORMANCE: Cache the results
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data || []))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Notifications cached for 30 seconds')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache notifications:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      // Update local state immediately for better UX
      setNotifications(prev => {
        const updated = prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )

        // PERFORMANCE: Update notification list cache with new state
        const cacheKey = `notifications-${userId}`
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(updated))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
          console.log('[Performance] Notification cache updated after marking as read')
        } catch (cacheError) {
          console.warn('[Performance] Failed to update notification cache:', cacheError)
        }

        // PERFORMANCE: Invalidate unread count cache to force refresh
        const unreadCacheKey = `notifications-unread-${userId}`
        sessionStorage.removeItem(unreadCacheKey)
        sessionStorage.removeItem(`${unreadCacheKey}-timestamp`)

        return updated
      })

      // Update database first
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      // Dispatch event to update unread count badge AFTER database update
      window.dispatchEvent(new Event('notificationRead'))

    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-4 h-4 text-primary" />
      case 'attendance':
        return <Users className="w-4 h-4 text-green-600" />
      case 'billing':
        return <CreditCard className="w-4 h-4 text-purple-600" />
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-primary" />
      case 'assignment':
        return <BookOpen className="w-4 h-4 text-orange-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffInMs = now.getTime() - past.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return translate("notifications.justNow")
    if (diffInMinutes < 60) return `${diffInMinutes}${translate("notifications.minutesAgo")}`
    if (diffInHours < 24) return `${diffInHours}${translate("notifications.hoursAgo")}`
    return `${diffInDays}${translate("notifications.daysAgo")}`
  }

  // Handle dropdown opening/closing and click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target)
      const clickedBellButton = bellButtonRef?.current && bellButtonRef.current.contains(target)
      
      if (!clickedInsideDropdown && !clickedBellButton) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, bellButtonRef])

  // Fetch notifications only when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Listen for new notification creation events
  useEffect(() => {
    const handleNotificationCreated = () => {
      // Invalidate cache and refetch immediately
      const cacheKey = `notifications-${userId}`
      sessionStorage.removeItem(cacheKey)
      sessionStorage.removeItem(`${cacheKey}-timestamp`)

      // Only refetch if dropdown is open
      if (isOpen) {
        fetchNotifications()
      }
    }

    window.addEventListener('notificationCreated', handleNotificationCreated)

    return () => {
      window.removeEventListener('notificationCreated', handleNotificationCreated)
    }
  }, [userId, isOpen, fetchNotifications])

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-10 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      <Card className="border-0 shadow-none p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-gray-900">{translate("notifications.title")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-auto"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3 p-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">{translate("notifications.noNotifications")}</p>
              <p className="text-xs text-gray-400 mt-1">{translate("notifications.noNotificationsDescription")}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`px-4 py-3 cursor-pointer transition-colors duration-150 ease-in-out ${
                    !notification.is_read 
                      ? 'bg-blue-50 border-l-2 border-l-blue-600 hover:bg-blue-100' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    // Always mark as read first
                    if (!notification.is_read) {
                      markAsRead(notification.id)
                    }
                    // Then execute click handler if provided
                    if (onNotificationClick) {
                      onNotificationClick(notification)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {getNotificationContent(notification).title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full ml-1"></div>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 line-clamp-2 ${
                        !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {getNotificationContent(notification).message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={() => {
                onNavigateToNotifications()
                onClose()
              }}
            >
              {translate("notifications.seeAllNotifications")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}