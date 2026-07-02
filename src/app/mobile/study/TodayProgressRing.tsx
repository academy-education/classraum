"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { useLandingData } from './LandingDataProvider'

interface Progress {
  questionsToday: number
  minutesToday: number
  sessionsToday: number
  goalMinutes: number
}

/**
 * Khan-Academy-style daily progress ring shown in the landing
 * header next to the streak chip. SVG circle with a colored arc
 * filling clockwise as the student approaches their daily goal.
 *
 * - Renders nothing while loading so it doesn't pop in late.
 * - When the goal is met, the ring shows a solid full ring with a
 *   subtle pulse. When over goal, stays full (no overflow).
 * - Tooltip shows the exact minute count for transparency.
 */
export function TodayProgressRing() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const landingData = useLandingData()
  const [fallbackProgress, setFallbackProgress] = useState<Progress | null>(null)
  const progress = landingData ? landingData.progress : fallbackProgress

  useEffect(() => {
    if (landingData) return
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/progress', { headers })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setFallbackProgress(json)
      } catch {
        // Soft-fail; ring just won't appear.
      }
    })()
    return () => { cancelled = true }
  }, [landingData])

  if (!progress) return null

  const fraction = Math.min(1, progress.minutesToday / Math.max(1, progress.goalMinutes))
  const met = fraction >= 1
  // SVG arc params — 28×28 ring, stroke 3.5px, r ≈ 12.25
  const SIZE = 36
  const STROKE = 3.5
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const dashOffset = C * (1 - fraction)

  const tooltip = ko
    ? `오늘 ${progress.minutesToday}분 / 목표 ${progress.goalMinutes}분`
    : `${progress.minutesToday} of ${progress.goalMinutes} min today`

  return (
    <Link
      href="/mobile/study/stats"
      className="relative inline-flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      title={tooltip}
      aria-label={tooltip}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={STROKE}
        />
        {/* Arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={met ? '#10B981' : '#2885E8'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {/* Center text — minute count, small */}
      <span className={`absolute text-[10px] font-bold tracking-tight ${met ? 'text-emerald-600' : 'text-primary'}`}>
        {met ? '✓' : progress.minutesToday}
      </span>
      <span className="sr-only">{String(t('study.progress.todayLabel') ?? 'Today\'s progress')}</span>
    </Link>
  )
}
