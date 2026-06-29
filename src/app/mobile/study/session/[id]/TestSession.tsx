"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { supabase } from '@/lib/supabase'

interface Question {
  passage?: string | null
  passageGroupId?: string | null
  prompt: string
  /** See generator route schema for full type docs. */
  type: 'multiple_choice' | 'numeric_entry' | 'multi_select' | 'three_choice' | 'quant_comparison'
  choices: string[]
  correct_answer: string
  correct_answers?: string[]
  acceptable_answers?: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
  distractor_rationales?: { choice: string; reason: string }[]
  graphic?: QuestionGraphic | null
}

interface QuestionGraphic {
  type?: string | null
  xLabel?: string | null
  yLabel?: string | null
  points?: unknown[] | null
  series?: unknown[] | null
  bestFit?: unknown
  bars?: unknown[] | null
  values?: unknown[] | null
  rowLabels?: string[] | null
  colLabels?: string[] | null
  cells?: unknown[][] | null
  shape?: string | null
  spec?: unknown
  labels?: unknown
  svg?: string | null
  caption?: string | null
}

interface TestPayload {
  title: string
  timeLimitMinutes: number
  section: string | null
  /** Test family used to pick label style for choice buttons —
   *  KSAT renders ①②③④⑤; everything else renders A B C D (E). */
  family?: string | null
  questions: Question[]
}

interface SubmitResult {
  totalQuestions: number
  correctCount: number
  scorePercent: number
  verdicts: { index: number; correct: boolean; correctAnswer: string }[]
}

/**
 * Full-test mode UI.
 *
 * Three phases:
 *   1. Loading  — fetch the generated test.
 *   2. Taking   — single-question view with prev/next + a question-
 *                 grid sheet for jumping. Countdown timer in the
 *                 header; running out auto-submits whatever the
 *                 student has so far.
 *   3. Reviewing — score summary card + per-question review
 *                 collapsibles so the student can study what they
 *                 missed.
 *
 * Timer state lives in localStorage keyed by session id, so a
 * refresh mid-test resumes from the elapsed-time the page left off.
 */
