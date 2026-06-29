"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * StreakAtRiskBanner — shown on the study landing when a previously-
 * meaningful streak (≥ 3 days) just ended because the student missed
 * BOTH today and yesterday.
 *
 * Honest framing: we don't pretend to "freeze" or "restore" a streak.
 * Instead we surface the loss and channel it into immediate action
 * ("start a new streak today"). Reduces the silent-churn pattern of
 * losing a streak and never coming back.
 *
 * Self-dismissable for the session.
 */

const DISMISS_KEY = 'streak-at-risk-dismissed'

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StreakAtRiskBanner() {
  const { language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [priorStreak, setPriorStreak] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from('study_sessions')
        .select('last_active_at')
        .eq('student_id', user.userId)
        .gte('last_active_at', cutoff)
      if (cancelled) return
      const days = new Set<string>()
      for (const r of data ?? []) {
        days.add(toLocalDateKey(new Date(r.last_active_at as string)))
      }
      const today = new Date()
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
      const dayBeforeYesterday = new Date(today); dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
      const hasToday = days.has(toLocalDateKey(today))
      const hasYesterday = days.has(toLocalDateKey(yesterday))
      // Only fires if BOTH today and yesterday are empty — the streak
      // has actually lapsed (StudyStreakChip allows yesterday-grace).
      if (hasToday || hasYesterday) { setPriorStreak(0); return }
      // Count the streak that was active up through day-before-yesterday.
      let cursor = dayBeforeYesterday
      let count = 0
      while (days.has(toLocalDateKey(cursor))) {
        count++
        cursor = new Date(cursor); cursor.setDate(cursor.getDate() - 1)
      }
      setPriorStreak(count)
    })()
    return () => { cancelled = true }
  }, [user?.userId])

  if (dismissed || priorStreak === null || priorStreak < 3) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <Link href="/mobile/study/review"
      onClick={dismiss}
      className="group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 text-white p-4 shadow-[0_8px_24px_-8px_rgba(244,63,94,0.40)] hover:-translate-y-0.5 transition-all">
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/25 flex items-center justify-center">
          <Flame className="w-5 h-5" fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase opacity-90">
            {ko ? '연속 학습 끊김' : 'Streak lost'}
          </div>
          <div className="text-[15px] font-semibold leading-snug mt-0.5">
            {ko
              ? `${priorStreak}일 연속 학습이 끝났어요`
              : `Your ${priorStreak}-day streak ended`}
          </div>
          <div className="text-[12px] opacity-95 mt-0.5">
            {ko ? '오늘부터 새 연속 기록을 시작해볼까요?' : 'Start a fresh one today — one card is enough.'}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 opacity-90 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  )
}
