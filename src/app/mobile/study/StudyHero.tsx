"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { SkeletonCard, SkeletonBlock } from './skeletons'

interface Progress {
  questionsToday: number
  minutesToday: number
  sessionsToday: number
  goalMinutes: number
}

/**
 * Study landing hero — greeting row + a single "Today" summary card
 * that anchors the page: today's minutes vs goal shown as the big
 * number + progress bar, with a row of three mini stats (streak,
 * sessions today, questions today) at the bottom.
 *
 * Layout modeled on the Nowon-fit reference: hero has one dominant
 * metric, one progress bar, and a row of three secondary stats —
 * no competing gradient chrome.
 */
export function StudyHero() {
  const { language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [streak, setStreak] = useState<number | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(true)

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
      finally { if (!cancelled) setLoadingProgress(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 5
    ? (ko ? '늦은 밤이에요' : 'Late night')
    : hour < 12
      ? (ko ? '좋은 아침이에요' : 'Good morning')
      : hour < 18
        ? (ko ? '좋은 오후예요' : 'Good afternoon')
        : (ko ? '좋은 저녁이에요' : 'Good evening')
  const firstName = user?.userName?.split(' ')[0] ?? user?.userName ?? ''
  const streakActive = (streak ?? 0) > 0
  const fraction = progress ? Math.min(1, progress.minutesToday / Math.max(1, progress.goalMinutes)) : 0
  const goalMet = fraction >= 1

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[12px] font-medium text-gray-500">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-gray-900 mt-0.5">
            {ko ? '오늘은 어떤 걸 공부할까요?' : "What'll you work on today?"}
          </h1>
        </div>

        {streakActive && (
          <Link
            href="/mobile/study/stats"
            className="inline-flex items-baseline gap-1.5 rounded-full bg-white ring-1 ring-gray-200 px-3 py-1.5 hover:ring-primary/40 transition-colors"
          >
            <Flame className="w-4 h-4 self-center text-orange-500" fill="currentColor" />
            <span className="text-[14px] font-semibold tabular-nums text-gray-900">{streak}</span>
            <span className="text-[12px] text-gray-500">{ko ? '일 연속' : 'day streak'}</span>
          </Link>
        )}
      </div>

      {loadingProgress ? (
        <SkeletonCard className="p-4 min-h-[124px]">
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-32 rounded-full" />
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
          </div>
        </SkeletonCard>
      ) : progress && progress.goalMinutes > 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-500">
                {ko ? '오늘의 학습' : "Today's study"}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={`text-[28px] font-bold leading-none tabular-nums ${goalMet ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {progress.minutesToday}
                </span>
                <span className="text-[13px] text-gray-500 tabular-nums">
                  / {progress.goalMinutes} {ko ? '분' : 'min'}
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-bold tabular-nums px-2 py-1 rounded-full ${
              goalMet
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-primary/10 text-primary'
            }`}>
              {Math.round(fraction * 100)}%
            </span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                goalMet ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(4, Math.round(fraction * 100))}%` }}
            />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
            <MiniStat
              label={ko ? '연속' : 'Streak'}
              value={streak ?? 0}
              unit={ko ? '일' : 'd'}
            />
            <MiniStat
              label={ko ? '세션' : 'Sessions'}
              value={progress.sessionsToday}
            />
            <MiniStat
              label={ko ? '문제' : 'Questions'}
              value={progress.questionsToday}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function MiniStat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-bold tabular-nums text-gray-900 leading-tight">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-medium text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}