export function TestSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'

  // Phase machine — splits the old single 'loading' state into three
  // distinct entry phases so we never flash the wrong UI on resume:
  //   detecting → blank/minimal spinner while we ask the DB whether
  //               this session already has a built test.
  //   resuming  → server says we have a cached test; show a neutral
  //               "Loading your test" spinner, NEVER the multi-step
  //               build checklist.
  //   generating → server has no cached test; show full
  //               GenerationProgress with phase events.
  // taking/submitting/reviewing/error unchanged.
  const [phase, setPhase] = useState<
    'detecting' | 'resuming' | 'generating' | 'taking' | 'submitting' | 'reviewing' | 'error'
  >('detecting')
  const [test, setTest] = useState<TestPayload | null>(null)
  const [answers, setAnswers] = useState<(string | null)[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [gridOpen, setGridOpen] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  /** Generation progress — populated by the NDJSON event stream from
   *  /api/study/test/generate. Each phase event carries an i18n key
   *  and an integer percent. Null until the first event arrives. */
  const [progress, setProgress] = useState<{ name: string; labelKey: string; percent: number } | null>(null)

  // Timer plumbing. startedAt lives in localStorage so a refresh
  // doesn't reset elapsed; expiresAt is derived from
  // startedAt + timeLimitMinutes. We tick a re-render every second
  // to update the countdown display.
  const startedAtRef = useRef<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // ── Phase 1: load (or resume) ───────────────────────────────────
  // Streams NDJSON events from the generator route: phase events
  // update the progress bar, result event hands over the test payload,
  // error event drops us to the error branch.
  const load = useCallback(async () => {
    // Phase 1: detect whether this is a resume or a fresh build by
    // asking the DB for generation_status. We MUST do this before
    // showing any loading UI — otherwise the user sees a flash of
    // GenerationProgress ("Writing your questions…") even when the
    // test is already built and we're just fetching it from cache.
    // Default to 'generating' on error so we don't silently hide
    // legitimate generation progress.
    setPhase('detecting')
    let isResume = false
    try {
      const { data: pre } = await supabase
        .from('study_sessions')
        .select('generation_status')
        .eq('id', sessionId)
        .maybeSingle()
      // 'ready' = built; null = freshly created session that hasn't
      // been generated yet; 'pending' = generation in flight on
      // another tab (we'll join that stream and show progress).
      // 'failed' = treat as fresh attempt so the user can retry.
      isResume = pre?.generation_status === 'ready'
    } catch { /* fall through to 'generating' */ }
    setPhase(isResume ? 'resuming' : 'generating')
    setProgress({ name: 'starting', labelKey: 'study.test.progress.starting', percent: 0 })
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let payload: TestPayload | null = null
      let streamError = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let event: { type: string; [k: string]: unknown }
          try { event = JSON.parse(trimmed) } catch { continue }
          if (event.type === 'phase') {
            setProgress({
              name: String(event.name ?? ''),
              labelKey: String(event.label ?? ''),
              percent: Math.max(0, Math.min(100, Number(event.percent ?? 0))),
            })
          } else if (event.type === 'result') {
            payload = event.test as TestPayload
          } else if (event.type === 'error') {
            streamError = true
          }
        }
      }
      if (streamError || !payload) throw new Error()

      setTest(payload)
      setAnswers(new Array(payload.questions.length).fill(null))

      const storageKey = `study:test:${sessionId}:startedAt`
      const stored = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      const startedAt = stored ? parseInt(stored, 10) : Date.now()
      if (!stored && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, String(startedAt))
      }
      startedAtRef.current = startedAt
      setPhase('taking')
    } catch {
      setPhase('error')
    }
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  // Re-render every second while taking so the timer ticks down.
  useEffect(() => {
    if (phase !== 'taking') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [phase])

  /** Surfaces the actual submit error so the student knows what went
   *  wrong instead of seeing the Submit button silently do nothing. */
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Confirm-before-submit dialog: opens when the student presses
   *  Submit, blocks the actual POST until they confirm. */
  const [confirmOpen, setConfirmOpen] = useState(false)

  // ── Submission path (used by manual Submit + timer expiry) ─────
  const submit = useCallback(async () => {
    if (!test || phase !== 'taking') return
    setSubmitError(null)
    setPhase('submitting')
    try {
      const elapsedSeconds = startedAtRef.current
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        : test.timeLimitMinutes * 60
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          questions: test.questions,
          answers,
          elapsedSeconds,
        }),
      })
      if (!res.ok) {
        // Pull the actual error message from the response so the user
        // sees something specific instead of a silent no-op.
        let detail = `HTTP ${res.status}`
        try {
          const errJson = await res.json() as { error?: string; details?: string }
          detail = errJson.error
            ? (errJson.details ? `${errJson.error} — ${errJson.details}` : errJson.error)
            : detail
        } catch { /* not JSON */ }
        throw new Error(detail)
      }
      const json = await res.json() as SubmitResult
      setResult(json)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`study:test:${sessionId}:startedAt`)
      }
      setPhase('reviewing')
    } catch (err) {
      console.error('[TestSession] submit failed', err)
      setSubmitError((err as Error).message || 'submit failed')
      // Drop back to taking so the student can retry instead of
      // losing the test to a transient error.
      setPhase('taking')
    }
  }, [test, phase, answers, sessionId])

  // Auto-submit when the timer hits zero.
  const expiresAt = useMemo(() => {
    if (!test || !startedAtRef.current) return null
    return startedAtRef.current + test.timeLimitMinutes * 60_000
  }, [test])
  useEffect(() => {
    if (phase !== 'taking' || !expiresAt) return
    if (now >= expiresAt) void submit()
  }, [now, expiresAt, phase, submit])

  // ── Render branches ─────────────────────────────────────────────
  // 'detecting' — DB ping in flight. Minimal neutral spinner so we
  // never flash a misleading "we're building your test" UI before
  // we know what's actually happening.
  if (phase === 'detecting') {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }
  // 'resuming' — server has a cached test; we're just fetching it.
  // Show a friendly "Loading your test" message, NOT the multi-step
  // build checklist (which implies fresh generation).
  if (phase === 'resuming') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-gray-600">{String(t('study.test.loadingTest'))}</p>
      </div>
    )
  }
  // 'generating' — fresh build from scratch. Show the full
  // GenerationProgress checklist with phase events from the stream.
  if (phase === 'generating') {
    return <GenerationProgress progress={progress} t={t} />
  }

  if (phase === 'error' || !test) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-sm text-gray-600">{t('study.test.generateFailed')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          {t('study.test.tryAgain')}
        </button>
      </div>
    )
  }

  if (phase === 'reviewing' && result) {
    return <ReviewView test={test} answers={answers} result={result} ko={ko} sessionId={sessionId} />
  }

  // phase === 'taking' or 'submitting'
  const q = test.questions[currentIdx]
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : 0
  const answered = answers.filter(a => a != null).length

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Sticky timer + progress strip */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between">
        <button
          type="button"
          onClick={() => setGridOpen(v => !v)}
          className="text-xs text-gray-600 inline-flex items-center gap-1"
        >
          {t('study.test.questionN', { current: String(currentIdx + 1), total: String(test.questions.length) })}
          {gridOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <div className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
          remainingMs < 60_000 ? 'text-rose-600 font-bold' : remainingMs < 5 * 60_000 ? 'text-amber-700' : 'text-gray-600'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          {formatTime(remainingMs)}
        </div>
      </div>

      {/* Question grid sheet — slide-down picker for quick jumps */}
      {gridOpen && (
        <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/60 px-3 py-3">
          <div className="grid grid-cols-8 gap-1.5">
            {test.questions.map((_, i) => {
              const isCurrent = i === currentIdx
              const isAnswered = answers[i] != null
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setCurrentIdx(i); setGridOpen(false) }}
                  className={`h-8 rounded-md text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white'
                      : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Question + answer choices */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Difficulty chip — hidden for SAT (the customization sheet
            already locks SAT to challenge and hides the picker, so
            surfacing per-item difficulty here would be inconsistent).
            Other families still show it so students can pace based on
            difficulty mix. */}
        {test.family !== 'sat' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {t(`study.practice.difficulty.${q.difficulty}`)}
            </span>
          </div>
        )}
        {q.passage && (() => {
          // Passage-group header: when the test has shared passages
          // (TOEFL/IELTS/ACT Reading), show "Passage X — Question Y
          // of Z" so the student knows where they are in the section.
          const groupInfo = passageGroupInfo(test.questions, currentIdx)
          return (
            <>
              {groupInfo && (
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.10em] text-primary">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10">
                    {ko
                      ? `지문 ${groupInfo.groupIndex} / ${groupInfo.totalGroups}`
                      : `Passage ${groupInfo.groupIndex} of ${groupInfo.totalGroups}`}
                  </span>
                  <span className="text-gray-500 font-normal normal-case tracking-normal">
                    {ko
                      ? `이 지문의 ${groupInfo.indexInGroup} / ${groupInfo.totalInGroup}번 문항`
                      : `Question ${groupInfo.indexInGroup} of ${groupInfo.totalInGroup} in this passage`}
                  </span>
                </div>
              )}
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 leading-relaxed">
                <PassageParagraphs text={q.passage} />
              </div>
            </>
          )
        })()}
        <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap mb-4">
          {q.prompt}
        </p>
        {q.graphic && <QuestionGraphicView graphic={q.graphic} />}
        {q.type === 'numeric_entry' ? (
          // SAT Math SPR / GRE NE / KSAT 단답형: free-text numeric input.
          <div className="space-y-2">
            <label className="block">
              <span className="block text-[12px] uppercase tracking-[0.10em] text-gray-500 mb-1.5">
                {ko ? '답 입력' : 'Enter answer'}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={answers[currentIdx] ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setAnswers(prev => {
                    const next = [...prev]
                    next[currentIdx] = val
                    return next
                  })
                }}
                placeholder={ko ? '예: 12, 3.44, 5/8' : 'e.g. 12, 3.44, 5/8'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <p className="text-[11px] text-gray-500">
              {ko ? '정수·소수·분수 모두 입력 가능합니다.' : 'Integers, decimals, or fractions are all accepted.'}
            </p>
          </div>
        ) : q.type === 'multi_select' ? (
          // GRE SE / RC "select all that apply": checkboxes with target count.
          (() => {
            const targetCount = q.correct_answers?.length ?? 2
            const current = (() => {
              const raw = answers[currentIdx]
              if (!raw) return [] as string[]
              try { return JSON.parse(raw) as string[] } catch { return [] }
            })()
            const toggle = (choice: string) => {
              const next = current.includes(choice)
                ? current.filter(c => c !== choice)
                : [...current, choice]
              setAnswers(prev => {
                const out = [...prev]
                out[currentIdx] = JSON.stringify(next)
                return out
              })
            }
            return (
              <>
                <p className="text-[12px] text-amber-700 mb-2 font-medium">
                  {ko ? `정확히 ${targetCount}개 선택` : `Select exactly ${targetCount}`}
                </p>
                <div className="space-y-2">
                  {q.choices.map(choice => {
                    const selected = current.includes(choice)
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => toggle(choice)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                          selected
                            ? 'border-primary bg-primary/5 text-gray-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 ${selected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'}`}>
                          {selected && <CheckCircle2 className="w-full h-full text-white" />}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()
        ) : (
          // multiple_choice / three_choice / quant_comparison — all
          // render the same way: vertical list of choice buttons with
          // a test-format-aware label prefix (KSAT ①②③④⑤, others A B C D).
          <div className="space-y-2">
            {q.choices.map((choice, i) => {
              const selected = answers[currentIdx] === choice
              const label = choiceLabel(test.family, i)
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    setAnswers(prev => {
                      const next = [...prev]
                      next[currentIdx] = choice
                      return next
                    })
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-start gap-3 ${
                    selected
                      ? 'border-primary bg-primary/5 text-gray-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className={`flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-md text-[12.5px] font-semibold tabular-nums ${
                    selected ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {label}
                  </span>
                  <span className="flex-1">{choice}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — prev / next / submit */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
          disabled={currentIdx === 0}
          className="h-11 w-11 rounded-full bg-white border border-gray-200 text-gray-700 inline-flex items-center justify-center disabled:opacity-40"
          aria-label={String(t('study.test.previous'))}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {currentIdx === test.questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={phase === 'submitting'}
            className="flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {phase === 'submitting'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : null}
            {answered < test.questions.length
              ? t('study.test.submitWithUnanswered', { count: String(test.questions.length - answered) })
              : t('study.test.submit')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIdx(i => Math.min(test.questions.length - 1, i + 1))}
            className="flex-1 h-11 rounded-full bg-gray-900 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
          >
            {t('study.test.next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Submit-failed banner — surfaces the actual error instead of
          silently reverting to the test view. Auto-clears when the
          student edits any answer (handled implicitly: state change
          re-renders without the banner if submitError is cleared). */}
      {submitError && (
        <div className="absolute inset-x-3 bottom-20 z-40 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 shadow-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-rose-900">
                {String(t('study.test.submitError.title'))}
              </div>
              <div className="text-[12px] text-rose-800 mt-0.5 break-words">{submitError}</div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-600 hover:text-rose-800 text-[11px] font-medium px-1"
            >
              {String(t('study.test.submitError.dismiss'))}
            </button>
          </div>
        </div>
      )}

      {/* Confirm-before-submit modal — warns about unanswered and
          asks "are you sure?" before locking in the score. Empty
          answers grade as incorrect, so this is a real choice point. */}
      {confirmOpen && (
        <SubmitConfirmModal
          unanswered={test.questions.length - answered}
          totalQuestions={test.questions.length}
          t={t}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); void submit() }}
        />
      )}
    </div>
  )
}

/** Pre-submit confirmation. Highlights unanswered count so students
 *  don't accidentally lock in a score they meant to revisit. */
function SubmitConfirmModal({
  unanswered, totalQuestions, t, onCancel, onConfirm,
}: {
  unanswered: number
  totalQuestions: number
  /** UI-language translator (from useTranslation) — not the test's
   *  content language, which is locked per family. A Korean user
   *  taking SAT sees Korean chrome via this t(). */
  t: (key: string, params?: Record<string, string | number>) => string | string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  const bodyKey = unanswered === 0
    ? 'study.test.submitConfirm.bodyAllAnswered'
    : unanswered === 1
      ? 'study.test.submitConfirm.bodyUnansweredOne'
      : 'study.test.submitConfirm.bodyUnansweredMany'
  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] max-w-sm mx-auto rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] animate-slide-up"
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {String(t('study.test.submitConfirm.titleSubmit'))}
          </h3>
          <p className="text-[13.5px] text-gray-600 mt-1.5 leading-relaxed">
            {String(t(bodyKey, { count: unanswered, total: totalQuestions }))}
          </p>
        </div>
        <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all"
          >
            {String(t('study.test.submitConfirm.cancel'))}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-all ${
              unanswered > 0
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {String(t('study.test.submitConfirm.confirm'))}
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * Post-submit review. Shows the score + a per-question accordion so
 * the student can revisit what they missed without re-running the
 * whole test.
 */
function ReviewView({
  test, answers, result, ko, sessionId,
}: { test: TestPayload; answers: (string | null)[]; result: SubmitResult; ko: boolean; sessionId: string }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-5 py-6 space-y-5">
        {/* Summary CTA — links to the dedicated summary page with
            mistake review, streak update, and "try again" surface. */}
        <Link
          href={`/mobile/study/session/${sessionId}/summary`}
          className="block rounded-2xl bg-gradient-to-br from-primary/[0.08] via-indigo-50/40 to-white ring-1 ring-primary/25 p-4 hover:shadow-[0_2px_8px_-2px_rgba(40,133,232,0.18)] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-primary to-indigo-600 text-white flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-primary/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold text-gray-900 leading-tight">
                {String(t('study.test.viewSummaryTitle'))}
              </div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                {String(t('study.test.viewSummarySubtitle'))}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </div>
        </Link>

        {/* Score summary */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
            {t('study.test.resultEyebrow')}
          </p>
          <h2 className="text-3xl font-semibold text-gray-900 tabular-nums">
            {result.correctCount} / {result.totalQuestions}
            <span className="text-base text-gray-500 ml-2">({result.scorePercent}%)</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`study.test.resultMessage.${
              result.scorePercent >= 85 ? 'excellent' :
              result.scorePercent >= 65 ? 'solid' :
              result.scorePercent >= 40 ? 'keepGoing' : 'startOver'
            }`)}
          </p>
        </div>

        {/* Per-question review accordion */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2 px-1">
            {t('study.test.reviewTitle')}
          </h3>
          <div className="space-y-2">
            {test.questions.map((q, i) => {
              const verdict = result.verdicts[i]
              const studentAnswer = answers[i]
              const isOpen = expanded === i
              return (
                <div
                  key={i}
                  className={`rounded-xl border bg-white overflow-hidden ${
                    verdict.correct ? 'border-gray-200' : 'border-rose-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(prev => prev === i ? null : i)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {verdict.correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      : studentAnswer == null
                        ? <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        {t('study.test.questionN', { current: String(i + 1), total: String(test.questions.length) })}
                      </div>
                      <div className="text-sm text-gray-900 line-clamp-2 mt-0.5">
                        {q.prompt}
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3 text-sm">
                      {q.passage && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800">
                          <PassageParagraphs text={q.passage} />
                        </div>
                      )}
                      <p className="text-gray-900 whitespace-pre-wrap">{q.prompt}</p>
                      {q.graphic && <QuestionGraphicView graphic={q.graphic} />}
                      <div className="space-y-1.5 mt-2">
                        {q.choices.map(choice => {
                          const isCorrect = choice === q.correct_answer
                          const isStudentPick = choice === studentAnswer
                          // Lookup the per-distractor rationale by
                          // choice text. Only shown on WRONG choices
                          // (correct choice's rationale lives in the
                          // single `explanation` field below).
                          const distractorReason = !isCorrect
                            ? q.distractor_rationales?.find(d => d.choice === choice)?.reason
                            : undefined
                          return (
                            <div
                              key={choice}
                              className={`px-3 py-2 rounded-lg text-xs ${
                                isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                  : isStudentPick
                                    ? 'bg-rose-50 text-rose-900 border border-rose-200'
                                    : 'bg-gray-50 text-gray-700 border border-gray-100'
                              }`}
                            >
                              <div>
                                {choice}
                                {isCorrect && <span className="ml-2 font-semibold">{ko ? '정답' : 'Correct'}</span>}
                                {isStudentPick && !isCorrect && <span className="ml-2 font-semibold">{ko ? '내 답' : 'Your answer'}</span>}
                              </div>
                              {distractorReason && (
                                <div className={`mt-1 text-[11px] leading-relaxed ${
                                  isStudentPick ? 'text-rose-800' : 'text-gray-600'
                                }`}>
                                  <span className="font-semibold">{ko ? '오답 이유: ' : 'Why wrong: '}</span>
                                  {distractorReason}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {studentAnswer == null && (
                          <div className="px-3 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200">
                            {ko ? '답하지 않음' : 'Not answered'}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mt-2">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <Link
          href="/mobile/study"
          className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
        >
          {t('study.test.backToStudy')}
        </Link>
      </div>
    </div>
  )
}

/** Renders a passage as one `<p>` per paragraph, with first-line
 *  indent on every paragraph after the first. Splits on `\n\n` (the
 *  encoding the generator uses). Single-paragraph passages render
 *  flat (no indent) since there's nothing to differentiate. Multi-
 *  paragraph passages get an indent on paragraphs 2+ so the reader
 *  can immediately see "this is a new paragraph" without having to
 *  notice the vertical gap. */
/** Visual asset renderer for math + data questions. Restyled to
 *  match the College Board's SAT PDF aesthetic: pure black strokes
 *  on white, thin axes, sans-serif labels, no color fills, no grid
 *  decoration. Dispatches on `graphic.type`; each branch tolerates
 *  missing fields and falls through to the rawSvg / caption-only
 *  fallback so a malformed graphic never blocks the question. */
function QuestionGraphicView({ graphic }: { graphic: QuestionGraphic | null | undefined }) {
  if (!graphic || !graphic.type) {
    // Edge case — model emitted a graphic.svg but forgot to set type
    if (graphic?.svg) return <RawSvgFigure svg={graphic.svg} caption={graphic.caption ?? undefined} />
    return null
  }
  const t = graphic.type.toLowerCase()

  // ─ Two-way table (PSD: conditional probability items) ──────────
  if (t === 'twowaytable' || t === 'table') {
    const rows = (graphic.rowLabels ?? []).filter(Boolean)
    const cols = (graphic.colLabels ?? []).filter(Boolean)
    const cells = (graphic.cells ?? []) as (number | string)[][]
    if (rows.length === 0 && cells.length === 0) return null
    return (
      <figure className="my-3 mx-auto max-w-md">
        <table className="w-full text-[12px] text-black border border-black border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 border border-black bg-white font-normal" />
              {cols.map((c, i) => (
                <th key={i} className="px-2 py-1.5 border border-black font-semibold text-center bg-white">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rowLabel, r) => (
              <tr key={r}>
                <td className="px-2 py-1.5 border border-black font-semibold bg-white">{rowLabel}</td>
                {(cells[r] ?? []).map((v, c) => (
                  <td key={c} className="px-2 py-1.5 border border-black text-right tabular-nums bg-white">
                    {String(v ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-1.5">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Bar chart / histogram ───────────────────────────────────────
  if (t === 'bar' || t === 'histogram') {
    const bars = ((graphic.bars ?? []) as Array<{ label?: string; value?: number }>).filter(b => b && typeof b.value === 'number')
    if (bars.length === 0) return null
    const maxVal = Math.max(...bars.map(b => b.value ?? 0), 1)
    const W = 300, H = 180
    const padL = 32, padB = 28, padT = 10, padR = 10
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const barW = innerW / bars.length
    // Build clean y-axis ticks at 0, max/4, max/2, 3max/4, max
    const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal]
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* y-axis ticks + gridlines (light) */}
          {ticks.map((v, i) => {
            const y = padT + innerH - (v / maxVal) * innerH
            return (
              <g key={i}>
                <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="black" strokeWidth={0.75} />
                <text x={padL - 5} y={y + 3} fontSize="9" textAnchor="end" fill="black">
                  {Number.isInteger(v) ? v : v.toFixed(1)}
                </text>
              </g>
            )
          })}
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {bars.map((b, i) => {
            const h = ((b.value ?? 0) / maxVal) * innerH
            const x = padL + i * barW + barW * 0.2
            const y = H - padB - h
            return (
              <g key={i}>
                <rect x={x} y={y} width={barW * 0.6} height={h} fill="black" />
                <text x={x + barW * 0.3} y={H - padB + 11} fontSize="9" textAnchor="middle" fill="black">
                  {b.label ?? ''}
                </text>
              </g>
            )
          })}
          {graphic.xLabel && (
            <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>
          )}
          {graphic.yLabel && (
            <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>
          )}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-1">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Scatter plot / line graph ───────────────────────────────────
  if (t === 'scatter' || t === 'linegraph' || t === 'line') {
    const W = 300, H = 220
    const padL = 32, padB = 28, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const seriesList: Array<{ label?: string; points: Array<[number, number]> }> = []
    if (t === 'scatter') {
      const pts: Array<[number, number]> = []
      ;(graphic.points ?? []).forEach(p => {
        if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])])
        else if (p && typeof p === 'object' && 'x' in p) pts.push([Number((p as { x: number }).x), Number((p as { y: number }).y)])
      })
      seriesList.push({ points: pts })
    } else {
      ((graphic.series ?? []) as Array<{ label?: string; points?: Array<[number, number]> }>).forEach(s => {
        const pts: Array<[number, number]> = []
        ;(s.points ?? []).forEach(p => { if (Array.isArray(p) && p.length >= 2) pts.push([Number(p[0]), Number(p[1])]) })
        seriesList.push({ label: s.label, points: pts })
      })
    }
    const allPts = seriesList.flatMap(s => s.points)
    if (allPts.length === 0) return null
    const xs = allPts.map(p => p[0]); const ys = allPts.map(p => p[1])
    const xMin = Math.min(...xs, 0); const xMax = Math.max(...xs)
    const yMin = Math.min(...ys, 0); const yMax = Math.max(...ys)
    const xR = (xMax - xMin) || 1; const yR = (yMax - yMin) || 1
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    // Build tick labels — 5 evenly-spaced on each axis
    const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (xR * i) / 4)
    const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yR * i) / 4)
    // Best-fit line if provided
    const bestFit = graphic.bestFit as { m?: number; b?: number } | undefined
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {/* axes */}
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="black" strokeWidth={1} />
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="black" strokeWidth={1} />
          {/* x ticks */}
          {xTicks.map((v, i) => (
            <g key={i}>
              <line x1={sx(v)} y1={H - padB} x2={sx(v)} y2={H - padB + 3} stroke="black" strokeWidth={0.75} />
              <text x={sx(v)} y={H - padB + 12} fontSize="8" textAnchor="middle" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* y ticks */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={padL - 3} y1={sy(v)} x2={padL} y2={sy(v)} stroke="black" strokeWidth={0.75} />
              <text x={padL - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{fmtTick(v)}</text>
            </g>
          ))}
          {/* best-fit line — drawn first so points sit on top */}
          {bestFit && typeof bestFit.m === 'number' && typeof bestFit.b === 'number' && (
            <line x1={sx(xMin)} y1={sy(bestFit.m * xMin + bestFit.b)} x2={sx(xMax)} y2={sy(bestFit.m * xMax + bestFit.b)} stroke="black" strokeWidth={0.75} strokeDasharray="3 2" />
          )}
          {/* points / line series */}
          {seriesList.map((s, si) => (
            <g key={si}>
              {t !== 'scatter' && s.points.length > 1 && (
                <polyline
                  points={s.points.map(p => `${sx(p[0])},${sy(p[1])}`).join(' ')}
                  fill="none" stroke="black" strokeWidth={1}
                />
              )}
              {s.points.map((p, i) => (
                <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.5} fill="black" />
              ))}
            </g>
          ))}
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
          {graphic.yLabel && <text x={10} y={padT + innerH / 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic" transform={`rotate(-90 10 ${padT + innerH / 2})`}>{graphic.yLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-1">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Dot plot ────────────────────────────────────────────────────
  if (t === 'dotplot') {
    const values = ((graphic.values ?? []) as number[]).map(Number).filter(n => !isNaN(n))
    if (values.length === 0) return null
    // Stack dots by integer value
    const counts: Record<string, number> = {}
    values.forEach(v => { counts[String(v)] = (counts[String(v)] ?? 0) + 1 })
    const keys = Object.keys(counts).map(Number).sort((a, b) => a - b)
    const minK = keys[0], maxK = keys[keys.length - 1]
    const maxStack = Math.max(...Object.values(counts))
    const W = 300, H = 160
    const padL = 24, padB = 26, padT = 10, padR = 12
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const range = (maxK - minK) || 1
    const sx = (v: number) => padL + ((v - minK) / range) * innerW
    const dotR = Math.min(5, innerH / (maxStack + 1) / 2.4)
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto bg-white">
          {keys.map((k, i) => (
            <g key={i}>
              {Array.from({ length: counts[String(k)] }).map((_, j) => (
                <circle key={j} cx={sx(k)} cy={H - padB - dotR - j * (dotR * 2 + 1)} r={dotR} fill="black" />
              ))}
              <text x={sx(k)} y={H - padB + 12} fontSize="9" textAnchor="middle" fill="black">{k}</text>
            </g>
          ))}
          <line x1={padL - 6} y1={H - padB} x2={W - padR + 6} y2={H - padB} stroke="black" strokeWidth={1} />
          {graphic.xLabel && <text x={padL + innerW / 2} y={H - 2} fontSize="10" textAnchor="middle" fill="black" fontStyle="italic">{graphic.xLabel}</text>}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-1">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Coordinate plane (functions, points, lines) ─────────────────
  if (t === 'coordinateplane' || t === 'coordinate' || t === 'plane') {
    const W = 280, H = 280
    const padL = 30, padB = 30, padT = 14, padR = 14
    const innerW = W - padL - padR
    const innerH = H - padT - padB
    const pts = ((graphic.points ?? []) as Array<{ x: number; y: number; label?: string }>)
      .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    const lines = ((graphic.spec as { lines?: Array<{ m: number; b: number }> } | undefined)?.lines
      ?? (graphic as unknown as { lines?: Array<{ m: number; b: number }> }).lines ?? [])
    const xVals = pts.map(p => p.x)
    const yVals = pts.map(p => p.y)
    const xMin = Math.min(-5, ...xVals); const xMax = Math.max(5, ...xVals)
    const yMin = Math.min(-5, ...yVals); const yMax = Math.max(5, ...yVals)
    const xR = xMax - xMin; const yR = yMax - yMin
    const sx = (x: number) => padL + ((x - xMin) / xR) * innerW
    const sy = (y: number) => padT + innerH - ((y - yMin) / yR) * innerH
    const xOrigin = sx(0), yOrigin = sy(0)
    return (
      <figure className="my-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm mx-auto bg-white">
          {/* grid */}
          {Array.from({ length: Math.floor(xR) + 1 }).map((_, i) => {
            const v = Math.ceil(xMin) + i
            return <line key={`vg${i}`} x1={sx(v)} y1={padT} x2={sx(v)} y2={H - padB} stroke="#d4d4d4" strokeWidth={0.4} />
          })}
          {Array.from({ length: Math.floor(yR) + 1 }).map((_, i) => {
            const v = Math.ceil(yMin) + i
            return <line key={`hg${i}`} x1={padL} y1={sy(v)} x2={W - padR} y2={sy(v)} stroke="#d4d4d4" strokeWidth={0.4} />
          })}
          {/* axes */}
          <line x1={padL} y1={yOrigin} x2={W - padR} y2={yOrigin} stroke="black" strokeWidth={1} />
          <line x1={xOrigin} y1={padT} x2={xOrigin} y2={H - padB} stroke="black" strokeWidth={1} />
          {/* tick labels */}
          {[-4, -2, 2, 4].map(v => v >= xMin && v <= xMax && (
            <text key={`xt${v}`} x={sx(v)} y={yOrigin + 11} fontSize="8" textAnchor="middle" fill="black">{v}</text>
          ))}
          {[-4, -2, 2, 4].map(v => v >= yMin && v <= yMax && (
            <text key={`yt${v}`} x={xOrigin - 5} y={sy(v) + 3} fontSize="8" textAnchor="end" fill="black">{v}</text>
          ))}
          {/* lines */}
          {lines.map((ln, i) => (
            <line key={i} x1={sx(xMin)} y1={sy(ln.m * xMin + ln.b)} x2={sx(xMax)} y2={sy(ln.m * xMax + ln.b)} stroke="black" strokeWidth={1} />
          ))}
          {/* points */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={2.5} fill="black" />
              {p.label && <text x={sx(p.x) + 5} y={sy(p.y) - 4} fontSize="9" fill="black" fontWeight="600">{p.label}</text>}
            </g>
          ))}
        </svg>
        {graphic.caption && <figcaption className="text-[11px] text-black text-center italic mt-1">{graphic.caption}</figcaption>}
      </figure>
    )
  }

  // ─ Raw SVG escape hatch (geometry, irregular figures) ──────────
  if (t === 'rawsvg' || graphic.svg) {
    return <RawSvgFigure svg={graphic.svg ?? ''} caption={graphic.caption ?? undefined} />
  }

  // ─ Caption-only fallback ───────────────────────────────────────
  return graphic.caption ? (
    <div className="my-3 px-3 py-2 text-[11px] text-black text-center italic">
      [{graphic.caption}]
    </div>
  ) : null
}

function RawSvgFigure({ svg, caption }: { svg: string; caption?: string }) {
  if (!svg) return null
  return (
    <figure className="my-3 flex flex-col items-center">
      <div
        className="max-w-xs w-full bg-white [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[280px]"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption && <figcaption className="text-[11px] text-black text-center italic mt-1">{caption}</figcaption>}
    </figure>
  )
}

function fmtTick(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(Math.abs(v) < 1 ? 2 : 1)
}

function PassageParagraphs({ text }: { text: string }) {
  // Split on one-or-more blank lines. Trim each paragraph so leading
  // whitespace from the model doesn't fight the indent we're adding.
  const paragraphs = text.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length <= 1) {
    // No paragraph breaks — render with whitespace-pre-wrap so any
    // intra-paragraph line breaks the model emits still show.
    return <p className="whitespace-pre-wrap">{text}</p>
  }
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="whitespace-pre-wrap"
          // First paragraph flush left; subsequent paragraphs get a
          // first-line indent. Bumped from 2em → 2.5em and space-y
          // 2 → 3 because the previous spacing was too tight for
          // students to perceive paragraph breaks at a glance.
          style={i === 0 ? undefined : { textIndent: '2.5em' }}
        >
          {p}
        </p>
      ))}
    </div>
  )
}

/** Test-format-aware choice label. KSAT uses circled digits ①-⑤,
 *  everything else uses Latin letters A-F. Falls back to numeric
 *  index if `family` is unknown or index out of range. */
function choiceLabel(family: string | null | undefined, index: number): string {
  if (family === 'ksat') {
    const circled = ['①', '②', '③', '④', '⑤', '⑥']
    return circled[index] ?? `${index + 1}.`
  }
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']
  return letters[index] ?? `${index + 1}.`
}

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Compute passage-group context for the current question — used to
 *  show "Passage X — Question Y of Z in this passage" labels on
 *  shared-passage tests (TOEFL/IELTS/ACT Reading). Returns null when
 *  the test has no passage groups or the current question is
 *  ungrouped. */
function passageGroupInfo(questions: Question[], currentIdx: number): {
  groupIndex: number
  totalGroups: number
  indexInGroup: number
  totalInGroup: number
} | null {
  const currentGroupId = questions[currentIdx]?.passageGroupId
  if (!currentGroupId) return null
  // Walk the list in order. Each new groupId increments groupIndex.
  // Within a group, count items to find this question's position.
  const groupOrder: string[] = []
  for (const q of questions) {
    const id = q.passageGroupId
    if (id && !groupOrder.includes(id)) groupOrder.push(id)
  }
  const totalGroups = groupOrder.length
  if (totalGroups < 2) return null // not worth showing for single group
  const groupIndex = groupOrder.indexOf(currentGroupId) + 1
  const inGroup = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => q.passageGroupId === currentGroupId)
  const totalInGroup = inGroup.length
  const indexInGroup = inGroup.findIndex(({ i }) => i === currentIdx) + 1
  return { groupIndex, totalGroups, indexInGroup, totalInGroup }
}

/** Stepped progress UI driven by the NDJSON event stream from the
 *  generator route. Each step lights up when the server emits its
 *  phase event; the progress bar tracks the carried percent. */
const PROGRESS_STEPS: { name: string; labelKey: string; minPercent: number }[] = [
  { name: 'format', labelKey: 'study.test.progress.format', minPercent: 5 },
  { name: 'drafting_questions', labelKey: 'study.test.progress.draftingQuestions', minPercent: 15 },
  { name: 'drafting_hard', labelKey: 'study.test.progress.draftingHard', minPercent: 40 },
  { name: 'verifying', labelKey: 'study.test.progress.verifying', minPercent: 60 },
  { name: 'assembling', labelKey: 'study.test.progress.assembling', minPercent: 92 },
  { name: 'done', labelKey: 'study.test.progress.done', minPercent: 100 },
]

function GenerationProgress({
  progress, t,
}: {
  progress: { name: string; labelKey: string; percent: number } | null
  t: (key: string) => string | string[]
}) {
  const percent = progress?.percent ?? 0
  const activeStepIndex = progress
    ? PROGRESS_STEPS.findIndex(s => s.name === progress.name)
    : -1
  // Special-case the polling stream — when the client connects to a
  // session whose server-side generation is already in flight on a
  // prior request, we get 'resuming' phase events. Tell the user
  // we're waiting for the existing run, not starting a new one.
  const isResuming = progress?.name === 'resuming'
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">
            {String(t('study.test.progress.title'))}
          </h2>
          <p className="text-[12.5px] text-gray-500 mt-1">
            {String(t('study.test.progress.subtitle'))}
          </p>
        </div>

        {isResuming && (
          <div className="mb-4 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-3 py-2.5 text-[12.5px] text-amber-900 leading-relaxed">
            {String(t('study.test.progress.resuming'))}
          </div>
        )}

        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="space-y-2.5">
          {PROGRESS_STEPS.filter(s => s.name !== 'done').map((step, i) => {
            const done = activeStepIndex > i || percent >= 100
            const active = activeStepIndex === i && percent < 100
            return (
              <li key={step.name} className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  done ? 'bg-primary text-white' : active ? 'bg-primary/15 ring-2 ring-primary/30' : 'bg-gray-100'
                }`}>
                  {done
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : active
                      ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
                      : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                </div>
                <span className={`text-[13.5px] ${
                  done ? 'text-gray-500' : active ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}>
                  {String(t(step.labelKey))}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
