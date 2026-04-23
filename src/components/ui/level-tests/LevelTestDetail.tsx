"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import {
  ArrowLeft,
  Share2,
  Printer,
  Users,
  Presentation,
  Trash2,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

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
  difficulty: string
  language: string
  question_count: number
  time_limit_minutes: number | null
  share_enabled: boolean
  share_token: string | null
  subjects?: { id: string; name: string } | null
}

interface Attempt {
  id: string
  taker_name: string
  taker_email: string | null
  score: number | null
  total_questions: number
  submitted_at: string
  status: string
  needs_manual_grading: boolean
}

interface Student {
  user_id: string
  users: { name: string; email: string } | null
}

interface LevelTestDetailProps {
  academyId: string
  testId: string
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
  const [printMenuOpen, setPrintMenuOpen] = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [copied, setCopied] = useState(false)
  const [inPersonMode, setInPersonMode] = useState(false)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)

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

  const loadAttempts = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}/attempts`, { headers })
      const json = await res.json()
      if (res.ok) setAttempts(json.attempts || [])
    } catch (e) {
      console.error(e)
    }
  }, [testId])

  useEffect(() => {
    loadTest()
    loadAttempts()
  }, [loadTest, loadAttempts])

  const handleToggleShare = async (enabled: boolean) => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ share_enabled: enabled }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTest(prev => (prev ? { ...prev, share_enabled: enabled, share_token: json.test.share_token } : prev))
      showSuccessToast(String(t('common.success')))
    } catch {
      showErrorToast(String(t('levelTests.errors.shareFailed')))
    }
  }

  const handleCopyLink = async () => {
    if (!test?.share_token) return
    const url = `${window.location.origin}/test/${test.share_token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    showSuccessToast(String(t('levelTests.detail.shareCopied')))
    setTimeout(() => setCopied(false), 2000)
  }

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('user_id, users(name, email)')
      .eq('academy_id', academyId)
    setStudents((data as unknown as Student[]) || [])
  }, [academyId])

  const openAssignModal = () => {
    loadStudents()
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (selectedStudents.size === 0) return
    setAssigning(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          student_ids: Array.from(selectedStudents),
          due_date: dueDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showSuccessToast(
        String(t('levelTests.assignModal.assigned')).replace('{count}', String(selectedStudents.size))
      )
      setShowAssignModal(false)
      setSelectedStudents(new Set())
      setDueDate('')
    } catch {
      showErrorToast(String(t('common.error')))
    } finally {
      setAssigning(false)
    }
  }

  const handleDelete = async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testId}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error('Delete failed')
      showSuccessToast(String(t('common.delete')))
      router.push('/level-tests')
    } catch {
      showErrorToast(String(t('levelTests.errors.deleteFailed')))
    }
  }

  const openPrint = (mode: 'student' | 'answer_key' | 'answer_sheet') => {
    window.open(`/level-tests/${testId}/print?mode=${mode}`, '_blank')
    setPrintMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  // In-person mode full-screen
  if (inPersonMode) {
    const q = questions[currentQuestionIdx]
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-sm text-gray-500">
            {String(t('levelTests.take.questionOf'))
              .replace('{current}', String(currentQuestionIdx + 1))
              .replace('{total}', String(questions.length))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setInPersonMode(false); setCurrentQuestionIdx(0); setShowCorrectAnswer(false) }}>
            <X className="w-4 h-4 mr-2" />
            {String(t('common.close'))}
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
          {q && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">{q.question}</h2>
              {q.type === 'multiple_choice' && q.choices && (
                <div className="space-y-3">
                  {q.choices.map((c, i) => {
                    const letter = String.fromCharCode(65 + i)
                    const isCorrect = showCorrectAnswer && c === q.correct_answer
                    return (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border-2 text-lg ${
                          isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <span className="font-semibold mr-3">{letter}.</span>{c}
                      </div>
                    )
                  })}
                </div>
              )}
              {q.type === 'true_false' && (
                <div className="space-y-3">
                  {['True', 'False'].map(v => {
                    const isCorrect = showCorrectAnswer && v.toLowerCase() === q.correct_answer.toLowerCase()
                    return (
                      <div
                        key={v}
                        className={`p-4 rounded-lg border-2 text-lg ${
                          isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        {v}
                      </div>
                    )
                  })}
                </div>
              )}
              {q.type === 'short_answer' && showCorrectAnswer && (
                <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                  <div className="text-sm text-green-700 font-medium mb-1">
                    {String(t('levelTests.detail.correctAnswer'))}
                  </div>
                  <div className="text-lg">{q.correct_answer}</div>
                </div>
              )}
              {showCorrectAnswer && q.explanation && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-gray-700">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    {String(t('levelTests.detail.explanation'))}
                  </div>
                  {q.explanation}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            disabled={currentQuestionIdx === 0}
            onClick={() => { setCurrentQuestionIdx(i => i - 1); setShowCorrectAnswer(false) }}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {String(t('common.previous'))}
          </Button>
          <Button variant="outline" onClick={() => setShowCorrectAnswer(s => !s)}>
            {showCorrectAnswer ? 'Hide Answer' : String(t('levelTests.detail.correctAnswer'))}
          </Button>
          <Button
            disabled={currentQuestionIdx === questions.length - 1}
            onClick={() => { setCurrentQuestionIdx(i => i + 1); setShowCorrectAnswer(false) }}
          >
            {String(t('common.next'))}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <Button variant="ghost" size="sm" onClick={() => router.push('/level-tests')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {String(t('common.back'))}
      </Button>

      <Card className="p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{test.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
          {test.subjects?.name && <span className="px-2 py-1 bg-gray-100 rounded">{test.subjects.name}</span>}
          {test.grade && <span className="px-2 py-1 bg-gray-100 rounded">{test.grade}</span>}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded">{test.question_count} Q</span>
          {test.time_limit_minutes && (
            <span className="px-2 py-1 bg-gray-100 rounded">{test.time_limit_minutes} min</span>
          )}
          <span className="px-2 py-1 bg-gray-100 rounded capitalize">{test.language}</span>
        </div>

        <div className="flex flex-wrap gap-2 relative">
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.share'))}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setPrintMenuOpen(v => !v)}>
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
          <Button variant="outline" size="sm" onClick={openAssignModal}>
            <Users className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.assign'))}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setInPersonMode(true)}>
            <Presentation className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.takeInPerson'))}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.delete'))}
          </Button>
        </div>
      </Card>

      {/* Questions */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {String(t('levelTests.detail.questions'))} ({questions.length})
        </h2>
        <div className="space-y-6">
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
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {String(t('levelTests.detail.attempts'))} ({attempts.length})
        </h2>
        {attempts.length === 0 ? (
          <div className="text-sm text-gray-500">—</div>
        ) : (
          <div className="divide-y">
            {attempts.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{a.taker_name}</div>
                  {a.taker_email && <div className="text-xs text-gray-500">{a.taker_email}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(a.submitted_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {a.score !== null ? `${a.score}%` : '—'}
                  </div>
                  {a.needs_manual_grading && (
                    <div className="text-xs text-orange-600">Manual grading</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Share Modal */}
      <Modal isOpen={showShareModal} onClose={() => setShowShareModal(false)} size="lg">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.detail.share'))}</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowShareModal(false)} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="space-y-5">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={test.share_enabled}
                  onChange={e => handleToggleShare(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-primary"
                />
                <span className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.detail.shareEnable'))}
                </span>
              </label>

              {test.share_enabled && test.share_token && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t('levelTests.detail.shareLink'))}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/test/${test.share_token}` : ''}
                      className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(false)}
              className="flex-1"
            >
              {String(t('common.close'))}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={showAssignModal} onClose={() => !assigning && setShowAssignModal(false)} size="lg">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.assignModal.title'))}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !assigning && setShowAssignModal(false)}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.assignModal.dueDate'))}
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.assignModal.selectStudents'))}
                </Label>
                <div className="border border-border rounded-lg divide-y divide-gray-100 max-h-80 overflow-auto">
                  {students.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">—</div>
                  ) : (
                    students.map(s => (
                      <label
                        key={s.user_id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(s.user_id)}
                          onChange={e => {
                            setSelectedStudents(prev => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(s.user_id)
                              else next.delete(s.user_id)
                              return next
                            })
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{s.users?.name || '—'}</div>
                          <div className="text-xs text-gray-500 truncate">{s.users?.email || ''}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAssignModal(false)}
              disabled={assigning}
              className="flex-1"
            >
              {String(t('common.cancel'))}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAssign}
              disabled={assigning || selectedStudents.size === 0}
              className="flex-1"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('levelTests.assignModal.assigning'))}
                </>
              ) : (
                String(t('levelTests.assignModal.assign'))
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} size="md">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{String(t('levelTests.detail.delete'))}</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <p className="text-sm text-gray-600">{String(t('levelTests.detail.confirmDelete'))}</p>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              {String(t('common.cancel'))}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {String(t('common.delete'))}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
