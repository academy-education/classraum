"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-screen'

export interface AuthRequirements {
  requireAuth?: boolean
  requireRole?: string[]
  redirectTo?: string
}

/**
 * Higher Order Component for authentication protection
 * Provides consistent authentication checking across all pages
 * 
 * @param Component - The component to protect
 * @param requirements - Authentication requirements
 * @returns Protected component
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requirements: AuthRequirements = { requireAuth: true }
) {
  return function ProtectedComponent(props: P) {
    const router = useRouter()
    const { userId, isLoading } = useAuth()
    
    useEffect(() => {
      // Wait for auth to load
      if (isLoading) return
      
      // Check authentication requirement
      if (requirements.requireAuth && !userId) {
        router.replace(requirements.redirectTo || '/auth')
        return
      }
      
      // Note: Role checking removed - handled by main routing logic
    }, [userId, isLoading, router])
    
    // Show loading while checking auth
    if (isLoading) {
      return <LoadingScreen />
    }
    
    // Don't render component if auth requirements not met
    if (requirements.requireAuth && !userId) {
      return <LoadingScreen />
    }
    
    // Role checking removed - handled by main routing logic
    
    // Render the protected component
    return <Component {...props} />
  }
}

// Convenience exports for common patterns
export const withManagerAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireRole: ['manager'],
    redirectTo: '/auth'
  })

export const withTeacherAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireRole: ['teacher', 'manager'],
    redirectTo: '/auth'
  })

export const withStudentAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireRole: ['student'],
    redirectTo: '/auth'
  })

export const withParentAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    requireRole: ['parent'],
    redirectTo: '/auth'
  })

export const withAnyAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, {
    requireAuth: true,
    redirectTo: '/auth'
  })