import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export interface AuthCheckOptions {
  requireAuth?: boolean
  requireRole?: string[]
  redirectTo?: string
  onAuthSuccess?: () => void
  onAuthFail?: () => void
}

/**
 * Custom hook for authentication checking
 * Provides consistent auth validation logic across the application
 * 
 * @param options - Authentication check options
 * @returns Authentication state and utilities
 */
export function useAuthCheck(options: AuthCheckOptions = { requireAuth: true }) {
  const router = useRouter()
  const { userId, role, academyId, isLoading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  
  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return
    
    // Reset state
    setAuthError(null)
    setIsAuthorized(false)
    
    // Check authentication requirement
    if (options.requireAuth && !userId) {
      setAuthError('Authentication required')
      options.onAuthFail?.()
      if (options.redirectTo) {
        router.replace(options.redirectTo)
      } else {
        router.replace('/auth')
      }
      return
    }
    
    // Check role requirement
    if (options.requireRole && options.requireRole.length > 0) {
      if (!role || !options.requireRole.includes(role)) {
        setAuthError(`Unauthorized role: ${role}`)
        options.onAuthFail?.()
        
        // Smart redirect based on role
        if (role === 'student' || role === 'parent') {
          router.replace('/mobile')
        } else if (role === 'manager' || role === 'teacher') {
          router.replace('/dashboard')
        } else {
          router.replace('/auth')
        }
        return
      }
    }
    
    // Auth successful
    setIsAuthorized(true)
    options.onAuthSuccess?.()
    
  }, [userId, role, isLoading, router, options])
  
  return {
    isAuthorized,
    isLoading,
    authError,
    userId,
    role,
    academyId,
    // Utility functions
    requireAuth: () => {
      if (!userId) {
        router.replace('/auth')
        return false
      }
      return true
    },
    requireRole: (roles: string[]) => {
      if (!role || !roles.includes(role)) {
        setAuthError(`Role ${role} not authorized`)
        return false
      }
      return true
    },
    checkAccess: (requiredRole?: string) => {
      if (!userId) return false
      if (requiredRole && role !== requiredRole) return false
      return true
    }
  }
}

// Convenience hooks for specific roles
export const useManagerAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['manager']
})

export const useTeacherAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['teacher', 'manager']
})

export const useStudentAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['student']
})

export const useParentAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['parent']
})

export const useMobileAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['student', 'parent']
})

export const useDashboardAuth = () => useAuthCheck({
  requireAuth: true,
  requireRole: ['manager', 'teacher']
})