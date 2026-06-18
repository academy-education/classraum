"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { translateNotificationContent, NotificationParams } from '@/lib/notifications'
import { languages } from '@/locales'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/common/EmptyState'
import {
  Bell,
  X,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  BookOpen,
  ChevronRight
} from 'lucide-react'

// Cache invalidation helper for notifications
export const invalidateNotificationCache = (userId: string) => {
  const cacheKey = `notifications-${userId}`
  sessionStorage.removeItem(cacheKey)
  sessionStorage.removeItem(`${cacheKey}-timestamp`)
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
        setNotifications(parsed)
        setLoading(false)
        return
      }
    } else {
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

  // Render a colored icon chip — mirrors the help-center
  // MessagesNotificationsDemo styling so the two surfaces match.
  const getNotificationIcon = (type: string) => {
    const map: Record<string, { Icon: typeof Bell; color: string }> = {
      session:    { Icon: Calendar,    color: 'text-primary bg-primary/10' },
      attendance: { Icon: Users,       color: 'text-amber-600 bg-amber-50' },
      billing:    { Icon: CreditCard,  color: 'text-emerald-600 bg-emerald-50' },
      alert:      { Icon: AlertCircle, color: 'text-rose-600 bg-rose-50' },
      assignment: { Icon: BookOpen,    color: 'text-violet-600 bg-violet-50' },
    }
    const { Icon, color } = map[type] ?? { Icon: Bell, color: 'text-gray-600 bg-gray-100' }
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </div>
    )
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
      className="absolute top-10 right-0 w-96 bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.08)] overflow-hidden z-50"
    >
      {/* Header — matches command palette chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
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
          <div className="p-3 space-y-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 p-2">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-3.5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={String(translate("notifications.noNotifications"))}
            description={String(translate("notifications.noNotificationsDescription"))}
            size="sm"
            variant="subtle"
          />
        ) : (
          <div>
            {notifications.map((notification, i) => (
              <div
                key={notification.id}
                className={`px-3 py-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                  i < notifications.length - 1 ? 'border-b border-gray-100' : ''
                } hover:bg-gray-50 ${notification.is_read ? '' : 'bg-primary/[0.02]'}`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id)
                  }
                  if (onNotificationClick) {
                    onNotificationClick(notification)
                  }
                }}
              >
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className={`text-sm truncate ${
                      !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                    }`}>
                      {getNotificationContent(notification).title}
                    </div>
                    <div className="text-[11px] text-gray-400 flex-shrink-0">
                      {formatTimeAgo(notification.created_at)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {getNotificationContent(notification).message}
                  </div>
                </div>
                {!notification.is_read && (
                  <div className="w-1.5 h-1.5 mt-2 bg-primary rounded-full flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — matches command palette ghost-link style */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-2 py-1.5">
          <Button
            variant="ghost"
            className="w-full justify-center text-sm text-primary hover:text-primary hover:bg-primary/8 font-medium gap-1"
            onClick={() => {
              onNavigateToNotifications()
              onClose()
            }}
          >
            {translate("notifications.seeAllNotifications")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}