"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
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
  const { user: authUser, userId, userName, academyId } = useAuth()
  const [mobileUser, setMobileUser] = useState<MobileUser | null>(null)

  // Navigation-aware initialization - don't show loading if we've been here before
  const [isInitializing, setIsInitializing] = useState(() => {
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

        // Transform to mobile user format
        const transformedUser: MobileUser = {
          userId: authUser.id,
          userName: userName,
          academyIds: academyId ? [academyId] : [],
          role: userInfo.role
        }

        console.log('✅ [PersistentMobileAuth] Setting mobile user:', transformedUser)
        setMobileUser(transformedUser)
        setIsInitializing(false)

        // Mark initialization complete
        appInitTracker.markUserDataInitialized()
      } catch (error) {
        console.error('[PersistentMobileAuth] Error in fetchUserRole:', error)
      }
    }

    fetchUserRole()
  }, [authUser, userId, userName, academyId])

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