"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, RefreshCw, RotateCw, Check, RefreshCcw, Sparkles, Lightbulb, X, Zap } from '@/app/mobile/study/_shared/icons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import { hapticTap, hapticImpact } from '@/lib/nativeHaptics'
import { PathMascot } from '../../_shared/PathMascot'
import { MascotLoader } from '../../_shared/MascotLoader'
import { scheduleNext, INITIAL_SRS } from '@/lib/srs'
import { useStudyErrorToast, saveFailedMessage } from '../../_shared/useStudyErrorToast'

interface Card { front: string; back: string; hint: string | null }
interface Deck { cards: Card[] }

/**
 * Flashcards mode.
 *
 * Show front → tap to flip → mark "Got it" or "Review again". Cards
 * marked "again" loop back to the end of the queue until the queue
 * empties. Each review writes a study_attempts row so future mastery
 * code can read confidence-over-time per card.
 *
 * v1 keeps the spacing logic in-memory only — no SR scheduling across
 * sessions yet. Phase 3 graduates this into a real spaced-repetition
 * queue keyed by card front + topic_id.
 */
/** Raumi's thinking loop is 3.2s; hold the loader at least one cycle
 *  so fast responses don't flash the mascot. */
const MIN_MASCOT_MS = 3200
const holdForMascot = async (startedAt: number) => {
  const left = MIN_MASCOT_MS - (Date.now() - startedAt)
  if (left > 0) await new Promise(r => setTimeout(r, left))
}

