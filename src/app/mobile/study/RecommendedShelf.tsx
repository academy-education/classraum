"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lightbulb, AlertTriangle, History, ArrowRight, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'
import type { StudyMode } from './modes'

interface Card {
  reason: 'weak' | 'recent'
  topic: { id: string; slug: string; name_en: string; name_ko: string; category: string }
  score: number | null
  attempts_count: number
  suggested_mode: StudyMode
  weakness_hint?: string | null
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Track scroll position so we can hide the prev/next buttons when
  // we're at the start or end of the carousel. The tolerance accounts
  // for the padding-left we use to keep cards out of the button hit
  // area — snap-mandatory aligns the first card to scrollLeft = paddingLeft,
  // so a raw `scrollLeft > 0` would falsely show the left button at
  // the carousel start.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const padLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0
      const padRight = parseFloat(getComputedStyle(el).paddingRight) || 0
      setCanScrollLeft(el.scrollLeft > padLeft + 8)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - padRight - 8)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [cards.length])

  const scrollByOneCard = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    // One card width + gap. Card is ~82% viewport up to 320px.
    const cardWidth = Math.min(el.clientWidth * 0.82, 320) + 12
    el.scrollBy({ left: dir === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
  }

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
    setCreating(card.topic.id)
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: card.topic.id,
        mode: card.suggested_mode,
        language: ko ? 'ko' : 'en',
      })
      .select('id')
      .single()
    if (error || !data) {
      setCreating(null)
      return
    }
    router.push(`/mobile/study/session/${data.id}`)
  }

  const name = (s: { name_en: string; name_ko: string }) => ko ? s.name_ko : s.name_en

  return (
    <section>
      <h2 className="text-[15px] font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 ring-1 ring-primary/15">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </span>
        {t('study.landing.recommendedTitle')}
      </h2>

      {loading ? (
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 px-5 py-7 text-center text-sm text-gray-400 inline-flex items-center justify-center gap-2 w-full shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('study.landing.loading')}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-gray-50/50 px-5 py-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white ring-1 ring-gray-200/70 mx-auto mb-3">
            <Lightbulb className="w-5 h-5 text-gray-300" />
          </div>
          <p className="text-[13.5px] text-gray-500 leading-relaxed max-w-[24ch] mx-auto">
            {t('study.landing.recommendedEmpty')}
          </p>
        </div>
      ) : (
        // Horizontal carousel. Cards bleed past the page padding via
        // -mx-5 so the next card peeks at the right edge. Edge-fade
        // overlays (left + right) gradient cards down to the page
        // background color where the buttons sit — clean visual
        // separation, no overlap of button + card content.
        <div className="relative -mx-5">
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-12 py-3">
            {cards.map(card => (
              <div
                key={`${card.topic.id}-${card.reason}`}
                className="snap-start flex-shrink-0 w-[82%] max-w-[320px]"
              >
                {card.reason === 'weak'
                  ? <WeakAreaCard card={card} name={name} t={t} startSession={startSession} creating={creating} />
                  : <RecentSessionCard card={card} name={name} t={t} startSession={startSession} creating={creating} />}
              </div>
            ))}
          </div>
          {/* Edge-fade overlays — bg-gray-50 matches the page surface.
              Only render when there's content behind the button at
              that edge, so we don't cover the first/last card content
              at the carousel boundaries. */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 via-gray-50 to-transparent z-[5]" />
          )}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 via-gray-50 to-transparent z-[5]" />
          )}
          {cards.length > 1 && (
            <>
              <CarouselSideButton
                direction="left"
                visible={canScrollLeft}
                onClick={() => scrollByOneCard('left')}
              />
              <CarouselSideButton
                direction="right"
                visible={canScrollRight}
                onClick={() => scrollByOneCard('right')}
              />
            </>
          )}
        </div>
      )}
    </section>
  )
}

/** Side-overlay button for any horizontal carousel. Sits absolutely
 *  on the left or right edge, fades in/out based on whether there's
 *  more to scroll that direction. Backdrop blur + white surface so
 *  it reads clearly over any card color underneath. Exported so the
 *  Resumable shelf below uses the same convention. */
export function CarouselSideButton({
  direction,
  visible,
  onClick,
}: {
  direction: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      aria-label={direction === 'left' ? 'Previous' : 'Next'}
      className={`absolute top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white ring-1 ring-gray-200/80 text-gray-700 shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_20px_-8px_rgba(0,0,0,0.18)] hover:ring-primary/40 hover:text-primary active:scale-[0.94] transition-all duration-200 ${
        direction === 'left' ? 'left-1.5' : 'right-1.5'
      } ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <Icon className="w-4 h-4" />
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
      className="group relative w-full overflow-hidden rounded-2xl p-4 ring-1 ring-amber-200/70 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(245,158,11,0.18)] hover:ring-amber-300 hover:shadow-[0_2px_8px_-2px_rgba(245,158,11,0.18),0_16px_32px_-12px_rgba(245,158,11,0.26)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-start gap-3.5">
        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(245,158,11,0.25)] ring-1 ring-amber-600/10">
          {creating === card.topic.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <AlertTriangle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[15px] font-semibold text-gray-900 truncate">
              {name(card.topic)}
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
      className="group relative w-full overflow-hidden rounded-2xl p-4 ring-1 ring-primary/15 bg-gradient-to-br from-primary/[0.04] via-indigo-50/40 to-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.14),0_12px_24px_-12px_rgba(40,133,232,0.20)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait"
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      <div className="flex items-center gap-3.5">
        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_4px_rgba(40,133,232,0.25)] ring-1 ring-primary/20">
          {creating === card.topic.id
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <History className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-gray-900 truncate">
              {name(card.topic)}
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
