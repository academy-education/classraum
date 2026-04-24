"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import {
  X,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { authHeaders } from '../hooks/authHeaders'
import { useAnalysisOptions } from '../hooks/useAnalysisOptions'
import { AnalysisOptions } from '../components/AnalysisOptions'
import type { Attempt, AttemptAnswer } from '../types'

interface AttemptUpdate {
  id: string
  score: number | null
  status: string
  needs_manual_grading: boolean
}

interface AttemptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  attempt: Attempt | null
  onAttemptUpdate: (update: AttemptUpdate) => void
}

export function AttemptDetailModal({ isOpen, onClose, attempt, onAttemptUpdate }: AttemptDetailModalProps) {
  const { t } = useTranslation()
  const analysis = useAnalysisOptions()

  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(attempt)
  const [attemptAnswers, setAttemptAnswers] = useState<AttemptAnswer[]>([])
  const [attemptLoading, setAttemptLoading] = useState(false)
  const [attemptAnalysis, setAttemptAnalysis] = useState<string | null>(null)
  const [analyzingAttempt, setAnalyzingAttempt] = useState(false)
  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null)
  const [aiGrading, setAiGrading] = useState(false)

  useEffect(() => {
    setSelectedAttempt(attempt)
  }, [attempt])

  const loadData = useCallback(async (attemptId: string) => {
    setAttemptAnswers([])
    setAttemptAnalysis(null)
    setAttemptLoading(true)
    try {
      const headers = await authHeaders()

      const ansRes = await fetch(`/api/level-tests/attempts/${attemptId}/answers`, { headers })
      if (ansRes.ok) {
        const ansJson = await ansRes.json()
        setAttemptAnswers(ansJson.answers || [])
      }

      const res = await fetch(`/api/level-tests/attempts/${attemptId}/analyze`, { headers })
      if (res.ok) {
        const json = await res.json()
        if (json.analysis) setAttemptAnalysis(json.analysis)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAttemptLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && attempt) {
      loadData(attempt.id)
    }
  }, [isOpen, attempt, loadData])

  const refetchAttemptAnswers = useCallback(async (attemptId: string) => {
    try {
      const headers = await authHeaders()
      const ansRes = await fetch(`/api/level-tests/attempts/${attemptId}/answers`, { headers })
      if (ansRes.ok) {
        const ansJson = await ansRes.json()
        setAttemptAnswers(ansJson.answers || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const applyAttemptUpdate = useCallback((update: AttemptUpdate) => {
    setSelectedAttempt(prev => (prev ? { ...prev, score: update.score, status: update.status, needs_manual_grading: update.needs_manual_grading } : prev))
    onAttemptUpdate(update)
  }, [onAttemptUpdate])

  const handleGrade = async (questionId: string, isCorrect: boolean) => {
    if (!selectedAttempt) return
    setGradingQuestionId(questionId)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${selectedAttempt.id}/grade`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ question_id: questionId, is_correct: isCorrect }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Grade failed')
      if (json.attempt) applyAttemptUpdate(json.attempt)
      await refetchAttemptAnswers(selectedAttempt.id)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setGradingQuestionId(null)
    }
  }

  const handleAiGrade = async () => {
    if (!selectedAttempt) return
    setAiGrading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${selectedAttempt.id}/ai-grade`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'AI grade failed')
      if (json.attempt) applyAttemptUpdate(json.attempt)
      await refetchAttemptAnswers(selectedAttempt.id)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setAiGrading(false)
    }
  }

  const handleGenerateAnalysis = async () => {
    if (!selectedAttempt) return
    setAnalyzingAttempt(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${selectedAttempt.id}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(analysis.toApiBody()),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analyze failed')
      setAttemptAnalysis(json.analysis)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setAnalyzingAttempt(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {selectedAttempt?.taker_name || ''}
            </h2>
            {selectedAttempt && (
              <div className="text-xs text-gray-500 mt-1">
                {String(t('levelTests.detail.score'))}:{' '}
                <span className="font-semibold text-gray-900">
                  {selectedAttempt.needs_manual_grading
                    ? String(t('levelTests.detail.scoreUnavailable'))
                    : (selectedAttempt.score !== null ? `${selectedAttempt.score}%` : '—')}
                </span>
                {' · '}
                {new Date(selectedAttempt.submitted_at).toLocaleString()}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
          {attemptLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-b last:border-b-0 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-6 w-8 bg-gray-200 rounded"></div>
                  </div>
                  <div className="pl-10 space-y-2">
                    <div className="h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              ))}
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-32"></div>
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                        <div className="h-9 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-9 bg-gray-200 rounded"></div>
                </div>
              </Card>
            </div>
          ) : (
            <>
              {attemptAnswers.length > 0 && (() => {
                const shortAnswers = attemptAnswers.filter(a => a.type === 'short_answer')
                const ungradedCount = shortAnswers.filter(a => a.is_correct === null).length
                const totalAnswered = attemptAnswers.length
                const gradedCount = attemptAnswers.filter(a => a.is_correct !== null).length

                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      {ungradedCount === 0
                        ? <span className="text-green-700 font-medium">{String(t('levelTests.detail.fullyGraded'))}</span>
                        : <span className="text-gray-700">
                            {String(t('levelTests.detail.partiallyGraded'))
                              .replace('{graded}', String(gradedCount))
                              .replace('{total}', String(totalAnswered))}
                          </span>
                      }
                    </div>
                    {ungradedCount > 0 && (
                      <Button variant="outline" size="sm" onClick={handleAiGrade} disabled={aiGrading}>
                        {aiGrading ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{String(t('levelTests.detail.aiGrading'))}</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />{String(t('levelTests.detail.aiGradeShortAnswers'))}</>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })()}
              <div className="space-y-4">
                {(attemptAnswers.length > 0 ? attemptAnswers : []).map((a, i) => {
                  const answerText = (a.answer ?? '').toString().trim()
                  const isCorrect = a.is_correct
                  let answerClass = 'bg-gray-50 border-gray-200 text-gray-900'
                  let badgeLabel = String(t('levelTests.detail.manualGrading'))
                  let badgeClass = 'bg-gray-100 text-gray-700'
                  if (isCorrect === true) {
                    answerClass = 'bg-green-50 border-green-300 text-green-900'
                    badgeLabel = '✓'
                    badgeClass = 'bg-green-100 text-green-800'
                  } else if (isCorrect === false) {
                    answerClass = 'bg-red-50 border-red-300 text-red-900'
                    badgeLabel = '✗'
                    badgeClass = 'bg-red-100 text-red-800'
                  }

                  return (
                    <div key={a.question_id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-900 mb-1">{a.question}</div>
                          {a.type && (
                            <div className="text-xs text-gray-500 capitalize">{a.type.replace('_', ' ')}</div>
                          )}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeClass} flex-shrink-0`}>
                          {badgeLabel}
                        </span>
                      </div>

                      <div className="pl-10 space-y-2">
                        <div className={`text-sm px-3 py-2 rounded border ${answerClass}`}>
                          <div className="text-xs uppercase tracking-wide opacity-75 mb-1">
                            {String(t('levelTests.detail.studentAnswer'))}
                          </div>
                          <div className="font-medium">{answerText || '—'}</div>
                        </div>

                        {a.type !== 'short_answer' && a.correct_answer !== answerText && (
                          <div className="text-sm px-3 py-2 rounded bg-green-50 border border-green-200 text-green-900">
                            <div className="text-xs text-green-700 uppercase tracking-wide mb-1">
                              {String(t('levelTests.detail.correctAnswer'))}
                            </div>
                            <div className="font-medium">{a.correct_answer}</div>
                          </div>
                        )}

                        {a.type === 'short_answer' && a.correct_answer && (
                          <div className="text-sm px-3 py-2 rounded bg-blue-50 border border-blue-200 text-blue-900">
                            <div className="text-xs text-blue-700 uppercase tracking-wide mb-1">
                              {String(t('levelTests.detail.correctAnswer'))} ({String(t('levelTests.detail.manualGrading'))})
                            </div>
                            <div className="font-medium">{a.correct_answer}</div>
                          </div>
                        )}

                        {a.type === 'short_answer' && a.is_correct === null && (
                          <div className="flex gap-2 mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrade(a.question_id, true)}
                              disabled={gradingQuestionId === a.question_id}
                              className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {String(t('levelTests.detail.markCorrect'))}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGrade(a.question_id, false)}
                              disabled={gradingQuestionId === a.question_id}
                              className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              {String(t('levelTests.detail.markIncorrect'))}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {attemptAnswers.length === 0 && (
                  <div className="text-center py-8 text-sm text-gray-500">—</div>
                )}
              </div>

              {selectedAttempt && selectedAttempt.needs_manual_grading ? (
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900">
                      {String(t('levelTests.detail.analysisRequiresGrading'))}
                    </p>
                  </div>
                </Card>
              ) : selectedAttempt && !selectedAttempt.needs_manual_grading && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      {String(t('levelTests.detail.aiAnalysis'))}
                    </h3>
                  </div>

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

                  {attemptAnalysis ? (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                      {attemptAnalysis}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3 text-center">
                      {String(t('levelTests.detail.noAnalysisYet'))}
                    </p>
                  )}

                  <Button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzingAttempt}
                    size="sm"
                    variant={attemptAnalysis ? 'outline' : 'default'}
                    className="w-full"
                  >
                    {analyzingAttempt ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {String(t('levelTests.detail.generatingAnalysis'))}
                      </>
                    ) : attemptAnalysis ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {String(t('levelTests.detail.regenerate'))}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {String(t('levelTests.detail.generateAiAnalysis'))}
                      </>
                    )}
                  </Button>
                  {analyzingAttempt && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {String(t('levelTests.detail.generatingAnalysisHelp'))}
                    </p>
                  )}
                </Card>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            {String(t('common.close'))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
