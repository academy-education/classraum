"use client"

import { useEffect, useState, use, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { Loader2, FileQuestion, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

interface Question {
  id: string
  order_index: number
  type: string
  question: string
  choices: string[] | null
}

interface Test {
  id: string
  title: string
  question_count: number
  time_limit_minutes: number | null
  language: string
  share_enabled: boolean
}

interface SubmitResult {
  score: number | null
  correct: number
  total: number
  needs_manual_grading: boolean
}

type Stage = 'loading' | 'error' | 'name' | 'test' | 'result'

interface PageProps {
  params: Promise<{ shareToken: string }>
}

const inputStyles = 'h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'

export default function PublicTestPage({ params }: PageProps) {
  const { shareToken } = use(params)
  const { t } = useTranslation()

  const [stage, setStage] = useState<Stage>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  const [takerName, setTakerName] = useState('')
  const [takerEmail, setTakerEmail] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/test/${shareToken}`)
        const json = await res.json()
        if (!res.ok) {
          setErrorMsg(json.error || '')
          setStage('error')
          return
        }
        setTest(json.test)
        setQuestions(json.questions || [])
        setStage('name')
      } catch {
        setErrorMsg('')
        setStage('error')
      }
    }
    load()
  }, [shareToken])

  const handleSubmit = useCallback(async () => {
    if (!test) return
    setSubmitting(true)
    try {
      const answerList = questions.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || '',
      }))
      const res = await fetch(`/api/test/${shareToken}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taker_name: takerName,
          taker_email: takerEmail || null,
          answers: answerList,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submit failed')
      setResult({
        score: json.score,
        correct: json.correct,
        total: json.total,
        needs_manual_grading: json.needs_manual_grading,
      })
      setStage('result')
    } catch (e) {
      showErrorToast(
        String(t('levelTests.errors.submitFailed')),
        e instanceof Error ? e.message : ''
      )
    } finally {
      setSubmitting(false)
    }
  }, [test, questions, answers, shareToken, takerName, takerEmail, t])

  // Timer
  useEffect(() => {
    if (stage !== 'test' || !test?.time_limit_minutes) return
    if (timeLeft === null) {
      setTimeLeft(test.time_limit_minutes * 60)
      return
    }
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    const id = setInterval(() => {
      setTimeLeft(tl => (tl !== null ? tl - 1 : null))
    }, 1000)
    return () => clearInterval(id)
  }, [stage, test, timeLeft, handleSubmit])

  const handleStart = () => {
    if (!takerName.trim()) return
    setStage('test')
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.toString().trim()).length

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            {String(t('levelTests.detail.notFoundTitle'))}
          </h1>
          <p className="text-sm text-gray-500">
            {String(t('levelTests.detail.notFoundDescription'))}
          </p>
          {errorMsg && (
            <p className="mt-4 text-xs text-gray-400">{errorMsg}</p>
          )}
        </Card>
      </div>
    )
  }

  if (stage === 'name' && test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 max-w-md w-full">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileQuestion className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{test.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {String(t('levelTests.detail.questionsCount')).replace('{count}', String(test.question_count))}
                {test.time_limit_minutes ? ` · ${String(t('levelTests.detail.minutesCount')).replace('{count}', String(test.time_limit_minutes))}` : ''}
              </p>
            </div>
          </div>

          <p className="text-sm text-gray-700 mb-4">{String(t('levelTests.take.enterName'))}</p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('common.name'))} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={takerName}
                onChange={e => setTakerName(e.target.value)}
                placeholder={String(t('levelTests.take.namePlaceholder'))}
                className={inputStyles}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('common.email'))}
              </Label>
              <Input
                type="email"
                value={takerEmail}
                onChange={e => setTakerEmail(e.target.value)}
                placeholder={String(t('levelTests.take.emailPlaceholder'))}
                className={inputStyles}
              />
            </div>
          </div>

          <Button className="w-full mt-6" onClick={handleStart} disabled={!takerName.trim()}>
            {String(t('levelTests.take.start'))}
          </Button>
        </Card>
      </div>
    )
  }

  if (stage === 'test' && test) {
    const formatTime = (s: number) => {
      const m = Math.floor(s / 60)
      const sec = s % 60
      return `${m}:${sec.toString().padStart(2, '0')}`
    }

    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 -mx-4 md:-mx-0 px-4 md:px-0 py-3 bg-gray-50 border-b border-gray-200 mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{test.title}</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {String(t('levelTests.inPerson.answered'))
                    .replace('{count}', String(answeredCount))
                    .replace('{total}', String(questions.length))}
                </p>
              </div>
              {timeLeft !== null && (
                <div className="flex items-center gap-1.5 text-sm font-medium bg-white border border-border rounded-lg px-3 py-1.5 flex-shrink-0">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className={timeLeft < 60 ? 'text-red-600 font-semibold' : 'text-gray-900'}>{formatTime(timeLeft)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={q.id} className="p-4 sm:p-5">
                <div className="flex gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 text-gray-900 pt-0.5">{q.question}</div>
                </div>

                {q.type === 'multiple_choice' && q.choices && (
                  <div className="space-y-2 ml-10">
                    {q.choices.map((c, idx) => {
                      const letter = String.fromCharCode(65 + idx)
                      const isSelected = answers[q.id] === c
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: c }))}
                          className={`flex items-center gap-3 p-3 w-full text-left rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="font-semibold text-gray-700 text-sm">{letter}.</span>
                          <span className="text-sm text-gray-900">{c}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="flex gap-3 ml-10">
                    {['True', 'False'].map(v => {
                      const isSelected = answers[q.id] === v
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                          className={`flex-1 p-3 rounded-lg border text-center text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {String(t(`levelTests.take.${v.toLowerCase()}`))}
                        </button>
                      )
                    })}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <div className="ml-10">
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      placeholder={String(t('levelTests.take.typeAnswer'))}
                      className="w-full min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                      rows={3}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('levelTests.take.submitting'))}
                </>
              ) : (
                String(t('levelTests.take.submit'))
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'result' && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 sm:p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            {String(t('levelTests.take.results.title'))}
          </h1>
          {result.score !== null && (
            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-1">{String(t('levelTests.take.results.score'))}</div>
              <div className="text-4xl font-bold text-gray-900">{result.score}%</div>
              <div className="text-sm text-gray-500 mt-1">
                {String(t('levelTests.take.results.correct'))
                  .replace('{correct}', String(result.correct))
                  .replace('{total}', String(result.total))}
              </div>
            </div>
          )}
          {result.needs_manual_grading && (
            <p className="text-sm text-orange-600 mb-4">
              {String(t('levelTests.take.results.needsManualGrading'))}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => {
              // window.close() only succeeds if the tab was opened via script
              // (window.open / <a target="_blank">). Browsers silently ignore it
              // otherwise — which is the common case for a pasted link. Try to
              // close first, then fall back to sending the user to the landing
              // page so the button always does something visible.
              try { window.close() } catch {}
              setTimeout(() => {
                if (typeof window !== 'undefined' && !window.closed) {
                  window.location.href = '/'
                }
              }, 100)
            }}
          >
            {String(t('levelTests.take.results.close'))}
          </Button>
        </Card>
      </div>
    )
  }

  return null
}
