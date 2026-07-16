"use client"

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Flame, Snowflake, TrendingUp, Search as SearchIcon } from '@/app/mobile/study/_shared/icons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { SkeletonBlock } from './skeletons'
import { useLandingData } from './LandingDataProvider'

interface Progress {
  questionsToday: number
  minutesToday: number
  sessionsToday: number
  goalMinutes: number
}

interface Props {
  onOpenSearch?: () => void
  overflowMenu?: ReactNode
}

/**
 * Study landing hero — modeled on the Nowon-fit reference layout:
 * a dark, saturated hero band with a top action row (search +
 * overflow) and greeting, and a big white summary card that
 * visually overlaps the bottom edge of the hero. The white card
 * carries a bold primary metric (today's minutes / goal), a
 * progress bar, and a row of three secondary stats.
 *
 * Renders edge-to-edge (`-mx-5 -mt-6`) inside the study landing
 * container so the dark band bleeds to the viewport edges. Callers
 * pass in the search-open handler and overflow menu so the header
 * action row lives inside the dark band, not above it.
 */
export function StudyHero({ onOpenSearch, overflowMenu }: Props) {
  const { language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const landingData = useLandingData()
  const [fallbackStreak, setFallbackStreak] = useState<number | null>(null)
  const [fallbackProgress, setFallbackProgress] = useState<Progress | null>(null)
  const [fallbackLoading, setFallbackLoading] = useState(true)

  // Prefer bundled landing payload; only fetch standalone if the
  // provider isn't mounted (component reused outside the landing).
  const streak = landingData ? landingData.streak : fallbackStreak
  const progress = landingData ? landingData.progress : fallbackProgress
  const loadingProgress = landingData ? landingData.loading : fallbackLoading
  const xpToday = landingData?.xpToday ?? 0
  const freezes = landingData?.freezes ?? 0
  const streakSaved = landingData?.streakSaved ?? false

  useEffect(() => {
    if (landingData) return
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/streak', { headers })
        if (!res.ok) return
        const json = await res.json() as { streak: number }
        if (!cancelled) setFallbackStreak(json.streak)
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [landingData, user?.userId])

  useEffect(() => {
    if (landingData) return
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/progress', { headers })
        if (!res.ok) return
        const json = await res.json() as Progress
        if (!cancelled) setFallbackProgress(json)
      } catch { /* silent */ }
      finally { if (!cancelled) setFallbackLoading(false) }
    })()
    return () => { cancelled = true }
  }, [landingData])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 5
    ? (ko ? '늦은 밤이에요' : 'Late night')
    : hour < 12
      ? (ko ? '좋은 아침이에요' : 'Good morning')
      : hour < 18
        ? (ko ? '좋은 오후예요' : 'Good afternoon')
        : (ko ? '좋은 저녁이에요' : 'Good evening')
  const firstName = user?.userName?.split(' ')[0] ?? user?.userName ?? ''
  const dateStr = now.toLocaleDateString(ko ? 'ko-KR' : 'en-US', {
    month: 'short', day: 'numeric', weekday: 'short',
  })
  const streakActive = (streak ?? 0) > 0
  const fraction = progress ? Math.min(1, progress.minutesToday / Math.max(1, progress.goalMinutes)) : 0
  const goalMet = fraction >= 1
  const pct = Math.round(fraction * 100)

  return (
    <section className="-mx-5 -mt-6 mb-2 lg:mx-0 lg:mt-0">
      {/* Full-bleed banner on phones; on desktop it becomes a rounded
          hero card aligned with the content cards below (no stray edge
          padding), so the whole page shares one left/right edge. */}
      <div className="relative overflow-hidden lg:rounded-3xl bg-gradient-to-br from-primary via-primary to-indigo-700 px-5 lg:px-8 pt-5 lg:pt-7 pb-24 text-white">
        <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-indigo-300/20 blur-2xl" />

        {(onOpenSearch || overflowMenu) && (
          <div className="relative flex items-center justify-end gap-1.5 mb-3">
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                aria-label={ko ? '검색' : 'Search'}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white hover:bg-white/25 transition"
              >
                <SearchIcon className="w-4 h-4" />
              </button>
            )}
            {overflowMenu}
          </div>
        )}

        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/70 tabular-nums">{dateStr}</p>
            <h1 className="mt-1 text-[22px] leading-tight font-bold tracking-tight text-white">
              {greeting}{firstName ? `,` : ''}
              {firstName && <span className="block text-white/95">{firstName}</span>}
            </h1>
          </div>

          {streakActive && (
            <Link
              href="/mobile/study/stats"
              className="flex-shrink-0 inline-flex items-baseline gap-1.5 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20 px-3 py-1.5 hover:bg-white/25 transition"
            >
              <Flame className="w-4 h-4 self-center text-orange-300" fill="currentColor" />
              <span className="text-[14px] font-bold tabular-nums text-white">{streak}</span>
              <span className="text-[11px] text-white/80">{ko ? '일 연속' : 'day streak'}</span>
              {freezes > 0 && (
                <span
                  className="ml-1 self-center inline-flex items-center gap-0.5 rounded-full bg-sky-400/25 ring-1 ring-sky-200/30 pl-1 pr-1.5 py-0.5"
                  title={ko ? '스트릭 프리즈' : 'Streak freeze'}
                >
                  <Snowflake className="w-3 h-3 text-sky-100" fill="currentColor" />
                  <span className="text-[10.5px] font-bold tabular-nums text-sky-50">{freezes}</span>
                </span>
              )}
            </Link>
          )}
        </div>
      </div>

      <div className="relative -mt-16 mx-5">
        {loadingProgress ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.20)] p-5 min-h-[164px] space-y-3">
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-32 rounded-full" />
            <SkeletonBlock className="h-1.5 w-full rounded-full" />
            <div className="pt-2 grid grid-cols-3 gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="space-y-1.5">
                  <SkeletonBlock className="h-2.5 w-3/5 rounded-full mx-auto" />
                  <SkeletonBlock className="h-5 w-2/5 rounded-full mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : progress && progress.goalMinutes > 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.20)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  {ko ? '오늘의 학습' : "Today's study"}
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className={`text-[36px] font-bold leading-none tabular-nums ${goalMet ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {progress.minutesToday}
                  </span>
                  <span className="text-[13px] text-gray-500 tabular-nums">
                    / {progress.goalMinutes} {ko ? '분' : 'min'}
                  </span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-full ${
                goalMet
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-primary/10 text-primary'
              }`}>
                <TrendingUp className="w-3 h-3" />{pct}%
              </span>
            </div>

            <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  goalMet
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : 'bg-gradient-to-r from-primary to-indigo-500'
                }`}
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>

            {/* Next-milestone nudge. Turns the passive number into a
                targeted goal. Uses the smallest still-useful hint:
                minutes remaining today, or a streak/celebration line
                once the daily goal is met. */}
            <p className="mt-2 text-[11.5px] text-gray-500">
              {goalMet ? (
                <span className="text-emerald-700 font-medium">
                  {ko ? '🎉 오늘의 목표 달성!' : "🎉 Daily goal met!"}
                  {streak !== null && streak > 0 && (
                    <span className="text-gray-500 font-normal">
                      {ko ? ` · ${streak}일 연속 유지 중` : ` · ${streak}-day streak going`}
                    </span>
                  )}
                </span>
              ) : (
                <>
                  {ko
                    ? `${progress.goalMinutes - progress.minutesToday}분 남았어요 → 오늘의 목표`
                    : `${progress.goalMinutes - progress.minutesToday} min to today's goal`}
                </>
              )}
            </p>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
              {/* XP today, not streak — the streak already lives in the
                  hero chip above; repeating it wasted a stat slot. */}
              <MiniStat
                label={ko ? '오늘 XP' : 'XP today'}
                value={xpToday}
                accent="orange"
              />
              <MiniStat
                label={ko ? '세션' : 'Sessions'}
                value={progress.sessionsToday}
                accent="primary"
              />
              <MiniStat
                label={ko ? '문제' : 'Questions'}
                value={progress.questionsToday}
                accent="violet"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.20)] p-5 min-h-[120px] flex items-center">
            <p className="text-[14px] text-gray-600">
              {ko ? '오늘 학습을 시작해 목표를 세워보세요.' : "Start studying today to set your goal."}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function MiniStat({
  label, value, unit, accent,
}: {
  label: string
  value: number
  unit?: string
  accent: 'orange' | 'primary' | 'violet'
}) {
  const accentClass = accent === 'orange'
    ? 'text-orange-600'
    : accent === 'violet'
      ? 'text-violet-600'
      : 'text-primary'
  return (
    <div className="text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-500">
        {label}
      </div>
      <div className={`mt-0.5 text-[18px] font-bold tabular-nums leading-tight ${accentClass}`}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-medium text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}
