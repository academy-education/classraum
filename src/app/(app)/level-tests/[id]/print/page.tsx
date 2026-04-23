"use client"

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Question {
  id: string
  order_index: number
  type: string
  question: string
  choices: string[] | null
  correct_answer: string
  explanation?: string | null
}

interface Test {
  id: string
  title: string
  grade: string | null
  question_count: number
  time_limit_minutes: number | null
  subjects?: { id: string; name: string } | null
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function LevelTestPrintPage({ params }: PageProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') || 'student') as 'student' | 'answer_key' | 'answer_sheet'

  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/level-tests/${id}`)
        const json = await res.json()
        if (res.ok) {
          setTest(json.test)
          setQuestions(json.questions || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading && test) {
      // Wait a tick for render, then auto-print
      const timer = setTimeout(() => window.print(), 300)
      return () => clearTimeout(timer)
    }
  }, [loading, test])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!test) return <div className="p-8">Test not found</div>

  return (
    <div className="bg-white text-black p-8 max-w-3xl mx-auto print-root">
      <style jsx global>{`
        @media print {
          @page { margin: 0.6in; }
          .no-print { display: none !important; }
          body { background: white; }
        }
        .print-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="no-print mb-4 flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded">
          Print
        </button>
        <button onClick={() => window.close()} className="px-4 py-2 border rounded">
          Close
        </button>
      </div>

      <header className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold">{test.title}</h1>
        <div className="text-sm mt-1">
          {test.subjects?.name && <span className="mr-3">Subject: {test.subjects.name}</span>}
          {test.grade && <span className="mr-3">Grade: {test.grade}</span>}
          {test.time_limit_minutes && <span>Time: {test.time_limit_minutes} min</span>}
        </div>
        {mode !== 'answer_key' && (
          <div className="grid grid-cols-2 gap-6 mt-4 text-sm">
            <div>Name: <span className="inline-block border-b border-black w-48 ml-2"></span></div>
            <div>Date: <span className="inline-block border-b border-black w-32 ml-2"></span></div>
          </div>
        )}
        {mode === 'answer_key' && (
          <div className="mt-2 text-sm font-semibold text-red-700">ANSWER KEY</div>
        )}
      </header>

      {mode === 'answer_sheet' ? (
        <AnswerSheet questions={questions} />
      ) : (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <QuestionBlock key={q.id} q={q} index={i} mode={mode} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionBlock({ q, index, mode }: { q: Question; index: number; mode: 'student' | 'answer_key' }) {
  const showAnswers = mode === 'answer_key'

  return (
    <div className="break-inside-avoid">
      <div className="flex gap-3">
        <div className="font-semibold min-w-[28px]">{index + 1}.</div>
        <div className="flex-1">
          <div className="mb-2">{q.question}</div>

          {q.type === 'multiple_choice' && q.choices && (
            <div className="space-y-1 ml-4">
              {q.choices.map((c, idx) => {
                const letter = String.fromCharCode(65 + idx)
                const isCorrect = showAnswers && c === q.correct_answer
                return (
                  <div
                    key={idx}
                    className={`flex gap-2 ${isCorrect ? 'bg-green-100 font-semibold' : ''} px-1`}
                    style={isCorrect ? { backgroundColor: '#bbf7d0' } : {}}
                  >
                    <span>{letter}.</span>
                    <span>{c}</span>
                  </div>
                )
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="ml-4 flex gap-8 text-sm">
              <div>
                <span className="inline-block w-4 h-4 border border-black mr-2 align-middle"></span>
                <span className={showAnswers && q.correct_answer.toLowerCase() === 'true' ? 'font-bold' : ''}>
                  True{showAnswers && q.correct_answer.toLowerCase() === 'true' ? ' ✓' : ''}
                </span>
              </div>
              <div>
                <span className="inline-block w-4 h-4 border border-black mr-2 align-middle"></span>
                <span className={showAnswers && q.correct_answer.toLowerCase() === 'false' ? 'font-bold' : ''}>
                  False{showAnswers && q.correct_answer.toLowerCase() === 'false' ? ' ✓' : ''}
                </span>
              </div>
            </div>
          )}

          {q.type === 'short_answer' && !showAnswers && (
            <div className="mt-2 space-y-4">
              <div className="border-b border-black h-5"></div>
              <div className="border-b border-black h-5"></div>
            </div>
          )}

          {q.type === 'short_answer' && showAnswers && (
            <div
              className="ml-4 mt-2 p-2 border border-green-500"
              style={{ backgroundColor: '#bbf7d0' }}
            >
              <span className="font-semibold">Answer: </span>{q.correct_answer}
            </div>
          )}

          {showAnswers && q.explanation && (
            <div className="mt-2 ml-4 text-sm italic">
              <span className="font-semibold">Explanation: </span>{q.explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AnswerSheet({ questions }: { questions: Question[] }) {
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={q.id} className="flex items-center gap-4 break-inside-avoid">
          <div className="font-semibold min-w-[32px]">{i + 1}.</div>
          {q.type === 'multiple_choice' && q.choices && (
            <div className="flex gap-3">
              {q.choices.map((_, idx) => {
                const letter = String.fromCharCode(65 + idx)
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span
                      className="inline-block w-5 h-5 border-2 border-black rounded-full"
                      aria-label={letter}
                    ></span>
                    <span className="text-sm">{letter}</span>
                  </div>
                )
              })}
            </div>
          )}
          {q.type === 'true_false' && (
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="inline-block w-5 h-5 border-2 border-black rounded-full"></span>
                <span className="text-sm">T</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-5 h-5 border-2 border-black rounded-full"></span>
                <span className="text-sm">F</span>
              </div>
            </div>
          )}
          {q.type === 'short_answer' && (
            <div className="flex-1 border-b border-black h-6"></div>
          )}
        </div>
      ))}
    </div>
  )
}
