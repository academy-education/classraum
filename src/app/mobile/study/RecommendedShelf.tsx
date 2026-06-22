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
      <h2 className="text-sm font-semibold text-gray-900 mb-2 inline-flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-primary" />
        {t('study.landing.recommendedTitle')}
      </h2>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 text-center text-sm text-gray-400 inline-flex items-center justify-center gap-2 w-full">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('study.landing.loading')}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-6 text-center">
          <Lightbulb className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t('study.landing.recommendedEmpty')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map(card => {
            const Icon = card.reason === 'weak' ? AlertTriangle : History
            const accent = card.reason === 'weak'
              ? 'text-amber-700 bg-amber-50'
              : 'text-primary bg-primary/10'
            return (
              <button
                key={`${card.topic.id}-${card.reason}`}
                type="button"
                onClick={() => void startSession(card)}
                disabled={creating !== null}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:ring-primary/30 hover:shadow-[0_4px_12px_-4px_rgba(40,133,232,0.18)] active:scale-[0.99] transition-all text-left disabled:opacity-60 disabled:cursor-wait"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.03] ${accent}`}>
                  {creating === card.topic.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {name(card.topic)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {card.reason === 'weak'
                      ? t('study.recommended.weakReason', {
                          score: String(card.score ?? 0),
                          mode: String(t(`study.modes.${card.suggested_mode}.title`)),
                        })
                      : t('study.recommended.recentReason', {
                          mode: String(t(`study.modes.${card.suggested_mode}.title`)),
                        })}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
