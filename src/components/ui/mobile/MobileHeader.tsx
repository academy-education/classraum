"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, User, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

export function MobileHeader() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const lastFetchTimeRef = useRef<number>(0)
  const lastMessagesFetchTimeRef = useRef<number>(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadNotifications()
    }, 500) // 500ms debounce
  }, [])

  // Debounced fetch for messages
  const debouncedMessagesFetch = useCallback(() => {
    if (messagesDebounceTimeoutRef.current) {
      clearTimeout(messagesDebounceTimeoutRef.current)
    }
    messagesDebounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadMessages()
    }, 500)
  }, [])

  useEffect(() => {
    fetchUnreadNotifications()
    fetchUnreadMessages()

    // Listen for notification read events
    const handleNotificationRead = () => {
      debouncedFetch()
    }

    // Listen for message read events
    const handleMessageRead = () => {
      debouncedMessagesFetch()
    }

    // Listen for page visibility changes (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only fetch if it's been more than 30 seconds since last fetch
        const now = Date.now()
        if (now - lastFetchTimeRef.current > 30000) {
          debouncedFetch()
        }
        if (now - lastMessagesFetchTimeRef.current > 30000) {
          debouncedMessagesFetch()
        }
      }
    }

    window.addEventListener('notificationRead', handleNotificationRead)
    window.addEventListener('messageRead', handleMessageRead)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Real-time subscription for new messages
    const channel = supabase
      .channel('mobile_header_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages'
        },
        () => {
          debouncedMessagesFetch()
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
          debouncedMessagesFetch()
        }
      )
      .subscribe()

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (messagesDebounceTimeoutRef.current) {
        clearTimeout(messagesDebounceTimeoutRef.current)
      }
      window.removeEventListener('notificationRead', handleNotificationRead)
      window.removeEventListener('messageRead', handleMessageRead)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUnreadNotifications = async () => {
    // Prevent concurrent fetches
    if (isLoading) return

    try {
      setIsLoading(true)
      lastFetchTimeRef.current = Date.now()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('MobileHeader: No user found')
        return
      }

      // Fetch unread notifications count (only recent ones, matching notifications page)
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (error) {
        console.error('MobileHeader: Error fetching notification count:', error)
        return
      }
      setUnreadCount(count || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnreadMessages = async () => {
    try {
      lastMessagesFetchTimeRef.current = Date.now()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('[MobileHeader] No session for unread messages')
        setUnreadMessagesCount(0)
        return
      }

      // Skip cache to ensure fresh data
      const response = await fetch('/api/messages/unread', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        console.warn('[MobileHeader] Failed to fetch unread message count:', response.status)
        setUnreadMessagesCount(0)
        return
      }

      const data = await response.json()
      const count = data.unreadCount || 0
      console.log('[MobileHeader] Unread messages count:', count)
      setUnreadMessagesCount(count)
    } catch (error) {
      console.warn('[MobileHeader] Unread message count fetch failed:', error)
      setUnreadMessagesCount(0)
    }
  }

  const handleNotificationClick = () => {
    router.push('/mobile/notifications')
  }

  const handleMessagesClick = () => {
    router.push('/mobile/messages')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo2-test.png"
            alt="Classraum"
            width={150}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Selected Student Indicator - Only show for parents */}
          {user?.role === 'parent' && selectedStudent && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 truncate max-w-[120px]">
                {selectedStudent.name}
              </span>
            </div>
          )}

          {/* Messages Button */}
          <button
            onClick={handleMessagesClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
            aria-label="Messages"
          >
            <MessageSquare className="w-6 h-6 text-gray-600" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center px-1">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Notification Button */}
          <button
            onClick={handleNotificationClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-xs rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}