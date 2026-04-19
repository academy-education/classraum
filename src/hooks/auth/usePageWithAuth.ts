"use client"

import { useAuth } from '@/contexts/AuthContext'
import { useMemo } from 'react'
import { simpleTabDetection } from '@/utils/simpleTabDetection'

export const usePageWithAuth = (requiredProp: 'academyId' | 'userId') => {
  const auth = useAuth()

  const value = useMemo(() => {
    // Check for navigation suppression first
    const shouldSuppress = simpleTabDetection.isReturningToTab()

    // During loading, return the auth object with loading state
    // This prevents throwing errors during initialization
    // However, if navigation is detected, proceed with normal flow
    if ((auth.isLoading || auth.userDataLoading) && !shouldSuppress) {
      return { ...auth, [requiredProp]: '' }
    }

    if (shouldSuppress) {
    }

    // If there's no user after loading completes, let auth system handle redirect
    if (!auth.user) {
      return { ...auth, [requiredProp]: '' }
    }

    const propValue = auth[requiredProp as keyof typeof auth]

    // Only throw error if we're not loading and the value is undefined/null
    // Note: Empty string '' is a valid value (e.g., admin users have academyId = '')
    if (propValue === undefined || propValue === null) {
      // Only show error if we're absolutely certain all loading is complete
      // Check isInitialized AND userDataLoading is explicitly false (not just falsy)
      const isFullyLoaded = auth.isInitialized && auth.userDataLoading === false

      if (!isFullyLoaded) {
        return { ...auth, [requiredProp]: '' }
      }

      // At this point, everything is loaded but prop is still missing
      // Just return safely - don't log error as it creates noise during normal auth flow
      return { ...auth, [requiredProp]: '' }
    }

    return { [requiredProp]: propValue, ...auth }
  }, [auth, requiredProp])

  return value
}