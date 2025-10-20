"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { translateNotificationContent, NotificationParams } from '@/lib/notifications'
import { languages } from '@/locales'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search,
  Bell,
  Calendar,
  Users,
  CreditCard,
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight
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

interface NotificationsPageProps {
  userId: string
  onNavigate?: (page: string, filters?: { classroomId?: string; sessionId?: string }) => void
}

export function NotificationsPage({ userId, onNavigate }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [updating, setUpdating] = useState(false)
  const itemsPerPage = 10

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

  // Fetch notifications with filters and pagination
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`)
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setNotifications(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, searchTerm, typeFilter, currentPage])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Calendar className="w-5 h-5 text-primary" />
      case 'attendance':
        return <Users className="w-5 h-5 text-green-600" />
      case 'billing':
        return <CreditCard className="w-5 h-5 text-purple-600" />
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-primary" />
      case 'assignment':
        return <BookOpen className="w-5 h-5 text-orange-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return String(t("notifications.today"))
    if (diffInDays === 1) return String(t("notifications.yesterday"))
    if (diffInDays < 7) return `${diffInDays}${String(t("notifications.daysAgo"))}`
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Group notifications by date
  const groupNotificationsByDate = () => {
    const groups: { [key: string]: Notification[] } = {}
    
    notifications.forEach(notification => {
      const dateKey = formatDate(notification.created_at)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(notification)
    })
    
    return groups
  }

  // Mark notifications as read
  const markAsRead = async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return

    setUpdating(true)
    try {
      // Update local state immediately
      setNotifications(prev => {
        const updated = prev.map(notif =>
          notificationIds.includes(notif.id)
            ? { ...notif, is_read: true }
            : notif
        )

        // PERFORMANCE: Update cache with new state
        if (userId) {
          const cacheKey = `notifications-${userId}`
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(updated))
            sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
            console.log('[Performance] Notification cache updated after bulk mark as read')
          } catch (cacheError) {
            console.warn('[Performance] Failed to update notification cache:', cacheError)
          }
        }

        return updated
      })

      setSelectedNotifications([])

      // Dispatch event to update unread count badge
      window.dispatchEvent(new Event('notificationRead'))

      // Update database in background
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .in('id', notificationIds)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    } finally {
      setUpdating(false)
    }
  }

  // Handle notification click with navigation
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read if it's unread
      if (!notification.is_read) {
        // Update local state immediately
        setNotifications(prev => {
          const updated = prev.map(notif =>
            notif.id === notification.id
              ? { ...notif, is_read: true }
              : notif
          )

          // PERFORMANCE: Update cache with new state
          if (userId) {
            const cacheKey = `notifications-${userId}`
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(updated))
              sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
              console.log('[Performance] Notification cache updated after click')
            } catch (cacheError) {
              console.warn('[Performance] Failed to update notification cache:', cacheError)
            }
          }

          return updated
        })

        // Dispatch event to update unread count badge
        window.dispatchEvent(new Event('notificationRead'))

        // Update database in background
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', notification.id)

        if (error) throw error
      }

      // Parse navigation data and navigate if handler provided
      if (onNavigate && notification.navigation_data) {
        const navigationData = notification.navigation_data
        const targetPage = navigationData.page
        const filters = navigationData.filters || {}

        if (targetPage && targetPage !== 'dashboard') {
          onNavigate(targetPage, {
            classroomId: filters.classroomId,
            sessionId: filters.sessionId
          })
        }
      }

    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }

  // Toggle notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  // Select all notifications on current page
  const selectAllCurrentPage = () => {
    const currentPageIds = notifications.map(n => n.id)
    setSelectedNotifications(prev => {
      const allSelected = currentPageIds.every(id => prev.includes(id))
      if (allSelected) {
        return prev.filter(id => !currentPageIds.includes(id))
      } else {
        return [...new Set([...prev, ...currentPageIds])]
      }
    })
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const groupedNotifications = groupNotificationsByDate()
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("notifications.title")}</h1>
          <p className="text-gray-500">
            {totalCount > 0 && (
              <span>
                {totalCount}{t("notifications.pagination.notifications")}
                {unreadCount > 0 && (
                  <span className="text-primary ml-1">
                    • {unreadCount} {t("notifications.unread")}
                  </span>
                )}
              </span>
            )}
          </p>
        </div>
        
        {selectedNotifications.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAsRead(selectedNotifications)}
              disabled={updating}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {t("notifications.markRead")} ({selectedNotifications.length})
            </Button>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center gap-2 mb-4">
        {totalCount > 0 && (
          <button
            onClick={selectAllCurrentPage}
            className="flex h-9 w-auto items-center justify-between gap-2 rounded-md border border-input bg-white px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50"
          >
            <span>
              {notifications.every(n => selectedNotifications.includes(n.id)) ? t("notifications.deselectAll") : t("notifications.selectAll")}
            </span>
          </button>
        )}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder={t("notifications.filterByType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("notifications.allTypes")}</SelectItem>
            <SelectItem value="session">{t("notifications.notificationTypes.sessions")}</SelectItem>
            <SelectItem value="attendance">{t("notifications.notificationTypes.attendance")}</SelectItem>
            <SelectItem value="billing">{t("notifications.notificationTypes.billing")}</SelectItem>
            <SelectItem value="assignment">{t("notifications.notificationTypes.assignments")}</SelectItem>
            <SelectItem value="alert">{t("notifications.notificationTypes.alerts")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={String(t("notifications.searchNotifications"))}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : Object.keys(groupedNotifications).length === 0 ? (
        <Card className="p-12 text-center gap-2">
          <Bell className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">{t("notifications.noNotificationsFound")}</h3>
          <p className="text-gray-500 mb-2">
            {searchTerm || typeFilter !== 'all'
              ? t("notifications.adjustSearchFilter")
              : t("notifications.noNotificationsDescription")
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([dateGroup, groupNotifications]) => (
            <Card key={dateGroup} className="overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">{dateGroup}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {groupNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleNotificationSelection(notification.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 text-primary border-gray-300 rounded"
                      />
                      
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-medium truncate ${
                              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {getNotificationContent(notification).title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {getNotificationContent(notification).message}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            {t("notifications.pagination.showing")} {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} {t("notifications.pagination.to")}{' '}
            {Math.min(currentPage * itemsPerPage, totalCount)} {t("notifications.pagination.of")} {totalCount}{t("notifications.pagination.notifications")}
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("notifications.pagination.previous")}
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber
                if (totalPages <= 5) {
                  pageNumber = i + 1
                } else if (currentPage <= 3) {
                  pageNumber = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i
                } else {
                  pageNumber = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
              className="flex items-center gap-1"
            >
              {t("notifications.pagination.next")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}