"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, ArrowRight, RefreshCw, Sparkles, BookOpen } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { authHeaders } from '@/lib/auth-headers'

interface Section { heading: string; body: string; example: string | null }
interface ComprehensionQ {
  prompt: string
  type: 'multiple_choice'
  choices: string[]
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string
}
interface Lesson {
  title: string
  introduction: string
  sections: Section[]
  keyTakeaways: string[]
  comprehension: ComprehensionQ[]
}

interface Verdict { isCorrect: boolean; aiExplanation: string }

/**
 * Lesson mode UI.
 *
 * Scrollable structure: title → intro → sections (each with optional
 * worked example) → key takeaways → comprehension quiz. The quiz
 * answers go through the existing /api/study/practice/grade since the
 * question shape matches. Lesson body is cached server-side so a
 * student can leave + resume without losing their place.
 */
export function LessonSession({ sessionId, language }: { sessionId: string; language: 'en' | 'ko' }) {
  const { t } = useTranslation()
  const ko = language === 'ko'

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Per-comprehension-question selected answer + verdict.
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [verdicts, setVerdicts] = useState<Record<number, Verdict>>({})
  const [grading, setGrading] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/lesson/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setLesson(json.lesson as Lesson)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { void load() }, [load])

  const gradeQuestion = useCallback(async (idx: number) => {
    if (!lesson) return
    const q = lesson.comprehension[idx]
    const ans = answers[idx]
    if (!ans) return
    setGrading(idx)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/study/practice/grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          question: q,
          studentAnswer: ans,
        }),
      })
      if (!res.ok) throw new Error()
      const v = (await res.json()) as Verdict
      setVerdicts(prev => ({ ...prev, [idx]: v }))
    } catch {
      // MC questions are deterministic — fall back to a local compare
      // so the student still gets a verdict.
      const isCorrect = ans.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
      setVerdicts(prev => ({ ...prev, [idx]: { isCorrect, aiExplanation: q.explanation } }))
    } finally {
      setGrading(null)
    }
  }, [answers, lesson, sessionId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-500 px-6 text-center">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('study.lesson.generating')}
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-sm text-gray-600">{t('study.lesson.generateFailed')}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-primary text-white text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          {t('study.lesson.tryAgain')}
        </button>
      </div>
    )
  }

  const answeredCount = Object.keys(verdicts).length
  const correctCount = Object.values(verdicts).filter(v => v.isCorrect).length

  return (
    <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
      <div className="px-5 py-5 space-y-6">
        {/* Lesson body */}
        <article className="rounded-2xl border border-gray-200 bg-white p-5 space-y-5">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600 mb-1.5 inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              {t('study.lesson.eyebrow')}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              {lesson.title}
            </h1>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {lesson.introduction}
            </p>
          </header>

          {lesson.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              <h2 className="text-base font-semibold text-gray-900">{s.heading}</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s.body}</p>
              {s.example && (
                <div className="mt-2 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    {t('study.lesson.example')}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{s.example}</p>
                </div>
              )}
            </section>
          ))}

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              {t('study.lesson.keyTakeaways')}
            </h2>
            <ul className="space-y-1.5">
              {lesson.keyTakeaways.map((k, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  <span className="leading-relaxed">{k}</span>
                </li>
              ))}
            </ul>
          </section>
        </article>

        {/* Comprehension quiz */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-900">
              {t('study.lesson.comprehensionTitle')}
            </h2>
            {answeredCount > 0 && (
              <span className="text-xs text-gray-500">
                {correctCount} / {answeredCount} {t('study.lesson.correctShort')}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {lesson.comprehension.map((q, i) => {
              const ans = answers[i]
              const v = verdicts[i]
              return (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900 mb-3 leading-relaxed">
                    {i + 1}. {q.prompt}
                  </p>
                  <div className="space-y-2">
                    {q.choices.map(choice => {
                      const selected = ans === choice
                      const graded = v != null
                      const showCorrect = graded && choice === q.correct_answer
                      const showWrong = graded && selected && !v.isCorrect
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => {
                            if (graded) return
                            setAnswers(prev => ({ ...prev, [i]: choice }))
                          }}
                          disabled={graded}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                            showCorrect
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                              : showWrong
                                ? 'border-rose-300 bg-rose-50 text-rose-900'
                                : selected
                                  ? 'border-primary bg-primary/5 text-gray-900'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {choice}
                        </button>
                      )
                    })}
                  </div>

                  {v ? (
                    <div className={`mt-3 rounded-xl p-3 ${
                      v.isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {v.isCorrect
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <XCircle className="w-4 h-4 text-rose-600" />}
                        <span className={`text-sm font-semibold ${
                          v.isCorrect ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {v.isCorrect ? t('study.practice.correct') : t('study.practice.incorrect')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{v.aiExplanation}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void gradeQuestion(i)}
                      disabled={!ans || grading === i}
                      className="mt-3 w-full h-10 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {grading === i ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('study.practice.checking')}
                        </>
                      ) : t('study.practice.submit')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {answeredCount === lesson.comprehension.length && (
            <div className="mt-4 flex flex-col gap-2">
              {correctCount < answeredCount && (
                <Link
                  href={`/mobile/study/session/${sessionId}/summary`}
                  className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary transition"
                >
                  {ko ? '틀린 문제 보기' : 'Review mistakes'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/mobile/study"
                className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-gray-900 text-white text-sm font-medium"
              >
                {t('study.lesson.finish')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
