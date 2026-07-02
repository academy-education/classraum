"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { XCircle, CheckCircle2, RotateCcw, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { authHeaders } from '@/lib/auth-headers'

interface MistakeQuestion {
  prompt: string
  choices?: string[]
  correct_answer: string
  explanation?: string
}

interface Mistake {
  attempt_id: string
  question: MistakeQuestion
  student_answer: string
  ai_explanation: string | null
  attempted_at: string
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
}

/**
 * Mistake bank shelf — pedagogically the highest-leverage surface
 * in the study landing. Surfaces the student's recent wrong answers
 * inline (question prompt + their wrong answer + the correct answer)
 * so they can see at a glance what they got wrong without navigating
 * back into the original session.
 *
 * "Try again" CTA on each card creates a new practice session for
 * the same topic — fresh questions in the same area so the student
 * can re-attempt without seeing the exact same item (anti-memorize).
 *
 * Reuses the carousel side-rail layout from RecommendedShelf for
 * visual consistency with the other landing shelves.
 */
export function MistakeBankShelf() {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'

  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch('/api/study/mistakes', { headers })
        if (!res.ok) throw new Error()
        const json = await res.json()
        if (!cancelled) setMistakes((json.mistakes ?? []) as Mistake[])
      } catch {
        if (!cancelled) setMistakes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Practice for the same topic — fresh items in the same area so
  // the student doesn't see the exact same question (memorize-resistant).
  const retryTopic = async (m: Mistake) => {
    if (!user?.userId || creating) return
    if (!m.topic) return
    setCreating(m.attempt_id)
    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        student_id: user.userId,
        topic_id: m.topic.id,
        mode: 'practice',
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

  if (loading || mistakes.length === 0) {
    // Don't show the section at all when there are no mistakes —
    // celebratory absence, not an empty discouraging shelf.
    return null
  }

  const topicName = (m: Mistake): string => {
    if (m.topic) return ko ? m.topic.name_ko : m.topic.name_en
    return String(t('study.mistakes.unknownTopic'))
  }

  const rest = mistakes.length - 1
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
          {t('study.mistakes.title')}
        </h2>
        <Link href="/mobile/study/wrong-notebook"
          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:text-primary/80 transition">
          {rest > 0 ? (ko ? `전체 ${mistakes.length}개` : `See all ${mistakes.length}`) : String(t('study.mistakes.viewNotebook'))}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {mistakes.slice(0, 1).map(m => (
        <MistakeCard
          key={m.attempt_id}
          mistake={m}
          topicName={topicName(m)}
          t={t}
          onRetry={() => void retryTopic(m)}
          isCreating={creating === m.attempt_id}
          creatingDisabled={creating !== null}
        />
      ))}
    </section>
  )
}

/** Single mistake card — shows the question prompt, the student's
 *  wrong answer (struck through), the correct answer (in green),
 *  and a retry CTA that opens a new practice session for the topic. */
function MistakeCard({
  mistake,
  topicName,
  t,
  onRetry,
  isCreating,
  creatingDisabled,
}: {
  mistake: Mistake
  topicName: string
  t: ReturnType<typeof useTranslation>['t']
  onRetry: () => void
  isCreating: boolean
  creatingDisabled: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-white ring-1 ring-gray-200 flex flex-col gap-3">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      {/* Topic eyebrow */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 ring-1 ring-rose-200/70">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.10em] text-rose-700 truncate">
          {topicName}
        </span>
      </div>

      {/* Question — truncated to 2 lines for layout consistency */}
      <div className="text-[13.5px] text-gray-900 font-medium leading-relaxed line-clamp-2">
        {mistake.question.prompt}
      </div>

      {/* Wrong / correct answers, stacked */}
      <div className="space-y-1.5 mt-auto">
        <div className="flex items-start gap-2 text-[12.5px]">
          <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
          <span className="text-rose-700 line-through truncate flex-1" title={mistake.student_answer}>
            {mistake.student_answer}
          </span>
        </div>
        <div className="flex items-start gap-2 text-[12.5px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span className="text-emerald-700 font-semibold truncate flex-1" title={mistake.question.correct_answer}>
            {mistake.question.correct_answer}
          </span>
        </div>
      </div>

      {/* Retry CTA */}
      <button
        type="button"
        onClick={onRetry}
        disabled={creatingDisabled || !mistake.topic}
        className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white ring-1 ring-gray-200/80 text-[12.5px] font-semibold text-gray-700 hover:ring-primary/40 hover:text-primary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isCreating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RotateCcw className="w-3.5 h-3.5" />}
        {String(t('study.mistakes.retry'))}
      </button>
    </div>
  )
}
