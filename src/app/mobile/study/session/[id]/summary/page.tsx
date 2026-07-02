"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, RotateCcw, Sparkles, BookOpen, RefreshCw } from 'lucide-react'
import { hapticImpact, hapticNotification } from '@/lib/nativeHaptics'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../../../SubscriptionGate'
import { SkeletonCard, SkeletonBlock } from '../../../skeletons'
import { PathMascot, type MascotState } from '../../../_shared/PathMascot'
import { StudySubPageHeader } from '../../../_shared/primitives'

interface SessionRow {
  id: string
  mode: string
  language: string
  topic_id: string | null
  topic_freeform: string | null
  status: string
  created_at: string
  last_active_at: string
  score: number | null
  correct_count: number | null
  total_count: number | null
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
}

interface AttemptRow {
  id: string
  is_correct: boolean
  time_spent_seconds: number | null
  question: {
    prompt: string
    correct_answer: string
    /** Full choice list for MC re-attempt. Present on most attempts
     *  but tolerated missing so we can gracefully hide the re-attempt
     *  affordance on non-MC types. */
    choices?: string[] | null
    type?: string | null
    explanation?: string | null
  } | null
  student_answer: string
}

/**
 * Post-session summary screen.
 *
 * Data-honest rules:
 * - Never invent a "streak +1" for sessions with 0 attempts.
 * - Never colour the hero as celebratory when nothing was attempted.
 * - When the session is empty, drop the metrics grid entirely and
 *   show a "nothing to summarize" empty state instead.
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
          score, correct_count, total_count,
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
      <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
        <SkeletonBlock className="h-4 w-24 rounded-full" />
        <SkeletonCard className="p-6 min-h-[220px] space-y-4">
          <SkeletonBlock className="h-3 w-24 rounded-full" />
          <SkeletonBlock className="h-10 w-32 rounded-full" />
          <SkeletonBlock className="h-3 w-40 rounded-full" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[0,1,2].map(i => (
              <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard className="p-4 min-h-[60px]" />
        <SkeletonCard className="p-4 min-h-[60px]" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-14 text-center">
        <p className="text-sm text-gray-500">{t('study.session.notFound')}</p>
        <Link
          href="/mobile/study"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4" />{t('study.topic.backToStudy')}
        </Link>
      </div>
    )
  }

  // Prefer server-persisted score when it exists (test-mode sessions
  // write score + correct_count + total_count on submit). Fall back to
  // recomputing from attempts for legacy sessions and non-test modes
  // that don't write a score column.
  const storedTotal = session.total_count ?? null
  const storedCorrect = session.correct_count ?? null
  const correct = storedCorrect !== null ? storedCorrect : attempts.filter(a => a.is_correct).length
  const totalItems = storedTotal !== null ? storedTotal : attempts.length
  const attempted = totalItems > 0
  const accuracy = !attempted
    ? 0
    : session.score !== null
      ? Math.round(session.score)
      : Math.round((correct / totalItems) * 100)
  const incorrect = totalItems - correct
  const totalSeconds = attempts.reduce((sum, a) => sum + (a.time_spent_seconds ?? 0), 0)
  const totalMinutes = Math.round(totalSeconds / 60)
  const topicName = session.topic
    ? (ko ? session.topic.name_ko : session.topic.name_en)
    : session.topic_freeform ?? String(t('study.session.untitled'))
  const modeLabel = String(t(`study.modes.${session.mode}.title`))

  // Hero color shifts with accuracy. Empty sessions get a neutral
  // slate treatment — never claim "celebrate" for something that
  // never happened.
  const hero = !attempted
    ? { gradient: 'from-slate-500 via-slate-600 to-slate-700', accent: 'text-slate-50' }
    : accuracy >= 80
      ? { gradient: 'from-emerald-500 via-emerald-600 to-teal-700', accent: 'text-emerald-50' }
      : accuracy >= 60
        ? { gradient: 'from-amber-500 via-orange-500 to-orange-700', accent: 'text-amber-50' }
        : { gradient: 'from-rose-500 via-rose-600 to-red-700', accent: 'text-rose-50' }

  const mistakes = attempts.filter(a => !a.is_correct)

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-14 space-y-6">
      <StudySubPageHeader
        backHref="/mobile/study"
        backLabel={String(t('study.topic.backToStudy'))}
        icon={Sparkles}
        iconColorClass="text-primary bg-primary/10"
        eyebrow={String(t('study.summary.eyebrow'))}
        title={modeLabel}
      />

      {/* Hero — score in a big gradient card, with the mascot in the
          top-right giving the numbers a face. Emotional state follows
          accuracy so a hard session doesn't get a cheerful celebrate. */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${hero.gradient} p-6 text-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.32)]`}>
        <div aria-hidden className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        {attempted && (
          <div className="absolute top-4 right-4 opacity-95 pointer-events-none">
            <PathMascot
              size={72}
              state={(accuracy >= 80 ? 'celebrate' : accuracy >= 60 ? 'idle' : 'sad') as MascotState}
            />
          </div>
        )}
        <div className="relative">
          <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${hero.accent} mb-2`}>
            <Sparkles className="w-3.5 h-3.5" />
            {String(t('study.summary.eyebrow'))}
          </div>
          {attempted ? (
            <>
              <h1 className={`text-[36px] font-bold leading-none tracking-tight ${hero.accent}`}>
                {accuracy}<span className="text-[24px] opacity-80">%</span>
              </h1>
              <p className={`text-[14px] ${hero.accent} mt-1.5 opacity-90`}>
                {String(t('study.summary.accuracyLine', {
                  correct: String(correct),
                  total: String(totalItems),
                }))}
              </p>
              <div className={`mt-5 grid grid-cols-3 gap-3 ${hero.accent}`}>
                <Stat icon={CheckCircle2} value={String(correct)} label={String(t('study.summary.correct'))} />
                <Stat icon={XCircle} value={String(incorrect)} label={String(t('study.summary.incorrect'))} />
                <Stat icon={Clock} value={`${totalMinutes}m`} label={String(t('study.summary.timeLabel'))} />
              </div>
            </>
          ) : (
            <>
              <h1 className={`text-[26px] font-bold leading-tight tracking-tight ${hero.accent}`}>
                {ko ? '기록된 답변이 없어요' : 'No attempts recorded'}
              </h1>
              <p className={`text-[13.5px] ${hero.accent} mt-2 opacity-90 leading-relaxed`}>
                {ko
                  ? '이 세션은 답변 없이 종료됐어요. 지금 다시 시작해볼까요?'
                  : 'This session ended without any answers. Want to try again now?'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Topic context — always shown for orientation, even for empty sessions. */}
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] text-gray-500 font-semibold leading-none">
            {modeLabel}
          </div>
          <div className="text-[14.5px] font-semibold text-gray-900 truncate mt-1">
            {topicName}
          </div>
        </div>
      </div>

      {/* Mistakes preview — only if there ARE mistakes AND we have some to show. */}
      {mistakes.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-gray-900">
              {String(t('study.summary.mistakesTitle', { count: String(mistakes.length) }))}
            </h2>
            <Link
              href="/mobile/study/wrong-notebook"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:text-primary/80"
            >
              {ko ? '오답노트' : 'Wrong notebook'}<ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {mistakes.slice(0, 3).map((m) => (
              <MistakeRow key={m.id} attempt={m} ko={ko} />
            ))}
            {mistakes.length > 3 && (
              <Link
                href="/mobile/study/wrong-notebook"
                className="block text-center text-[12.5px] text-primary hover:text-primary/80 py-2 font-medium"
              >
                {String(t('study.summary.mistakesMore', { count: String(mistakes.length - 3) }))} →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* CTAs — unified h-12 rounded-2xl for both. */}
      <section className="space-y-2 pt-2">
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
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-white text-gray-700 text-[14px] font-semibold ring-1 ring-gray-200 hover:ring-primary/30 hover:text-primary active:scale-[0.98] transition-all"
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

/**
 * MistakeRow — Brilliant/Photomath-style interactive review.
 *
 * Prior behavior: static row showing student_answer (strikethrough)
 * + correct_answer. The deep-research pass flagged this as a "static
 * text explanation" gap — students absorb more from re-attempting an
 * item than from reading the correct answer.
 *
 * New behavior: keeps the static answers visible (nothing lost), but
 * adds a "Try again" button that expands the row with a fresh choice
 * picker. Tapping a choice reveals correct/incorrect inline with a
 * mascot reaction and haptic. The original attempt's is_correct on
 * the server stays unchanged — this is a learning affordance, not a
 * grade reversal.
 *
 * Hides the re-attempt button gracefully when the question doesn't
 * carry a choice list (non-MC types, or legacy attempts stored
 * without full question JSON).
 */
function MistakeRow({ attempt, ko }: { attempt: AttemptRow; ko: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const choices = attempt.question?.choices ?? []
  const correct = attempt.question?.correct_answer ?? ''
  const canReattempt = choices.length >= 2 && !!correct

  const isCorrectPick = picked !== null && picked === correct
  const isWrongPick = picked !== null && picked !== correct

  const handlePick = (choice: string) => {
    if (picked !== null) return  // one attempt per row for now
    setPicked(choice)
    if (choice === correct) {
      hapticNotification('success')
    } else {
      hapticImpact('medium')
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-4">
      <div className="text-[13px] text-gray-900 font-medium leading-relaxed line-clamp-2 mb-2">
        {attempt.question?.prompt}
      </div>
      <div className="flex items-start gap-2 text-[12px] mb-1">
        <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
        <span className="text-rose-700 line-through flex-1 truncate" title={attempt.student_answer}>
          {attempt.student_answer || '—'}
        </span>
      </div>
      <div className="flex items-start gap-2 text-[12px]">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <span className="text-emerald-700 font-semibold flex-1 truncate" title={correct}>
          {correct}
        </span>
      </div>

      {canReattempt && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary text-[11.5px] font-semibold transition"
        >
          <RefreshCw className="w-3 h-3" />
          {ko ? '다시 풀어보기' : 'Try again'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <PathMascot
              size={40}
              state={
                isCorrectPick ? 'celebrate' :
                isWrongPick ? 'sad' :
                'thinking'
              }
            />
            <div className="flex-1 text-[12px] text-gray-600 leading-snug pt-1">
              {picked === null
                ? (ko ? '이번엔 답을 골라볼까요?' : 'Give it another shot — pick the right choice.')
                : isCorrectPick
                  ? (ko ? '정답이에요! 이제 확실해졌어요.' : 'You got it — that\'s the one.')
                  : (ko ? '다시 한번 정답을 확인해 봐요.' : 'Not quite — the correct answer is highlighted above.')}
            </div>
          </div>
          <div className="space-y-1.5">
            {choices.map((choice, i) => {
              const isThisPick = picked === choice
              const isCorrectChoice = choice === correct
              const showCorrect = picked !== null && isCorrectChoice
              const showWrongPick = isThisPick && !isCorrectChoice
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePick(choice)}
                  disabled={picked !== null}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium ring-1 transition-all ${
                    showCorrect
                      ? 'bg-emerald-50 ring-emerald-300 text-emerald-800'
                      : showWrongPick
                        ? 'bg-rose-50 ring-rose-200 text-rose-700'
                        : picked !== null
                          ? 'bg-white ring-gray-200 text-gray-500'
                          : 'bg-white ring-gray-200 text-gray-800 hover:ring-primary/40 hover:bg-primary/[0.02] active:scale-[0.99]'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10.5px] font-bold flex-shrink-0 ${
                    showCorrect
                      ? 'bg-emerald-500 text-white'
                      : showWrongPick
                        ? 'bg-rose-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 truncate">{choice}</span>
                  {showCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                  {showWrongPick && <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
