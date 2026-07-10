'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { appInitTracker } from '@/utils/appInitializationTracker'

export default function AppRootPage() {
  const router = useRouter()
  const pathname = usePathname()
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

        // Redirect based on role (only if not already on target page).
        // Students with an academy land on the Grades/Study hub;
        // study-only students (no academy membership) go straight to
        // Study. Parents go to the Grades dashboard since Study is a
        // student-only experience.
        if (userRole === 'student') {
          const { count } = await supabase
            .from('students')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('active', true)
          const target = (count ?? 0) > 0 ? '/mobile/start' : '/mobile/study'
          if (pathname !== target) {
            router.replace(target)
          }
        } else if (userRole === 'parent') {
          if (pathname !== '/mobile') {
            router.replace('/mobile')
          }
        } else if (userRole === 'manager') {
          if (pathname !== '/dashboard') {
            router.replace('/dashboard')
          }
        } else if (userRole === 'teacher') {
          if (pathname !== '/classrooms') {
            router.replace('/classrooms')
          }
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          if (pathname !== '/admin') {
            router.replace('/admin')
          }
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
  }, [user, isInitialized, isLoading, userDataLoading, router, pathname])

  // Show loading screen while auth is initializing (with navigation awareness)
  if (appInitTracker.shouldSuppressLoadingForNavigation()) {
    // Return empty to avoid blocking - the redirect useEffect will handle navigation
    return <></>
  }

  return <LoadingScreen />
}