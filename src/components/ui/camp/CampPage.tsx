"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { CampClassroomDashboard } from '@/components/ui/camp/CampClassroomDashboard'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { Loader2, Plus, School, Tent, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Camp dashboard — quota meter, camp classrooms, and the assignment
 * builder (pick section/domain/count → the server draws from the study
 * bank and charges the program's question quota).
 *
 * Data comes exclusively from /api/camp/* (service-role reads), because
 * migration 082 made camp tables client-read-only and this page must
 * show the same truth the writes enforce.
 */

interface CampProgram {
  id: string
  academy_id: string
  name: string
  test_family: string
  starts_on: string | null
  ends_on: string | null
  question_quota: number
  questions_used: number
  student_cap: number
}

interface CampClassroom {
  id: string
  name: string
  teacher_id: string | null
}

interface CampAssignment {
  id: string
  classroom_id: string
  title: string
  section: string | null
  domain: string | null
  question_count: number
  due_at: string | null
  created_at: string
}

/* Bank vocabulary per family — mirrors src/lib/study/assemble.ts
 * (BLUEPRINT keys, READING_TASKS, LISTENING_TASKS). Duplicated here
 * because assemble.ts is server-only (it imports the service-role
 * client); the API validates against the originals, so drift shows up
 * as a 400, not a bad draw. */
const FAMILY_SECTIONS: Record<string, string[]> = {
  sat: ['reading_writing', 'math'],
  toefl: ['reading', 'listening'],
}
const SECTION_DOMAINS: Record<string, string[]> = {
  'sat:reading_writing': [
    'Craft and Structure',
    'Information and Ideas',
    'Standard English Conventions',
    'Expression of Ideas',
  ],
  'sat:math': [
    'Algebra',
    'Advanced Math',
    'Problem-Solving and Data Analysis',
    'Geometry and Trigonometry',
  ],
  'toefl:reading': ['daily_life', 'academic_passage'],
  'toefl:listening': ['choose_response', 'conversation', 'announcement', 'academic_talk'],
}

const MIN_COUNT = 5
const MAX_COUNT = 40

interface CampPageProps {
  academyId: string
}

export function CampPage({ academyId }: CampPageProps) {
  const { t, language } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<CampProgram | null>(null)
  const [classrooms, setClassrooms] = useState<CampClassroom[]>([])
  const [assignments, setAssignments] = useState<Record<string, CampAssignment[]>>({})

  /** Classrooms whose tracking panel (P2 dashboard) is expanded. */
  const [openDashboards, setOpenDashboards] = useState<Record<string, boolean>>({})

  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    classroomId: '',
    title: '',
    section: '',
    domain: '',
    count: '20',
    dueDate: '',
  })

  const fetchAssignments = useCallback(async (classroomIds: string[]) => {
    const headers = await authHeaders()
    const results = await Promise.all(
      classroomIds.map(async id => {
        const res = await fetch(`/api/camp/assignments?classroomId=${id}`, { headers })
        if (!res.ok) return [id, []] as const
        const json = await res.json()
        return [id, (json.assignments ?? []) as CampAssignment[]] as const
      }),
    )
    setAssignments(Object.fromEntries(results))
  }, [])

  const fetchAll = useCallback(async () => {
    if (!academyId) return
    setLoading(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/camp/program?academyId=${academyId}`, { headers })
      if (!res.ok) {
        setProgram(null)
        setClassrooms([])
        return
      }
      const json = await res.json()
      setProgram(json.program ?? null)
      const rooms = (json.classrooms ?? []) as CampClassroom[]
      setClassrooms(rooms)
      if (rooms.length > 0) await fetchAssignments(rooms.map(r => r.id))
    } catch (error) {
      console.error('[camp] failed to load program:', error)
      setProgram(null)
    } finally {
      setLoading(false)
    }
  }, [academyId, fetchAssignments])

  useEffect(() => { fetchAll() }, [fetchAll])

  const sections = program ? (FAMILY_SECTIONS[program.test_family] ?? []) : []
  const domains = program && form.section
    ? (SECTION_DOMAINS[`${program.test_family}:${form.section}`] ?? [])
    : []

  const quotaTotal = program?.question_quota ?? 0
  const quotaUsed = program?.questions_used ?? 0
  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed)
  const quotaPct = quotaTotal > 0 ? Math.min(100, Math.round((quotaUsed / quotaTotal) * 100)) : 0

  const sectionLabel = useCallback(
    (section: string) => String(t(`camp.sections.${section}`)),
    [t],
  )
  const domainLabel = useCallback(
    (family: string, domain: string) =>
      family === 'sat' ? domain : String(t(`camp.tasks.${domain}`)),
    [t],
  )

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  const openModal = () => {
    setForm({
      classroomId: classrooms.length === 1 ? classrooms[0]!.id : '',
      title: '',
      section: '',
      domain: '',
      count: '20',
      dueDate: '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const isFormValid = useMemo(() => {
    const count = Number(form.count)
    return (
      form.classroomId !== '' &&
      form.title.trim() !== '' &&
      Number.isInteger(count) && count >= MIN_COUNT && count <= MAX_COUNT
    )
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program || !isFormValid || submitting) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/camp/assignments', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          classroomId: form.classroomId,
          title: form.title.trim(),
          section: form.section || undefined,
          domain: form.domain || undefined,
          count: Number(form.count),
          dueAt: form.dueDate ? new Date(`${form.dueDate}T23:59:59`).toISOString() : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json.code === 'quota_exceeded') {
          setFormError(String(t('camp.errors.quotaExceeded', { remaining: json.remaining ?? 0 })))
        } else if (json.code === 'not_enough_items') {
          setFormError(String(t('camp.errors.notEnoughItems', { available: json.available ?? 0 })))
        } else {
          setFormError(json.error || String(t('camp.errors.createFailed')))
        }
        return
      }
      showSuccessToast(String(t('camp.createdSuccessfully')))
      setShowModal(false)
      await fetchAll()
    } catch (error) {
      console.error('[camp] create assignment failed:', error)
      showErrorToast(String(t('camp.errors.createFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="p-6">
        <Card className="p-12 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
            <Tent className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('camp.noProgramTitle')}</h2>
          <p className="text-sm text-gray-500 max-w-md">{t('camp.noProgramDescription')}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('camp.subtitle', { family: program.test_family.toUpperCase() })}
            {program.starts_on && program.ends_on && (
              <span className="ml-2 text-gray-400">
                {formatDate(program.starts_on)} – {formatDate(program.ends_on)}
              </span>
            )}
          </p>
        </div>
        <Button onClick={openModal} disabled={classrooms.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          {t('camp.newAssignment')}
        </Button>
      </div>

      {/* Quota */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{t('camp.questionQuota')}</span>
          <span className="text-sm text-gray-500">
            {t('camp.quotaUsage', { used: quotaUsed, total: quotaTotal })}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${quotaPct >= 90 ? 'bg-rose-500' : 'bg-primary'}`}
            style={{ width: `${quotaPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {t('camp.quotaRemaining', { remaining: quotaRemaining })}
        </p>
      </Card>

      {/* Classrooms + assignments */}
      {classrooms.length === 0 ? (
        <Card className="p-8 flex flex-col items-center text-center gap-2">
          <School className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
          <p className="text-sm text-gray-500">{t('camp.noClassrooms')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {classrooms.map(room => {
            const rows = assignments[room.id] ?? []
            return (
              <Card key={room.id} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <School className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                  <h3 className="text-base font-semibold text-gray-900">{room.name}</h3>
                  <span className="text-xs text-gray-400">
                    {t('camp.assignmentCount', { count: rows.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDashboards(prev => ({ ...prev, [room.id]: !prev[room.id] }))
                    }
                    className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    {openDashboards[room.id]
                      ? t('camp.dashboard.hideProgress')
                      : t('camp.dashboard.viewProgress')}
                    {openDashboards[room.id]
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {rows.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">{t('camp.noAssignments')}</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {rows.map(a => (
                      <div key={a.id} className="py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ClipboardList className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                          <p className="text-xs text-gray-500">
                            {[
                              a.section && sectionLabel(a.section),
                              a.domain && domainLabel(program.test_family, a.domain),
                              String(t('camp.questionCountLabel', { count: a.question_count })),
                            ].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 flex-shrink-0">
                          {a.due_at
                            ? t('camp.dueDateLabel', { date: formatDate(a.due_at) })
                            : formatDate(a.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {openDashboards[room.id] && (
                  <CampClassroomDashboard classroomId={room.id} testFamily={program.test_family} />
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* New assignment modal */}
      <ModalShell
        isOpen={showModal}
        onClose={() => { if (!submitting) setShowModal(false) }}
        size="md"
        title={String(t('camp.newAssignment'))}
        subtitle={String(t('camp.newAssignmentSubtitle', { remaining: quotaRemaining }))}
        closeDisabled={submitting}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="camp-assignment-form"
              disabled={!isFormValid || submitting}
              className={!isFormValid || submitting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? t('common.creating') : t('camp.createAssignment')}
            </Button>
          </ModalShell.Footer>
        }
      >
        <form id="camp-assignment-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('camp.form.classroom')} <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={form.classroomId}
              onValueChange={value => setForm(prev => ({ ...prev, classroomId: value }))}
            >
              <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                <SelectValue placeholder={String(t('camp.form.selectClassroom'))} />
              </SelectTrigger>
              <SelectContent className="z-[210]">
                {classrooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('camp.form.title')} <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder={String(t('camp.form.titlePlaceholder'))}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('camp.form.section')}</Label>
              <Select
                value={form.section || 'all'}
                onValueChange={value =>
                  setForm(prev => ({ ...prev, section: value === 'all' ? '' : value, domain: '' }))
                }
              >
                <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="all">{t('camp.form.allSections')}</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section} value={section}>{sectionLabel(section)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('camp.form.domain')}</Label>
              <Select
                value={form.domain || 'all'}
                onValueChange={value =>
                  setForm(prev => ({ ...prev, domain: value === 'all' ? '' : value }))
                }
                disabled={!form.section}
              >
                <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="all">{t('camp.form.allDomains')}</SelectItem>
                  {domains.map(domain => (
                    <SelectItem key={domain} value={domain}>
                      {domainLabel(program.test_family, domain)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('camp.form.questionCount')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                required
                min={MIN_COUNT}
                max={MAX_COUNT}
                value={form.count}
                onChange={e => setForm(prev => ({ ...prev, count: e.target.value }))}
                className="h-10"
              />
              <p className="text-xs text-gray-400">
                {t('camp.form.countHint', { min: MIN_COUNT, max: MAX_COUNT })}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('camp.form.dueDate')}</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
        </form>
      </ModalShell>
    </div>
  )
}
