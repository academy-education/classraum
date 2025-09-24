"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'
import { translateNotificationContent, NotificationParams } from '@/lib/notifications'
import { languages } from '@/locales'

export interface RecentActivity {
  id: string
  title: string
  description: string
  timestamp: string
  type?: string
  navigationData?: {
    page?: string
    filters?: Record<string, unknown>
  } | null
}

interface UseRecentActivitiesReturn {
  activities: RecentActivity[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useRecentActivities = (
  userId: string | null, 
  language: 'english' | 'korean' = 'english'
): UseRecentActivitiesReturn => {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecentActivities = useCallback(async () => {
    if (!userId) return
    
    const cacheKey = `activities_${userId}_${language}`
    const cached = queryCache.get(cacheKey)

    if (cached && Array.isArray(cached)) {
      console.log('✅ [useRecentActivities] Using cached data')
      setActivities(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (cached && Array.isArray(cached)) {
        setActivities(cached)
        setLoading(false)
        return
      }

      // Fetch recent notifications
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (notificationsError) {
        // Log error for development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching notifications:', notificationsError)
        }
        setError('Failed to load recent activities')
        return
      }

      const processedActivities = notifications?.map(notification => {
        const translatedContent = translateNotificationContent(
          notification.title_key,
          notification.message_key,
          notification.title_params as NotificationParams,
          notification.message_params as NotificationParams,
          languages[language],
          notification.title,
          notification.message,
          language
        )

        return {
          id: notification.id,
          title: translatedContent.title,
          description: translatedContent.message,
          timestamp: notification.created_at,
          type: notification.type,
          navigationData: notification.navigation_data as { page?: string } | null
        }
      }) || []

      queryCache.set(cacheKey, processedActivities, CACHE_TTL.SHORT)
      setActivities(processedActivities)
      
    } catch (err) {
      // Log error for development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching recent activities:', err)
      }
      setError('Failed to load recent activities')
    } finally {
      setLoading(false)
    }
  }, [userId, language])

  // Immediate check for navigation suppression with cached data
  useEffect(() => {
    if (!userId) return

    const cacheKey = `activities_${userId}_${language}`
    const cached = queryCache.get(cacheKey)
    if (cached && Array.isArray(cached) && loading) {
      console.log('✅ [useRecentActivities] Using cached data during loading')
      setActivities(cached)
      setLoading(false)
      return
    }

    fetchRecentActivities()
  }, [fetchRecentActivities, userId, language, loading])

  return {
    activities,
    loading,
    error,
    refetch: fetchRecentActivities
  }
}