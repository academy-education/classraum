import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useStableCallback } from './useStableCallback'

export function useNotifications(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useStableCallback(async () => {
    if (!userId) return

    // PERFORMANCE: Check cache first (30 second TTL for unread count)
    const cacheKey = `notifications-unread-${userId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 30 * 1000 // 30 seconds TTL
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = parseInt(cachedData)
        console.log('✅ Unread count cache hit:', parsed)
        setUnreadCount(parsed)
        return
      }
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.warn('Could not fetch notifications:', error.message)
        setUnreadCount(0)
        return
      }

      const count = data?.length || 0
      setUnreadCount(count)

      // PERFORMANCE: Cache the count
      try {
        sessionStorage.setItem(cacheKey, count.toString())
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Unread count cached:', count)
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache unread count:', cacheError)
      }
    } catch (error) {
      console.warn('Notification fetch failed, continuing without notifications:', error)
      setUnreadCount(0)
    }
  })

  useEffect(() => {
    if (userId) {
      fetchUnreadCount()

      // Listen for notification read events from other components
      const handleNotificationRead = () => {
        fetchUnreadCount()
      }

      // Listen for new notification creation events
      const handleNotificationCreated = () => {
        // Invalidate cache and refetch immediately
        const cacheKey = `notifications-unread-${userId}`
        sessionStorage.removeItem(cacheKey)
        sessionStorage.removeItem(`${cacheKey}-timestamp`)
        fetchUnreadCount()
      }

      window.addEventListener('notificationRead', handleNotificationRead)
      window.addEventListener('notificationCreated', handleNotificationCreated)

      // OPTIMIZED: Use polling instead of real-time subscription to reduce requests
      // Poll every 60 seconds instead of subscribing to every change
      const pollInterval = setInterval(() => {
        fetchUnreadCount()
      }, 60000) // 60 seconds

      return () => {
        window.removeEventListener('notificationRead', handleNotificationRead)
        window.removeEventListener('notificationCreated', handleNotificationCreated)
        clearInterval(pollInterval)
      }
    }
  }, [userId])

  return { unreadCount, refetch: fetchUnreadCount }
}