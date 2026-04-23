"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { FileQuestion, Plus, Trash2, Loader2, X } from 'lucide-react'

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
  const { t } = useTranslation()
  const router = useRouter()
  const [tests, setTests] = useState<LevelTest[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [testToDelete, setTestToDelete] = useState<LevelTest | null>(null)

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
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generate failed')

      setShowCreateModal(false)
      resetForm()
      router.push(`/level-tests/${json.test.id}`)
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header - matches other pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{String(t('levelTests.title'))}</h1>
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

      {tests.length === 0 ? (
        <Card className="p-12 text-center gap-2">
          <FileQuestion className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">{String(t('levelTests.noTests'))}</h3>
          <p className="text-gray-500 mb-2">{String(t('levelTests.noTestsDescription'))}</p>
          <Button
            className="flex items-center gap-2 mx-auto"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" />
            {String(t('levelTests.createTest'))}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tests.map(test => (
            <Card
              key={test.id}
              className="p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer"
              onClick={() => router.push(`/level-tests/${test.id}`)}
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
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                  {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-medium">
                  {test.question_count} Q
                </span>
                {test.share_enabled && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded font-medium">
                    Shared
                  </span>
                )}
              </div>

              <div className="mt-auto text-xs text-gray-400">
                {new Date(test.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => !generating && setShowCreateModal(false)} size="lg">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-900">{String(t('levelTests.createTest'))}</h2>
            <Button variant="ghost" size="sm" onClick={() => !generating && setShowCreateModal(false)} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {String(t('levelTests.form.subject'))} <span className="text-red-500">*</span>
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
                    {String(t('levelTests.form.difficulty'))} <span className="text-red-500">*</span>
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
                  {String(t('levelTests.form.language'))} <span className="text-red-500">*</span>
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
                  {String(t('levelTests.form.questionTypes'))} <span className="text-red-500">*</span>
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
                    {String(t('levelTests.form.questionCount'))} <span className="text-red-500">*</span>
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
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateModal(false)}
              disabled={generating}
              className="flex-1"
            >
              {String(t('common.cancel'))}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('levelTests.form.generating'))}
                </>
              ) : (
                String(t('levelTests.form.generate'))
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!testToDelete} onClose={() => setTestToDelete(null)} size="md">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-900">{String(t('levelTests.detail.delete'))}</h2>
            <Button variant="ghost" size="sm" onClick={() => setTestToDelete(null)} className="p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <p className="text-sm text-gray-600">
              {String(t('levelTests.detail.confirmDelete'))}
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTestToDelete(null)}
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
