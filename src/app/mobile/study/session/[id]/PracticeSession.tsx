"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'
import { PathMascot } from '../../_shared/PathMascot'
import { MascotLoader } from '../../_shared/MascotLoader'

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'

interface Question {
  prompt: string
  type: QuestionType
  choices: string[] | null
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
}

interface Verdict {
  isCorrect: boolean
  aiExplanation: string
}

/**
 * Practice mode UI.
 *
 * On mount: POST /api/study/practice/generate to get a batch of
 * questions, then walk through them one at a time. Each answer is
 * graded server-side (MC/TF deterministically, short-answer via AI
 * judge) and persisted to study_attempts via /grade.
 *
 * Layout: header strip with progress + score, single question card,
 * sticky bottom CTA (Submit / Next). The card collapses into a
 * summary when the student finishes the set.
 */

/** Raumi's thinking loop is 3.2s; hold the loader at least one cycle
 *  so instant (bank-served) fetches don't flash the mascot. */
const MIN_MASCOT_MS = 3200
const holdForMascot = async (startedAt: number) => {
  const left = MIN_MASCOT_MS - (Date.now() - startedAt)
  if (left > 0) await new Promise(r => setTimeout(r, left))
}

export function PracticeSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'

  const [phase, setPhase] = useState<'loading' | 'asking' | 'feedback' | 'done' | 'error'>('loading')
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const startedAtRef = useRef<number>(Date.now())

  const fetchQuestions = useCallback(async () => {
    setPhase('loading')
    setQuestions([])
    setIdx(0)
    setAnswer('')
    setVerdict(null)
    setResults([])
    const startedAt = Date.now()
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/practice/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, count: 5 }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      const list = (json.questions ?? []) as Question[]
      if (list.length === 0) throw new Error('empty set')
      await holdForMascot(startedAt)
      setQuestions(list)
      startedAtRef.current = Date.now()
      setPhase('asking')
    } catch {
      setPhase('error')
    }
  }, [sessionId])

  useEffect(() => { void fetchQuestions() }, [fetchQuestions])

  const submit = useCallback(async () => {
    if (submitting || !questions[idx]) return
    const trimmed = answer.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const headers = await authHeaders()
      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000)
      const res = await fetch('/api/study/practice/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          question: questions[idx],
          studentAnswer: trimmed,
          timeSpentSeconds: elapsed,
        }),
      })
      if (!res.ok) throw new Error()
      const v = (await res.json()) as Verdict
      setVerdict(v)
      setResults(prev => [...prev, v.isCorrect])
      setPhase('feedback')
    } catch {
      // Soft-fail: show a synthetic verdict using the AI's pre-baked
      // explanation so the student isn't stranded on a 500 page.
      const q = questions[idx]
      const isCorrect = trimmed.toLowerCase() === q.correct_answer.trim().toLowerCase()
      setVerdict({ isCorrect, aiExplanation: q.explanation })
      setResults(prev => [...prev, isCorrect])
      setPhase('feedback')
    } finally {
      setSubmitting(false)
    }
  }, [answer, idx, questions, sessionId, submitting])

  const next = useCallback(() => {
    if (idx + 1 >= questions.length) {
      setPhase('done')
      // Persist completion server-side (score derived from the
      // attempts ledger there). Drives daily-challenge "done" state
      // and journey per-node progress; failure is non-fatal.
      void (async () => {
        try {
          const headers = await authHeaders()
          await fetch('/api/study/practice/complete', {
            method: 'POST',
            headers,
            body: JSON.stringify({ sessionId }),
          })
        } catch { /* silent */ }
      })()
      return
    }
    setIdx(i => i + 1)
    setAnswer('')
    setVerdict(null)
    startedAtRef.current = Date.now()
    setPhase('asking')
  }, [idx, questions.length])

  if (phase === 'loading') {
    return (
      <MascotLoader className="flex-1" label={t('study.practice.generating')} />
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <PathMascot state="sad" size={84} />
        <p className="text-sm text-gray-600">{t('study.practice.generateFailed')}</p>
        <button
          type="button"
          onClick={() => void fetchQuestions()}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          {t('study.practice.tryAgain')}
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const correct = results.filter(Boolean).length
    const total = results.length
    return (
      <div className="flex-1 px-5 py-8 overflow-y-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1">
            {t('study.practice.doneEyebrow')}
          </p>
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {correct} / {total}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t(`study.practice.doneMessage.${correct === total ? 'perfect' : correct >= total / 2 ? 'good' : 'keepGoing'}`)}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void fetchQuestions()}
            className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t('study.practice.moreQuestions')}
          </button>
          {results.some(r => r === false) && (
            <Link
              href={`/mobile/study/session/${sessionId}/summary`}
              className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition"
            >
              {language === 'ko' ? '틀린 문제 보기' : 'Review mistakes'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <Link
            href="/mobile/study"
            className="w-full inline-flex items-center justify-center h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700"
          >
            {t('study.practice.backToStudy')}
          </Link>
        </div>
      </div>
    )
  }

  const q = questions[idx]
  const correctCount = results.filter(Boolean).length

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Progress strip */}
      <div className="flex-shrink-0 px-5 lg:px-8 py-3 flex items-center justify-between text-xs text-gray-500">
        <span>{t('study.practice.progress', { current: String(idx + 1), total: String(questions.length) })}</span>
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {correctCount}
        </span>
      </div>

      {/* Question card */}
      <div className="flex-1 px-5 lg:px-8 pb-5 overflow-y-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {t(`study.practice.difficulty.${q.difficulty}`)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {t(`study.practice.type.${q.type}`)}
            </span>
          </div>
          {/* Two-pane on desktop: the passage + question sit on the left,
              the answer choices on the right, so a wide screen is used
              instead of a narrow centered column. Stacks on phones. */}
          <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-8 lg:items-start">
            <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
              {q.prompt}
            </p>

            {/* Right pane: answer choices + post-submit feedback. */}
            <div className="mt-5 lg:mt-0">
          {/* Answer input — varies by type. */}
          <div className="space-y-2">
            {q.type === 'multiple_choice' && q.choices && (
              q.choices.map((choice, ci) => {
                const selected = answer === choice
                const showCorrect = phase === 'feedback' && choice === q.correct_answer
                const showWrong = phase === 'feedback' && selected && !verdict?.isCorrect
                const letter = String.fromCharCode(65 + ci)
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => phase === 'asking' && setAnswer(choice)}
                    disabled={phase !== 'asking'}
                    className={`w-full flex items-start gap-3 text-left px-3.5 py-3 rounded-xl border text-sm transition-colors ${
                      showCorrect
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : showWrong
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : selected
                            ? 'border-primary bg-primary/5 text-gray-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold mt-[1px] ${
                      showCorrect
                        ? 'bg-emerald-600 text-white'
                        : showWrong
                          ? 'bg-rose-500 text-white'
                          : selected
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-500'
                    }`}>
                      {letter}
                    </span>
                    <span className="flex-1">{choice}</span>
                  </button>
                )
              })
            )}
            {q.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-2">
                {['True', 'False'].map(opt => {
                  const label = ko ? (opt === 'True' ? '참' : '거짓') : opt
                  const selected = answer === opt
                  const showCorrect = phase === 'feedback' && opt === q.correct_answer
                  const showWrong = phase === 'feedback' && selected && !verdict?.isCorrect
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => phase === 'asking' && setAnswer(opt)}
                      disabled={phase !== 'asking'}
                      className={`h-12 rounded-xl border text-sm font-medium transition-colors ${
                        showCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : showWrong
                            ? 'border-rose-300 bg-rose-50 text-rose-900'
                            : selected
                              ? 'border-primary bg-primary/5 text-gray-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
            {q.type === 'short_answer' && (
              <input
                type="text"
                value={answer}
                onChange={(e) => phase === 'asking' && setAnswer(e.target.value)}
                disabled={phase !== 'asking'}
                placeholder={String(t('study.practice.shortAnswerPlaceholder'))}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50"
              />
            )}
          </div>

          {/* Feedback panel — shown after submit. */}
          {phase === 'feedback' && verdict && (
            <div className={`mt-4 rounded-xl p-4 ${
              verdict.isCorrect
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-rose-50 border border-rose-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {verdict.isCorrect ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span className={`text-sm font-semibold ${
                  verdict.isCorrect ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  {verdict.isCorrect ? t('study.practice.correct') : t('study.practice.incorrect')}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {verdict.aiExplanation}
              </p>
              {!verdict.isCorrect && q.type !== 'short_answer' && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('study.practice.correctAnswerLabel')}: <strong>{q.correct_answer}</strong>
                </p>
              )}
            </div>
          )}
            </div>{/* end right pane */}
          </div>{/* end two-pane grid */}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex-shrink-0 px-5 lg:px-8 py-3 border-t border-gray-100 bg-white">
        {phase === 'asking' ? (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!answer.trim() || submitting}
            className="w-full h-12 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('study.practice.checking')}
              </>
            ) : (
              t('study.practice.submit')
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="w-full h-12 rounded-full bg-gradient-to-b from-primary to-primary/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(40,133,232,0.28)] text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            {idx + 1 >= questions.length
              ? t('study.practice.finish')
              : t('study.practice.next')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
