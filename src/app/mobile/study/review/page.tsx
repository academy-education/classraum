"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Shuffle, X, Barbell, Check, Info, Sparkles } from '@/app/mobile/study/_shared/icons'
import { MascotLoader, useMascotGate } from '../_shared/MascotLoader'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import { scheduleNext, INITIAL_SRS } from '@/lib/srs'
import { hapticTap } from '@/lib/nativeHaptics'
import { StudySubscriptionGate } from '../SubscriptionGate'
import { StudyPageHeader, StudyEmptyState } from '../_shared/primitives'
import { emitXp } from '../_shared/XpToast'
import { useStudyErrorToast, saveFailedMessage } from '../_shared/useStudyErrorToast'

/**
 * /mobile/study/review — Daily SRS Review.
 *
 * Pulls all due flashcards across topics (via /api/study/srs-review)
 * INTERLEAVED rather than blocked by topic, then runs the same flip-
 * card UX as FlashcardsSession. Interleaving + spacing is super-
 * additive in retention research (Butowska-Buczyńska 2024, d=0.87
 * vs blocked d=0.52).
 *
 * The "Why this card is back" tooltip counteracts the documented
 * judgments-of-learning illusion where students prefer massed
 * practice despite spacing winning on long-term recall — surfacing
 * the science prevents "the algorithm is wrong" churn.
 */

interface Card {
  topic_id: string | null
  card_front: string
  card_back: string
  topic_name_en: string | null
  topic_name_ko: string | null
}

export default function ReviewPage() {
  return (
    <StudySubscriptionGate>
      <ReviewInner />
    </StudySubscriptionGate>
  )
}

