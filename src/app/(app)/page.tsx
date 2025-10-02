'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { appInitTracker } from '@/utils/appInitializationTracker'

export default function AppRootPage() {
  const router = useRouter()
  const { user, isLoading, isInitialized, userDataLoading } = useAuth()

  useEffect(() => {
    // Wait for auth initialization and user data loading
    if (!isInitialized || isLoading || userDataLoading) {
      return
    }

    // If no user after initialization, AuthWrapper will handle redirect to /auth
    if (!user) {
      return
    }

    const roleBasedRedirect = async () => {
      try {
        // Get user role from database - this is safe because AuthWrapper has validated the user
        const { supabase } = await import('@/lib/supabase')
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          console.error('[AppRoot] Error fetching user role:', error)
          // Let AuthWrapper handle the error case
          return
        }

        const userRole = userInfo.role
        console.log('[AppRoot] User role detected:', userRole)

        // Redirect based on role
        if (userRole === 'student' || userRole === 'parent') {
          console.log('[AppRoot] Redirecting student/parent to mobile')
          router.replace('/mobile')
        } else if (userRole === 'manager') {
          console.log('[AppRoot] Redirecting manager to dashboard')
          router.replace('/dashboard')
        } else if (userRole === 'teacher') {
          console.log('[AppRoot] Redirecting teacher to classrooms')
          router.replace('/classrooms')
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          console.log('[AppRoot] Redirecting admin to admin dashboard')
          router.replace('/admin')
        } else {
          console.warn('[AppRoot] Unknown role, staying on current page:', userRole)
          // Don't redirect to auth - let AuthWrapper handle invalid roles
        }
      } catch (error) {
        console.error('[AppRoot] Error in role-based redirect:', error)
        // Let AuthWrapper handle the error
      }
    }

    roleBasedRedirect()
  }, [user, isInitialized, isLoading, userDataLoading, router])

  // Show loading screen while auth is initializing (with navigation awareness)
  if (appInitTracker.shouldSuppressLoadingForNavigation()) {
    console.log('🚫 [AppRootPage] Suppressing loading screen - navigation detected')
    // Return empty to avoid blocking - the redirect useEffect will handle navigation
    return <></>
  }

  return <LoadingScreen />
}