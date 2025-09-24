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
      console.log('🔄 [usePageWithAuth] Returning loading state - genuine loading detected')
      return { ...auth, [requiredProp]: '' }
    }

    if (shouldSuppress) {
      console.log('🚫 [usePageWithAuth] Navigation detected - proceeding with auth data')
    }

    const propValue = auth[requiredProp as keyof typeof auth]

    // Only throw error if we're not loading and the value is truly missing
    if (!propValue || propValue === '') {
      console.error(`[usePageWithAuth] Missing ${requiredProp} in auth context after loading completed`)
      // Instead of throwing immediately, return a safe state
      // The AuthWrapper will handle the redirect
      return {
        ...auth,
        [requiredProp]: '',
        hasError: true,
        errorMessage: `Missing ${requiredProp} in auth context`
      }
    }

    return { [requiredProp]: propValue, ...auth }
  }, [auth, requiredProp])

  return value
}