function ReviewInner() {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [queue, setQueue] = useState<Card[]>([])
  const [topicCount, setTopicCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const showLoader = useMascotGate(loading)
  const [reviewed, setReviewed] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  const [done, setDone] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [grading, setGrading] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoadFailed(false)
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/srs-review', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (cancelled) return
        setQueue((json.queue ?? []) as Card[])
        setTopicCount(json.topicCount ?? 0)
      } catch {
        // Distinguish "network failed" from "queue is empty" — an empty
        // queue renders the celebratory "all caught up" state, which is
        // actively misleading when the student DOES have cards due.
        if (!cancelled) setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [retryKey])

  // Release the grade lock when the queue head actually advances —
  // resetting inside grade() itself would still let a fast double-tap
  // read the same queue[0] twice (setState is async).
  useEffect(() => { setGrading(false) }, [queue])

  const grade = useCallback(async (quality: 1 | 3 | 5) => {
    if (queue.length === 0 || !user?.userId || grading) return
    setGrading(true)
    hapticTap()
    const card = queue[0]

    void (async () => {
      const { data: existing } = await supabase
        .from('study_flashcard_reviews')
        .select('ease_factor, interval_days, repetitions')
        .eq('student_id', user.userId)
        .eq('topic_id', card.topic_id ?? null)
        .eq('card_front', card.card_front)
        .maybeSingle()
      const prev = existing ?? INITIAL_SRS
      const next = scheduleNext(prev, quality)
      const { error: srsError } = await supabase.from('study_flashcard_reviews').upsert({
        student_id: user.userId,
        topic_id: card.topic_id,
        card_front: card.card_front,
        card_back: card.card_back,
        ease_factor: next.ease_factor,
        interval_days: next.interval_days,
        repetitions: next.repetitions,
        due_at: next.due_at.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        last_quality: quality,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,topic_id,card_front' })
      // Persistence failure used to vanish into console.error — the
      // student thinks the review saved when it didn't. Tell them.
      if (srsError) showError(saveFailedMessage(ko))
    })()

    // XP toast — fire immediately for UI delight; server award follows
    // in the background. Mirrors the server-side amounts in xp.ts.
    emitXp(quality === 5 ? 5 : quality === 3 ? 8 : 2)
    void (async () => {
      try {
        const headers = await authHeaders()
        await fetch('/api/study/xp', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            eventType: quality === 5 ? 'flashcard_easy' : quality === 3 ? 'flashcard_hard' : 'flashcard_again',
            sourceId: null,
          }),
        })
      } catch {
        // Best-effort.
      }
    })()

    setReviewed(r => r + 1)
    setQueue(prev => {
      const next = prev.slice(1)
      // "Again" re-queues at the end of the in-session pass so the
      // student keeps hitting hard cards until they stick. "Hard" and
      // "Easy" leave the queue — their next SRS due_at controls them.
      if (quality === 1) next.push(card)
      return next
    })
    setFlipped(false)
    if (queue.length <= 1 && quality !== 1) setDone(true)
  }, [queue, user?.userId, grading, ko, showError])

  const header = (
    <StudyPageHeader
      icon={Shuffle}
      iconColorClass="text-violet-600 bg-violet-50"
      eyebrow={String(t('study.review.eyebrow'))}
      title={String(t('study.review.title'))}
      rightSlot={queue.length > 0 ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold tabular-nums">
          {queue.length}
        </span>
      ) : undefined}
    />
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        {/* Studying surface → Raumi (commit-gated: fast loads show
            nothing, slower ones get his full cycle). */}
        {showLoader
          ? <MascotLoader className="flex-1" label={ko ? '오늘의 복습을 준비 중…' : 'Preparing your review…'} />
          : <div className="flex-1" aria-hidden />}
      </div>
    )
  }

  if (loadFailed && queue.length === 0 && !done) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-3">
          <p className="text-sm text-gray-600">
            {ko ? '복습 카드를 불러오지 못했어요.' : "We couldn't load your review cards."}
          </p>
          <button
            type="button"
            onClick={() => { setLoading(true); setRetryKey(k => k + 1) }}
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 active:scale-[0.98] transition-all"
          >
            {ko ? '다시 시도' : 'Retry'}
          </button>
        </div>
      </div>
    )
  }

  if (queue.length === 0 || done) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center">
          <StudyEmptyState
            icon={Sparkles}
            iconColorClass="text-emerald-600 bg-emerald-50"
            headline={reviewed > 0 ? `${reviewed} ${t('study.review.reviewedSuffix')}` : t('study.review.noneDueYet')}
            body={String(t('study.review.doneBody'))}
            ctaHref="/mobile/study"
            ctaText={String(t('study.review.backToStudy'))}
          />
          {/* Secondary path — "nothing due" shouldn't be a dead end
              when the student is in the mood to review anyway. */}
          <Link
            href="/mobile/study/wrong-notebook"
            className="mt-2 text-[12.5px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {ko ? '오답노트 다시 보기 →' : 'Or revisit your wrong answers →'}
          </Link>
        </div>
      </div>
    )
  }

  const card = queue[0]
  const topicName = card.topic_name_en
    ? (ko ? (card.topic_name_ko ?? card.topic_name_en) : card.topic_name_en)
    : (ko ? '주제 없음' : 'No topic')

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {errorToast}
      {header}
      <div className="flex-1 flex flex-col px-5 py-4">

        {/* Cross-topic context strip — visible reminder that the queue
            interleaves so the student doesn't think the order is buggy. */}
        <div className="flex items-center justify-between mb-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Shuffle className="w-3 h-3" />
            {topicCount > 1
              ? t('study.review.interleavedBadge', { count: String(topicCount) })
              : topicName}
          </span>
          <button type="button" onClick={() => setShowWhy(v => !v)}
            className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800">
            <Info className="w-3 h-3" />{t('study.review.whyBack')}
          </button>
        </div>

        {showWhy && (
          <div className="mb-3 rounded-xl bg-violet-50/70 ring-1 ring-violet-100 p-3 text-[12px] text-violet-900 leading-relaxed">
            {t('study.review.whyBackBody')}
          </div>
        )}

        {/* Flip card */}
        <div
          className="flex-1 min-h-[260px] mb-4"
          style={{ perspective: '1200px' }}
        >
          <button
            type="button"
            onClick={() => setFlipped(f => !f)}
            aria-label={String(t('study.review.tapToFlip'))}
            aria-pressed={flipped}
            className="relative w-full h-full rounded-3xl text-left"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-3xl bg-white ring-1 ring-gray-200/70 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.10)] p-6 flex flex-col"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold tracking-wider uppercase mb-3">
                {topicName}
              </span>
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="text-[20px] font-semibold text-gray-900 leading-snug whitespace-pre-line">
                  {card.card_front}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-3">{t('study.review.tapToFlip')}</p>
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500 to-blue-600 text-white p-6 flex flex-col"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold tracking-wider uppercase mb-3">
                {ko ? '정답' : 'Answer'}
              </span>
              <div className="flex-1 flex items-center justify-center text-center">
                <div className="text-[18px] font-medium leading-relaxed whitespace-pre-line">
                  {card.card_back}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Rating row — only enabled once flipped. Full-color gradient
            buttons (rose / amber / emerald) with white icon + label, so
            the three grades read instantly and feel like primary CTAs. */}
        <div className={`grid grid-cols-3 gap-2 transition-opacity ${flipped ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          {([
            { quality: 1 as const, Icon: X, label: t('study.flashcards.again'),
              cls: 'from-rose-400 to-rose-600 shadow-[0_6px_16px_-6px_rgba(244,63,94,0.5)]' },
            { quality: 3 as const, Icon: Barbell, label: t('study.flashcards.hard'),
              cls: 'from-amber-400 to-orange-500 shadow-[0_6px_16px_-6px_rgba(251,146,60,0.5)]' },
            { quality: 5 as const, Icon: Check, label: t('study.flashcards.easy'),
              cls: 'from-emerald-400 to-teal-500 shadow-[0_6px_16px_-6px_rgba(16,185,129,0.5)]' },
          ]).map(({ quality, Icon, label, cls }) => (
            <button key={quality} type="button" disabled={grading || !flipped} onClick={() => void grade(quality)}
              className={`h-13 min-h-[52px] rounded-2xl bg-gradient-to-b text-white inline-flex items-center justify-center gap-1.5 hover:brightness-105 active:scale-[0.96] transition-all ${cls}`}>
              <Icon className="w-4 h-4" strokeWidth={2.5} />
              <span className="text-[13px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
