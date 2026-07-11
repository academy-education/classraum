"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authHeaders } from '@/lib/auth-headers'

/**
 * Provider that fetches the batched /api/study/landing payload once
 * and hands it to child components. Without this, the landing cold-
 * loads fire /api/study/progress 3× (StudyHero, TodayProgressRing,
 * DailyGoalCelebration), /api/study/prefs 2× (useOnboardingGate,
 * landing target-test hoist), and /api/study/streak 1× — six network
 * hops instead of one bundled call.
 *
 * Consumers call useLandingData(). If the provider isn't mounted
 * (component rendered outside the landing), the hook returns null
 * and the consumer is expected to fall back to its own fetch — so
 * shared components (StudyHero, TodayProgressRing) can still work
 * on non-landing surfaces without a big-bang cutover.
 *
 * refetch() is exposed for DailyGoalCelebration's 30s poll: instead
 * of its own /progress fetch loop, it refreshes the shared payload.
 */

interface Progress {
  questionsToday: number
  minutesToday: number
  sessionsToday: number
  goalMinutes: number
}

interface Prefs {
  target_test: string | null
  target_tests: string[]
  onboarded_at: string | null
  daily_goal_minutes: number
  default_language: 'en' | 'ko'
  default_difficulty: 'warmup' | 'balanced' | 'challenge'
}

export interface LandingData {
  progress: Progress | null
  streak: number | null
  prefs: Prefs | null
  /** study_subscriptions.status ('free' | 'trial' | 'active' | ...). */
  subscriptionStatus: string | null
  /** Batched daily-challenge state (null until loaded). */
  dailyChallenge: {
    date: string
    sessionId: string | null
    completed: boolean
    topic: { id: string; slug: string; name_en: string; name_ko: string } | null
    weak: boolean
  } | null
  loading: boolean
  refetch: () => Promise<void>
}

const Ctx = createContext<LandingData | null>(null)

export function LandingDataProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [dailyChallenge, setDailyChallenge] = useState<LandingData['dailyChallenge']>(null)
  const [loading, setLoading] = useState(true)

  const fetchOnce = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/landing', { headers })
      if (!res.ok) return
      const json = await res.json() as {
        progress: Progress
        streak: number
        prefs: Prefs
        subscriptionStatus?: string
        dailyChallenge?: LandingData['dailyChallenge']
      }
      setProgress(json.progress ?? null)
      setStreak(json.streak ?? 0)
      setPrefs(json.prefs ?? null)
      setSubscriptionStatus(json.subscriptionStatus ?? null)
      setDailyChallenge(json.dailyChallenge ?? null)
    } catch {
      // Soft-fail: consumers using the fallback fetch will still work.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  return (
    <Ctx.Provider value={{ progress, streak, prefs, subscriptionStatus, dailyChallenge, loading, refetch: fetchOnce }}>
      {children}
    </Ctx.Provider>
  )
}

/** Returns the shared landing data, or null when no provider is mounted. */
export function useLandingData(): LandingData | null {
  return useContext(Ctx)
}
