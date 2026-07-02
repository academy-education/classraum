"use client"

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth-headers'
import { useLandingData } from './LandingDataProvider'

/** Returns true when the student needs the onboarding wizard
 *  (first visit + no onboarded_at set yet). Null while loading so
 *  the landing doesn't flash the wizard on a returning user.
 *
 *  Prefers the shared LandingDataProvider payload when mounted so we
 *  don't double-fetch /api/study/prefs. Falls back to the standalone
 *  endpoint when the provider isn't in the tree (e.g., if this hook
 *  is used on a non-landing surface in the future). */
export function useOnboardingGate(): { needsOnboarding: boolean | null; markComplete: () => void } {
  const landingData = useLandingData()
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    // Provider path: read from the shared context.
    if (landingData) {
      if (landingData.loading) return
      setNeedsOnboarding(!landingData.prefs?.onboarded_at)
      return
    }
    // Fallback path: no provider, fetch directly.
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/prefs', { headers })
        if (!res.ok) {
          if (!cancelled) setNeedsOnboarding(false)
          return
        }
        const json = await res.json()
        if (!cancelled) setNeedsOnboarding(!json.prefs?.onboarded_at)
      } catch {
        if (!cancelled) setNeedsOnboarding(false)
      }
    })()
    return () => { cancelled = true }
  }, [landingData])

  return {
    needsOnboarding,
    markComplete: () => setNeedsOnboarding(false),
  }
}