export function FlashcardsSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const router = useRouter()
  const ko = language === 'ko'

  const [deck, setDeck] = useState<Card[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [topicId, setTopicId] = useState<string | null>(null)
  // Queue of indices into `deck`. We push "review again" cards back to
  // the end so the user keeps hitting the hard ones until they stick.
  const [queue, setQueue] = useState<number[]>([])
  const [flipped, setFlipped] = useState(false)
  const [marking, setMarking] = useState(false)
  const { errorToast, showError } = useStudyErrorToast()
  const [showHint, setShowHint] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [marked, setMarked] = useState({ got: 0, again: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    const startedAt = Date.now()
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/flashcards/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const cards = (json.deck as Deck).cards
      await holdForMascot(startedAt)
      setDeck(cards)
      setQueue(cards.map((_, i) => i))
      setFlipped(false)
      setShowHint(false)
      setReviewed(0)
      setMarked({ got: 0, again: 0 })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  // SRS persistence is keyed by (student, topic_id, card_front), so we
  // need topic_id from the session row alongside the deck.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select('topic_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (data?.topic_id) setTopicId(data.topic_id as string)
    })()
  }, [sessionId])

  const mark = useCallback(async (quality: 1 | 3 | 5) => {
    // marking lock: setQueue is async, so a fast double-tap would read
    // the same queue[0] twice — double-counting one card and silently
    // skipping the next. Released by the queue-advance effect.
    if (!deck || queue.length === 0 || !user?.userId || marking) return
    setMarking(true)
    hapticImpact('medium')  // tactile commit when rating a card
    const currentIdx = queue[0]
    const card = deck[currentIdx]
    const isCorrect = quality >= 3

    // Persist the review as a study_attempts row (for mastery + stats).
    void (async () => {
      const { error } = await supabase.from('study_attempts').insert({
        session_id: sessionId,
        question: {
          prompt: card.front,
          type: 'flashcard',
          choices: null,
          correct_answer: card.back,
          difficulty: 'medium',
          explanation: card.back,
        },
        student_answer: quality === 1 ? 'again' : quality === 3 ? 'hard' : 'easy',
        is_correct: isCorrect,
        ai_explanation: null,
      })
      if (error) console.error('[flashcards] attempt insert failed', error)
    })()

    // SRS update — load existing state (if any), compute next, persist.
    // Fire-and-forget so the UI advances immediately; the next-due
    // calculation only matters for the NEXT session, not this card.
    void (async () => {
      const { data: existing } = await supabase
        .from('study_flashcard_reviews')
        .select('ease_factor, interval_days, repetitions')
        .eq('student_id', user.userId)
        .eq('topic_id', topicId ?? null)
        .eq('card_front', card.front)
        .maybeSingle()

      const prev = existing ?? INITIAL_SRS
      const next = scheduleNext(prev, quality)

      const { error: srsError } = await supabase.from('study_flashcard_reviews').upsert({
        student_id: user.userId,
        topic_id: topicId,
        card_front: card.front,
        card_back: card.back,
        ease_factor: next.ease_factor,
        interval_days: next.interval_days,
        repetitions: next.repetitions,
        due_at: next.due_at.toISOString(),
        last_reviewed_at: new Date().toISOString(),
        last_quality: quality,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,topic_id,card_front' })
      if (srsError) showError(saveFailedMessage(ko))
    })()

    // Toast first (instant) — server award follows in background.
    import('../../_shared/XpToast').then(m => m.emitXp(
      quality === 5 ? 5 : quality === 3 ? 8 : 2,
    ))
    void (async () => {
      try {
        const headers = await authHeaders()
        await fetch('/api/study/xp', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            eventType: quality === 5 ? 'flashcard_easy' : quality === 3 ? 'flashcard_hard' : 'flashcard_again',
            sourceId: sessionId,
          }),
        })
      } catch {
        // Non-fatal — XP is best-effort.
      }
    })()

    setReviewed(r => r + 1)
    setMarked(m => isCorrect ? { ...m, got: m.got + 1 } : { ...m, again: m.again + 1 })

    setQueue(prev => {
      const next = prev.slice(1)
      // "Again" cards come back in this session for immediate practice;
      // "Hard" + "Easy" exit the queue (their next SRS due_at takes over).
      if (quality === 1) next.push(currentIdx)
      return next
    })
    setFlipped(false)
    setShowHint(false)
  }, [deck, queue, sessionId, user?.userId, topicId, marking, ko, showError])

  // Release the mark lock once the queue head advances.
  useEffect(() => { setMarking(false) }, [queue])

  // Mark the session completed once the student clears the whole queue.
  // Flashcards were never flipped off 'in_progress', so history showed
  // them "in progress" forever and they never got a score chip. Score =
  // % of cards rated "got it". Fires once via the ref guard.
  const completedRef = useRef(false)
  useEffect(() => {
    if (completedRef.current) return
    if (!user?.userId || !deck || deck.length === 0 || queue.length !== 0) return
    completedRef.current = true
    const score = Math.round((marked.got / deck.length) * 100)
    void supabase
      .from('study_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString(), score })
      .eq('id', sessionId)
      .eq('student_id', user.userId)
  }, [deck, queue.length, marked.got, sessionId, user?.userId])

  if (loading) {
    return (
      <MascotLoader className="flex-1" label={t('study.flashcards.generating')} />
    )
  }

  if (error || !deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <PathMascot state="sad" size={84} />
        <p className="text-sm text-gray-600">{t('study.flashcards.generateFailed')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          {t('study.flashcards.tryAgain')}
        </button>
      </div>
    )
  }

  // No cards for this section yet (e.g. a section with no bank coverage).
  // Distinct from the "you reviewed everything" done state below.
  if (deck.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm text-gray-600 max-w-xs">
          {ko ? '이 섹션의 플래시카드는 아직 준비 중이에요.' : "Flashcards for this section aren't ready yet."}
        </p>
        <Link
          href="/mobile/study"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-primary text-white text-sm font-medium"
        >
          {ko ? '학습으로 돌아가기' : 'Back to study'}
        </Link>
      </div>
    )
  }

  // "New deck" starts a FRESH flashcards session on the same topic so
  // the bank draw serves the next unseen cards (reloading this session
  // just returns the cached deck). Falls back to a reload if we can't
  // spin up a new session.
  const startFreshDeck = async () => {
    if (!user?.userId || !topicId) { void load(); return }
    const { data, error: insErr } = await supabase
      .from('study_sessions')
      .insert({ student_id: user.userId, topic_id: topicId, mode: 'flashcards', language })
      .select('id')
      .single()
    if (insErr || !data) { void load(); return }
    router.push(`/mobile/study/session/${data.id}`)
  }

  // Empty queue means the student reviewed every card and didn't mark
  // any "again" — show the summary.
  if (queue.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
          {t('study.flashcards.doneEyebrow')}
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
          {marked.got} / {deck.length}
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          {t('study.flashcards.doneMessage', { reviews: String(reviewed) })}
        </p>
        <div className="mt-6 w-full max-w-xs flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void startFreshDeck()}
            className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t('study.flashcards.newDeck')}
          </button>
          {marked.again > 0 && (
            <Link
              href={`/mobile/study/session/${sessionId}/summary`}
              className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition"
            >
              {language === 'ko' ? '어려웠던 카드 보기' : 'Review tough cards'}
            </Link>
          )}
          <Link
            href="/mobile/study"
            className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
          >
            {t('study.flashcards.backToStudy')}
          </Link>
        </div>
      </div>
    )
  }

  const card = deck[queue[0]]
  // Position is 1-based count of cards reviewed so far, out of the
  // total unique deck size. Doesn't count re-queued repeats so the
  // progress feels stable.
  const position = Math.min(reviewed + 1, deck.length)

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {errorToast}
      <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
        <span>
          {t('study.flashcards.progress', { current: String(position), total: String(deck.length) })}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="w-3.5 h-3.5" />
            {marked.got}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <RefreshCcw className="w-3.5 h-3.5" />
            {marked.again}
          </span>
        </span>
      </div>

      <div className="flex-1 px-5 pb-3 flex flex-col items-stretch overflow-hidden">
        {/* 3D-flip card. Outer wrapper sets perspective; inner div
            rotates Y on flip. Front + back are siblings with
            backface-hidden so only the visible side renders.
            Tap anywhere to flip. */}
        <button
          type="button"
          onClick={() => { hapticTap(); setFlipped(f => !f) }}
          aria-pressed={flipped}
          className="flex-1 group"
          style={{ perspective: '1200px' }}
        >
          <div
            className="relative w-full h-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front face */}
            <div
              className="absolute inset-0 rounded-2xl border-2 border-gray-200 bg-white px-6 py-8 flex flex-col items-center justify-center gap-3 text-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_12px_28px_-12px_rgba(0,0,0,0.10)]"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                {t('study.flashcards.frontLabel')}
              </span>
              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {card.front}
              </p>

              {card.hint && (
                showHint ? (
                  <div className="mt-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-800 inline-flex items-start gap-1.5 text-left">
                    <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{card.hint}</span>
                  </div>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setShowHint(true) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowHint(true) } }}
                    className="mt-1 text-xs text-amber-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Lightbulb className="w-3 h-3" />
                    {t('study.flashcards.showHint')}
                  </span>
                )
              )}

              <span className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1">
                <RotateCw className="w-3 h-3" />
                {t('study.flashcards.tapToFlip')}
              </span>
            </div>

            {/* Back face — pre-rotated 180° so it shows right-side-up
                when the card flips. */}
            <div
              className="absolute inset-0 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.06] via-white to-primary/[0.04] px-6 py-8 flex flex-col items-center justify-center gap-3 text-center shadow-[0_2px_8px_-2px_rgba(40,133,232,0.10),0_12px_28px_-12px_rgba(40,133,232,0.16)]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {t('study.flashcards.backLabel')}
              </span>
              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                {card.back}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Confidence rating (SRS) — only appears after flip. Three
          buttons mapped to SM-2 quality values 1 / 3 / 5. The chosen
          rating drives the card's next-review schedule in
          study_flashcard_reviews. */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white">
        {flipped ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={marking} onClick={() => void mark(1)}
              className="h-12 rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-200 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
            >
              <X className="w-3.5 h-3.5" />
              {t('study.flashcards.again')}
            </button>
            <button
              type="button"
              disabled={marking} onClick={() => void mark(3)}
              className="h-12 rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              {t('study.flashcards.hard')}
            </button>
            <button
              type="button"
              disabled={marking} onClick={() => void mark(5)}
              className="h-12 rounded-2xl bg-emerald-600 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(16,185,129,0.25)]"
            >
              <Zap className="w-3.5 h-3.5" fill="currentColor" />
              {t('study.flashcards.easy')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { hapticTap(); setFlipped(true) }}
            className="w-full h-12 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <RotateCw className="w-4 h-4" />
            {t('study.flashcards.flip')}
          </button>
        )}
      </div>
    </div>
  )
}
