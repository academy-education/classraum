"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

// Module-level state that persists across navigation
const globalAuthState = {
  user: null as MobileUser | null,
  isInitialized: false,
  initPromise: null as Promise<void> | null
}

// Force clear cached state on hot reload for development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  globalAuthState.user = null
  globalAuthState.isInitialized = false
  globalAuthState.initPromise = null
}

export function PersistentMobileAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<MobileUser | null>(globalAuthState.user)
  const [isInitializing, setIsInitializing] = useState(!globalAuthState.isInitialized)

  useEffect(() => {
    // If already initialized, use cached state
    if (globalAuthState.isInitialized) {
      setUser(globalAuthState.user)
      setIsInitializing(false)
      return
    }

    // If initialization is already in progress, wait for it
    if (globalAuthState.initPromise) {
      globalAuthState.initPromise.then(() => {
        setUser(globalAuthState.user)
        setIsInitializing(false)
      })
      return
    }

    // Start initial authentication check
    const initAuth = async () => {
      let authTimeout: NodeJS.Timeout | null = null

      // Set a timeout to prevent infinite loading
      authTimeout = setTimeout(() => {
        console.error('Auth check timeout - forcing redirect to auth')
        globalAuthState.isInitialized = true
        setIsInitializing(false)
        router.replace('/auth')
      }, 10000) // 10 second timeout

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (authTimeout) clearTimeout(authTimeout)
        
        if (!session?.user) {
          globalAuthState.isInitialized = true
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
          globalAuthState.isInitialized = true
          setIsInitializing(false)
          router.replace('/auth')
          if (authTimeout) clearTimeout(authTimeout)
          return
        }

        const role = userInfo.role

        // Only allow students and parents in mobile
        if (!role || (role !== 'student' && role !== 'parent')) {
          globalAuthState.isInitialized = true
          setIsInitializing(false)
          if (role === 'manager' || role === 'teacher') {
            router.replace('/dashboard')
          } else {
            router.replace('/auth')
          }
          if (authTimeout) clearTimeout(authTimeout)
          return
        }

        // Get academy_ids from role-specific table (support multiple academies)
        let academyIds: string[] = []
        if (role === 'student') {
          const { data: studentData } = await supabase
            .from('students')
            .select('academy_id')
            .eq('user_id', session.user.id)
          academyIds = studentData?.map(s => s.academy_id) || []
        } else if (role === 'parent') {
          const { data: parentData } = await supabase
            .from('parents')
            .select('academy_id')
            .eq('user_id', session.user.id)
          academyIds = parentData?.map(p => p.academy_id) || []
        }

        // Cache user data globally
        const userData = {
          userId: session.user.id,
          userName: userInfo.name || userInfo.email || '',
          academyIds: academyIds,
          role: userInfo.role
        }

        console.log('🔍 PersistentMobileAuth - User data created:', userData)

        globalAuthState.user = userData
        globalAuthState.isInitialized = true
        setUser(userData)
        setIsInitializing(false)
        if (authTimeout) clearTimeout(authTimeout)
      } catch (error) {
        console.error('Mobile auth check error:', error)
        globalAuthState.isInitialized = true
        setIsInitializing(false)
        router.replace('/auth')
        if (authTimeout) clearTimeout(authTimeout)
      } finally {
        globalAuthState.initPromise = null
      }
    }

    // Store the promise to prevent multiple initializations
    globalAuthState.initPromise = initAuth()
  }, [router]) // Router dependency needed for error handling

  // Listen for auth state changes (logout only)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Clear global cache on logout
        globalAuthState.user = null
        globalAuthState.isInitialized = false
        globalAuthState.initPromise = null
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