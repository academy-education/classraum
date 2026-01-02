"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { appInitTracker } from '@/utils/appInitializationTracker'

// Simplified mobile user interface that wraps the unified auth user
interface MobileUser {
  userId: string
  userName: string
  academyIds: string[]
  role: string
}

interface PersistentMobileAuthContextType {
  user: MobileUser | null
  isInitializing: boolean
  isAuthenticated: boolean
}

const PersistentMobileAuthContext = createContext<PersistentMobileAuthContextType>({
  user: null,
  isInitializing: true,
  isAuthenticated: false
})

export function PersistentMobileAuthProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, userId, userName, academyId, academyIds } = useAuth()

  // Initialize mobile user from sessionStorage to prevent flash
  const [mobileUser, setMobileUser] = useState<MobileUser | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      const cachedUser = sessionStorage.getItem('mobile-user')
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser)
        console.log('✅ [PersistentMobileAuth] Loaded cached user on init:', parsed)
        return parsed
      }
    } catch (error) {
      console.warn('[PersistentMobileAuth] Failed to load cached user:', error)
    }
    return null
  })

  const lastAcademyIdsRef = useRef<string[]>([])

  // Navigation-aware initialization - don't show loading if we've been here before or have cached user
  const [isInitializing, setIsInitializing] = useState(() => {
    // If we have a cached user, we're not initializing
    if (mobileUser) {
      console.log('✅ [PersistentMobileAuth] Have cached user, not initializing')
      return false
    }

    // Check if we should suppress loading for navigation
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
      console.log('🚫 [PersistentMobileAuth] Suppressing initial loading - app previously initialized')
      return false
    }
    return !mobileUser && !!authUser
  })

  // Transform auth user to mobile user format when auth state changes
  useEffect(() => {
    if (!authUser || !userId || !userName) {
      setMobileUser(null)
      // Clear cached user on logout
      try {
        sessionStorage.removeItem('mobile-user')
      } catch (error) {
        console.warn('[PersistentMobileAuth] Failed to clear cached user:', error)
      }
      return
    }

    // If we already have a mobile user with matching userId, skip fetch
    if (mobileUser && mobileUser.userId === authUser.id) {
      console.log('✅ [PersistentMobileAuth] Already have user, skipping fetch')
      return
    }

    // Get user role from Supabase to determine mobile user format
    const fetchUserRole = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single()

        if (error || !userInfo) {
          console.error('[PersistentMobileAuth] Error fetching user role:', error)
          return
        }

        // Create stable academyIds array - use academyIds from context if available, fallback to single academyId
        const newAcademyIds = academyIds && academyIds.length > 0 ? academyIds : (academyId ? [academyId] : [])
        const academyIdsChanged =
          lastAcademyIdsRef.current.length !== newAcademyIds.length ||
          !lastAcademyIdsRef.current.every((id, i) => id === newAcademyIds[i])

        if (academyIdsChanged) {
          lastAcademyIdsRef.current = newAcademyIds
        }

        // Transform to mobile user format
        const transformedUser: MobileUser = {
          userId: authUser.id,
          userName: userName,
          academyIds: lastAcademyIdsRef.current,
          role: userInfo.role
        }

        console.log('✅ [PersistentMobileAuth] Setting mobile user:', transformedUser)
        setMobileUser(transformedUser)
        setIsInitializing(false)

        // Cache user in sessionStorage for instant access on reload
        try {
          sessionStorage.setItem('mobile-user', JSON.stringify(transformedUser))
        } catch (error) {
          console.warn('[PersistentMobileAuth] Failed to cache user:', error)
        }

        // Mark initialization complete
        appInitTracker.markUserDataInitialized()
      } catch (error) {
        console.error('[PersistentMobileAuth] Error in fetchUserRole:', error)
      }
    }

    fetchUserRole()
  }, [authUser, userId, userName, academyId, academyIds])

  return (
    <PersistentMobileAuthContext.Provider
      value={{
        user: mobileUser,
        isInitializing,
        isAuthenticated: !!mobileUser
      }}
    >
      {children}
    </PersistentMobileAuthContext.Provider>
  )
}

export function usePersistentMobileAuth() {
  const context = useContext(PersistentMobileAuthContext)
  if (!context) {
    throw new Error('usePersistentMobileAuth must be used within a PersistentMobileAuthProvider')
  }
  return context
}