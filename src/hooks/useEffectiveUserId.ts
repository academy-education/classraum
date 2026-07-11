"use client"

import { useMemo, useRef } from 'react'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useSelectedStudentStore, useSelectedStudentHydrated } from '@/stores/selectedStudentStore'

interface UseEffectiveUserIdReturn {
  effectiveUserId: string | null
  isReady: boolean
  isLoading: boolean
  userRole: string | null
  hasAcademyIds: boolean
  academyIds: string[]
}

// Stable empty array reference to prevent infinite loops
const EMPTY_ACADEMY_IDS: string[] = []

/**
 * Stable hook for calculating effective user ID with proper loading states
 * Prevents infinite loading by providing clear ready/loading states
 */
export function useEffectiveUserId(): UseEffectiveUserIdReturn {
  const { user, isInitializing } = usePersistentMobileAuth()
  const { selectedStudent } = useSelectedStudentStore()
  const studentHydrated = useSelectedStudentHydrated()
  const lastResultRef = useRef<UseEffectiveUserIdReturn | null>(null)

  return useMemo(() => {
    // Wait for the persisted selectedStudent to rehydrate from localStorage
    // before deciding readiness. Otherwise parents see a "Select a student"
    // empty state flash on hard refresh because selectedStudent is briefly
    // null on the first client render. Keep isLoading=true so pages render
    // their skeletons during this window.
    if (!studentHydrated) {
      const result = {
        effectiveUserId: null,
        isReady: false,
        isLoading: true,
        userRole: null,
        hasAcademyIds: false,
        academyIds: EMPTY_ACADEMY_IDS
      }
      lastResultRef.current = result
      return result
    }

    // Still initializing auth
    if (isInitializing) {
      const result = {
        effectiveUserId: null,
        isReady: false,
        isLoading: true,
        userRole: null,
        hasAcademyIds: false,
        academyIds: EMPTY_ACADEMY_IDS
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
        academyIds: EMPTY_ACADEMY_IDS
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

    // Check if we have academy IDs - use stable reference when empty
    const academyIds = user.academyIds && user.academyIds.length > 0 ? user.academyIds : EMPTY_ACADEMY_IDS
    const hasAcademyIds = academyIds.length > 0

    // Ready when:
    // - For students: we have an effective user ID. Academy membership
    //   is OPTIONAL since study-only accounts exist — pages that need
    //   academy data check hasAcademyIds themselves.
    // - For parents: we have academy IDs (even if no student selected - shows empty state)
    const isReady = user.role === 'parent'
      ? hasAcademyIds // Parents are ready if they have academy access, even without selected student
      : Boolean(effectiveUserId)

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
    }

    lastResultRef.current = result
    return result
  }, [user, selectedStudent, isInitializing, studentHydrated])
}