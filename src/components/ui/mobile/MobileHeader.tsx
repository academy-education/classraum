"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

export function MobileHeader() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { user } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const lastFetchTimeRef = useRef<number>(0)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchUnreadNotifications()
    }, 500) // 500ms debounce
  }, [])

  useEffect(() => {
    fetchUnreadNotifications()

    // Listen for notification read events
    const handleNotificationRead = () => {
      debouncedFetch()
    }

    // Listen for page visibility changes (when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only fetch if it's been more than 30 seconds since last fetch
        const now = Date.now()
        if (now - lastFetchTimeRef.current > 30000) {
          debouncedFetch()
        }
      }
    }

    window.addEventListener('notificationRead', handleNotificationRead)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      window.removeEventListener('notificationRead', handleNotificationRead)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [debouncedFetch])

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

  const handleNotificationClick = () => {
    router.push('/mobile/notifications')
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

          {/* Notification Button */}
          <button
            onClick={handleNotificationClick}
            className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-600" />
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0 rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}