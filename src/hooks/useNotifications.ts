import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useNotifications(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('is_read', false)

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
  }

  useEffect(() => {
    if (userId) {
      fetchUnreadCount()
      
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
          subscription.unsubscribe()
        }
      } catch (error) {
        console.warn('Could not set up notification subscription:', error)
      }
    }
  }, [userId])

  return { unreadCount, refetch: fetchUnreadCount }
}