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
  /** Comma-separated academy names (kept for backwards compat with non-mobile callers). */
  academy_name?: string
  /** Full list of academy names — preferred for rendering since the page can decide how to summarize. */
  academy_names?: string[]
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
  /** Save a new phone number. Writes users.phone (the home for
   *  academy-less study accounts) and the role table when a row exists.
   *  Returns false if every write failed. */
  updatePhone: (phone: string) => Promise<boolean>
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
          role: userData.role,
          // users.phone is the base — study-only accounts have no role
          // table row, so this is their only phone home. Role tables
          // override below when they carry one.
          phone: userData.phone || undefined
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
              if (studentData.phone) profileData.phone = studentData.phone
              profileData.student_school = studentData.school_name
            }
          } else if (userData.role === 'teacher') {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (teacherData?.phone) {
              profileData.phone = teacherData.phone
            }
          } else if (userData.role === 'parent') {
            const { data: parentData } = await supabase
              .from('parents')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (parentData?.phone) {
              profileData.phone = parentData.phone
            }
          } else if (userData.role === 'academy_owner') {
            const { data: ownerData } = await supabase
              .from('academy_owners')
              .select('phone')
              .eq('user_id', userId)
              .single()

            if (ownerData?.phone) {
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
              const names = academyData.map(a => a.name)
              profileData.academy_names = names
              profileData.academy_name = names.join(', ')
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
      } catch (cacheError) {
        console.warn('[useMobileProfile] Failed to cache data:', cacheError)
      }

      setData(cachedData)
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

  const updatePhone = useCallback(async (rawPhone: string): Promise<boolean> => {
    if (!userId || !data) return false
    const phone = rawPhone.trim() || null

    // users.phone always (the only home for academy-less study accounts).
    const { error: usersError } = await supabase
      .from('users')
      .update({ phone })
      .eq('id', userId)
    if (usersError) {
      console.error('[useMobileProfile] Error updating users.phone:', usersError)
      return false
    }

    // Role table too, when a row exists — keeps academy surfaces (which
    // read the role tables) in sync. A 0-row update is a silent no-op.
    const roleTable = data.profile.role === 'student' ? 'students' :
                      data.profile.role === 'teacher' ? 'teachers' :
                      data.profile.role === 'parent' ? 'parents' :
                      data.profile.role === 'academy_owner' ? 'academy_owners' : null
    if (roleTable) {
      const { error: roleError } = await supabase
        .from(roleTable)
        .update({ phone })
        .eq('user_id', userId)
      if (roleError) console.warn(`[useMobileProfile] Error updating ${roleTable}.phone:`, roleError)
    }

    const cachedData: CachedProfileData = {
      profile: { ...data.profile, phone: phone || undefined },
      preferences: data.preferences
    }
    setData(cachedData)
    try {
      const sessionCacheKey = `mobile-profile-${userId}`
      sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
      sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
    } catch { /* cache best-effort */ }
    return true
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
    updatePreferences,
    updatePhone
  }
}
