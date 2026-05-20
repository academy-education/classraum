"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { useTranslation } from '@/hooks/useTranslation'
import { getDateLocale } from '@/utils/dateUtils'
import { useCreateShortcut } from '@/hooks/useCreateShortcut'
import { showSuccessToast, showErrorToast } from '@/stores'
import { FileQuestion, Plus, Trash2, Loader2, X, Grid3X3, Rows3 } from 'lucide-react'
import { TableCheckbox, BulkActionBar } from '@/components/ui/dashboard'

interface Subject {
  id: string
  name: string
}

interface LevelTest {
  id: string
  title: string
  grade: string | null
  difficulty: string
  language: string
  question_count: number
  question_types: string[]
  share_enabled: boolean
  share_token: string | null
  created_at: string
  subjects?: { id: string; name: string } | null
}

interface LevelTestsPageProps {
  academyId: string
}

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'expert'] as const
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer'] as const

const inputStyles = 'h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'
const selectStyles = '!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3'

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export function LevelTestsPage({ academyId }: LevelTestsPageProps) {
  const { t, language } = useTranslation()
  const router = useRouter()
  const [tests, setTests] = useState<LevelTest[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Wire 'n' shortcut + command-palette "Create new" → open create modal.
  // Defined here so the hook references the state as soon as it exists.
  const [generating, setGenerating] = useState(false)
  const [testToDelete, setTestToDelete] = useState<LevelTest | null>(null)

  // Default to the table ('list') view since it's now on the left of the toggle.
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useCreateShortcut({
    onTrigger: () => setShowCreateModal(true),
    enabled: !showCreateModal && !testToDelete && !showBulkDeleteConfirm,
  })

  const [formData, setFormData] = useState({
    subject_id: '',
    subject_name: '',
    grade: '',
    difficulty: 'intermediate' as typeof DIFFICULTIES[number],
    language: 'english' as 'english' | 'korean',
    question_types: ['multiple_choice'] as string[],
    question_count: 10,
    mc_choice_count: 4,
    time_limit_minutes: '',
    extra_comments: '',
  })

  const loadTests = useCallback(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/level-tests', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setTests(json.tests || [])
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('levelTests.errors.loadFailed')))
    } finally {
      setLoading(false)
    }
  }, [t])

  const loadSubjects = useCallback(async () => {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('academy_id', academyId)
      .order('name')
    setSubjects(data || [])
  }, [academyId])

  useEffect(() => {
    loadTests()
    loadSubjects()
  }, [loadTests, loadSubjects])

  const handleToggleType = (type: string) => {
    setFormData(prev => {
      const has = prev.question_types.includes(type)
      const next = has
        ? prev.question_types.filter(t => t !== type)
        : [...prev.question_types, type]
      return { ...prev, question_types: next.length > 0 ? next : prev.question_types }
    })
  }

  const resetForm = () => {
    setFormData({
      subject_id: '',
      subject_name: '',
      grade: '',
      difficulty: 'intermediate',
      language: 'english',
      question_types: ['multiple_choice'],
      question_count: 10,
      mc_choice_count: 4,
      time_limit_minutes: '',
      extra_comments: '',
    })
  }

  const handleGenerate = async () => {
    if (!formData.subject_name.trim()) {
      showErrorToast(String(t('levelTests.form.selectSubject')))
      return
    }
    if (formData.question_types.length === 0) {
      showErrorToast(String(t('levelTests.form.questionTypes')))
      return
    }

    setGenerating(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/level-tests', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          academy_id: academyId,
          subject_id: formData.subject_id || null,
          subject_name: formData.subject_name,
          grade: formData.grade || null,
          difficulty: formData.difficulty,
          language: formData.language,
          question_types: formData.question_types,
          question_count: formData.question_count,
          mc_choice_count: formData.mc_choice_count,
          time_limit_minutes: formData.time_limit_minutes ? parseInt(formData.time_limit_minutes) : null,
          extra_comments: formData.extra_comments.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generate failed')

      setShowCreateModal(false)
      resetForm()
      router.push(`/exams-and-scores/${json.test.id}`)
    } catch (e) {
      console.error(e)
      showErrorToast(String(t('levelTests.errors.generateFailed')), e instanceof Error ? e.message : '')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!testToDelete) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/level-tests/${testToDelete.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Delete failed')
      setTests(prev => prev.filter(t => t.id !== testToDelete.id))
      setTestToDelete(null)
      showSuccessToast(String(t('common.delete')))
    } catch {
      showErrorToast(String(t('levelTests.errors.deleteFailed')))
    }
  }

  // ===== Bulk status update (Public ↔ Private via share_enabled) =====
  const handleBulkStatusUpdate = async (shareEnabled: boolean) => {
    if (selectedTestIds.size === 0) return
    setBulkUpdating(true)
    try {
      const headers = await authHeaders()
      const ids = Array.from(selectedTestIds)
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/level-tests/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ share_enabled: shareEnabled }),
        }))
      )
      const succeeded = results
        .map((r, i) => r.status === 'fulfilled' && r.value.ok ? ids[i] : null)
        .filter((id): id is string => id !== null)
      if (succeeded.length === 0) throw new Error('All updates failed')
      // Optimistically update local state
      setTests(prev => prev.map(t => succeeded.includes(t.id) ? { ...t, share_enabled: shareEnabled } : t))
      showSuccessToast(String(t('levelTests.bulkStatusSuccess', { count: succeeded.length })))
    } catch {
      showErrorToast(String(t('levelTests.bulkStatusError')))
    } finally {
      setBulkUpdating(false)
    }
  }

  // ===== Bulk delete =====
  const handleBulkDelete = async () => {
    if (selectedTestIds.size === 0) return
    setBulkDeleting(true)
    try {
      const headers = await authHeaders()
      const ids = Array.from(selectedTestIds)
      // No bulk endpoint — fan out per id and tolerate partial failures.
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/level-tests/${id}`, { method: 'DELETE', headers }))
      )
      const succeeded = results
        .map((r, i) => r.status === 'fulfilled' && r.value.ok ? ids[i] : null)
        .filter((id): id is string => id !== null)
      if (succeeded.length === 0) throw new Error('All deletes failed')
      setTests(prev => prev.filter(t => !succeeded.includes(t.id)))
      setSelectedTestIds(new Set())
      setShowBulkDeleteConfirm(false)
      showSuccessToast(String(t('levelTests.bulkDeleteSuccess', { count: succeeded.length })))
    } catch {
      showErrorToast(String(t('levelTests.bulkDeleteError')))
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleSubjectChange = (id: string) => {
    const subj = subjects.find(s => s.id === id)
    setFormData(prev => ({
      ...prev,
      subject_id: id,
      subject_name: subj?.name || '',
    }))
  }

  if (loading) {
    return (
      <div className="p-4">
        {/* Real header — matches the loaded view exactly so there's no
            visual jump on first paint. Every other manager/teacher page
            does this; level-tests was the only outlier replacing the
            title + description with gray rectangles. */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{String(t('eyebrows.levelTests'))}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{String(t('levelTests.title'))}</h1>
            <p className="text-gray-500">{String(t('levelTests.description'))}</p>
          </div>
          <Button
            disabled
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 self-start sm:self-auto"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {String(t('levelTests.createTest'))}
          </Button>
        </div>
        <div className="flex justify-end mb-4 animate-pulse">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
          </div>
        </div>
        {/* Table-shaped skeleton — matches the default viewMode = 'list'
            so the loading state doesn't flash a card grid that then
            collapses into a table. Same column count + chrome (rounded
            card, gray header band) as the real table. */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50/60">
                <tr>
                  {/* Match the real header: checkbox + 6 labelled columns + actions slot */}
                  <th className="text-left p-3 sm:p-4 w-10">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                  </th>
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="text-left p-3 sm:p-4">
                      <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                    </th>
                  ))}
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...Array(6)].map((_, row) => (
                  <tr key={row}>
                    <td className="p-3 sm:p-4">
                      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                    {[...Array(6)].map((__, col) => (
                      <td key={col} className="p-3 sm:p-4">
                        <div className={`h-4 bg-gray-200 rounded animate-pulse ${col === 0 ? 'w-40' : col === 5 ? 'w-20' : 'w-24'}`} />
                      </td>
                    ))}
                    <td className="p-3 sm:p-4">
                      <div className="h-6 w-6 bg-gray-200 rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header - matches other pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{String(t('eyebrows.levelTests'))}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{String(t('levelTests.title'))}</h1>
          <p className="text-gray-500">{String(t('levelTests.description'))}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {String(t('levelTests.createTest'))}
          </Button>
        </div>
      </div>

      {/* View Mode Toggle — Table (default) on the left, Card on the right.
          Matches the convention used by sessions / classrooms / students / etc. */}
      {tests.length > 0 && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setViewMode('list'); setSelectedTestIds(new Set()) }}
              className={`h-9 px-3 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
              title={String(t('levelTests.detail.listView'))}
            >
              <Rows3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setViewMode('card'); setSelectedTestIds(new Set()) }}
              className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
              title={String(t('levelTests.detail.cardView'))}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar — shows when tests are selected in table view. */}
      {viewMode === 'list' && selectedTestIds.size > 0 && (
        <div className="mb-4">
          <BulkActionBar
            selectedCount={selectedTestIds.size}
            onClear={() => setSelectedTestIds(new Set())}
          >
            <Select
              value=""
              onValueChange={(value) => handleBulkStatusUpdate(value === 'public')}
              disabled={bulkUpdating}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] rounded-md border border-border bg-white text-sm shadow-sm focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                <SelectValue placeholder={String(t('levelTests.bulkSetStatus'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{String(t('levelTests.detail.visibilityPublic'))}</SelectItem>
                <SelectItem value="private">{String(t('levelTests.detail.visibilityPrivate'))}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkDeleting}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {String(t('common.delete'))}
            </Button>
          </BulkActionBar>
        </div>
      )}

      {tests.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileQuestion}
            title={String(t('levelTests.noTests'))}
            description={String(t('levelTests.noTestsDescription'))}
            actionLabel={String(t('levelTests.createTest'))}
            actionIcon={<Plus className="w-4 h-4" />}
            onAction={() => setShowCreateModal(true)}
          />
        </Card>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tests.map(test => (
            <Card
              key={test.id}
              className="p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer"
              onClick={() => router.push(`/exams-and-scores/${test.id}`)}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileQuestion className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{test.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                      {test.subjects?.name || '—'}{test.grade ? ` · ${test.grade}` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); setTestToDelete(test) }}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 rounded font-medium">
                  {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-50 text-gray-700 rounded font-medium">
                  {String(t('levelTests.detail.questionsCount')).replace('{count}', String(test.question_count))}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  test.share_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {String(t(test.share_enabled ? 'levelTests.detail.visibilityPublic' : 'levelTests.detail.visibilityPrivate'))}
                </span>
              </div>

              <div className="mt-auto text-xs text-gray-400">
                {new Date(test.created_at).toLocaleDateString(getDateLocale(language))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 w-10">
                    {(() => {
                      const allSelected = tests.length > 0 && selectedTestIds.size === tests.length
                      const someSelected = selectedTestIds.size > 0 && selectedTestIds.size < tests.length
                      return (
                        <TableCheckbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          ariaLabel={String(t('common.selectAll'))}
                          onChange={() => {
                            if (allSelected) setSelectedTestIds(new Set())
                            else setSelectedTestIds(new Set(tests.map(t => t.id)))
                          }}
                        />
                      )
                    })()}
                  </th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('levelTests.form.title'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('levelTests.form.subject'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('levelTests.form.difficulty'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('levelTests.form.questionCount'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('common.status'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500">{String(t('common.date'))}</th>
                  <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tests.map(test => {
                  const isSelected = selectedTestIds.has(test.id)
                  return (
                    <tr
                      key={test.id}
                      className={`transition-colors cursor-pointer ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'}`}
                      onClick={() => router.push(`/exams-and-scores/${test.id}`)}
                    >
                      <td className="p-3 sm:p-4">
                        <TableCheckbox
                          checked={isSelected}
                          ariaLabel={String(t('common.selectRow'))}
                          onChange={() => {
                            const next = new Set(selectedTestIds)
                            if (next.has(test.id)) next.delete(test.id); else next.add(test.id)
                            setSelectedTestIds(next)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileQuestion className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{test.title}</span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-sm text-gray-600">
                        {test.subjects?.name || '—'}{test.grade ? ` · ${test.grade}` : ''}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 rounded font-medium">
                          {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-sm text-gray-600">{test.question_count}</td>
                      <td className="p-3 sm:p-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          test.share_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {String(t(test.share_enabled ? 'levelTests.detail.visibilityPublic' : 'levelTests.detail.visibilityPrivate'))}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-sm text-gray-500">
                        {new Date(test.created_at).toLocaleDateString(getDateLocale(language))}
                      </td>
                      <td className="p-3 sm:p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); setTestToDelete(test) }}
                        >
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <ModalShell
        isOpen={showCreateModal}
        onClose={() => !generating && setShowCreateModal(false)}
        size="lg"
        title={String(t('levelTests.createTest'))}
        closeDisabled={generating}
        footer={
          <ModalShell.Footer split>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={generating}>
              {String(t('common.cancel'))}
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('levelTests.form.generating'))}
                </>
              ) : (
                String(t('levelTests.form.generate'))
              )}
            </Button>
          </ModalShell.Footer>
        }
      >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.subject'))} <span className="text-rose-500">*</span>
                </Label>
                {subjects.length > 0 ? (
                  <Select value={formData.subject_id} onValueChange={handleSubjectChange}>
                    <SelectTrigger className={selectStyles}>
                      <SelectValue placeholder={String(t('levelTests.form.selectSubject'))} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={formData.subject_name}
                    onChange={e => setFormData(p => ({ ...p, subject_name: e.target.value }))}
                    placeholder={String(t('levelTests.form.selectSubject'))}
                    className={inputStyles}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t('levelTests.form.grade'))}
                  </Label>
                  <Input
                    value={formData.grade}
                    onChange={e => setFormData(p => ({ ...p, grade: e.target.value }))}
                    placeholder={String(t('levelTests.form.gradePlaceholder'))}
                    className={inputStyles}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t('levelTests.form.difficulty'))} <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={v => setFormData(p => ({ ...p, difficulty: v as typeof DIFFICULTIES[number] }))}
                  >
                    <SelectTrigger className={selectStyles}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => (
                        <SelectItem key={d} value={d}>
                          {String(t(`levelTests.form.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}`))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.language'))} <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formData.language}
                  onValueChange={v => setFormData(p => ({ ...p, language: v as 'english' | 'korean' }))}
                >
                  <SelectTrigger className={selectStyles}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
                    <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.questionTypes'))} <span className="text-rose-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {QUESTION_TYPES.map(type => {
                    const key = `type${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleToggleType(type)}
                        className={`h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                          formData.question_types.includes(type)
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {String(t(`levelTests.form.${key}`))}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t('levelTests.form.questionCount'))} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={formData.question_count}
                    onChange={e => setFormData(p => ({ ...p, question_count: parseInt(e.target.value) || 10 }))}
                    className={inputStyles}
                  />
                  <p className="text-xs text-gray-500">{String(t('levelTests.form.questionCountHelp'))}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t('levelTests.form.mcChoiceCount'))}
                  </Label>
                  <Input
                    type="number"
                    min={2}
                    max={6}
                    value={formData.mc_choice_count}
                    onChange={e => setFormData(p => ({ ...p, mc_choice_count: parseInt(e.target.value) || 4 }))}
                    className={inputStyles}
                  />
                  <p className="text-xs text-gray-500">{String(t('levelTests.form.mcChoiceCountHelp'))}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.timeLimit'))}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.time_limit_minutes}
                  onChange={e => setFormData(p => ({ ...p, time_limit_minutes: e.target.value }))}
                  className={inputStyles}
                />
                <p className="text-xs text-gray-500">{String(t('levelTests.form.timeLimitHelp'))}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.extraComments'))}
                </Label>
                <textarea
                  value={formData.extra_comments}
                  onChange={e => setFormData(p => ({ ...p, extra_comments: e.target.value }))}
                  placeholder={String(t('levelTests.form.extraCommentsPlaceholder'))}
                  className="w-full min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:border-primary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                  rows={3}
                />
                <p className="text-xs text-gray-500">{String(t('levelTests.form.extraCommentsHelp'))}</p>
              </div>
            </div>
      </ModalShell>

      {/* Delete Confirmation */}
      <ModalShell.Confirm
        isOpen={!!testToDelete}
        onClose={() => setTestToDelete(null)}
        onConfirm={handleDelete}
        title={String(t('levelTests.detail.delete'))}
        message={String(t('levelTests.detail.confirmDelete'))}
        variant="danger"
        confirmLabel={String(t('common.delete'))}
        cancelLabel={String(t('common.cancel'))}
      />

      {/* Bulk Delete Confirmation */}
      <ModalShell.Confirm
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={String(t('levelTests.bulkDeleteTitle'))}
        message={String(t('levelTests.bulkDeleteConfirm', { count: selectedTestIds.size }))}
        variant="danger"
        confirmLabel={bulkDeleting ? String(t('common.deleting')) : String(t('common.delete'))}
        cancelLabel={String(t('common.cancel'))}
        loading={bulkDeleting}
      />
    </div>
  )
}
