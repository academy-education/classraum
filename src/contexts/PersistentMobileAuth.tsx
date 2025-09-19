"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Network-aware timeout calculation
const getAdaptiveTimeout = (): number => {
  if (typeof window === 'undefined') return 5000 // Default for SSR

  try {
    // Check if Network Information API is available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    if (connection) {
      // Adapt timeout based on effective connection type
      switch (connection.effectiveType) {
        case 'slow-2g':
          return 10000 // 10 seconds for very slow connections
        case '2g':
          return 8000  // 8 seconds for slow connections
        case '3g':
          return 6000  // 6 seconds for moderate connections
        case '4g':
        default:
          return 4000  // 4 seconds for fast connections
      }
    }

    // Fallback: try to detect connection speed using ping-like approach
    const start = performance.now()
    const img = new Image()

    return new Promise<number>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(6000) // Default if ping test takes too long
      }, 1000)

      img.onload = img.onerror = () => {
        clearTimeout(timeout)
        const duration = performance.now() - start

        if (duration > 500) {
          resolve(8000) // Slow connection
        } else if (duration > 200) {
          resolve(6000) // Moderate connection
        } else {
          resolve(4000) // Fast connection
        }
      }

      img.src = '/favicon.ico?' + Math.random()
    }) as any

  } catch (error) {
    console.warn('[AdaptiveTimeout] Error detecting network conditions:', error)
  }

  return 5000 // Safe default
}

interface MobileUser {
  userId: string
  userName: string
  academyIds: string[]
  role: string
}

interface AuthStateCache {
  user: MobileUser | null
  isInitialized: boolean
  initPromise: Promise<void> | null
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

// Session-based state that clears on tab close/refresh
const getSessionAuthState = (): AuthStateCache => {
  if (typeof window === 'undefined') {
    return { user: null, isInitialized: false, initPromise: null }
  }

  const key = 'mobile-auth-state'
  const stored = sessionStorage.getItem(key)

  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      return {
        user: parsed.user,
        isInitialized: parsed.isInitialized,
        initPromise: null // Never restore promises
      }
    } catch {
      sessionStorage.removeItem(key)
    }
  }

  return { user: null, isInitialized: false, initPromise: null }
}

const setSessionAuthState = (state: { user: MobileUser | null; isInitialized: boolean }) => {
  if (typeof window === 'undefined') return

  const key = 'mobile-auth-state'
  try {
    sessionStorage.setItem(key, JSON.stringify({
      user: state.user,
      isInitialized: state.isInitialized
    }))
  } catch (error) {
    console.warn('Failed to store auth state:', error)
  }
}

const clearSessionAuthState = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('mobile-auth-state')
}

// Use session storage instead of module-level global state
// eslint-disable-next-line prefer-const
let authStateCache = getSessionAuthState()

