"use client"

import { useMemo, useRef } from 'react'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'

interface UseEffectiveUserIdReturn {
  effectiveUserId: string | null
  isReady: boolean
  isLoading: boolean
  userRole: string | null
  hasAcademyIds: boolean
  academyIds: string[]
}

/**
 * Stable hook for calculating effective user ID with proper loading states
 * Prevents infinite loading by providing clear ready/loading states
 */
export function useEffectiveUserId(): UseEffectiveUserIdReturn {
  const { user, isInitializing } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const lastResultRef = useRef<UseEffectiveUserIdReturn | null>(null)

  return useMemo(() => {
    // Still initializing auth
    if (isInitializing) {
      const result = {
        effectiveUserId: null,
        isReady: false,
        isLoading: true,
        userRole: null,
        hasAcademyIds: false,
        academyIds: []
      }
      lastResultRef.current = result
      return result
    }

    // No user authenticated
    if (!user) {
      const result = {
        effectiveUserId: null,
        isReady: false,
        isLoading: false,
        userRole: null,
        hasAcademyIds: false,
        academyIds: []
      }
      lastResultRef.current = result
      return result
    }

    // Calculate effective user ID
    let effectiveUserId: string | null = null

    if (user.role === 'parent') {
      // For parents, use selected student if available, otherwise null
      effectiveUserId = selectedStudent?.id || null
    } else {
      // For students, use their own ID
      effectiveUserId = user.userId
    }

    // Check if we have academy IDs
    const academyIds = user.academyIds || []
    const hasAcademyIds = academyIds.length > 0

    // Ready when we have effective user ID and academy IDs
    const isReady = Boolean(effectiveUserId && hasAcademyIds)

    const result = {
      effectiveUserId,
      isReady,
      isLoading: false,
      userRole: user.role,
      hasAcademyIds,
      academyIds
    }

    // Only log if values actually changed to reduce console spam
    if (!lastResultRef.current ||
        lastResultRef.current.effectiveUserId !== result.effectiveUserId ||
        lastResultRef.current.isReady !== result.isReady ||
        lastResultRef.current.hasAcademyIds !== result.hasAcademyIds) {
      console.log('🎯 [useEffectiveUserId] State changed:', {
        effectiveUserId,
        isReady,
        hasAcademyIds,
        academyIdsCount: academyIds.length,
        userRole: user.role
      })
    }

    lastResultRef.current = result
    return result
  }, [user, selectedStudent, isInitializing])
}