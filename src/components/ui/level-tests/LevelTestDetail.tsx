"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import { DateInput } from '@/components/ui/common/DateInput'
import { Modal } from '@/components/ui/modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Search,
  Sparkles,
  FileQuestion,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

const selectStyles = '!h-9 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-1 px-2 text-sm'

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
  started_at?: string | null
  student_id?: string | null
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

type InPersonStage = 'name' | 'taking' | 'results'

interface AttemptAnswer {
  question_id: string
  answer: string
  is_correct: boolean | null
  manual_score?: number | null
  question?: string
  type?: string
  choices?: string[] | null
  correct_answer?: string
  explanation?: string | null
  order_index?: number
}

type AnalysisFocus = 'overall' | 'strengths' | 'weaknesses' | 'study_plan' | 'misconceptions'
type AnalysisLength = 'short' | 'medium' | 'detailed'
type AnalysisTone = 'encouraging' | 'direct' | 'formal'
type AnalysisLanguage = 'default' | 'english' | 'korean'

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
  const [showInPersonStartModal, setShowInPersonStartModal] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [printMenuOpen, setPrintMenuOpen] = useState(false)

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [studentSearch, setStudentSearch] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [copied, setCopied] = useState(false)

  // In-person mode state
  const [inPersonMode, setInPersonMode] = useState(false)
  const [inPersonStage, setInPersonStage] = useState<InPersonStage>('name')
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
  const [resultsSummary, setResultsSummary] = useState<{
    score: number | null
    correct: number
    auto_graded: number
    total: number
    needs_manual_grading: boolean
  } | null>(null)
  const [resultsAnalysis, setResultsAnalysis] = useState<string | null>(null)
  const [analyzingResults, setAnalyzingResults] = useState(false)

  // Attempt detail modal state
  const [showAttemptDetail, setShowAttemptDetail] = useState(false)
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null)
  const [attemptAnswers, setAttemptAnswers] = useState<AttemptAnswer[]>([])
  const [attemptLoading, setAttemptLoading] = useState(false)
  const [attemptAnalysis, setAttemptAnalysis] = useState<string | null>(null)
  const [analyzingAttempt, setAnalyzingAttempt] = useState(false)
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>('overall')
  const [analysisLength, setAnalysisLength] = useState<AnalysisLength>('medium')
  const [analysisTone, setAnalysisTone] = useState<AnalysisTone>('encouraging')
  const [analysisLanguage, setAnalysisLanguage] = useState<AnalysisLanguage>('default')
  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null)
  const [aiGrading, setAiGrading] = useState(false)

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

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('user_id, users(name, email)')
      .eq('academy_id', academyId)
    setStudents((data as unknown as Student[]) || [])
  }, [academyId])

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

  const openAssignModal = () => {
    loadStudents()
    setStudentSearch('')
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
    window.open(`/print/level-test/${testId}?mode=${mode}`, '_blank')
    setPrintMenuOpen(false)
  }

  const filteredStudents = useMemo(() => {
    const searchLower = studentSearch.toLowerCase()
    if (!searchLower) return students
    return students.filter(s => (s.users?.name || '').toLowerCase().includes(searchLower))
  }, [students, studentSearch])

  // ============ In-person flow ============
  const openInPersonStart = () => {
    loadStudents()
    setInPersonInfo({ name: '', studentId: null })
    setShowInPersonStartModal(true)
  }

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
      setShowInPersonStartModal(false)
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
      // Flush any pending save first
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
        body: JSON.stringify({
          focus: analysisFocus,
          length: analysisLength,
          tone: analysisTone,
          analysis_language: analysisLanguage === 'default' ? undefined : analysisLanguage,
        }),
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

  const handleContinueAsInstructor = async () => {
    if (!currentAttemptId) return
    // Find the attempt by id in the attempts list, or fall back to fetching latest
    let attempt = attempts.find(a => a.id === currentAttemptId)
    if (!attempt) {
      // Refresh and try again
      await loadAttempts()
      attempt = attempts.find(a => a.id === currentAttemptId)
    }
    // Close in-person mode
    setInPersonMode(false)
    setInPersonStage('name')
    const savedAttemptId = currentAttemptId
    setCurrentAttemptId(null)
    setCurrentAnswers({})
    setCurrentQuestionIdx(0)
    setResultsSummary(null)
    setResultsAnalysis(null)

    // Open attempt detail; if we couldn't find it yet, try one more time after loadAttempts
    if (attempt) {
      openAttemptDetail(attempt)
    } else {
      // Last resort: fetch attempts again then open
      await loadAttempts()
      // After loadAttempts, attempts state is updated but the closure still has old value
      // Use a timeout so React commits before we try again
      setTimeout(() => {
        const found = attempts.find(a => a.id === savedAttemptId)
        if (found) openAttemptDetail(found)
      }, 100)
    }
  }

  const handleCloseInPerson = () => {
    setInPersonMode(false)
    setInPersonStage('name')
    setCurrentAttemptId(null)
    setCurrentAnswers({})
    setCurrentQuestionIdx(0)
    setResultsSummary(null)
    setResultsAnalysis(null)
    loadAttempts()
  }

  // ============ Attempt detail modal ============
  const openAttemptDetail = async (attempt: Attempt) => {
    setSelectedAttempt(attempt)
    setShowAttemptDetail(true)
    setAttemptAnswers([])
    setAttemptAnalysis(null)
    setAttemptLoading(true)
    try {
      const headers = await authHeaders()

      // Use proper API route (bypasses RLS issues from client-side queries)
      const ansRes = await fetch(`/api/level-tests/attempts/${attempt.id}/answers`, { headers })
      if (ansRes.ok) {
        const ansJson = await ansRes.json()
        setAttemptAnswers(ansJson.answers || [])
      }

      // Fetch existing analysis
      const res = await fetch(`/api/level-tests/attempts/${attempt.id}/analyze`, { headers })
      if (res.ok) {
        const json = await res.json()
        if (json.analysis) setAttemptAnalysis(json.analysis)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAttemptLoading(false)
    }
  }

  const handleGenerateAttemptAnalysis = async () => {
    if (!selectedAttempt) return
    setAnalyzingAttempt(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/attempts/${selectedAttempt.id}/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          focus: analysisFocus,
          length: analysisLength,
          tone: analysisTone,
          analysis_language: analysisLanguage === 'default' ? undefined : analysisLanguage,
        }),
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

  const applyAttemptUpdate = useCallback((attempt: { id: string; score: number | null; status: string; needs_manual_grading: boolean }) => {
    setSelectedAttempt(prev => (prev ? { ...prev, score: attempt.score, status: attempt.status, needs_manual_grading: attempt.needs_manual_grading } : prev))
  }, [])

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
      loadAttempts()
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
      loadAttempts()
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    } finally {
      setAiGrading(false)
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
      setCurrentAttemptId(attempt.id)
      setInPersonInfo({ name: attempt.taker_name, studentId: attempt.student_id ?? null })
      setCurrentAnswers(answers)
      setCurrentQuestionIdx(0)
      setResultsSummary(null)
      setResultsAnalysis(null)
      setInPersonStage('taking')
      setInPersonMode(true)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('common.error')))
    }
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

  // ============ In-person full-screen mode ============
  if (inPersonMode) {
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

                  {/* Analysis options */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        {String(t('levelTests.detail.analysisFocus'))}
                      </Label>
                      <Select value={analysisFocus} onValueChange={(v) => setAnalysisFocus(v as AnalysisFocus)}>
                        <SelectTrigger className={selectStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overall">{String(t('levelTests.detail.focusOverall'))}</SelectItem>
                          <SelectItem value="strengths">{String(t('levelTests.detail.focusStrengths'))}</SelectItem>
                          <SelectItem value="weaknesses">{String(t('levelTests.detail.focusWeaknesses'))}</SelectItem>
                          <SelectItem value="study_plan">{String(t('levelTests.detail.focusStudyPlan'))}</SelectItem>
                          <SelectItem value="misconceptions">{String(t('levelTests.detail.focusMisconceptions'))}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        {String(t('levelTests.detail.analysisLength'))}
                      </Label>
                      <Select value={analysisLength} onValueChange={(v) => setAnalysisLength(v as AnalysisLength)}>
                        <SelectTrigger className={selectStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">{String(t('levelTests.detail.lengthShort'))}</SelectItem>
                          <SelectItem value="medium">{String(t('levelTests.detail.lengthMedium'))}</SelectItem>
                          <SelectItem value="detailed">{String(t('levelTests.detail.lengthDetailed'))}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        {String(t('levelTests.detail.analysisTone'))}
                      </Label>
                      <Select value={analysisTone} onValueChange={(v) => setAnalysisTone(v as AnalysisTone)}>
                        <SelectTrigger className={selectStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="encouraging">{String(t('levelTests.detail.toneEncouraging'))}</SelectItem>
                          <SelectItem value="direct">{String(t('levelTests.detail.toneDirect'))}</SelectItem>
                          <SelectItem value="formal">{String(t('levelTests.detail.toneFormal'))}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground/70">
                        {String(t('levelTests.detail.analysisLanguage'))}
                      </Label>
                      <Select value={analysisLanguage} onValueChange={(v) => setAnalysisLanguage(v as AnalysisLanguage)}>
                        <SelectTrigger className={selectStyles}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{String(t('levelTests.detail.analysisLanguageDefault'))}</SelectItem>
                          <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
                          <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                  onClick={handleContinueAsInstructor}
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
        </div>
      )
    }
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
            onClick={openAssignModal}
            className="h-8 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            {String(t('levelTests.detail.assign'))}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openInPersonStart}
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
          <div className="text-sm text-gray-500 text-center py-4">
            {String(t('levelTests.detail.noResults'))}
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
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.detail.shareEnable'))}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={test.share_enabled}
                  onClick={() => handleToggleShare(!test.share_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    test.share_enabled ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      test.share_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
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
                    <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0 h-10">
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
                <DateInput
                  value={dueDate}
                  onChange={setDueDate}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.assignModal.selectStudents'))}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder={String(t('levelTests.assignModal.searchPlaceholder'))}
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="h-10 pl-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="border border-border rounded-lg divide-y divide-gray-100 max-h-80 overflow-auto">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">—</div>
                  ) : (
                    filteredStudents.map(s => {
                      const isSelected = selectedStudents.has(s.user_id)
                      return (
                        <button
                          key={s.user_id}
                          type="button"
                          onClick={() => {
                            setSelectedStudents(prev => {
                              const next = new Set(prev)
                              if (next.has(s.user_id)) next.delete(s.user_id)
                              else next.add(s.user_id)
                              return next
                            })
                          }}
                          className={`flex items-center gap-3 p-3 w-full text-left hover:bg-gray-50 cursor-pointer ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
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

      {/* In-Person Start Modal */}
      <Modal
        isOpen={showInPersonStartModal}
        onClose={() => !startingAttempt && setShowInPersonStartModal(false)}
        size="md"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.detail.takeInPerson'))}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => !startingAttempt && setShowInPersonStartModal(false)}
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
              onClick={() => setShowInPersonStartModal(false)}
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

      {/* Attempt Detail Modal */}
      <Modal isOpen={showAttemptDetail} onClose={() => setShowAttemptDetail(false)} size="lg">
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
            <Button variant="ghost" size="sm" onClick={() => setShowAttemptDetail(false)} className="p-1">
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

                    {/* Analysis options */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground/70">
                          {String(t('levelTests.detail.analysisFocus'))}
                        </Label>
                        <Select value={analysisFocus} onValueChange={(v) => setAnalysisFocus(v as AnalysisFocus)}>
                          <SelectTrigger className={selectStyles}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overall">{String(t('levelTests.detail.focusOverall'))}</SelectItem>
                            <SelectItem value="strengths">{String(t('levelTests.detail.focusStrengths'))}</SelectItem>
                            <SelectItem value="weaknesses">{String(t('levelTests.detail.focusWeaknesses'))}</SelectItem>
                            <SelectItem value="study_plan">{String(t('levelTests.detail.focusStudyPlan'))}</SelectItem>
                            <SelectItem value="misconceptions">{String(t('levelTests.detail.focusMisconceptions'))}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground/70">
                          {String(t('levelTests.detail.analysisLength'))}
                        </Label>
                        <Select value={analysisLength} onValueChange={(v) => setAnalysisLength(v as AnalysisLength)}>
                          <SelectTrigger className={selectStyles}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">{String(t('levelTests.detail.lengthShort'))}</SelectItem>
                            <SelectItem value="medium">{String(t('levelTests.detail.lengthMedium'))}</SelectItem>
                            <SelectItem value="detailed">{String(t('levelTests.detail.lengthDetailed'))}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground/70">
                          {String(t('levelTests.detail.analysisTone'))}
                        </Label>
                        <Select value={analysisTone} onValueChange={(v) => setAnalysisTone(v as AnalysisTone)}>
                          <SelectTrigger className={selectStyles}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encouraging">{String(t('levelTests.detail.toneEncouraging'))}</SelectItem>
                            <SelectItem value="direct">{String(t('levelTests.detail.toneDirect'))}</SelectItem>
                            <SelectItem value="formal">{String(t('levelTests.detail.toneFormal'))}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground/70">
                          {String(t('levelTests.detail.analysisLanguage'))}
                        </Label>
                        <Select value={analysisLanguage} onValueChange={(v) => setAnalysisLanguage(v as AnalysisLanguage)}>
                          <SelectTrigger className={selectStyles}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{String(t('levelTests.detail.analysisLanguageDefault'))}</SelectItem>
                            <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
                            <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Analysis text OR empty state */}
                    {attemptAnalysis ? (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        {attemptAnalysis}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mb-3 text-center">
                        {String(t('levelTests.detail.noAnalysisYet'))}
                      </p>
                    )}

                    {/* Single bottom action button */}
                    <Button
                      onClick={handleGenerateAttemptAnalysis}
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
              onClick={() => setShowAttemptDetail(false)}
              className="flex-1"
            >
              {String(t('common.close'))}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
