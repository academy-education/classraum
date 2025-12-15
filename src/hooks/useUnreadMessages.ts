import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setUnreadCount(0)
        return
      }

      // Check cache first (30 second TTL)
      const cacheKey = `messages-unread-${session.user.id}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cachedTimestamp) {
        const cacheValidFor = 30 * 1000 // 30 seconds TTL
        const timeDiff = Date.now() - parseInt(cachedTimestamp)

        if (timeDiff < cacheValidFor) {
          const parsed = parseInt(cachedData)
          setUnreadCount(parsed)
          return
        }
      }

      const response = await fetch('/api/messages/unread', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.warn('Failed to fetch unread message count')
        setUnreadCount(0)
        return
      }

      const data = await response.json()
      const count = data.unreadCount || 0
      setUnreadCount(count)

      // Cache the count
      try {
        sessionStorage.setItem(cacheKey, count.toString())
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('Failed to cache unread message count:', cacheError)
      }
    } catch (error) {
      console.warn('Unread message count fetch failed:', error)
      setUnreadCount(0)
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()

    // Listen for message read events from MessagesPage
    const handleMessageRead = () => {
      // Invalidate cache and refetch
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          const cacheKey = `messages-unread-${session.user.id}`
          sessionStorage.removeItem(cacheKey)
          sessionStorage.removeItem(`${cacheKey}-timestamp`)
        }
      })
      fetchUnreadCount()
    }

    window.addEventListener('messageRead', handleMessageRead)

    // Real-time subscription for new messages
    const channel = supabase
      .channel('sidebar_unread_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages'
        },
        () => {
          // Invalidate cache and refetch on new message
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.id) {
              const cacheKey = `messages-unread-${session.user.id}`
              sessionStorage.removeItem(cacheKey)
              sessionStorage.removeItem(`${cacheKey}-timestamp`)
            }
          })
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_messages'
        },
        () => {
          // Refetch when messages are marked as read
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.id) {
              const cacheKey = `messages-unread-${session.user.id}`
              sessionStorage.removeItem(cacheKey)
              sessionStorage.removeItem(`${cacheKey}-timestamp`)
            }
          })
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('messageRead', handleMessageRead)
      supabase.removeChannel(channel)
    }
  }, [fetchUnreadCount])

  return { unreadCount, refetch: fetchUnreadCount }
}
