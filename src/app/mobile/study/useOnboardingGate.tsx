"use client"

import { useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth-headers'

/** Returns true when the student needs the onboarding wizard
 *  (first visit + no onboarded_at set yet). Null while loading so
 *  the landing doesn't flash the wizard on a returning user. */
export function useOnboardingGate(): { needsOnboarding: boolean | null; markComplete: () => void } {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
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
  }, [])

  return {
    needsOnboarding,
    markComplete: () => setNeedsOnboarding(false),
  }
}
