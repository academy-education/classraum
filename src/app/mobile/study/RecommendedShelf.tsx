"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lightbulb, AlertTriangle, History, ArrowRight, Loader2, Camera } from 'lucide-react'
import { SkeletonCard, SkeletonBlock } from './skeletons'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import type { StudyMode } from './modes'
import { useStudyErrorToast, startFailedMessage } from './_shared/useStudyErrorToast'

interface Card {
  reason: 'weak' | 'recent' | 'snap_followup'
  topic: { id: string; slug: string; name_en: string; name_ko: string; category: string } | null
  score: number | null
  attempts_count: number
  suggested_mode: StudyMode
  weakness_hint?: string | null
  snap?: {
    capture_id: string
    image_url: string | null
    ocr_text: string
    subject_guess: string
  }
}

/**
 * Recommended-for-you shelf on the study landing.
 *
 * Powered by /api/study/recommended which reads study_mastery +
 * recent sessions. New students get an empty state — the placeholder
 * the old static shelf used.
 *
 * Tapping a card creates a new session in the suggested mode for the
 * suggested topic and routes to it. Skips the topic page since the
 * card already represents an explicit (topic, mode) decision.
 */
export function RecommendedShelf() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'

  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const { errorToast, showError } = useStudyErrorToast()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/recommended', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (cancelled) return
        setCards((json.cards ?? []) as Card[])
      } catch {
        // Soft-fail: show the empty state rather than an error chunk.
        if (!cancelled) setCards([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const startSession = async (card: Card) => {
    if (!user?.userId || creating) return
    const key = card.reason === 'snap_followup' ? (card.snap?.capture_id ?? 'snap') : card.topic?.id
    if (!key) return
    setCreating(key)
    // Snap follow-up cards create a freeform practice session seeded
    // from the OCR'd problem; topic cards create a normal session.
    const insertBody = card.reason === 'snap_followup' && card.snap
      ? {
          student_id: user.userId,
          topic_id: null,
          topic_freeform: `${card.snap.subject_guess} snap follow-up: ${card.snap.ocr_text.slice(0, 90)}`,
          mode: 'practice' as const,
          language: ko ? 'ko' : 'en',
          config: { questionCount: 5, difficultyBias: 'similar' },
        }
      : card.topic
        ? {
            student_id: user.userId,
            topic_id: card.topic.id,
            mode: card.suggested_mode,
            language: ko ? 'ko' : 'en',
          }
        : null
    if (!insertBody) { setCreating(null); return }
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(insertBody)
      .select('id')
      .single()
    if (error || !data) {
      setCreating(null)
      showError(startFailedMessage(ko))
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  const name = (s: { name_en: string; name_ko: string }) => ko ? s.name_ko : s.name_en

  return (
    <section>
      {errorToast}
      <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
        {t('study.landing.recommendedTitle')}
      </h2>

      {loading ? (
        <SkeletonCard className="h-[104px] p-4 flex items-start gap-3">
          <SkeletonBlock className="w-11 h-11 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-2/5 rounded-full" />
            <SkeletonBlock className="h-2.5 w-4/5 rounded-full" />
            <SkeletonBlock className="h-2.5 w-3/5 rounded-full" />
          </div>
        </SkeletonCard>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white ring-1 ring-gray-200/70 mx-auto mb-3">
            <Lightbulb className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-[13.5px] text-gray-500 leading-relaxed max-w-[24ch] mx-auto">
            {t('study.landing.recommendedEmpty')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.slice(0, 2).map((card, idx) => (
            <div
              key={card.reason === 'snap_followup' ? `snap-${card.snap?.capture_id ?? idx}` : `${card.topic?.id}-${card.reason}`}
            >
              {card.reason === 'snap_followup'
                ? <SnapFollowupCard card={card} ko={ko} startSession={startSession} creating={creating} />
                : card.reason === 'weak'
                  ? <WeakAreaCard card={card} name={name} t={t} startSession={startSession} creating={creating} />
                  : <RecentSessionCard card={card} name={name} t={t} startSession={startSession} creating={creating} />}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/** Snap-followup card: shows the captured image as background with a
 *  "practice 5 similar" CTA overlay. Closes the loop from snap-solve
 *  to actual drill practice. */
function SnapFollowupCard({ card, ko, startSession, creating }: {
  card: Card
  ko: boolean
  startSession: (c: Card) => Promise<void>
  creating: string | null
}) {
  const isCreating = creating === card.snap?.capture_id
  const SUBJECT_LABEL_KO: Record<string, string> = {
    math: '수학', physics: '물리', chemistry: '화학', biology: '생물',
    english: '영어', korean: '국어', social_studies: '사회', history: '역사', other: '기타',
  }
  const SUBJECT_LABEL_EN: Record<string, string> = {
    math: 'Math', physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology',
    english: 'English', korean: 'Korean', social_studies: 'Social', history: 'History', other: 'Other',
  }
  const subj = card.snap?.subject_guess ?? 'other'
  const subjLabel = ko ? SUBJECT_LABEL_KO[subj] : SUBJECT_LABEL_EN[subj]
  return (
    <button type="button"
      onClick={() => void startSession(card)}
      disabled={creating !== null}
      className="group relative w-full h-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(251,146,60,0.30)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(251,146,60,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60">
      {/* Optional background image — semi-transparent so the gradient + text stay legible. */}
      {card.snap?.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.snap.image_url} alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.22] mix-blend-luminosity" />
      )}
      <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/30 blur-2xl" />
      <div className="relative flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase opacity-95">
            <Camera className="w-3 h-3" />{ko ? '사진 후속' : 'Snap follow-up'}
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
            {subjLabel}
          </span>
        </div>
        <p className="text-[12.5px] leading-relaxed line-clamp-2 opacity-95 mb-3">
          {card.snap?.ocr_text || (ko ? '이전에 찍은 문제' : 'A problem you snapped')}
        </p>
        <div className="mt-auto inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
          {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          {ko ? '유사 문제 5개 풀기' : 'Practice 5 similar'}
        </div>
      </div>
    </button>
  )
}

/** Distinctive treatment for weak-area cards: amber gradient, mastery
 *  score visualized as a horizontal progress bar at the bottom. The
 *  bar gives the card a concrete data anchor instead of a generic row. */
function WeakAreaCard({ card, name, t, startSession, creating }: {
  card: Card
  name: (s: { name_en: string; name_ko: string }) => string
  t: ReturnType<typeof useTranslation>['t']
  startSession: (c: Card) => Promise<void>
  creating: string | null
}) {
  const score = card.score ?? 0
  const reasonText = card.weakness_hint
    ? t('study.recommended.weakReasonWithHint', {
        hint: card.weakness_hint,
        mode: String(t(`study.modes.${card.suggested_mode}.title`)),
      })
    : t('study.recommended.weakReason', {
        score: String(score),
        mode: String(t(`study.modes.${card.suggested_mode}.title`)),
      })
  return (
    <button
      type="button"
      onClick={() => void startSession(card)}
      disabled={creating !== null}
      className="group relative w-full h-full overflow-hidden rounded-2xl p-4 ring-1 ring-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(245,158,11,0.18)] hover:ring-amber-300 hover:shadow-[0_2px_8px_-2px_rgba(245,158,11,0.18),0_16px_32px_-12px_rgba(245,158,11,0.26)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start gap-3.5">
        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(245,158,11,0.25)] ring-1 ring-amber-600/10">
          {creating === card.topic?.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[15px] font-semibold text-gray-900 truncate">
              {card.topic ? name(card.topic) : ''}
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-white/80 backdrop-blur ring-1 ring-amber-200 rounded-full px-1.5 py-0.5">
              {score}<span className="text-amber-500">/100</span>
            </span>
          </div>
          <div className="text-[12.5px] text-gray-600 mt-1 leading-relaxed pr-1">
            {String(reasonText)}
          </div>
          {/* Mastery bar — gives the card a concrete data anchor */}
          <div className="mt-2.5 h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all"
              style={{ width: `${Math.max(8, Math.min(100, score))}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

/** Distinctive treatment for recent-session cards: indigo/cool palette
 *  with a "Resume" chip and forward arrow. Visually separate from
 *  weak-area cards so the student can scan the shelf and tell at a
 *  glance which suggestions are "improve" vs "continue". */
function RecentSessionCard({ card, name, t, startSession, creating }: {
  card: Card
  name: (s: { name_en: string; name_ko: string }) => string
  t: ReturnType<typeof useTranslation>['t']
  startSession: (c: Card) => Promise<void>
  creating: string | null
}) {
  return (
    <button
      type="button"
      onClick={() => void startSession(card)}
      disabled={creating !== null}
      className="group relative w-full h-full overflow-hidden rounded-2xl p-4 ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.04] via-indigo-50/40 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.14),0_12px_24px_-12px_rgba(40,133,232,0.20)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-center gap-3.5">
        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/20">
          {creating === card.topic?.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <History className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-gray-900 truncate">
              {card.topic ? name(card.topic) : ''}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-white/80 backdrop-blur ring-1 ring-primary/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
              {String(t('study.modes.' + card.suggested_mode + '.title'))}
            </span>
          </div>
          <div className="text-[12.5px] text-gray-600 mt-1 leading-relaxed">
            {String(t('study.recommended.recentReason', {
              mode: String(t(`study.modes.${card.suggested_mode}.title`)),
            }))}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
      </div>
    </button>
  )
}
