"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import {
  ArrowLeft,
  Share2,
  Printer,
  Users,
  Presentation,
  Trash2,
  Check,
  FileQuestion,
} from 'lucide-react'
import { authHeaders } from './hooks/authHeaders'
import { ShareModal } from './modals/ShareModal'
import { AssignModal } from './modals/AssignModal'
import { DeleteModal } from './modals/DeleteModal'
import { AttemptDetailModal } from './modals/AttemptDetailModal'
import { InPersonMode } from './in-person/InPersonMode'
import type { Test, Question, Attempt } from './types'

interface LevelTestDetailProps {
  academyId: string
  testId: string
}

interface ResumeData {
  id: string
  taker_name: string
  student_id?: string | null
  answers: Record<string, string>
}

export function LevelTestDetail({ academyId, testId }: LevelTestDetailProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [test, setTest] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])

  const [showShareModal, setShowShareModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showInPersonMode, setShowInPersonMode] = useState(false)
  const [resumeFromAttempt, setResumeFromAttempt] = useState<ResumeData | null>(null)
  const [printMenuOpen, setPrintMenuOpen] = useState(false)

  const [showAttemptDetail, setShowAttemptDetail] = useState(false)
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)

  const loadTest = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTest(json.test)
      setQuestions(json.questions || [])
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('levelTests.errors.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [testId, t])

  const loadAttempts = useCallback(async (): Promise<Attempt[]> => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}/attempts`, { headers })
      const json = await res.json()
      if (res.ok) {
        const list = (json.attempts || []) as Attempt[]
        setAttempts(list)
        return list
      }
    } catch (e) {
      console.error(e)
    }
    return []
  }, [testId])

  useEffect(() => {
    loadTest()
    loadAttempts()
  }, [loadTest, loadAttempts])

  const openPrint = (mode: 'student' | 'answer_key' | 'answer_sheet') => {
    window.open(`/print/level-test/${testId}?mode=${mode}`, '_blank')
    setPrintMenuOpen(false)
  }

  const openAttemptDetail = (attempt: Attempt) => {
    setSelectedAttempt(attempt)
    setShowAttemptDetail(true)
  }

  const handleAttemptUpdate = useCallback((update: { id: string; score: number | null; status: string; needs_manual_grading: boolean }) => {
    setAttempts(prev => prev.map(a => a.id === update.id ? { ...a, score: update.score, status: update.status, needs_manual_grading: update.needs_manual_grading } : a))
    loadAttempts()
  }, [loadAttempts])

  const handleInPersonCompleted = () => {
    loadAttempts()
  }

  const handleContinueAsInstructor = async (attemptId: string) => {
    setShowInPersonMode(false)
    setResumeFromAttempt(null)
    let attempt = attempts.find(a => a.id === attemptId)
    if (!attempt) {
      const freshList = await loadAttempts()
      attempt = freshList.find(a => a.id === attemptId)
    }
    if (attempt) {
      openAttemptDetail(attempt)
    }
  }

  const handleStartInPerson = () => {
    setResumeFromAttempt(null)
    setShowInPersonMode(true)
  }

  const handleResumeAttempt = async (attempt: Attempt) => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${attempt.id}/save`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Resume failed')
      const answers: Record<string, string> = {}
      for (const a of (json.answers || []) as { question_id: string; answer: string }[]) {
        answers[a.question_id] = a.answer
      }
      setResumeFromAttempt({
        id: attempt.id,
        taker_name: attempt.taker_name,
        student_id: attempt.student_id ?? null,
        answers,
      })
      setShowInPersonMode(true)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    }
  }

  const handleCloseInPerson = () => {
    setShowInPersonMode(false)
    setResumeFromAttempt(null)
  }

  // ============ Rendering ============
  if (loading) {
    return (
      <div className="p-4">
        <div className="h-9 w-20 bg-gray-200 rounded mb-4 animate-pulse"></div>
        <Card className="p-6 mb-6 animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-64"></div>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 bg-gray-200 rounded w-16"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            <div className="h-6 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-gray-200 rounded w-24"></div>)}
          </div>
        </Card>
        <Card className="p-6 mb-6 animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-32"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </Card>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center text-gray-500">Test not found</Card>
      </div>
    )
  }

  if (showInPersonMode) {
    return (
      <InPersonMode
        isOpen={showInPersonMode}
        onClose={handleCloseInPerson}
        testId={testId}
        questions={questions}
        academyId={academyId}
        onCompleted={handleInPersonCompleted}
        onContinueAsInstructor={handleContinueAsInstructor}
        resumeFromAttempt={resumeFromAttempt}
      />
    )
  }

  return (
    <div className="p-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/level-tests')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {String(t('common.back'))}
      </Button>

      <Card className="p-4 sm:p-6 mb-6">
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileQuestion className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{test.title}</h1>
            {(test.subjects?.name || test.grade) && (
              <p className="text-sm text-gray-500 mt-1">
                {test.subjects?.name || ''}
                {test.subjects?.name && test.grade ? ' · ' : ''}
                {test.grade || ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-5">
          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
          </span>
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
            {String(t('levelTests.detail.questionsCount')).replace('{count}', String(test.question_count))}
          </span>
          {test.time_limit_minutes && (
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
              {String(t('levelTests.detail.minutesCount')).replace('{count}', String(test.time_limit_minutes))}
            </span>
          )}
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
            {String(t(`levelTests.form.language${test.language.charAt(0).toUpperCase() + test.language.slice(1)}`))}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            test.share_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
          }`}>
            {String(t(test.share_enabled ? 'levelTests.detail.visibilityPublic' : 'levelTests.detail.visibilityPrivate'))}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.share'))}
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrintMenuOpen(v => !v)}
              className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              {String(t('levelTests.detail.print'))}
            </Button>
            {printMenuOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[260px]">
                <button
                  onClick={() => openPrint('student')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {String(t('levelTests.detail.printWithoutAnswers'))}
                </button>
                <button
                  onClick={() => openPrint('answer_key')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {String(t('levelTests.detail.printWithAnswers'))}
                </button>
                <button
                  onClick={() => openPrint('answer_sheet')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  {String(t('levelTests.detail.printAnswerSheet'))}
                </button>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignModal(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.assign'))}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartInPerson}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
          >
            <Presentation className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.takeInPerson'))}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.delete'))}
          </Button>
        </div>
      </Card>

      {/* Questions */}
      <Card className="p-4 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          {String(t('levelTests.detail.questions'))} ({questions.length})
        </h2>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="border-b last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <div className="font-semibold text-gray-600 min-w-[24px]">{i + 1}.</div>
                <div className="flex-1">
                  <div className="text-gray-900 mb-2">{q.question}</div>
                  <div className="text-xs text-gray-500 mb-3 capitalize">{q.type.replace('_', ' ')}</div>

                  {q.type === 'multiple_choice' && q.choices && (
                    <div className="space-y-2">
                      {q.choices.map((c, idx) => {
                        const letter = String.fromCharCode(65 + idx)
                        const isCorrect = c === q.correct_answer
                        return (
                          <div
                            key={idx}
                            className={`text-sm px-3 py-2 rounded ${
                              isCorrect ? 'bg-green-50 text-green-900 border border-green-300' : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-semibold mr-2">{letter}.</span>{c}
                            {isCorrect && <Check className="w-4 h-4 inline ml-2 text-green-600" />}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="text-sm">
                      <span className="text-gray-500 mr-2">{String(t('levelTests.detail.correctAnswer'))}:</span>
                      <span className="font-medium text-green-700 capitalize">{q.correct_answer}</span>
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <div className="text-sm">
                      <span className="text-gray-500 mr-2">{String(t('levelTests.detail.correctAnswer'))}:</span>
                      <span className="font-medium text-green-700">{q.correct_answer}</span>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      <span className="font-medium">{String(t('levelTests.detail.explanation'))}:</span> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Attempts */}
      <Card className="p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          {String(t('levelTests.detail.attempts'))} ({attempts.length})
        </h2>
        {attempts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <Users className="w-10 h-10 text-gray-400" />
              <h3 className="text-base font-medium text-gray-900">
                {String(t('levelTests.detail.noResults'))}
              </h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {String(t('levelTests.detail.noAttemptsDescription'))}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map(a => {
              if (a.status === 'in_progress') {
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 rounded-lg border border-dashed border-gray-300 bg-gray-50/50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{a.taker_name}</div>
                      <div className="text-xs text-gray-500">
                        {String(t('levelTests.detail.ungraded'))} · {new Date(a.started_at || a.submitted_at || '').toLocaleString()}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleResumeAttempt(a)}>
                      {String(t('levelTests.detail.resume'))}
                    </Button>
                  </div>
                )
              }
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openAttemptDetail(a)}
                  className="w-full py-3 flex items-center justify-between text-left hover:bg-gray-50 px-2 -mx-2 rounded transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{a.taker_name}</div>
                    {a.taker_email && <div className="text-xs text-gray-500">{a.taker_email}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(a.submitted_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {a.needs_manual_grading
                        ? String(t('levelTests.detail.scoreUnavailable'))
                        : (a.score !== null ? `${a.score}%` : '—')}
                    </div>
                    {a.needs_manual_grading && (
                      <div className="text-xs text-orange-600">{String(t('levelTests.detail.manualGrading'))}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        test={test}
        testId={testId}
        onTestUpdate={(updater) => setTest(prev => (prev ? updater(prev) : prev))}
      />

      <AssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        academyId={academyId}
        testId={testId}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        testId={testId}
      />

      <AttemptDetailModal
        isOpen={showAttemptDetail}
        onClose={() => setShowAttemptDetail(false)}
        attempt={selectedAttempt}
        onAttemptUpdate={handleAttemptUpdate}
      />
    </div>
  )
}
