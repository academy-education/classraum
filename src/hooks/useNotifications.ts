import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifications(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return

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
      setUnreadCount(data?.length || 0)
    } catch (error) {
      console.warn('Notification fetch failed, continuing without notifications:', error)
      setUnreadCount(0)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchUnreadCount()

      // Listen for notification read events from other components
      const handleNotificationRead = () => {
        fetchUnreadCount()
      }

      window.addEventListener('notificationRead', handleNotificationRead)

      // Set up real-time subscription for notifications (optional)
      try {
        const subscription = supabase
          .channel('notifications')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, () => {
            fetchUnreadCount()
          })
          .subscribe()

        return () => {
          window.removeEventListener('notificationRead', handleNotificationRead)
          subscription.unsubscribe()
        }
      } catch (error) {
        console.warn('Could not set up notification subscription:', error)
        return () => {
          window.removeEventListener('notificationRead', handleNotificationRead)
        }
      }
    }
  }, [userId, fetchUnreadCount])

  return { unreadCount, refetch: fetchUnreadCount }
}