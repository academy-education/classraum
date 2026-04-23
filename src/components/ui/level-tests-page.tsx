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
import { FileQuestion, Plus, Trash2, Loader2 } from 'lucide-react'

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
      const res = await fetch('/api/level-tests')
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
      const res = await fetch('/api/level-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/level-tests/${testToDelete.id}`, { method: 'DELETE' })
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
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{String(t('levelTests.title'))}</h1>
          <p className="text-gray-500 mt-1">{String(t('levelTests.description'))}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {String(t('levelTests.createTest'))}
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card className="p-12 text-center">
          <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{String(t('levelTests.noTests'))}</h3>
          <p className="text-gray-500 mb-6">{String(t('levelTests.noTestsDescription'))}</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {String(t('levelTests.createTest'))}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map(test => (
            <Card key={test.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/level-tests/${test.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{test.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {test.subjects?.name || '—'} · {test.grade || '—'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setTestToDelete(test) }}
                  className="text-gray-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {String(t(`levelTests.form.difficulty${test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)}`))}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded">
                  {test.question_count} Q
                </span>
                {test.share_enabled && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                    Shared
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(test.created_at).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => !generating && setShowCreateModal(false)} size="lg">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6">{String(t('levelTests.createTest'))}</h2>

          <div className="space-y-4">
            <div>
              <Label>{String(t('levelTests.form.subject'))} *</Label>
              {subjects.length > 0 ? (
                <Select value={formData.subject_id} onValueChange={handleSubjectChange}>
                  <SelectTrigger>
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
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{String(t('levelTests.form.grade'))}</Label>
                <Input
                  value={formData.grade}
                  onChange={e => setFormData(p => ({ ...p, grade: e.target.value }))}
                  placeholder={String(t('levelTests.form.gradePlaceholder'))}
                />
              </div>
              <div>
                <Label>{String(t('levelTests.form.difficulty'))} *</Label>
                <Select value={formData.difficulty} onValueChange={v => setFormData(p => ({ ...p, difficulty: v as typeof DIFFICULTIES[number] }))}>
                  <SelectTrigger>
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

            <div>
              <Label>{String(t('levelTests.form.language'))} *</Label>
              <Select value={formData.language} onValueChange={v => setFormData(p => ({ ...p, language: v as 'english' | 'korean' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">{String(t('levelTests.form.languageEnglish'))}</SelectItem>
                  <SelectItem value="korean">{String(t('levelTests.form.languageKorean'))}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{String(t('levelTests.form.questionTypes'))} *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {QUESTION_TYPES.map(type => {
                  const key = `type${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleToggleType(type)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        formData.question_types.includes(type)
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {String(t(`levelTests.form.${key}`))}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{String(t('levelTests.form.questionCount'))} *</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={formData.question_count}
                  onChange={e => setFormData(p => ({ ...p, question_count: parseInt(e.target.value) || 10 }))}
                />
                <p className="text-xs text-gray-500 mt-1">{String(t('levelTests.form.questionCountHelp'))}</p>
              </div>
              <div>
                <Label>{String(t('levelTests.form.mcChoiceCount'))}</Label>
                <Input
                  type="number"
                  min={2}
                  max={6}
                  value={formData.mc_choice_count}
                  onChange={e => setFormData(p => ({ ...p, mc_choice_count: parseInt(e.target.value) || 4 }))}
                />
                <p className="text-xs text-gray-500 mt-1">{String(t('levelTests.form.mcChoiceCountHelp'))}</p>
              </div>
            </div>

            <div>
              <Label>{String(t('levelTests.form.timeLimit'))}</Label>
              <Input
                type="number"
                min={1}
                value={formData.time_limit_minutes}
                onChange={e => setFormData(p => ({ ...p, time_limit_minutes: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">{String(t('levelTests.form.timeLimitHelp'))}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={generating}>
              {String(t('common.cancel'))}
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {String(t('levelTests.form.generating'))}
                </>
              ) : (
                <>
                  <FileQuestion className="w-4 h-4 mr-2" />
                  {String(t('levelTests.form.generate'))}
                </>
              )}
            </Button>
          </div>
          {generating && (
            <p className="text-xs text-gray-500 mt-3 text-center">
              {String(t('levelTests.form.generatingHelp'))}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!testToDelete} onClose={() => setTestToDelete(null)} size="md">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-3">{String(t('levelTests.detail.delete'))}</h2>
          <p className="text-gray-600 mb-6">{String(t('levelTests.detail.confirmDelete'))}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTestToDelete(null)}>
              {String(t('common.cancel'))}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {String(t('common.delete'))}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
