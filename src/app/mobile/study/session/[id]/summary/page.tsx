"use client"

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, RotateCcw, Sparkles, BookOpen, RefreshCw } from '@/app/mobile/study/_shared/icons'
import { hapticImpact, hapticNotification } from '@/lib/nativeHaptics'
import { db } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { StudySubscriptionGate } from '../../../SubscriptionGate'
import { studyButtonClass } from '../../../_shared/StudyButton'
import { MascotLoader, useMascotGate } from '../../../_shared/MascotLoader'
import { PathMascot, type MascotState } from '../../../_shared/PathMascot'
import { StudyPageHeader, StudyScrollShell } from '../../../_shared/primitives'
import { estimateSectionScore } from '@/lib/study/sat-adaptive'
import {
  satSectionFromTopicSlug, familyFromTopicSlug, buildResultModel,
  type ResultRowQuestion,
} from '@/lib/study/test-result'
import { actSectionForSlug } from '@/lib/study/act-test'
import { TestResultView } from '../test/TestResultView'

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
  /** SAT two-module adaptive: the earned Module 2 route, or null. */
  module2_route: string | null
  /** Module 1 as graded at the module break: correct CARDS, and how many
   *  CARDS Module 1 held (which is also the break index). Written by
   *  /api/study/test/route; NULL on every non-adaptive session. */
  module1_correct: number | null
  module1_total: number | null
  /** Why the session ended when it wasn't a deliberate submit.
   *  'app_exited' = the native app was backgrounded mid-test and the
   *  exit guard submitted what had been answered. See migration 066. */
  ended_reason: string | null
  config: { dailyChallenge?: string } | null
  topic: { id: string; slug: string; name_en: string; name_ko: string } | null
}

interface AttemptRow {
  id: string
  /** NULL for open-response items — rubric-graded, not objectively
   *  gradable. `!a.is_correct` therefore counts every writing and
   *  speaking answer as a mistake; compare to false explicitly. */
  is_correct: boolean | null
  time_spent_seconds: number | null
  /** Delivery order. NULL on legacy rows (519 of 932 live full-test
   *  rows), which is why numbering is gated — see canNumberRows. */
  position: number | null
  question: ResultRowQuestion | null
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
  /** Review list is capped at 3 until asked; see the expander below. */
  const [showAllMistakes, setShowAllMistakes] = useState(false)
  const showLoader = useMascotGate(loading)

