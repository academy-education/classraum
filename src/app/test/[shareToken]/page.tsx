"use client"

import { useEffect, useState, use, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/hooks/useTranslation'
import { Loader2 } from 'lucide-react'

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
          setErrorMsg(json.error || 'Test not found')
          setStage('error')
          return
        }
        setTest(json.test)
        setQuestions(json.questions || [])
        setStage('name')
      } catch {
        setErrorMsg('Failed to load test')
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
      alert(e instanceof Error ? e.message : String(t('levelTests.errors.submitFailed')))
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
      setTimeLeft(t => (t !== null ? t - 1 : null))
    }, 1000)
    return () => clearInterval(id)
  }, [stage, test, timeLeft, handleSubmit])

  const handleStart = () => {
    if (!takerName.trim()) return
    setStage('test')
  }

  if (stage === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{String(t('common.error'))}</h1>
          <p className="text-gray-600">{errorMsg}</p>
        </Card>
      </div>
    )
  }

  if (stage === 'name' && test) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{test.title}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {test.question_count} questions
            {test.time_limit_minutes ? ` · ${test.time_limit_minutes} min` : ''}
          </p>
          <p className="text-gray-700 mb-4">{String(t('levelTests.take.enterName'))}</p>
          <div className="space-y-3">
            <div>
              <Label>{String(t('common.name'))} *</Label>
              <Input
                value={takerName}
                onChange={e => setTakerName(e.target.value)}
                placeholder={String(t('levelTests.take.namePlaceholder'))}
              />
            </div>
            <div>
              <Label>{String(t('common.email'))}</Label>
              <Input
                type="email"
                value={takerEmail}
                onChange={e => setTakerEmail(e.target.value)}
                placeholder={String(t('levelTests.take.emailPlaceholder'))}
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
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-gray-50 py-2 z-10">
            <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
            {timeLeft !== null && (
              <div className="text-sm font-medium bg-white border rounded-lg px-3 py-1">
                <span className="text-gray-500 mr-2">{String(t('levelTests.take.timeRemaining'))}:</span>
                <span className={timeLeft < 60 ? 'text-red-600' : 'text-gray-900'}>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <Card key={q.id} className="p-5">
                <div className="flex gap-3 mb-3">
                  <div className="font-semibold text-gray-600">{i + 1}.</div>
                  <div className="flex-1 text-gray-900">{q.question}</div>
                </div>

                {q.type === 'multiple_choice' && q.choices && (
                  <div className="space-y-2 ml-7">
                    {q.choices.map((c, idx) => {
                      const letter = String.fromCharCode(65 + idx)
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                            answers[q.id] === c ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={answers[q.id] === c}
                            onChange={() => setAnswers(a => ({ ...a, [q.id]: c }))}
                          />
                          <span className="font-semibold mr-1">{letter}.</span>
                          <span>{c}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="flex gap-3 ml-7">
                    {['True', 'False'].map(v => (
                      <label
                        key={v}
                        className={`flex-1 p-3 rounded-lg border text-center cursor-pointer ${
                          answers[q.id] === v ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === v}
                          onChange={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                          className="mr-2"
                        />
                        {String(t(`levelTests.take.${v.toLowerCase()}`))}
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'short_answer' && (
                  <div className="ml-7">
                    <Input
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      placeholder={String(t('levelTests.take.typeAnswer'))}
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
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
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
          <Button className="w-full" onClick={() => window.close()}>
            {String(t('levelTests.take.results.close'))}
          </Button>
        </Card>
      </div>
    )
  }

  return null
}
