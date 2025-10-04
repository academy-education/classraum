"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'announcement' | 'assignment' | 'grade' | 'attendance' | 'payment'
  is_read: boolean
  created_at: string
  related_id: string | null
  classroom?: {
    id: string
    name: string
    color: string
  }
}

interface UseMobileNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export const useMobileNotifications = (user: User | null | any, studentId: string | null): UseMobileNotificationsReturn => {
  // Initialize with sessionStorage data synchronously to prevent flash
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window === 'undefined' || !studentId) return []

    try {
      const sessionCacheKey = `mobile-notifications-${studentId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes (shorter for notifications)

        if (timeDiff < cacheValidFor) {
          return JSON.parse(sessionCachedData)
        }
      }
    } catch (error) {
      console.warn('[useMobileNotifications] Cache read error:', error)
    }

    return []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!user || !studentId) return

    // Check sessionStorage first for persistence across page reloads
    const sessionCacheKey = `mobile-notifications-${studentId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes (shorter for notifications)

      if (timeDiff < cacheValidFor) {
        setNotifications(JSON.parse(sessionCachedData))
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(`
          id,
          title,
          message,
          type,
          is_read,
          created_at,
          related_id,
          classroom:classrooms(
            id,
            name,
            color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError

      // Transform the data to match the Notification type
      const notificationsData: Notification[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        is_read: item.is_read,
        created_at: item.created_at,
        related_id: item.related_id,
        classroom: Array.isArray(item.classroom) ? item.classroom[0] : item.classroom
      }))

      // Cache in sessionStorage for persistence across page reloads
      try {
        const sessionCacheKey = `mobile-notifications-${studentId}`
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(notificationsData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[useMobileNotifications] Failed to cache data:', cacheError)
      }

      setNotifications(notificationsData)
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching mobile notifications:', err)
      }
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user, studentId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (updateError) throw updateError

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )

      // Update cache
      if (studentId) {
        const sessionCacheKey = `mobile-notifications-${studentId}`
        const updatedNotifications = notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(updatedNotifications))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error marking notification as read:', err)
      }
    }
  }, [notifications, studentId])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (updateError) throw updateError

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))

      // Update cache
      if (studentId) {
        const sessionCacheKey = `mobile-notifications-${studentId}`
        const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }))
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(updatedNotifications))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error marking all notifications as read:', err)
      }
    }
  }, [user, notifications, studentId])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (!user || !studentId) return
    fetchNotifications()
  }, [fetchNotifications, user, studentId])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead
  }
}