  useEffect(() => {
    if (!user?.userId) return
    let cancelled = false
    void (async () => {
      try {
      const { data: sess } = await db
        .from('study_sessions')
        .select(`
          id, mode, language, topic_id, topic_freeform, status, created_at, last_active_at,
          score, correct_count, total_count, module2_route, module1_correct, module1_total,
          config, ended_reason,
          topic:study_topics ( id, slug, name_en, name_ko )
        `)
        .eq('id', id)
        .eq('student_id', user.userId)
        .maybeSingle()
      if (cancelled) return
      setSession((sess as unknown as SessionRow | null))

      const { data: atts } = await db
        .from('study_attempts')
        .select('id, is_correct, time_spent_seconds, position, question, student_answer')
        .eq('session_id', id)
        // NOT created_at: every full-test session writes its rows in one
        // bulk insert sharing a single timestamp (1 distinct value per
        // session across all 37 live sessions), so ordering by it returns
        // an arbitrary order. `position` is the real delivery order; rows
        // without one fall back to id and render unnumbered.
        .order('position', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      if (cancelled) return
      setAttempts((atts as unknown as AttemptRow[]) ?? [])
      } catch { /* fall through to not-found via finally */ }
      finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, user?.userId])

  if (loading || showLoader) {
    // Studying surface → Raumi (commit-gated).
    return showLoader
      ? <MascotLoader className="min-h-[60vh]" label={t('study.landing.loading')} />
      : <div className="min-h-[60vh]" aria-hidden />
  }

  if (!session) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-14 text-center">
        <p className="text-sm text-gray-500">{t('study.session.notFound')}</p>
        <Link
          href="/mobile/study"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />{t('study.topic.backToStudy')}
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
  // MISSED counts the same unit as the headline score (scored questions),
  // so it reconciles with "6 of 35 correct" directly above it.
  //
  // It does NOT match the review list below, which is per CARD: a
  // Complete-the-Words card is one row but ten scored questions, and
  // unscored pilot items have no scored weight at all. A TOEFL Reading
  // session showed "29 MISSED" above "20 to review" — both correct,
  // counting different things, and impossible for a student to
  // reconcile. Same card-vs-question conflation as the Module 2 banner's
  // phantom "19". The list heading now says how many CARDS it holds
  // rather than implying it accounts for the 29.
  const incorrect = totalItems - correct
  // SAT adaptive: path-weighted 200–800 section band (easy path caps).
  //
  // Gated on the topic being SAT. This used to key off `module2_route`
  // alone, and TOEFL became adaptive too — so a TOEFL Reading session
  // rendered "EST. SCORE 240 · easier module (capped)", a College Board
  // 200-800 section score on a test graded 1-6. A student reasonably
  // reads 240 as their result. The submit route already refuses to emit
  // a TOEFL band precisely because no raw-count -> band conversion
  // exists (see its header note); this screen was inventing one anyway
  // from the wrong exam's curve.
  const isSat = (session.topic?.slug ?? '').startsWith('sat-')
  const satRoute = isSat && (session.module2_route === 'hard' || session.module2_route === 'easy')
    ? session.module2_route
    : null
  // The 4th argument is NOT optional in practice. It defaults to
  // 'reading_writing' (sat-adaptive.ts:139), so every SAT MATH session was
  // scored against the Reading & Writing curve — at 50% correct that is
  // RW ~340-360 where Math is ~430-460, a 90-100 point error presented to
  // the student as their estimated score. submit/route.ts:138 derives the
  // section from the topic slug and passes it, so the post-submit screen
  // was right and this one was wrong: the same number, two values,
  // depending which screen you opened. Third bug in this family.
  const satSection = satSectionFromTopicSlug(session.topic?.slug)
  const satBand = satRoute && attempted
    ? estimateSectionScore(correct, totalItems, satRoute, satSection)
    : null
  // time_spent_seconds is NOT per-question: submit distributes the session
  // elapsed evenly (`elapsedSeconds / questions.length`), and writes NULL for
  // unanswered items. Summing it therefore reports only the answered share —
  // a 54-question session with 1 answer showed "0m" for a ~23 minute sitting.
  // Until the true elapsed is persisted, reconstruct it: every non-null row
  // carries the same per-question value, so value x cards is the original.
  const perQuestionSeconds = Math.max(0, ...attempts.map(a => a.time_spent_seconds ?? 0))
  const totalSeconds = perQuestionSeconds * attempts.length
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

  // `is_correct` is NULL for open-response items (rubric-graded elsewhere),
  // and `!null === true` — so every writing and speaking answer was being
  // listed as a MISTAKE. Compare to false explicitly.
  const mistakes = attempts.filter(a => a.is_correct === false)

  // ---- Full tests render THE result screen, the same component the
  // post-submit view uses.
  //
  // Not "a summary of" the result — the same one. Before this, a finished
  // test looked different depending on whether you had just submitted it
  // or come back to it later, and the two disagreed about the score more
  // than once. Other modes (practice, flashcards, daily challenge) keep
  // the hero + mistakes layout below; nothing here applies to them.
  if (session.mode === 'full_test' && attempts.length > 0) {
    const model = buildResultModel({
      // Derived from the topic slug, by the same helper the post-submit
      // screen runs on the payload's family label.
      family: familyFromTopicSlug(session.topic?.slug),
      actSectionKey: actSectionForSlug(session.topic?.slug ?? '')?.key ?? null,
      // From the SESSION ROW, never counted off the attempt rows: rows are
      // CARDS and these are SCORED QUESTIONS. Counting gives 10/30 where
      // submit recorded 6/35.
      correctCount: correct,
      totalScored: totalItems,
      scorePercent: accuracy,
      cards: attempts.map(a => ({
        question: a.question ?? { prompt: '', type: 'multiple_choice' },
        studentAnswer: a.student_answer ?? null,
        correct: a.is_correct === true,
        // is_correct IS NULL means open response — rubric-graded
        // elsewhere. Distinct from a wrong answer and from a pilot.
        ungraded: a.is_correct === null,
        position: a.position,
      })),
    })
    return (
      <StudyScrollShell
        header={
          <StudyPageHeader
            backHref="/mobile/study"
            backLabel={String(t('study.topic.backToStudy'))}
            icon={Sparkles}
            iconColorClass="text-primary bg-primary/10"
            eyebrow={String(t('study.summary.eyebrow'))}
            title={topicName}
          />
        }
      >
        <div className="-mx-5 -my-6">
          {/* Reopening the result must still say why the test is short.
              Same sentence the post-submit screen showed. */}
          {session.ended_reason === 'app_exited' && (
            <div className="mx-4 mt-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200/70 px-4 py-3">
              <p className="text-[12.5px] text-amber-800 leading-relaxed">
                {t('study.test.exitEndedNotice')}
              </p>
            </div>
          )}
          <TestResultView
            model={model}
            sessionId={id}
            ko={ko}
            sat={satBand ? { score: satBand.score, capped: satBand.route === 'easy' } : null}
            /* The payload is not available on a reopened session, so the
               break index comes from `module1_total` — Module 1's CARD
               count, which IS the index of Module 2's first card. Both
               columns are written together by the routing endpoint, and
               only on an adaptive session, so their presence is the same
               gate as `adaptive && moduleBreakIdx != null`. */
            modules={session.module2_route !== null && session.module1_total !== null
              ? { breakIdx: session.module1_total, module1CorrectCards: session.module1_correct }
              : null}
            footer={
              <section className="space-y-2 pt-2 lg:space-y-0 lg:flex lg:flex-row-reverse lg:items-center lg:justify-start lg:gap-3">
                {session.topic && !session.config?.dailyChallenge && (
                  <Link
                    href={`/mobile/study/topic/${session.topic.slug}`}
                    className={`${studyButtonClass({ variant: 'primary', size: 'lg', fullWidth: true })} lg:w-auto lg:min-w-[240px]`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {/* This branch only renders for mode === 'full_test',
                        so the CTA can name the thing the student just did.
                        The shared 'tryAgain' string says "topic", which is
                        right for practice and flashcards below and wrong
                        here — a mock test is what they came for. */}
                    {String(t('study.summary.tryTestAgain'))}
                  </Link>
                )}
                <Link
                  href="/mobile/study/wrong-notebook"
                  className={`${studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true })} lg:w-auto lg:min-w-[200px]`}
                >
                  {ko ? '오답노트' : 'Wrong notebook'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </section>
            }
          />
        </div>
      </StudyScrollShell>
    )
  }

  return (
    <StudyScrollShell
      header={
        <StudyPageHeader
          backHref="/mobile/study"
          backLabel={String(t('study.topic.backToStudy'))}
          icon={Sparkles}
          iconColorClass="text-primary bg-primary/10"
          eyebrow={String(t('study.summary.eyebrow'))}
          title={modeLabel}
        />
      }
    >
      {/* Hero — score in a big gradient card, with the mascot in the
          top-right giving the numbers a face. Emotional state follows
          accuracy so a hard session doesn't get a cheerful celebrate. */}
      {/* Sections enter with a soft stagger: hero → topic → mistakes →
          CTAs (fill-mode backwards keeps delayed items hidden pre-run). */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${hero.gradient} p-6 text-white shadow-[0_2px_8px_rgba(0,0,0,0.10),0_24px_48px_-16px_rgba(0,0,0,0.32)] animate-fade-in-up`} style={{ animationFillMode: 'both' }}>
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
              <h1 className={`text-[36px] font-bold leading-none tracking-tight tabular-nums ${hero.accent}`}>
                <CountUp value={accuracy} /><span className="text-[24px] opacity-80">%</span>
              </h1>
              <p className={`text-[14px] ${hero.accent} mt-1.5 opacity-90`}>
                {String(t('study.summary.accuracyLine', {
                  correct: String(correct),
                  total: String(totalItems),
                }))}
              </p>
              {satBand && (
                // Adaptive section band — a transparent 200–800 estimate,
                // path-weighted so the easy module reads as capped.
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 ring-1 ring-white/25 px-3 py-1.5 backdrop-blur-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.10em] opacity-90">
                    {ko ? '예상 점수' : 'Est. score'}
                  </span>
                  <span className="text-[15px] font-bold tabular-nums">{satBand.score}</span>
                  <span className="text-[11px] opacity-90">
                    {satBand.route === 'hard'
                      ? (ko ? '· 상위 모듈' : '· harder module')
                      : (ko ? '· 하위 모듈 (상한)' : '· easier module (capped)')}
                  </span>
                </div>
              )}
              <div className={`mt-5 grid grid-cols-3 gap-3 ${hero.accent}`}>
                <Stat icon={CheckCircle2} value={String(correct)} label={String(t('study.summary.correct'))} />
                <Stat icon={XCircle} value={String(incorrect)} label={String(t('study.summary.incorrect'))} />
                {/* The unit is part of the translation, not glued on here —
                    a hardcoded "m" rendered "35m" under a Korean label. */}
                <Stat icon={Clock} value={String(t('study.summary.timeValue', { minutes: totalMinutes }))} label={String(t('study.summary.timeLabel'))} />
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
      <div className="rounded-2xl bg-white ring-1 ring-gray-200 px-4 py-3 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
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
        <section className="animate-fade-in-up" style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-gray-900">
              {/* "N questions to review" — N is CARDS, deliberately not the
                  MISSED stat above, which counts scored questions. Naming the
                  unit is what makes the two numbers reconcilable. */}
              {ko
                ? `다시 볼 문제 ${mistakes.length}개`
                : `${mistakes.length} question${mistakes.length === 1 ? '' : 's'} to review`}
            </h2>
            <Link
              href="/mobile/study/wrong-notebook"
              className="inline-flex items-center gap-0.5 text-[12px] font-medium text-primary hover:text-primary/80"
            >
              {ko ? '오답노트' : 'Wrong notebook'}<ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(showAllMistakes ? mistakes : mistakes.slice(0, 3)).map((m) => (
              <MistakeRow key={m.id} attempt={m} ko={ko} />
            ))}
            {mistakes.length > 3 && (
              // Was a link straight out to the wrong notebook, so the
              // student had to leave this screen to see items 4..N of
              // their own test. Expand in place; the notebook link stays
              // in the header for the cross-session view.
              <button
                type="button"
                onClick={() => setShowAllMistakes(v => !v)}
                aria-expanded={showAllMistakes}
                className="block w-full text-center text-[12.5px] text-primary hover:text-primary/80 py-2 font-medium"
              >
                {showAllMistakes
                  ? (ko ? '접기' : 'Show less')
                  : `${String(t('study.summary.mistakesMore', { count: String(mistakes.length - 3) }))} →`}
              </button>
            )}
          </div>
        </section>
      )}

      {/* CTAs.
          The "try this topic again" button is GONE. It was a link back
          to the topic page dressed as the primary action, which put
          "do that again" in front of a student who had just finished —
          ahead of the per-question re-attempt below, which actually
          re-asks the questions they got wrong. Re-running a whole topic
          is still one tap away from the topic page. */}
      <section className="space-y-2 pt-2 lg:space-y-0 lg:flex lg:flex-row-reverse lg:items-center lg:justify-start lg:gap-3 animate-fade-in-up" style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
        <Link
          href="/mobile/study"
          className={`${studyButtonClass({ variant: 'secondary', size: 'lg', fullWidth: true })} lg:w-auto lg:min-w-[200px]`}
        >
          {String(t('study.summary.backToStudy'))}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </StudyScrollShell>
  )
}

/**
 * Eases 0→value over ~900ms on mount so the score lands as a moment
 * instead of popping in. Respects prefers-reduced-motion (jumps
 * straight to the final number).
 */
function CountUp({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    setShown(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  return <>{shown}</>
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
/**
 * Complete-the-Words stores BOTH sides as a blank-map, not a string:
 * the student's answer is JSON like {"1":"adfad","2":"dhgfdh",...} and
 * `correct_answer` is empty because the key lives in `blanks[]`. The row
 * rendered the raw JSON with an empty green line underneath it — which a
 * student cannot read and cannot learn from. Render both as
 * "1 ous · 2 ification · …" instead.
 */
function formatBlankMap(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s.startsWith('{')) return null
  try {
    const obj = JSON.parse(s) as Record<string, unknown>
    const parts = Object.entries(obj)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([k, v]) => `${k} ${String(v ?? '').trim() || '—'}`)
    return parts.length ? parts.join(' · ') : null
  } catch { return null }
}

function MistakeRow({ attempt, ko }: { attempt: AttemptRow; ko: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const choices = attempt.question?.choices ?? []
  const rawCorrect = attempt.question?.correct_answer ?? ''
  // Fall back to the blanks array — fill_in_blanks has no correct_answer.
  const blanks = (attempt.question as { blanks?: { id: number; answer: string }[] } | null)?.blanks
  const correct = rawCorrect
    || (blanks?.length
      ? blanks.map(b => `${b.id} ${b.answer}`).join(' · ')
      : '')
  const shownStudent = formatBlankMap(attempt.student_answer) ?? attempt.student_answer
  const canReattempt = choices.length >= 2 && !!rawCorrect

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
        <span className="text-rose-700 line-through flex-1 truncate" title={shownStudent ?? undefined}>
          {shownStudent || '—'}
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