// Mutex-like mechanism to prevent multiple simultaneous initializations
let initializationMutex = false
const waitForMutex = async (timeout = 3000): Promise<boolean> => {
  const startTime = Date.now()
  while (initializationMutex && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return !initializationMutex
}

export function PersistentMobileAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<MobileUser | null>(authStateCache.user)
  const [isInitializing, setIsInitializing] = useState(!authStateCache.isInitialized)

  useEffect(() => {
    // If already initialized, use cached state
    if (authStateCache.isInitialized) {
      setUser(authStateCache.user)
      setIsInitializing(false)
      return
    }

    // If initialization is already in progress, wait for it
    if (authStateCache.initPromise) {
      authStateCache.initPromise.then(() => {
        setUser(authStateCache.user)
        setIsInitializing(false)
      })
      return
    }

    // Wait for mutex before starting initialization to prevent race conditions
    const initializeWithMutex = async () => {
      const canProceed = await waitForMutex()
      if (!canProceed) {
        console.warn('[PersistentMobileAuth] Mutex timeout, proceeding anyway')
      }

      // Check again if someone else initialized while we were waiting
      if (authStateCache.isInitialized) {
        setUser(authStateCache.user)
        setIsInitializing(false)
        return
      }

      // Acquire mutex
      initializationMutex = true

      // Start auth initialization
      await initAuth()

      // Release mutex
      initializationMutex = false
    }

    // Start initial authentication check
    const initAuth = async () => {
      let authTimeout: NodeJS.Timeout | null = null

      // Get adaptive timeout based on network conditions
      const adaptiveTimeout = getAdaptiveTimeout()
      console.debug('[PersistentMobileAuth] Using adaptive timeout:', adaptiveTimeout)

      // Set a timeout to prevent infinite loading with network-aware duration
      authTimeout = setTimeout(() => {
        console.error(`Auth check timeout after ${adaptiveTimeout}ms - forcing redirect to auth`)
        authStateCache.isInitialized = true
        setSessionAuthState({ user: null, isInitialized: true })
        setIsInitializing(false)
        router.replace('/auth')
      }, adaptiveTimeout)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (authTimeout) clearTimeout(authTimeout)
        
        if (!session?.user) {
          authStateCache.isInitialized = true
          setSessionAuthState({ user: null, isInitialized: true })
          setIsInitializing(false)
          router.replace('/auth')
          return
        }
        
        // Get user info from database
        const { data: userInfo, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userError || !userInfo) {
          authStateCache.isInitialized = true
          setSessionAuthState({ user: null, isInitialized: true })
          setIsInitializing(false)
          router.replace('/auth')
          if (authTimeout) clearTimeout(authTimeout)
          return
        }

        const role = userInfo.role

        // Only allow students and parents in mobile
        if (!role || (role !== 'student' && role !== 'parent')) {
          authStateCache.isInitialized = true
          setSessionAuthState({ user: null, isInitialized: true })
          setIsInitializing(false)
          if (role === 'manager' || role === 'teacher') {
            router.replace('/dashboard')
          } else {
            router.replace('/auth')
          }
          if (authTimeout) clearTimeout(authTimeout)
          return
        }

        // Get academy_ids using security definer functions (bypasses RLS for auth context)
        let academyIds: string[] = []
        if (role === 'student') {
          const { data: academyIdsData, error: academyError } = await supabase
            .rpc('get_student_academy_ids', { student_user_id: session.user.id })
          if (academyError) {
            console.error('Error getting student academy IDs:', academyError)
          }
          academyIds = academyIdsData || []
        } else if (role === 'parent') {
          const { data: academyIdsData, error: academyError } = await supabase
            .rpc('get_parent_academy_ids', { parent_user_id: session.user.id })
          if (academyError) {
            console.error('Error getting parent academy IDs:', academyError)
          }
          academyIds = academyIdsData || []
        } else if (role === 'teacher') {
          const { data: academyIdsData, error: academyError } = await supabase
            .rpc('get_teacher_academy_ids', { teacher_user_id: session.user.id })
          if (academyError) {
            console.error('Error getting teacher academy IDs:', academyError)
          }
          academyIds = academyIdsData || []
        } else if (role === 'manager') {
          const { data: academyIdsData, error: academyError } = await supabase
            .rpc('get_manager_academy_ids', { manager_user_id: session.user.id })
          if (academyError) {
            console.error('Error getting manager academy IDs:', academyError)
          }
          academyIds = academyIdsData || []
        }

        // Cache user data globally
        const userData = {
          userId: session.user.id,
          userName: userInfo.name || userInfo.email || '',
          academyIds: academyIds,
          role: userInfo.role
        }

        console.log('🔍 PersistentMobileAuth - User data created:', userData)

        authStateCache.user = userData
        authStateCache.isInitialized = true
        setSessionAuthState({ user: userData, isInitialized: true })
        setUser(userData)
        setIsInitializing(false)
        if (authTimeout) clearTimeout(authTimeout)
      } catch (error) {
        console.error('Mobile auth check error:', error)
        authStateCache.isInitialized = true
        setSessionAuthState({ user: null, isInitialized: true })
        setIsInitializing(false)
        router.replace('/auth')
        if (authTimeout) clearTimeout(authTimeout)
      } finally {
        authStateCache.initPromise = null
        // Ensure mutex is always released
        initializationMutex = false
      }
    }

    // Store the promise to prevent multiple initializations
    authStateCache.initPromise = initializeWithMutex()
  }, [router]) // Router dependency needed for error handling

  // Listen for auth state changes (logout only)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Clear session cache on logout
        authStateCache.user = null
        authStateCache.isInitialized = false
        authStateCache.initPromise = null
        clearSessionAuthState()
        setUser(null)
        setIsInitializing(true)
        router.replace('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <PersistentMobileAuthContext.Provider 
      value={{ 
        user, 
        isInitializing, 
        isAuthenticated: !!user 
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