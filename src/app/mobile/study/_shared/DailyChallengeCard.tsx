"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, CheckCircle2 } from '@/app/mobile/study/_shared/icons'
import { SkeletonCard, SkeletonBlock } from '../skeletons'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { StudyTodayCard } from './primitives'
import { useStudyErrorToast, startFailedMessage } from './useStudyErrorToast'
import { useLandingData } from '../LandingDataProvider'

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
  const [fetched, setFetched] = useState<ChallengeState | null>(null)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()

  // On the landing the challenge arrives batched with everything else
  // (LandingDataProvider), so the card paints in the same frame as the
  // rest of the Today band. Outside a provider (topic page) it fetches
  // its own state from the dedicated endpoint.
  const landing = useLandingData()
  const hasProvider = landing !== null

  const load = useCallback(async () => {
    if (hasProvider) return
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/daily-challenge', { headers })
      if (!res.ok) throw new Error()
      const json = await res.json() as ChallengeState
      setFetched(json)
    } catch {
      setFetched(null)
    } finally {
      setFetchLoading(false)
    }
  }, [hasProvider])

  useEffect(() => { void load() }, [load])

  const state = hasProvider ? (landing?.dailyChallenge ?? null) : fetched
  const loading = hasProvider ? landing!.loading : fetchLoading

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
      if (!res.ok || !json.sessionId) { setStarting(false); showError(startFailedMessage(ko)); return }
      router.push(`/mobile/study/session/${json.sessionId}`)
    } catch {
      setStarting(false)
      showError(startFailedMessage(ko))
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
      <StudyTodayCard
        href={state.sessionId ? `/mobile/study/session/${state.sessionId}/summary` : '#'}
        icon={CheckCircle2}
        iconColorClass="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.30)]"
        eyebrow={ko ? '오늘의 도전' : "Today's challenge"}
        title={ko ? '완료! 내일 또 만나요' : 'Done for today!'}
        subtitle={ko ? '결과 확인' : 'View summary'}
      />
    )
  }

  return (
    <>
      {errorToast}
    <StudyTodayCard
      onClick={() => void start()}
      loading={starting}
      icon={Target}
      iconColorClass="bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_4px_10px_-2px_rgba(245,158,11,0.30)]"
      eyebrow={ko ? '오늘의 도전' : "Today's challenge"}
      title={state.sessionId
        ? (ko ? `${topicName} — 이어서 풀기` : `${topicName} — continue`)
        : (state.weak
          ? (ko ? `${topicName} 약점 보완 3문항` : `3 questions on your weakest: ${topicName}`)
          : (ko ? `${topicName} 3문항 풀기` : `3 questions on ${topicName}`))}
      subtitle={ko ? '3분이면 충분해요 · +50 XP' : '~3 minutes · earn ~50 XP'}
    />
    </>
  )
}
