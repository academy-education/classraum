"use client"

import { useEffect, useState } from 'react'
import { Flame } from '@/app/mobile/study/_shared/icons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'

/**
 * Daily-streak chip shown in the study landing header.
 *
 * Counts consecutive calendar days (user's local time) on which the
 * student has started or worked on at least one study_session, walking
 * back from today. Tolerates a one-day grace — if today has no session
 * yet but yesterday did, the streak still counts (yesterday-anchored)
 * so the student doesn't see a "broken" streak just because it's
 * still morning.
 *
 * Renders nothing when there's no streak (count = 0) so first-time
 * students don't see an empty/discouraging chip. Once they've studied
 * one day the chip appears showing "🔥 1일".
 *
 * Inspired by Duolingo — the single most-credited feature for
 * Duolingo's daily-engagement retention.
 */
export function StudyStreakChip() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [streak, setStreak] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      // Pull the last 60 days of activity — generous enough that
      // even a 30-day streak comfortably fits with room to spare.
      const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('study_sessions')
        .select('created_at, last_active_at')
        .eq('student_id', user.userId)
        .gte('last_active_at', cutoff)
        .order('last_active_at', { ascending: false })

      if (cancelled) return

      // Group activity by local-time calendar day. We use last_active_at
      // (which the session updates as the student interacts) rather than
      // created_at — a session created days ago but worked on today
      // should count today as a study day.
      const days = new Set<string>()
      for (const row of data ?? []) {
        const d = new Date(row.last_active_at as string)
        days.add(toLocalDateKey(d))
      }

      // Walk back from today. Allow yesterday-anchored streaks so the
      // chip doesn't disappear at 12:01 AM before today's session.
      const today = new Date()
      const todayKey = toLocalDateKey(today)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayKey = toLocalDateKey(yesterday)

      let cursor: Date
      if (days.has(todayKey)) {
        cursor = new Date(today)
      } else if (days.has(yesterdayKey)) {
        cursor = new Date(yesterday)
      } else {
        setStreak(0)
        return
      }

      let count = 0
      while (days.has(toLocalDateKey(cursor))) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      }
      setStreak(count)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  if (streak === null || streak === 0) return null

  const label = ko
    ? `${streak}일`
    : `${streak} ${streak === 1 ? String(t('study.streak.day')) : String(t('study.streak.days'))}`

  return (
    <div
      className="inline-flex items-center gap-1 pl-2 pr-2.5 h-9 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 text-white text-[12px] font-bold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_4px_rgba(245,158,11,0.28),0_4px_12px_-4px_rgba(245,158,11,0.4)] ring-1 ring-orange-600/20"
      title={String(t('study.streak.tooltip', { count: String(streak) }))}
    >
      <Flame className="w-3.5 h-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" fill="currentColor" />
      <span>{label}</span>
    </div>
  )
}

/** YYYY-MM-DD in the user's local timezone — date-only key for set
 *  membership checks. */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
