"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, RefreshCw, ArrowRight, ArrowLeft, Clock, CheckCircle2,
  XCircle, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

interface Question {
  prompt: string
  type: 'multiple_choice'
  choices: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
}

interface TestPayload {
  title: string
  timeLimitMinutes: number
  section: string | null
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

  const [phase, setPhase] = useState<'loading' | 'taking' | 'submitting' | 'reviewing' | 'error'>('loading')
  const [test, setTest] = useState<TestPayload | null>(null)
  const [answers, setAnswers] = useState<(string | null)[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [gridOpen, setGridOpen] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  // Timer plumbing. startedAt lives in localStorage so a refresh
  // doesn't reset elapsed; expiresAt is derived from
  // startedAt + timeLimitMinutes. We tick a re-render every second
  // to update the countdown display.
  const startedAtRef = useRef<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // ── Phase 1: load (or resume) ───────────────────────────────────
  const load = useCallback(async () => {
    setPhase('loading')
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/test/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const payload = json.test as TestPayload
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

  // ── Submission path (used by manual Submit + timer expiry) ─────
  const submit = useCallback(async () => {
    if (!test || phase !== 'taking') return
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
      if (!res.ok) throw new Error()
      const json = await res.json() as SubmitResult
      setResult(json)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`study:test:${sessionId}:startedAt`)
      }
      setPhase('reviewing')
    } catch {
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
  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.test.generating')}
      </div>
    )
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
    return <ReviewView test={test} answers={answers} result={result} ko={ko} />
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
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {t(`study.practice.difficulty.${q.difficulty}`)}
          </span>
        </div>
        <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap mb-4">
          {q.prompt}
        </p>
        <div className="space-y-2">
          {q.choices.map(choice => {
            const selected = answers[currentIdx] === choice
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
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                  selected
                    ? 'border-primary bg-primary/5 text-gray-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {choice}
              </button>
            )
          })}
        </div>
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
            onClick={() => void submit()}
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
    </div>
  )
}

/**
 * Post-submit review. Shows the score + a per-question accordion so
 * the student can revisit what they missed without re-running the
 * whole test.
 */
function ReviewView({
  test, answers, result, ko,
}: { test: TestPayload; answers: (string | null)[]; result: SubmitResult; ko: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-5 py-6 space-y-5">
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
                      <p className="text-gray-900 whitespace-pre-wrap">{q.prompt}</p>
                      <div className="space-y-1.5 mt-2">
                        {q.choices.map(choice => {
                          const isCorrect = choice === q.correct_answer
                          const isStudentPick = choice === studentAnswer
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
                              {choice}
                              {isCorrect && <span className="ml-2 font-semibold">{ko ? '정답' : 'Correct'}</span>}
                              {isStudentPick && !isCorrect && <span className="ml-2 font-semibold">{ko ? '내 답' : 'Your answer'}</span>}
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

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
