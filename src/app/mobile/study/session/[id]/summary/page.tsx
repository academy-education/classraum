"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, Target, RotateCcw, Loader2, Sparkles, Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../../../SubscriptionGate'

interface SessionRow {
  id: string
  mode: string
  language: string
  topic_id: string | null
  topic_freeform: string | null
  status: string
  created_at: string
  last_active_at: string
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
}

interface AttemptRow {
  id: string
  is_correct: boolean
  time_spent_seconds: number | null
  question: { prompt: string; correct_answer: string } | null
  student_answer: string
}

/**
 * Post-session summary screen — the missing surface in the flow.
 *
 * Shows: score (correct/total), accuracy %, total time, breakdown
 * by mistake type if any, and "next step" CTAs (review mistakes,
 * try again, back to study). Updates the streak chip + progress
 * ring on the landing automatically when student returns.
 */
export default function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <StudySubscriptionGate>
      <SummaryInner id={id} />
    </StudySubscriptionGate>
  )
}

function SummaryInner({ id }: { id: string }) {
  const { t, language } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const ko = language === 'korean'
  const [session, setSession] = useState<SessionRow | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      const { data: sess } = await supabase
        .from('study_sessions')
        .select(`
          id, mode, language, topic_id, topic_freeform, status, created_at, last_active_at,
          topic:study_topics ( id, slug, name_en, name_ko )
        `)
        .eq('id', id)
        .eq('student_id', user.userId)
        .maybeSingle()
      if (cancelled) return
      setSession((sess as unknown as SessionRow | null))

      const { data: atts } = await supabase
        .from('study_attempts')
        .select('id, is_correct, time_spent_seconds, question, student_answer')
        .eq('session_id', id)
        .order('created_at', { ascending: true })
      if (cancelled) return
      setAttempts((atts as unknown as AttemptRow[]) ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, user?.userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-gray-500 px-5 py-10">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.landing.loading')}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        {t('study.session.notFound')}
      </div>
    )
  }

  const correct = attempts.filter(a => a.is_correct).length
  const incorrect = attempts.length - correct
  const accuracy = attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100)
  const totalSeconds = attempts.reduce((sum, a) => sum + (a.time_spent_seconds ?? 0), 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const topicName = session.topic
    ? (ko ? session.topic.name_ko : session.topic.name_en)
    : session.topic_freeform ?? String(t('study.session.untitled'))
  const modeLabel = String(t(`study.modes.${session.mode}.title`))

  // Hero color shifts based on accuracy — green for great, amber for
  // moderate, rose for low. Encouraging but honest.
  const hero = accuracy >= 80
    ? { gradient: 'from-emerald-500 via-emerald-600 to-teal-700', accent: 'text-emerald-50' }
    : accuracy >= 60
      ? { gradient: 'from-amber-500 via-orange-500 to-orange-700', accent: 'text-amber-50' }
      : { gradient: 'from-rose-500 via-rose-600 to-red-700', accent: 'text-rose-50' }

  const mistakes = attempts.filter(a => !a.is_correct)

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
      <Link
        href="/mobile/study"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors -ml-1 px-1 py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('study.topic.backToStudy')}
      </Link>

      {/* Hero — score in a big gradient card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${hero.gradient} p-6 text-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.32)]`}>
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative">
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${hero.accent} mb-2`}>
            <Sparkles className="w-3.5 h-3.5" />
            {String(t('study.summary.eyebrow'))}
          </div>
          <h1 className={`text-[36px] font-bold leading-none tracking-tight ${hero.accent}`}>
            {accuracy}<span className="text-[24px] opacity-80">%</span>
          </h1>
          <p className={`text-[14px] ${hero.accent} mt-1.5 opacity-90`}>
            {String(t('study.summary.accuracyLine', {
              correct: String(correct),
              total: String(attempts.length),
            }))}
          </p>
          <div className={`mt-5 grid grid-cols-3 gap-3 ${hero.accent}`}>
            <Stat icon={CheckCircle2} value={String(correct)} label={String(t('study.summary.correct'))} />
            <Stat icon={XCircle} value={String(incorrect)} label={String(t('study.summary.incorrect'))} />
            <Stat icon={Clock} value={`${totalMinutes}m`} label={String(t('study.summary.timeLabel'))} />
          </div>
        </div>
      </div>

      {/* Topic context */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-200/60 px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center gap-3">
        <Target className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] uppercase tracking-[0.10em] text-gray-500 font-semibold leading-none">
            {modeLabel}
          </div>
          <div className="text-[15px] font-semibold text-gray-900 truncate mt-0.5">
            {topicName}
          </div>
        </div>
      </div>

      {/* Streak bump */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-200/60 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_8px_rgba(245,158,11,0.25)]">
          <Flame className="w-5 h-5" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-amber-900">
            {String(t('study.summary.streakLine'))}
          </div>
          <div className="text-[11.5px] text-amber-700/80 mt-0.5">
            {String(t('study.summary.streakHint'))}
          </div>
        </div>
      </div>

      {/* Mistakes preview */}
      {mistakes.length > 0 && (
        <section>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900 mb-3">
            {String(t('study.summary.mistakesTitle', { count: String(mistakes.length) }))}
          </h2>
          <div className="space-y-2.5">
            {mistakes.slice(0, 3).map((m) => (
              <div key={m.id} className="rounded-2xl bg-gradient-to-br from-rose-50/60 via-white to-white ring-1 ring-rose-200/50 p-4">
                <div className="text-[13.5px] text-gray-900 font-medium leading-relaxed line-clamp-2 mb-2">
                  {m.question?.prompt}
                </div>
                <div className="flex items-start gap-2 text-[12.5px] mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span className="text-rose-700 line-through flex-1 truncate" title={m.student_answer}>
                    {m.student_answer}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-[12.5px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-emerald-700 font-semibold flex-1 truncate" title={m.question?.correct_answer}>
                    {m.question?.correct_answer}
                  </span>
                </div>
              </div>
            ))}
            {mistakes.length > 3 && (
              <div className="text-[12px] text-gray-500 text-center pt-1">
                {String(t('study.summary.mistakesMore', { count: String(mistakes.length - 3) }))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTAs */}
      <section className="space-y-2.5 pt-2">
        {session.topic && (
          <Link
            href={`/mobile/study/topic/${session.topic.slug}`}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-b from-primary to-primary/90 text-white text-[15px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(40,133,232,0.25),0_8px_20px_-8px_rgba(40,133,232,0.4)] ring-1 ring-primary/30 active:scale-[0.98] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            {String(t('study.summary.tryAgain'))}
          </Link>
        )}
        <Link
          href="/mobile/study"
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-2xl bg-white text-gray-700 text-[14px] font-semibold ring-1 ring-gray-200/70 hover:ring-primary/30 hover:text-primary active:scale-[0.98] transition-all"
        >
          {String(t('study.summary.backToStudy'))}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}

function Stat({ icon: Icon, value, label }: {
  icon: typeof CheckCircle2; value: string; label: string
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/25 mb-1.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-[20px] font-bold tracking-tight leading-none">{value}</div>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.10em] opacity-80 mt-0.5">{label}</div>
    </div>
  )
}
