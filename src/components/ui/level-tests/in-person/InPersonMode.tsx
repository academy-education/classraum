"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import {
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Presentation,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { supabase } from '@/lib/supabase'
import { authHeaders } from '../hooks/authHeaders'
import { useAnalysisOptions } from '../hooks/useAnalysisOptions'
import { AnalysisOptions } from '../components/AnalysisOptions'
import type { Question, Student, InPersonStage } from '../types'

interface ResumeData {
  id: string
  taker_name: string
  student_id?: string | null
  answers: Record<string, string>
}

interface InPersonModeProps {
  isOpen: boolean
  onClose: () => void
  testId: string
  questions: Question[]
  academyId: string
  onCompleted: () => void
  onContinueAsInstructor: (attemptId: string) => void
  resumeFromAttempt?: ResumeData | null
}

export function InPersonMode({
  isOpen,
  onClose,
  testId,
  questions,
  academyId,
  onCompleted,
  onContinueAsInstructor,
  resumeFromAttempt,
}: InPersonModeProps) {
  const { t } = useTranslation()
  const analysis = useAnalysisOptions()

  const [students, setStudents] = useState<Student[]>([])
  const [inPersonStage, setInPersonStage] = useState<InPersonStage>('name')
  const [showStartModal, setShowStartModal] = useState(false)
  const [inPersonMode, setInPersonMode] = useState(false)
  const [inPersonInfo, setInPersonInfo] = useState<{ name: string; studentId: string | null }>({
    name: '',
    studentId: null,
  })
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null)
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [startingAttempt, setStartingAttempt] = useState(false)
  const [submittingAttempt, setSubmittingAttempt] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showInstructorConfirm, setShowInstructorConfirm] = useState(false)
  const [resultsSummary, setResultsSummary] = useState<{
    score: number | null
    correct: number
    auto_graded: number
    total: number
    needs_manual_grading: boolean
  } | null>(null)
  const [resultsAnalysis, setResultsAnalysis] = useState<string | null>(null)
  const [analyzingResults, setAnalyzingResults] = useState(false)
  const [aiGrading, setAiGrading] = useState(false)

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('user_id, users(name, email)')
      .eq('academy_id', academyId)
    setStudents((data as unknown as Student[]) || [])
  }, [academyId])

  // Handle open/close and resume
  useEffect(() => {
    if (!isOpen) return

    if (resumeFromAttempt) {
      setCurrentAttemptId(resumeFromAttempt.id)
      setInPersonInfo({ name: resumeFromAttempt.taker_name, studentId: resumeFromAttempt.student_id ?? null })
      setCurrentAnswers(resumeFromAttempt.answers)
      setCurrentQuestionIdx(0)
      setResultsSummary(null)
      setResultsAnalysis(null)
      setInPersonStage('taking')
      setInPersonMode(true)
      setShowStartModal(false)
    } else {
      loadStudents()
      setInPersonInfo({ name: '', studentId: null })
      setShowStartModal(true)
      setInPersonMode(false)
      setInPersonStage('name')
    }
  }, [isOpen, resumeFromAttempt, loadStudents])

  const handleStartInPerson = async () => {
    if (!inPersonInfo.name.trim()) {
      showErrorToast(String(t('levelTests.inPerson.enterStudentName')))
      return
    }
    setStartingAttempt(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}/attempts/in-person`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          taker_name: inPersonInfo.name.trim(),
          student_id: inPersonInfo.studentId || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start attempt')
      setCurrentAttemptId(json.attempt?.id || json.id)
      setCurrentAnswers({})
      setCurrentQuestionIdx(0)
      setResultsSummary(null)
      setResultsAnalysis(null)
      setInPersonStage('taking')
      setShowStartModal(false)
      setInPersonMode(true)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setStartingAttempt(false)
    }
  }

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  useEffect(() => {
    if (!currentAttemptId || inPersonStage !== 'taking') return
    const snapshot = JSON.stringify(currentAnswers)
    if (snapshot === lastSavedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true)
        const headers = await authHeaders()
        const answers = Object.entries(currentAnswers).map(([question_id, answer]) => ({
          question_id,
          answer,
        }))
        const res = await fetch(`/api/level-tests/attempts/${currentAttemptId}/save`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ answers }),
        })
        if (res.ok) {
          lastSavedRef.current = snapshot
          setSavedIndicator(true)
          setTimeout(() => setSavedIndicator(false), 1500)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setSaving(false)
      }
    }, 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [currentAnswers, currentAttemptId, inPersonStage])

  const handleAnswerChange = (questionId: string, answer: string) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const answeredCount = useMemo(
    () => questions.filter(q => (currentAnswers[q.id] ?? '').toString().trim() !== '').length,
    [questions, currentAnswers]
  )

  const handleRequestFinish = () => {
    setShowFinishConfirm(true)
  }

  const handleConfirmFinish = async () => {
    if (!currentAttemptId) return
    setSubmittingAttempt(true)
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const headers = await authHeaders()
      const answers = Object.entries(currentAnswers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))
      await fetch(`/api/level-tests/attempts/${currentAttemptId}/save`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ answers }),
      })

      const res = await fetch(`/api/level-tests/attempts/${currentAttemptId}/submit`, {
        method: 'POST',
        headers,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submit failed')
      setResultsSummary({
        score: json.score,
        correct: json.correct,
        auto_graded: json.auto_graded,
        total: json.total,
        needs_manual_grading: json.needs_manual_grading,
      })
      setInPersonStage('results')
      setShowFinishConfirm(false)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('levelTests.errors.submitFailed')))
    } finally {
      setSubmittingAttempt(false)
    }
  }

  const handleGenerateResultsAnalysis = async () => {
    if (!currentAttemptId) return
    setAnalyzingResults(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${currentAttemptId}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysis.toApiBody()),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analyze failed')
      setResultsAnalysis(json.analysis)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setAnalyzingResults(false)
    }
  }

  const handleAiGradeOnResults = async () => {
    if (!currentAttemptId) return
    setAiGrading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${currentAttemptId}/ai-grade`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI grade failed')
      if (json.attempt) {
        setResultsSummary(prev => prev ? {
          ...prev,
          score: json.attempt.score,
          needs_manual_grading: json.attempt.needs_manual_grading,
        } : prev)
      }
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setAiGrading(false)
    }
  }

  const resetState = () => {
    setInPersonMode(false)
    setInPersonStage('name')
    setCurrentAttemptId(null)
    setCurrentAnswers({})
    setCurrentQuestionIdx(0)
    setResultsSummary(null)
    setResultsAnalysis(null)
  }

  const handleContinueAsInstructor = () => {
    if (!currentAttemptId) return
    const savedAttemptId = currentAttemptId
    resetState()
    onContinueAsInstructor(savedAttemptId)
  }

  const handleCloseInPerson = () => {
    resetState()
    onCompleted()
    onClose()
  }

  const handleCloseStartModal = () => {
    if (startingAttempt) return
    setShowStartModal(false)
    onClose()
  }

  if (!isOpen) return null

  // Start modal (name stage)
  if (!inPersonMode && showStartModal) {
    return (
      <Modal
        isOpen={showStartModal}
        onClose={handleCloseStartModal}
        size="md"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.detail.takeInPerson'))}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseStartModal}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.inPerson.enterStudentName'))} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={inPersonInfo.name}
                onChange={e => setInPersonInfo(prev => ({ ...prev, name: e.target.value, studentId: null }))}
                className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {String(t('levelTests.inPerson.selectStudent'))}
              </Label>
              <div className="border border-border rounded-lg divide-y divide-gray-100 max-h-60 overflow-auto">
                {students.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">—</div>
                ) : (
                  students.map(s => {
                    const isSelected = inPersonInfo.studentId === s.user_id
                    return (
                      <button
                        key={s.user_id}
                        type="button"
                        onClick={() =>
                          setInPersonInfo(prev =>
                            isSelected
                              ? { name: '', studentId: null }
                              : { name: s.users?.name || '', studentId: s.user_id }
                          )
                        }
                        className={`flex items-center gap-3 p-3 w-full text-left hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.users?.name || '—'}</div>
                          <div className="text-xs text-gray-500 truncate">{s.users?.email || ''}</div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseStartModal}
              disabled={startingAttempt}
              className="flex-1"
            >
              {String(t('common.cancel'))}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleStartInPerson}
              disabled={startingAttempt || !inPersonInfo.name.trim()}
              className="flex-1"
            >
              {startingAttempt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('common.loading'))}
                </>
              ) : (
                String(t('levelTests.inPerson.startAttempt'))
              )}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  if (!inPersonMode) return null

  const q = questions[currentQuestionIdx]

  if (inPersonStage === 'taking' && q) {
    const currentAnswer = currentAnswers[q.id] ?? ''
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {String(t('levelTests.take.questionOf'))
                .replace('{current}', String(currentQuestionIdx + 1))
                .replace('{total}', String(questions.length))}
            </div>
            <div className="text-xs text-gray-400">
              {String(t('levelTests.inPerson.answered'))
                .replace('{count}', String(answeredCount))
                .replace('{total}', String(questions.length))}
            </div>
            <div className="text-xs text-gray-400 min-w-[60px]">
              {saving
                ? String(t('levelTests.inPerson.saving'))
                : savedIndicator
                ? String(t('levelTests.inPerson.saved'))
                : ''}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCloseInPerson}>
            <X className="w-4 h-4 mr-2" />
            {String(t('common.close'))}
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">{q.question}</h2>

          {q.type === 'multiple_choice' && q.choices && (
            <div className="space-y-3">
              {q.choices.map((c, i) => {
                const letter = String.fromCharCode(65 + i)
                const isSelected = currentAnswer === c
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, c)}
                    className={`w-full text-left p-4 rounded-lg border-2 text-lg transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-semibold mr-3">{letter}.</span>{c}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {['True', 'False'].map(v => {
                const isSelected = currentAnswer.toLowerCase() === v.toLowerCase()
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, v)}
                    className={`p-6 rounded-lg border-2 text-lg font-medium transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {v}
                  </button>
                )
              })}
            </div>
          )}

          {q.type === 'short_answer' && (
            <textarea
              value={currentAnswer}
              onChange={e => handleAnswerChange(q.id, e.target.value)}
              rows={5}
              className="w-full p-4 rounded-lg border-2 border-gray-200 focus:border-primary focus:ring-0 focus:outline-none text-lg"
              placeholder="..."
            />
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx(i => i - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {String(t('common.previous'))}
          </Button>
          {currentQuestionIdx === questions.length - 1 ? (
            <Button onClick={handleRequestFinish}>
              {String(t('levelTests.inPerson.finish'))}
            </Button>
          ) : (
            <Button onClick={() => setCurrentQuestionIdx(i => i + 1)}>
              {String(t('common.next'))}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Finish confirmation */}
        <Modal isOpen={showFinishConfirm} onClose={() => !submittingAttempt && setShowFinishConfirm(false)} size="md">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">{String(t('levelTests.inPerson.finish'))}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowFinishConfirm(false)} className="p-1">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {answeredCount < questions.length && (
                <p className="text-sm text-orange-600">
                  {String(t('levelTests.inPerson.unansweredWarning')).replace(
                    '{count}',
                    String(questions.length - answeredCount)
                  )}
                </p>
              )}
              <p className="text-sm text-gray-600">{String(t('levelTests.inPerson.confirmFinish'))}</p>
            </div>
            <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFinishConfirm(false)}
                disabled={submittingAttempt}
                className="flex-1"
              >
                {String(t('common.cancel'))}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmFinish}
                disabled={submittingAttempt}
                className="flex-1"
              >
                {submittingAttempt ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {String(t('levelTests.take.submitting'))}
                  </>
                ) : (
                  String(t('levelTests.inPerson.finish'))
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  if (inPersonStage === 'results' && resultsSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-end p-4 border-b">
          <Button variant="ghost" size="sm" onClick={handleCloseInPerson}>
            <X className="w-4 h-4 mr-2" />
            {String(t('common.close'))}
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-8 w-full">
          <div className="max-w-md mx-auto text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{String(t('levelTests.take.results.title'))}</h2>
            <p className="text-sm text-gray-600 mb-6">{String(t('levelTests.take.instructorMessage'))}</p>

            {resultsSummary?.needs_manual_grading && (
              <Card className="p-4 mb-4 bg-amber-50 border-amber-200 text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-900 mb-3">
                      {String(t('levelTests.detail.analysisRequiresGrading'))}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiGradeOnResults}
                      disabled={aiGrading}
                      className="w-full"
                    >
                      {aiGrading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{String(t('levelTests.detail.aiGrading'))}</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />{String(t('levelTests.detail.aiGradeShortAnswers'))}</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!resultsSummary?.needs_manual_grading && (
              <Card className="p-4 text-left">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  {String(t('levelTests.detail.aiAnalysis'))}
                </h3>

                <AnalysisOptions
                  focus={analysis.focus}
                  setFocus={analysis.setFocus}
                  length={analysis.length}
                  setLength={analysis.setLength}
                  tone={analysis.tone}
                  setTone={analysis.setTone}
                  language={analysis.language}
                  setLanguage={analysis.setLanguage}
                />

                {resultsAnalysis ? (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                    {resultsAnalysis}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-3 text-center">
                    {String(t('levelTests.detail.noAnalysisYet'))}
                  </p>
                )}
                <Button
                  onClick={handleGenerateResultsAnalysis}
                  disabled={analyzingResults}
                  size="sm"
                  className="w-full"
                >
                  {analyzingResults ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{String(t('levelTests.detail.generatingAnalysis'))}</>
                  ) : resultsAnalysis ? (
                    <><Sparkles className="w-4 h-4 mr-2" />{String(t('levelTests.detail.regenerate'))}</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />{String(t('levelTests.detail.generateAiAnalysis'))}</>
                  )}
                </Button>
                {analyzingResults && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {String(t('levelTests.detail.generatingAnalysisHelp'))}
                  </p>
                )}
              </Card>
            )}

            {/* Instructor continue card */}
            <Card className="p-4 mt-4 text-left bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3 mb-3">
                <Presentation className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    {String(t('levelTests.take.continueAsInstructor'))}
                  </h3>
                  <p className="text-xs text-blue-800">
                    {String(t('levelTests.take.continueAsInstructorDescription'))}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowInstructorConfirm(true)}
                size="sm"
                className="w-full"
              >
                {String(t('levelTests.take.continueAsInstructor'))}
              </Button>
            </Card>

            <Button variant="outline" onClick={handleCloseInPerson} className="mt-3 w-full">
              {String(t('common.close'))}
            </Button>
          </div>
        </div>

        {/* Instructor confirmation modal */}
        <Modal
          isOpen={showInstructorConfirm}
          onClose={() => setShowInstructorConfirm(false)}
          size="md"
        >
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                {String(t('levelTests.take.continueConfirmTitle'))}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructorConfirm(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  {String(t('levelTests.take.continueConfirmBody'))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInstructorConfirm(false)}
                className="flex-1"
              >
                {String(t('common.cancel'))}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowInstructorConfirm(false)
                  handleContinueAsInstructor()
                }}
                className="flex-1"
              >
                {String(t('levelTests.take.continueAsInstructor'))}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return null
}
