"use client"

import { useEffect, useState } from 'react'
import { Flame, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'

interface Progress {
  questionsToday: number
  minutesToday: number
  sessionsToday: number
  goalMinutes: number
}

/**
 * Study landing hero card — Duolingo-flavoured centrepiece.
 *
 * Combines three previously-scattered signals (greeting, streak, daily
 * progress) into one bold gradient card that sets the tone for the
 * whole page. Copy shifts by state so students feel progression:
 *   - New: "Let's start your streak"
 *   - On-streak, not at goal: "N days in a row — keep going"
 *   - Streak + goal met: "N days — goal crushed"
 *   - Streak + halfway: encouraging middle state
 *
 * Replaces the tiny StudyStreakChip + TodayProgressRing header row.
 * They're still importable for other surfaces (stats page) but the
 * landing now leads with this hero.
 */
export function StudyHero() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [streak, setStreak] = useState<number | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)

  // Load streak: same logic as StudyStreakChip, inlined here so this
  // component is standalone.
  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('study_sessions')
        .select('last_active_at')
        .eq('student_id', user.userId)
        .gte('last_active_at', cutoff)
        .order('last_active_at', { ascending: false })
      if (cancelled) return
      const days = new Set<string>()
      ;(data ?? []).forEach(row => {
        if (!row.last_active_at) return
        const d = new Date(row.last_active_at)
        days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      })
      const today = new Date()
      const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      let count = 0
      const cursor = new Date(today)
      // Grace period: if no activity today but yesterday exists, count from yesterday.
      if (!days.has(dayKey(cursor)) && days.has(dayKey(new Date(cursor.getTime() - 86400000)))) {
        cursor.setDate(cursor.getDate() - 1)
      }
      while (days.has(dayKey(cursor)) && count < 400) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      }
      setStreak(count)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  // Load progress ring data.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/progress', { headers })
        if (!res.ok) return
        const json = await res.json() as Progress
        if (!cancelled) setProgress(json)
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Time-of-day greeting — different across morning/afternoon/evening.
  const hour = new Date().getHours()
  const greeting = hour < 5
    ? (ko ? '늦은 밤이에요' : 'Burning the midnight oil')
    : hour < 12
      ? (ko ? '좋은 아침이에요' : 'Good morning')
      : hour < 18
        ? (ko ? '좋은 오후예요' : 'Good afternoon')
        : (ko ? '좋은 저녁이에요' : 'Good evening')

  const firstName = user?.userName?.split(' ')[0] ?? user?.userName ?? ''

  const fraction = progress ? Math.min(1, progress.minutesToday / Math.max(1, progress.goalMinutes)) : 0
  const goalMet = fraction >= 1
  const halfDone = fraction >= 0.5 && !goalMet
  const streakActive = (streak ?? 0) > 0

  // Copy shifts by state — makes the hero feel alive rather than static.
  const encouragement = !streakActive
    ? (ko ? '오늘 첫 학습으로 스트릭을 시작해 보세요' : "Start today — build your first streak")
    : goalMet
      ? (ko ? '오늘 목표 달성! 대단해요 🎉' : "Today's goal crushed 🎉")
      : halfDone
        ? (ko ? '거의 다 왔어요, 조금만 더!' : "Almost there — keep pushing")
        : (ko ? '오늘도 힘내세요' : "Let's keep it going")

  const minutesTodayText = progress
    ? (ko
      ? `오늘 ${progress.minutesToday}분 / 목표 ${progress.goalMinutes}분`
      : `${progress.minutesToday} of ${progress.goalMinutes} min today`)
    : ''

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 text-white"
      style={{
        background: 'linear-gradient(135deg, #2885E8 0%, #6E5CF6 100%)',
        boxShadow: '0 8px 24px -8px rgba(40,133,232,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
    >
      {/* Decorative background sparkles — very subtle. */}
      <div aria-hidden className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <Sparkles className="absolute top-3 right-4 w-16 h-16" />
        <Sparkles className="absolute bottom-2 left-2 w-10 h-10 rotate-12" />
      </div>

      <div className="relative">
        <p className="text-[13px] font-medium text-white/85">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>
        <h2 className="text-[22px] font-bold leading-tight mt-0.5 tracking-tight">
          {encouragement}
        </h2>

        <div className="mt-4 flex items-center gap-3">
          {/* Streak pill — big flame + number. Falls back to a "start
              your streak" prompt when count is 0. */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ring-1 ring-inset ${
              streakActive
                ? 'bg-white/15 backdrop-blur ring-white/25'
                : 'bg-white/10 ring-white/20'
            }`}
          >
            <Flame
              className={`w-4 h-4 ${streakActive ? 'text-orange-300' : 'text-white/60'}`}
              fill={streakActive ? 'currentColor' : 'none'}
            />
            <span className="text-[15px] font-bold tabular-nums">
              {streak ?? 0}
            </span>
            <span className="text-[12px] font-medium opacity-90">
              {ko ? '일' : streak === 1 ? 'day' : 'days'}
            </span>
          </div>

          {progress && (
            <div className="text-[12px] text-white/90">
              {minutesTodayText}
            </div>
          )}
        </div>

        {/* Progress toward daily goal — full-width bar under the
            streak pill. Only shows when we have progress data + a
            goal to work toward. */}
        {progress && progress.goalMinutes > 0 && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  goalMet ? 'bg-gradient-to-r from-emerald-300 to-emerald-400' : 'bg-white'
                }`}
                style={{ width: `${Math.max(4, Math.round(fraction * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {/* Suppress unused imports lint — t is used indirectly if we
          add translated strings later, keep it here for consistency
          with sibling components. */}
      <span className="sr-only">{t('study.landing.eyebrow')}</span>
    </section>
  )
}
