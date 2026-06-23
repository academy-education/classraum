"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lightbulb, AlertTriangle, History, ArrowRight, Loader2, Sparkles } from 'lucide-react'
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
        <div className="space-y-2">
          {cards.map(card => {
            const Icon = card.reason === 'weak' ? AlertTriangle : History
            const accent = card.reason === 'weak'
              ? 'text-amber-700 bg-gradient-to-br from-amber-50 to-amber-100/60'
              : 'text-primary bg-gradient-to-br from-primary/10 to-primary/15'
            return (
              <button
                key={`${card.topic.id}-${card.reason}`}
                type="button"
                onClick={() => void startSession(card)}
                disabled={creating !== null}
                className="group w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white ring-1 ring-gray-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.12),0_12px_24px_-12px_rgba(40,133,232,0.18)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left disabled:opacity-60 disabled:cursor-wait"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${accent}`}>
                  {creating === card.topic.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {name(card.topic)}
                  </div>
                  <div className="text-[12.5px] text-gray-500 mt-0.5 leading-relaxed">
                    {card.reason === 'weak'
                      ? card.weakness_hint
                        ? t('study.recommended.weakReasonWithHint', {
                            hint: card.weakness_hint,
                            mode: String(t(`study.modes.${card.suggested_mode}.title`)),
                          })
                        : t('study.recommended.weakReason', {
                            score: String(card.score ?? 0),
                            mode: String(t(`study.modes.${card.suggested_mode}.title`)),
                          })
                      : t('study.recommended.recentReason', {
                          mode: String(t(`study.modes.${card.suggested_mode}.title`)),
                        })}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0 transition-all" />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
