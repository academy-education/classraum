"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Target, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import { SkeletonCard, SkeletonBlock } from '../skeletons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * DailyChallengeCard — daily 5-question micro-quiz prompt on the
 * study landing. Single tap → creates (or resumes) a practice session
 * for the day, tagged via session.config.dailyChallenge for tracking.
 *
 * States:
 *  - loading: skeleton row
 *  - new: "Today's challenge" card with topic name, start CTA
 *  - active: "Continue" CTA + small in-progress chip
 *  - completed: ✓ celebratory state, "Done for today" chip
 *  - empty: nothing yet (no topic available) — hide
 */

interface ChallengeState {
  date: string
  sessionId: string | null
  completed: boolean
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
  weak: boolean
}

export function DailyChallengeCard() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const [state, setState] = useState<ChallengeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/daily-challenge', { headers })
      if (!res.ok) throw new Error()
      const json = await res.json() as ChallengeState
      setState(json)
    } catch {
      setState(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const start = async () => {
    if (!state?.topic || starting) return
    setStarting(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/daily-challenge/start', {
        method: 'POST', headers,
        body: JSON.stringify({ topicId: state.topic.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.sessionId) { setStarting(false); return }
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setStarting(false)
    }
  }

  if (loading) {
    // Match the loaded card's height so there's no layout shift on
    // transition. Uses the shared shimmer atom so the animation
    // matches every other study skeleton.
    return (
      <SkeletonCard className="h-[72px] p-4 flex items-center gap-3">
        <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-2.5 w-1/4 rounded-full" />
          <SkeletonBlock className="h-3 w-3/5 rounded-full" />
        </div>
      </SkeletonCard>
    )
  }
  if (!state || !state.topic) return null

  const topicName = ko ? state.topic.name_ko : state.topic.name_en

  if (state.completed) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white ring-1 ring-emerald-200/60 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-emerald-700">
            {ko ? '오늘의 도전' : "Today's challenge"}
          </div>
          <div className="text-[15px] font-semibold text-gray-900 truncate">
            {ko ? '완료! 내일 또 만나요' : 'Done for today!'}
          </div>
        </div>
        {state.sessionId && (
          <Link href={`/mobile/study/session/${state.sessionId}/summary`}
            className="text-[12px] font-medium text-emerald-700 hover:text-emerald-900">
            {ko ? '결과' : 'Summary'}
          </Link>
        )}
      </div>
    )
  }

  return (
    <button type="button" onClick={() => void start()} disabled={starting}
      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.06] via-primary/[0.03] to-white ring-1 ring-primary/20 p-4 text-left flex items-center gap-3 hover:bg-primary/[0.08] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait transition-all">
      {/* Compact tinted row. Re-tinted from violet → primary blue
          for landing-page color consistency (Resume + Test ready +
          Daily Challenge now all use the same primary tone). */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
        {starting
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Target className="w-4 h-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-primary">
          {ko ? '오늘의 도전' : "Today's challenge"}
        </div>
        <div className="text-[14px] font-semibold leading-snug text-gray-900 mt-0.5 truncate">
          {state.sessionId
            ? (ko ? `${topicName} — 이어서 풀기` : `${topicName} — continue`)
            : (state.weak
              ? (ko ? `${topicName} 약점 보완 5문항` : `5 questions on your weakest: ${topicName}`)
              : (ko ? `${topicName} 5문항 풀기` : `5 questions on ${topicName}`))}
        </div>
        <div className="text-[12px] text-gray-500 mt-0.5">
          {ko ? '5분이면 충분해요 · +50 XP' : '~5 minutes · earn ~50 XP'}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}
