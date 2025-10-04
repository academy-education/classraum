"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { appInitTracker } from '@/utils/appInitializationTracker'

interface RoleBasedAuthWrapperProps {
  children: React.ReactNode
  allowedRoles: string[]
  redirectTo?: string
  fallbackRedirect?: string
}

export function RoleBasedAuthWrapper({
  children,
  allowedRoles,
  redirectTo,
  fallbackRedirect = '/auth'
}: RoleBasedAuthWrapperProps) {
  const router = useRouter()
  const { user, isLoading, isInitialized, error, userId, userDataLoading } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)
  // Always show loading during initial role fetch, only suppress on true tab returns
  const [roleLoading, setRoleLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Fetch user role when user is available
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setUserRole(null)
        setRoleLoading(false)
        return
      }

      try {
        const { data: userInfo, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userInfo) {
          setAuthError('Failed to load user role')
          setUserRole(null)
        } else {
          setUserRole(userInfo.role)
          // Mark role validation complete
          appInitTracker.markRoleValidated()
        }
      } catch (error) {
        setAuthError('Authentication error')
        setUserRole(null)
      } finally {
        setRoleLoading(false)
      }
    }

    if (isInitialized && !userDataLoading) {
      fetchUserRole()
    }
  }, [user, isInitialized, userDataLoading])

  // Handle redirects based on authentication and role
  useEffect(() => {
    if (!isInitialized || isLoading || roleLoading || userDataLoading) {
      return
    }

    // Redirect unauthenticated users
    if (!user) {
      router.replace(fallbackRedirect)
      return
    }

    // Wait for role to be loaded before making decisions
    if (!userRole) {
      return
    }

    // Redirect users with unauthorized roles
    if (!allowedRoles.includes(userRole)) {
      // Determine redirect destination based on role
      let redirectDestination = redirectTo || fallbackRedirect

      if (!redirectTo) {
        // Auto-determine redirect based on role
        if (userRole === 'student' || userRole === 'parent') {
          redirectDestination = '/mobile'
        } else if (userRole === 'manager' || userRole === 'teacher') {
          redirectDestination = '/dashboard'
        } else if (userRole === 'admin' || userRole === 'super_admin') {
          redirectDestination = '/admin'
        }
      }

      router.replace(redirectDestination)
      return
    }
  }, [user, userRole, isInitialized, isLoading, roleLoading, userDataLoading, allowedRoles, router, redirectTo, fallbackRedirect])

  // Don't show loading screen - let the layout and page components handle their own loading states
  // This prevents flickering when switching from LoadingScreen to actual content

  // Show error state
  if (error || authError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 p-6 max-w-md">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-destructive">Authentication Error</h2>
            <p className="text-sm text-muted-foreground">
              {authError || error || 'Unable to verify your access permissions. Please sign in again.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Don't block rendering during redirects - let the layout show through
  // The redirect useEffect will handle navigation
  if (!user || !userRole || !allowedRoles.includes(userRole)) {
    return <></>
  }

  // Render children if user is authenticated and authorized
  return <>{children}</>
}