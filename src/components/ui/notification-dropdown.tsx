"use client"

import { useState, useEffect, useRef } from 'react'
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
  onNotificationUpdate?: () => void
  onNotificationClick?: (notification: Notification) => void
  bellButtonRef?: React.RefObject<HTMLButtonElement>
}

export function NotificationDropdown({ 
  userId, 
  isOpen, 
  onClose, 
  onNavigateToNotifications,
  onNotificationUpdate,
  onNotificationClick,
  bellButtonRef
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  const { language } = useLanguage()
  const dropdownRef = useRef<HTMLDivElement>(null)

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
        notification.message
      )
    }
    // Fallback to original title/message for legacy notifications
    return {
      title: notification.title,
      message: notification.message
    }
  }

  // Fetch recent notifications (last 6)
  const fetchNotifications = async () => {
    if (!userId) return
    
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
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      )

      // Notify parent component to update count
      if (onNotificationUpdate) {
        onNotificationUpdate()
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-4 h-4 text-blue-600" />
      case 'attendance':
        return <Users className="w-4 h-4 text-green-600" />
      case 'billing':
        return <CreditCard className="w-4 h-4 text-purple-600" />
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-600" />
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

    if (diffInMinutes < 1) return t("notifications.justNow")
    if (diffInMinutes < 60) return `${diffInMinutes}${t("notifications.minutesAgo")}`
    if (diffInHours < 24) return `${diffInHours}${t("notifications.hoursAgo")}`
    return `${diffInDays}${t("notifications.daysAgo")}`
  }

  // Close dropdown when clicking outside
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
      fetchNotifications()
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-10 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
    >
      <Card className="border-0 shadow-none p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-gray-900">{t("notifications.title")}</h3>
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
              <p className="text-sm">{t("notifications.noNotifications")}</p>
              <p className="text-xs text-gray-400 mt-1">{t("notifications.noNotificationsDescription")}</p>
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
                    if (onNotificationClick) {
                      onNotificationClick(notification)
                    } else if (!notification.is_read) {
                      markAsRead(notification.id)
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
              className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => {
                onNavigateToNotifications()
                onClose()
              }}
            >
              {t("notifications.seeAllNotifications")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}