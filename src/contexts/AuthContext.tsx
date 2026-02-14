"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { appInitTracker } from '@/utils/appInitializationTracker'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  // Extended user data from AuthWrapper
  userId?: string
  userName?: string
  academyId?: string
  academyIds?: string[]  // Multi-academy support
  userDataLoading?: boolean
  // Method to update extended user data
  updateUserData?: (data: {
    userId: string
    userName: string
    academyId: string
    academyIds?: string[]  // Multi-academy support
    isLoading: boolean
  }) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  userId: undefined,
  userName: undefined,
  academyId: undefined,
  academyIds: undefined,
  userDataLoading: true
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  // Navigation-aware loading state initialization using appInitTracker
  const [isLoading, setIsLoading] = useState(() => {
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
      console.log('🚫 [AuthContext] Suppressing initial loading - navigation detected via appInitTracker')
      return false
    }
    return true // Default to loading
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extended user data state
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [academyId, setAcademyId] = useState<string | undefined>(undefined)
  const [academyIds, setAcademyIds] = useState<string[] | undefined>(undefined)
  const [userDataLoading, setUserDataLoading] = useState(() => {
    const shouldSuppress = appInitTracker.shouldSuppressLoadingForNavigation()
    if (shouldSuppress) {
      console.log('🚫 [AuthContext] Suppressing initial user data loading - navigation detected via appInitTracker')
      return false
    }
    return true
  })

  // Method to update extended user data
  const updateUserData = (data: {
    userId: string
    userName: string
    academyId: string
    academyIds?: string[]
    isLoading: boolean
  }) => {
    setUserId(data.userId)
    setUserName(data.userName)
    setAcademyId(data.academyId)
    setAcademyIds(data.academyIds || (data.academyId ? [data.academyId] : []))
    setUserDataLoading(data.isLoading)
  }

  useEffect(() => {
    let mounted = true

    // Get initial session and set up auth listener
    const initializeAuth = async () => {
      console.log('🔐 [AuthContext] Starting auth initialization')
      try {
        // Get initial session
        console.log('🔐 [AuthContext] Calling supabase.auth.getSession()')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('🔐 [AuthContext] getSession result:', { session: !!session, error: !!error })

        if (mounted) {
          // Handle stale/invalid refresh token: clear bad tokens and treat as logged out
          if (error && error.message?.includes('Refresh Token')) {
            console.warn('🔐 [AuthContext] Stale refresh token detected, clearing session')
            await supabase.auth.signOut().catch(() => {})
            // Clear any leftover Supabase keys from localStorage
            if (typeof window !== 'undefined') {
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key)
              })
            }
            setSession(null)
            setUser(null)
            setError(null)
          } else {
            if (error) {
              setError(error.message)
            }
            setSession(session)
            setUser(session?.user ?? null)
          }
          setIsLoading(false)
          setIsInitialized(true)

          // Mark auth as initialized in the app tracker
          appInitTracker.markAuthInitialized()
          console.log('✅ [AuthContext] Auth initialization complete, marked in tracker')
        }
      } catch (error) {
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Authentication error')
          setIsLoading(false)
          setIsInitialized(true)

          // Mark auth as initialized even in error case
          appInitTracker.markAuthInitialized()
          console.log('✅ [AuthContext] Auth initialization complete (error case), marked in tracker')
        }
      }
    }

    // Initialize immediately
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setError(null)

          // Clear extended user data on logout
          if (!session?.user) {
            setUserId(undefined)
            setUserName(undefined)
            setAcademyId(undefined)
            setAcademyIds(undefined)
            setUserDataLoading(false)
          } else {
            // Reset userDataLoading when we get a user to trigger refetch, unless navigation detected
            const shouldSuppressUserDataLoading = appInitTracker.shouldSuppressLoadingForNavigation()
            if (shouldSuppressUserDataLoading) {
              console.log('🚫 [AuthContext] Suppressing user data loading on auth change - navigation detected')
              setUserDataLoading(false)
            } else {
              setUserDataLoading(true)
            }
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isInitialized,
    error,
    userId,
    userName,
    academyId,
    academyIds,
    userDataLoading,
    updateUserData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}