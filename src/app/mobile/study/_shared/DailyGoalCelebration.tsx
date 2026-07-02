"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, Trophy } from 'lucide-react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { useLandingData } from '../LandingDataProvider'

/**
 * Full-screen overlay that fires once when the student crosses their
 * daily-minutes goal. Polls /api/study/progress every 30s while
 * mounted; if minutesToday flips from < goal to >= goal during the
 * session, the overlay pops with a confetti-ish burst.
 *
 * Dismissal stored in sessionStorage so it only shows once per
 * browser session per day. Resets at midnight local.
 */

interface Progress {
  minutesToday: number
  goalMinutes: number
  questionsToday: number
  sessionsToday: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function DailyGoalCelebration() {
  const { language } = useTranslation()
  const ko = language === 'korean'
  const landingData = useLandingData()
  const [show, setShow] = useState(false)
  const [fallbackProgress, setFallbackProgress] = useState<Progress | null>(null)
  const progress = landingData ? landingData.progress : fallbackProgress

  // Session-scoped ratchet: only fire when the student crosses 0→met
  // within this browser session, not on every re-render or refetch.
  const prevMetRef = useRef(false)

  // Provider path: watch the shared payload + drive the 30s refetch
  // off the provider so we don't double the /api/study/landing call.
  useEffect(() => {
    if (!landingData) return
    const id = setInterval(() => { void landingData.refetch() }, 30 * 1000)
    return () => { clearInterval(id) }
  }, [landingData])

  useEffect(() => {
    if (!progress) return
    const met = progress.minutesToday >= progress.goalMinutes && progress.goalMinutes > 0
    const dismissKey = `study-goal-celebration-shown:${todayKey()}`
    const alreadyShown = sessionStorage.getItem(dismissKey) === '1'
    if (met && !prevMetRef.current && !alreadyShown) {
      setShow(true)
      sessionStorage.setItem(dismissKey, '1')
    }
    prevMetRef.current = met
  }, [progress])

  // Fallback path: no provider mounted, run the old polling loop.
  useEffect(() => {
    if (landingData) return
    let cancelled = false
    const fetchOnce = async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/progress', { headers })
        if (!res.ok) return
        const json = await res.json() as Progress
        if (cancelled) return
        setFallbackProgress(json)
      } catch {
        // Soft-fail.
      }
    }
    void fetchOnce()
    const id = setInterval(fetchOnce, 30 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [landingData])

  if (!show || !progress) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShow(false)}
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      />
      {/* Confetti dots — pure CSS, no library. Random hues, falling. */}
      <ConfettiBurst />
      {/* Celebration card */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[111] mx-auto max-w-sm rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45)] animate-in zoom-in-95 fade-in duration-400 overflow-hidden"
      >
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/30 blur-3xl" />
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 inline-flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 ring-1 ring-white/30 mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase opacity-90 mb-1">
            {ko ? '오늘의 목표 달성' : 'Goal hit!'}
          </div>
          <h2 className="text-[24px] font-bold tracking-tight leading-tight">
            {ko
              ? `${progress.goalMinutes}분 학습 완료 🎉`
              : `${progress.goalMinutes} minutes done 🎉`}
          </h2>
          <p className="text-[13px] opacity-95 mt-2 leading-relaxed">
            {ko
              ? `오늘 ${progress.questionsToday}문항을 풀었어요. 내일도 같은 시간에 만나요.`
              : `You answered ${progress.questionsToday} questions today. Come back tomorrow at the same time.`}
          </p>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setShow(false)}
              className="flex-1 h-11 rounded-xl bg-white/20 hover:bg-white/30 text-[13px] font-semibold transition">
              {ko ? '닫기' : 'Done'}
            </button>
            <Link href="/mobile/study/league" onClick={() => setShow(false)}
              className="flex-1 h-11 rounded-xl bg-white text-amber-700 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold hover:bg-amber-50 transition">
              <Sparkles className="w-3.5 h-3.5" />{ko ? '내 리그' : 'My league'}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

/** Lightweight confetti — 24 absolutely-positioned dots dropping with
 *  staggered animation delays. No third-party deps. */
function ConfettiBurst() {
  const dots = Array.from({ length: 28 }, (_, i) => i)
  const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[112] overflow-hidden">
      {dots.map(i => {
        const left = (i * 137.5) % 100  // golden-ratio spread
        const delay = (i % 8) * 60
        const dur = 1400 + (i % 5) * 220
        const color = colors[i % colors.length]
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: '-20px',
              backgroundColor: color,
              animationDelay: `${delay}ms`,
              animationDuration: `${dur}ms`,
            }}
            className="absolute w-2 h-2 rounded-sm animate-confetti-fall"
          />
        )
      })}
    </div>
  )
}
