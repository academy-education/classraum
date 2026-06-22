"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, RefreshCw, RotateCw, Check, RefreshCcw, Sparkles, Lightbulb } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

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
export function FlashcardsSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'

  const [deck, setDeck] = useState<Card[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Queue of indices into `deck`. We push "review again" cards back to
  // the end so the user keeps hitting the hard ones until they stick.
  const [queue, setQueue] = useState<number[]>([])
  const [flipped, setFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [marked, setMarked] = useState({ got: 0, again: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
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

  const mark = useCallback(async (verdict: 'got' | 'again') => {
    if (!deck || queue.length === 0) return
    const currentIdx = queue[0]
    const card = deck[currentIdx]

    // Persist the review as a study_attempts row. RLS scoped by
    // session ownership covers this — the client write is fine.
    // We await so errors surface in the console; the UI advances
    // either way so a flaky network never blocks the deck.
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
        student_answer: verdict,
        is_correct: verdict === 'got',
        ai_explanation: null,
      })
      if (error) console.error('[flashcards] attempt insert failed', error)
    })()

    setReviewed(r => r + 1)
    setMarked(m => verdict === 'got' ? { ...m, got: m.got + 1 } : { ...m, again: m.again + 1 })

    setQueue(prev => {
      const next = prev.slice(1)
      // Re-queue if the user wants to revisit — appended so other cards
      // get cycled through first.
      if (verdict === 'again') next.push(currentIdx)
      return next
    })
    setFlipped(false)
    setShowHint(false)
  }, [deck, queue, sessionId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.flashcards.generating')}
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
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
            onClick={() => void load()}
            className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t('study.flashcards.newDeck')}
          </button>
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
        {/* The card itself — tap anywhere to flip. */}
        <button
          type="button"
          onClick={() => setFlipped(f => !f)}
          className={`flex-1 rounded-2xl border-2 px-6 py-8 text-center transition-colors flex flex-col items-center justify-center gap-3 ${
            flipped
              ? 'bg-primary/5 border-primary/30'
              : 'bg-white border-gray-200'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            {flipped ? t('study.flashcards.backLabel') : t('study.flashcards.frontLabel')}
          </span>
          <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
            {flipped ? card.back : card.front}
          </p>

          {!flipped && card.hint && (
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

          {!flipped && (
            <span className="mt-2 text-xs text-gray-400 inline-flex items-center gap-1">
              <RotateCw className="w-3 h-3" />
              {t('study.flashcards.tapToFlip')}
            </span>
          )}
        </button>
      </div>

      {/* Verdict CTAs — only appear after flip so the student commits
          to a recall attempt before deciding. */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white">
        {flipped ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void mark('again')}
              className="h-12 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" />
              {t('study.flashcards.again')}
            </button>
            <button
              type="button"
              onClick={() => void mark('got')}
              className="h-12 rounded-full bg-emerald-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {t('study.flashcards.got')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="w-full h-12 rounded-full bg-gray-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <RotateCw className="w-4 h-4" />
            {t('study.flashcards.flip')}
          </button>
        )}
      </div>
    </div>
  )
}
