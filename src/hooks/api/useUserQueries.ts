import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { showSuccessToast, showErrorToast } from '@/stores'

// Query key factory for user-related queries
export const userKeys = {
  all: ['user'] as const,
  user: (id: string) => [...userKeys.all, 'detail', id] as const,
  profile: (id: string) => [...userKeys.all, 'profile', id] as const,
  preferences: (id: string) => [...userKeys.all, 'preferences', id] as const,
  notifications: (id: string) => [...userKeys.all, 'notifications', id] as const,
}

// Types
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
  academy_id: string
  avatar_url?: string
  phone?: string
  address?: string
  date_of_birth?: string
  emergency_contact?: {
    name: string
    phone: string
    relationship: string
  }
  created_at: string
  updated_at: string
}

interface UserPreferences {
  id: string
  user_id: string
  language: 'english' | 'korean'
  theme: 'light' | 'dark' | 'system'
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    marketing: boolean
  }
  dashboard_layout: 'default' | 'compact' | 'detailed'
  calendar_view: 'month' | 'week' | 'day'
  auto_refresh: boolean
  updated_at: string
}

interface UserNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  category: 'system' | 'payment' | 'session' | 'report' | 'announcement'
  read: boolean
  action_url?: string
  created_at: string
}

// Fetch user profile
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: userKeys.user(userId),
    queryFn: async (): Promise<User> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch user preferences
export const useUserPreferences = (userId: string) => {
  return useQuery({
    queryKey: userKeys.preferences(userId),
    queryFn: async (): Promise<UserPreferences> => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        // If no preferences exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            id: '',
            user_id: userId,
            language: 'english',
            theme: 'system',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            notifications: {
              email: true,
              push: true,
              sms: false,
              marketing: false,
            },
            dashboard_layout: 'default',
            calendar_view: 'month',
            auto_refresh: true,
            updated_at: new Date().toISOString(),
          }
        }
        throw error
      }
      
      return data
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// Fetch user notifications
export const useUserNotifications = (userId: string, unreadOnly = false) => {
  return useQuery({
    queryKey: [...userKeys.notifications(userId), unreadOnly],
    queryFn: async (): Promise<UserNotification[]> => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for notifications
  })
}

// Get unread notification count
export const useUnreadNotificationCount = (userId: string) => {
  return useQuery({
    queryKey: [...userKeys.notifications(userId), 'unread-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) throw error
      return count || 0
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Update user profile mutation
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Update user cache
      queryClient.setQueryData(userKeys.user(data.id), data)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      
      showSuccessToast('Profile updated', 'Your profile has been updated successfully.')
    },
    onError: (error: Error) => {
      showErrorToast('Update failed', error.message || 'Failed to update profile.')
    },
  })
}

// Update user preferences mutation
export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      userId, 
      preferences 
    }: { 
      userId: string
      preferences: Partial<UserPreferences> 
    }) => {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Update preferences cache
      queryClient.setQueryData(userKeys.preferences(data.user_id), data)
      
      showSuccessToast('Preferences updated', 'Your preferences have been saved.')
    },
    onError: (error: Error) => {
      showErrorToast('Update failed', error.message || 'Failed to update preferences.')
    },
  })
}

// Mark notification as read mutation
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ notificationId }: { notificationId: string }) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ 
        queryKey: userKeys.notifications(data.user_id) 
      })
    },
    onError: (error: Error) => {
      console.error('Failed to mark notification as read:', error)
    },
  })
}

// Mark all notifications as read mutation
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ 
        queryKey: userKeys.notifications(variables.userId) 
      })
      
      if (data.length > 0) {
        showSuccessToast('Notifications marked as read', `${data.length} notifications marked as read.`)
      }
    },
    onError: (error: Error) => {
      showErrorToast('Update failed', error.message || 'Failed to mark notifications as read.')
    },
  })
}

// Delete notification mutation
export const useDeleteNotification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ notificationId }: { notificationId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      // Remove from cache optimistically
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    onError: (error: Error) => {
      showErrorToast('Delete failed', error.message || 'Failed to delete notification.')
    },
  })
}

// Refresh user data utility
export const useRefreshUserData = (userId: string) => {
  const queryClient = useQueryClient()

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
    refreshUser: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.user(userId) })
    },
    refreshPreferences: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.preferences(userId) })
    },
    refreshNotifications: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.notifications(userId) })
    },
  }
}