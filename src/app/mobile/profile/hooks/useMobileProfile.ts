"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useStableCallback } from '@/hooks/useStableCallback'

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  academy_name?: string
  student_grade?: string
  student_school?: string
  created_at?: string
}

export interface UserPreferences {
  push_notifications: boolean
  email_notifications: {
    assignments: boolean
    grades: boolean
    announcements: boolean
    reminders: boolean
  }
  language: string
}

interface CachedProfileData {
  profile: UserProfile
  preferences: UserPreferences
}

interface UseMobileProfileReturn {
  profile: UserProfile | null
  preferences: UserPreferences
  loading: boolean
  preferencesLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
}

const defaultPreferences: UserPreferences = {
  push_notifications: false,
  email_notifications: {
    assignments: true,
    grades: true,
    announcements: true,
    reminders: true
  },
  language: 'english'
}

export const useMobileProfile = (
  userId: string | null,
  userName: string | null,
  academyIds: string[]
): UseMobileProfileReturn => {
  // Initialize with sessionStorage data synchronously
  const [data, setData] = useState<CachedProfileData | null>(() => {
    if (typeof window === 'undefined' || !userId) return null

    try {
      const sessionCacheKey = `mobile-profile-${userId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(sessionCachedData)
          console.log('✅ [useMobileProfile] Loaded cached profile on init for user:', userId)
          return parsed
        }
      }
    } catch (error) {
      console.warn('[useMobileProfile] Cache read error:', error)
    }

    return null
  })

  const [loading, setLoading] = useState(() => data === null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfileData = useStableCallback(async () => {
    if (!userId) {
      console.log('[useMobileProfile] No user ID available')
      return
    }

    // Check cache first
    const sessionCacheKey = `mobile-profile-${userId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        try {
          const parsed = JSON.parse(sessionCachedData)
          console.log('✅ [useMobileProfile] Using cached data, skipping fetch')
          setData(parsed)
          return
        } catch (error) {
          console.warn('[useMobileProfile] Cache parse error:', error)
        }
      }
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[useMobileProfile] Fetching profile for user:', userId)

      // Fetch profile and preferences in parallel
      const [userDataResult, preferencesResult] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('user_preferences').select('*').eq('user_id', userId).single()
      ])

      // Build profile data
      let profileData: UserProfile = {
        id: userId,
        name: userName || 'User',
        email: '',
        role: 'student'
      }

      if (userDataResult.data && !userDataResult.error) {
        const userData = userDataResult.data
        profileData = {
          id: userData.id,
          name: userData.name || userName || 'User',
          email: userData.email || '',
          role: userData.role
        }

        // Fetch role-specific data
        try {
          if (userData.role === 'student') {
            const { data: studentData } = await supabase
              .from('students')
              .select('phone, school_name')
              .eq('user_id', userId)
              .single()

            if (studentData) {
              profileData.phone = studentData.phone
              profileData.student_school = studentData.school_name
            }
          } else if (userData.role === 'teacher') {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (teacherData) {
              profileData.phone = teacherData.phone
            }
          } else if (userData.role === 'parent') {
            const { data: parentData } = await supabase
              .from('parents')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (parentData) {
              profileData.phone = parentData.phone
            }
          } else if (userData.role === 'academy_owner') {
            const { data: ownerData } = await supabase
              .from('academy_owners')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (ownerData) {
              profileData.phone = ownerData.phone
            }
          }
        } catch (roleError) {
          console.warn('[useMobileProfile] Error fetching role-specific data:', roleError)
        }

        // Get academy names
        try {
          if (academyIds && academyIds.length > 0) {
            const { data: academyData } = await supabase
              .from('academies')
              .select('name')
              .in('id', academyIds)

            if (academyData && academyData.length > 0) {
              profileData.academy_name = academyData.map(a => a.name).join(', ')
            }
          }
        } catch (academyError) {
          console.warn('[useMobileProfile] Error fetching academy data:', academyError)
        }
      }

      // Build preferences data
      let preferencesData = { ...defaultPreferences }

      if (preferencesResult.data && !preferencesResult.error) {
        const emailNotifs = preferencesResult.data.email_notifications || {}
        preferencesData = {
          push_notifications: preferencesResult.data.push_notifications || false,
          email_notifications: {
            assignments: emailNotifs.assignments !== false,
            grades: emailNotifs.grades !== false,
            announcements: emailNotifs.announcements !== false,
            reminders: emailNotifs.reminders !== false
          },
          language: preferencesResult.data.language || 'english'
        }
      }

      const cachedData: CachedProfileData = {
        profile: profileData,
        preferences: preferencesData
      }

      // Cache the combined data
      try {
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
        console.log('[useMobileProfile] Cached profile data')
      } catch (cacheError) {
        console.warn('[useMobileProfile] Failed to cache data:', cacheError)
      }

      setData(cachedData)
      console.log('[useMobileProfile] Successfully fetched profile')
    } catch (err) {
      console.error('[useMobileProfile] Error fetching profile:', err)
      setError('Failed to load profile')

      // Set fallback data
      setData({
        profile: {
          id: userId,
          name: userName || 'User',
          email: '',
          role: 'student'
        },
        preferences: defaultPreferences
      })
    } finally {
      setLoading(false)
    }
  })

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId || !data) return

    const newPreferences = {
      ...data.preferences,
      ...updates,
      email_notifications: {
        ...data.preferences.email_notifications,
        ...(updates.email_notifications || {})
      }
    }

    // Optimistically update state
    setData({
      ...data,
      preferences: newPreferences
    })

    setPreferencesLoading(true)

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          push_notifications: newPreferences.push_notifications,
          email_notifications: newPreferences.email_notifications,
          language: newPreferences.language
        })

      if (error) {
        console.error('[useMobileProfile] Error updating preferences:', error)
        // Revert on error
        setData(data)
      } else {
        // Update cache with new preferences
        const sessionCacheKey = `mobile-profile-${userId}`
        const cachedData: CachedProfileData = {
          profile: data.profile,
          preferences: newPreferences
        }
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      }
    } catch (error) {
      console.error('[useMobileProfile] Error updating preferences:', error)
      setData(data)
    } finally {
      setPreferencesLoading(false)
    }
  }, [userId, data])

  // Fetch on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchProfileData()
    }
  }, [userId])

  // Clear cache when userId changes (for parent switching students)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && userId) {
        const prevCacheKey = `mobile-profile-${userId}`
        // We don't clear here because the cleanup would run on every render
        // Instead we clear in PersistentMobileAuth when user logs out
      }
    }
  }, [userId])

  return {
    profile: data?.profile || null,
    preferences: data?.preferences || defaultPreferences,
    loading,
    preferencesLoading,
    error,
    refetch: fetchProfileData,
    updatePreferences
  }
}
