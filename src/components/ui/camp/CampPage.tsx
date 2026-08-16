"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { StatusPill } from '@/components/ui/status-pill'
import { CampClassroomDashboard } from '@/components/ui/camp/CampClassroomDashboard'
import { CampReviewPresenter } from '@/components/ui/camp/CampReviewPresenter'
import { CampReportsPanel } from '@/components/ui/camp/CampReportsPanel'
import { CampStudentsPanel } from '@/components/ui/camp/CampStudentsPanel'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import type { Question } from '@/app/mobile/study/session/[id]/test/types'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { Loader2, Plus, School, Tent, ClipboardList, ChevronDown, ChevronUp, Presentation, FileText, BookOpen, Clock, Users, CheckCircle2, Target, AlertTriangle } from 'lucide-react'

/**
 * Camp dashboard — quota meter, camp classrooms, and the assignment
 * builder (pick section/domain/count → the server draws from the study
 * bank and charges the program's question quota).
 *
 * Data comes exclusively from /api/camp/* (service-role reads), because
 * migration 082 made camp tables client-read-only and this page must
 * show the same truth the writes enforce.
 *
 * Presentation follows the dashboard design system: header/eyebrow and
 * stat-card idioms from classrooms-page.tsx, the grouped list (session
 * header + row cards) and skeleton idioms from assignments-page.tsx.
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
  /** Enrolled-student count, computed by /api/camp/program. */
  student_count?: number
}

/* Per-family identity — the marketing page's SAT blue / TOEFL violet,
 * reduced to a dot and a tinted badge (accents inside the dashboard
 * design system, not marketing gradients). */
const FAMILY_ACCENT: Record<string, { dot: string; badge: string; hex: string }> = {
  sat: { dot: 'bg-[#2885e8]', badge: 'bg-[#2885e8]/10 text-[#2885e8]', hex: '#2885e8' },
  toefl: { dot: 'bg-[#7a5af8]', badge: 'bg-[#7a5af8]/10 text-[#7a5af8]', hex: '#7a5af8' },
}
const familyAccent = (family: string) => FAMILY_ACCENT[family] ?? FAMILY_ACCENT.sat!

/** One tab's worth of data — /api/camp/program returns every active
 *  program with its own classrooms grouped under it. */
interface ProgramGroup {
  program: CampProgram
  classrooms: CampClassroom[]
}

/** GET /api/camp/overview — program-wide stats + chart data. */
interface ProgramOverview {
  programId: string
  studentsEnrolled: number
  studentCap: number
  completion: { done: number; expected: number; pct: number }
  averageScorePct: number | null
  scoredSessions: number
  skillsToReview: { count: number; accuracyThreshold: number; minAnswers: number }
  /** Weakest cohort domains (the count above, itemised) — the
   *  "suggested topics for teacher review" card. */
  reviewTopics: Array<{ section: string; domain: string; accuracy: number; n: number }>
  /** Graded camp sessions bucketed by completion day, oldest first. */
  trend: Array<{ date: string; avgPct: number; sessions: number }>
  /** (assignment × student) pairs; definitions in the overview route. */
  assignmentStatus: { completed: number; late: number; missing: number; open: number }
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
  const [programGroups, setProgramGroups] = useState<ProgramGroup[]>([])
  /** Which program tab is showing (only relevant when >1 program). */
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, CampAssignment[]>>({})
  /** Overview stats per program id, fetched lazily per active tab. */
  const [overviews, setOverviews] = useState<Record<string, ProgramOverview>>({})
  /** Which view of the program is showing — Overview (stats + charts),
   *  Students (program-wide roster), Classrooms (assignments + tools). */
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'classrooms'>('overview')

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

  /* Camp P3 — class review presenter. The modal creates a review set
   * (POST /api/camp/review-set, same quota pool), fetches its full items
   * (GET, teacher-only) and opens the full-screen presenter. */
  const [reviewClassroomId, setReviewClassroomId] = useState<string | null>(null)

  /* Camp P4 — per-classroom reports modal (generate + preview). */
  const [reportsClassroom, setReportsClassroom] = useState<{ id: string; name: string } | null>(null)
  const [reviewForm, setReviewForm] = useState({ section: '', domain: '', count: '10' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [presenter, setPresenter] = useState<{ title: string; testFamily: string; questions: Question[] } | null>(null)

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
        setProgramGroups([])
        return
      }
      const json = await res.json()
      const groups = (json.programs ?? []) as ProgramGroup[]
      setProgramGroups(groups)
      setActiveProgramId(prev =>
        groups.some(g => g.program.id === prev) ? prev : (groups[0]?.program.id ?? null),
      )
      // Overviews are recomputed per tab visit; clear so post-create
      // numbers (completion denominator) are fresh.
      setOverviews({})
    } catch (error) {
      console.error('[camp] failed to load program:', error)
      setProgramGroups([])
    } finally {
      setLoading(false)
    }
  }, [academyId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const activeGroup = programGroups.find(g => g.program.id === activeProgramId)
    ?? programGroups[0] ?? null
  const program = activeGroup?.program ?? null
  const classrooms = useMemo(() => activeGroup?.classrooms ?? [], [activeGroup])
  const overview = program ? (overviews[program.id] ?? null) : null

  // Assignments for the ACTIVE program's classrooms (lazy per tab).
  useEffect(() => {
    if (classrooms.length > 0) fetchAssignments(classrooms.map(r => r.id))
  }, [classrooms, fetchAssignments])

  // Overview strip for the active program (lazy, cached until fetchAll).
  useEffect(() => {
    const pid = program?.id
    if (!pid || overviews[pid]) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/camp/overview?programId=${pid}`, {
          headers: await authHeaders(),
        })
        if (!res.ok) return
        const json = (await res.json()) as ProgramOverview
        if (!cancelled) setOverviews(prev => ({ ...prev, [pid]: json }))
      } catch (error) {
        console.error('[camp] overview load failed:', error)
      }
    })()
    return () => { cancelled = true }
  }, [program?.id, overviews])

  const sections = program ? (FAMILY_SECTIONS[program.test_family] ?? []) : []
  const domains = program && form.section
    ? (SECTION_DOMAINS[`${program.test_family}:${form.section}`] ?? [])
    : []

  const quotaTotal = program?.question_quota ?? 0
  const quotaUsed = program?.questions_used ?? 0
  const quotaRemaining = Math.max(0, quotaTotal - quotaUsed)
  const quotaPct = quotaTotal > 0 ? Math.min(100, Math.round((quotaUsed / quotaTotal) * 100)) : 0

  /** Family accent (SAT blue / TOEFL violet) for the active program. */
  const accent = familyAccent(program?.test_family ?? 'sat')
  /** Quota-remaining chip text for a program row in the selector. */
  const quotaChipLabel = useCallback(
    (p: CampProgram) =>
      String(t('camp.quotaRemaining', {
        remaining: Math.max(0, p.question_quota - p.questions_used),
      })),
    [t],
  )

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

  const openReviewModal = (classroomId: string) => {
    setReviewClassroomId(classroomId)
    setReviewForm({ section: '', domain: '', count: '10' })
    setReviewError(null)
  }

  const reviewDomains = program && reviewForm.section
    ? (SECTION_DOMAINS[`${program.test_family}:${reviewForm.section}`] ?? [])
    : []

  const isReviewFormValid = useMemo(() => {
    const count = Number(reviewForm.count)
    return Number.isInteger(count) && count >= 1 && count <= MAX_COUNT
  }, [reviewForm])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program || !reviewClassroomId || !isReviewFormValid || reviewSubmitting) return
    setReviewSubmitting(true)
    setReviewError(null)
    try {
      const headers = await authHeaders()
      const count = Number(reviewForm.count)
      const createRes = await fetch('/api/camp/review-set', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          classroomId: reviewClassroomId,
          section: reviewForm.section || undefined,
          domain: reviewForm.domain || undefined,
          count,
        }),
      })
      const created = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
        if (created.code === 'quota_exceeded') {
          setReviewError(String(t('camp.errors.quotaExceeded', { remaining: created.remaining ?? 0 })))
        } else if (created.code === 'not_enough_items') {
          setReviewError(String(t('camp.errors.notEnoughItems', { available: created.available ?? 0 })))
        } else {
          setReviewError(created.error || String(t('camp.review.errors.createFailed')))
        }
        return
      }
      const setId = created.reviewSet?.id as string | undefined
      if (!setId) { setReviewError(String(t('camp.review.errors.createFailed'))); return }

      const itemsRes = await fetch(`/api/camp/review-set?id=${setId}`, { headers })
      const items = await itemsRes.json().catch(() => ({}))
      if (!itemsRes.ok || !Array.isArray(items.questions) || items.questions.length === 0) {
        setReviewError(String(t('camp.review.errors.loadFailed')))
        return
      }

      // Quota moved server-side; mirror it locally WITHOUT fetchAll(),
      // whose loading state would unmount the presenter we open next.
      setProgramGroups(prev => prev.map(g =>
        g.program.id === program.id
          ? { ...g, program: { ...g.program, questions_used: g.program.questions_used + count } }
          : g,
      ))
      setReviewClassroomId(null)
      setPresenter({
        title: (items.reviewSet?.title as string) ?? String(t('camp.review.title')),
        testFamily: (items.reviewSet?.testFamily as string) ?? program.test_family,
        questions: items.questions as Question[],
      })
    } catch (error) {
      console.error('[camp] create review set failed:', error)
      showErrorToast(String(t('camp.review.errors.createFailed')))
    } finally {
      setReviewSubmitting(false)
    }
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
      <div className="p-4">
        {/* Header — eyebrow is static; the title/description are dynamic, so bars */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="animate-pulse">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-2">{t("navigation.camp")}</p>
            {/* Program select-card skeleton */}
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 w-full sm:w-[26rem]">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-56" />
              </div>
            </div>
          </div>
          <Button className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("camp.newAssignment")}
          </Button>
        </div>

        {/* Overview stat-card skeleton — matches the 4-card grid below */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gray-200" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-9 bg-gray-200 rounded w-20" />
            </Card>
          ))}
        </div>

        {/* Classroom group skeletons */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2 sm:space-y-3 animate-pulse">
              {/* Classroom header skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="h-5 bg-gray-200 rounded w-32" />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-5 sm:ml-0">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-28" />
                </div>
              </div>
              {/* Assignment row skeletons */}
              {[...Array(2)].map((_, j) => (
                <Card key={j} className="p-3 sm:p-4 ml-4 sm:ml-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-4 bg-gray-200 rounded w-32" />
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("navigation.camp")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("navigation.camp")}</h1>
          </div>
        </div>

        <Card>
          <EmptyState
            icon={Tent}
            title={String(t('camp.noProgramTitle'))}
            description={String(t('camp.noProgramDescription'))}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header — step 1: program identity + primary action. The
          select-card replaces both the h1 (program name) and the old
          underline tabs: one prominent selector carries the active
          program's identity (family dot + badge, dates, quota chip),
          and opening it lists every program with the same summary.
          Radix Select keeps it keyboard accessible; a single program
          renders the same card, inert, without a chevron. */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-2">{t("navigation.camp")}</p>
          {programGroups.length > 1 ? (
            <SelectPrimitive.Root value={program.id} onValueChange={setActiveProgramId}>
              <SelectPrimitive.Trigger
                aria-label={String(t('camp.selector.switchProgram'))}
                className="group flex w-full sm:w-auto sm:min-w-[26rem] max-w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left shadow-xs transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary data-[state=open]:border-primary"
              >
                <ProgramSummary
                  program={program}
                  formatDate={formatDate}
                  quotaLabel={quotaChipLabel(program)}
                  large
                />
                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:-rotate-180" />
              </SelectPrimitive.Trigger>
              <SelectContent className="z-[210]">
                {programGroups.map(g => (
                  <SelectItem key={g.program.id} value={g.program.id} className="py-2.5">
                    <ProgramSummary
                      program={g.program}
                      formatDate={formatDate}
                      quotaLabel={quotaChipLabel(g.program)}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectPrimitive.Root>
          ) : (
            <div className="flex w-full sm:w-auto sm:min-w-[26rem] max-w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-xs">
              <ProgramSummary
                program={program}
                formatDate={formatDate}
                quotaLabel={quotaChipLabel(program)}
                large
              />
            </div>
          )}
        </div>
        <Button
          onClick={openModal}
          disabled={classrooms.length === 0}
          className="self-start lg:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 flex-shrink-0"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          {t("camp.newAssignment")}
        </Button>
      </div>

      {/* Quota meter — the paid resource, kept visible above every tab
          as a slim full-width bar (the stat-card version crowded the
          mock's 4-card row out of parity). */}
      <Card className="p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t("camp.questionQuota")}
            </p>
          </div>
          <div className="flex-1 flex items-center gap-3 w-full">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${quotaPct >= 90 ? 'bg-rose-500' : 'bg-primary'}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            <p className="text-sm tabular-nums flex-shrink-0">
              <span className="font-semibold text-gray-900">{quotaUsed}</span>
              <span className="text-gray-400"> / {quotaTotal}</span>
            </p>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium flex-shrink-0 self-start sm:self-auto ${quotaPct >= 90 ? 'bg-rose-50 text-rose-700' : 'bg-primary/10 text-primary'}`}>
            {t('camp.quotaRemaining', { remaining: quotaRemaining })}
          </div>
        </div>
      </Card>

      {/* View tabs — payments-page underline idiom. Students is a
          first-class view (Andy: student-first visibility), not a
          drill buried behind classroom → roster → click. */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(['overview', 'students', 'classrooms'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t(`camp.tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Overview tab — the marketing mock's dashboard, with real
            numbers: 4 stat cards, average-score trend line, assignment
            status donut, suggested review topics. ── */}
      {activeTab === 'overview' && (overview === null ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-200" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-9 bg-gray-200 rounded w-20" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
                <div className="h-40 bg-gray-100 rounded" />
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {t('camp.overview.studentsEnrolled')}
                </p>
                <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {overview.studentsEnrolled}
                </p>
                <p className="text-sm text-gray-400">
                  {t('camp.overview.ofCap', { cap: overview.studentCap })}
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {t('camp.overview.completion')}
                </p>
                <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {overview.completion.pct}%
                </p>
                <p className="text-sm text-gray-400">
                  {t('camp.overview.sessionsLabel', {
                    done: overview.completion.done,
                    expected: overview.completion.expected,
                  })}
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {t('camp.overview.averageScore')}
                </p>
                <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {overview.averageScorePct !== null ? `${overview.averageScorePct}%` : '—'}
                </p>
                <p className="text-sm text-gray-400">
                  {overview.scoredSessions > 0
                    ? t('camp.overview.gradedSessions', { n: overview.scoredSessions })
                    : t('camp.overview.noGradedSessions')}
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  {t('camp.overview.skillsToReview')}
                </p>
                <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {overview.skillsToReview.count}
                </p>
                <p className="text-sm text-gray-400">
                  {t('camp.overview.skillsHint', { threshold: overview.skillsToReview.accuracyThreshold })}
                </p>
              </div>
            </Card>
          </div>

          {/* Trend + status donut, the mock's middle row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-900">{t('camp.overview.trendTitle')}</h3>
                <span className="text-[11px] text-gray-400 whitespace-nowrap tabular-nums">
                  {overview.scoredSessions > 0
                    ? t('camp.overview.gradedSessions', { n: overview.scoredSessions })
                    : t('camp.overview.noGradedSessions')}
                </span>
              </div>
              {overview.trend.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">
                  {t('camp.overview.trendEmpty')}
                </p>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overview.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickFormatter={(d: string) =>
                          new Date(`${d}T00:00:00`).toLocaleDateString(
                            language === 'korean' ? 'ko-KR' : 'en-US',
                            { month: 'short', day: 'numeric' },
                          )}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        width={32}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}%`, String(t('camp.overview.averageScore'))]}
                        labelFormatter={(label: string) => formatDate(`${label}T00:00:00`)}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgPct"
                        stroke={accent.hex}
                        strokeWidth={2.5}
                        dot={{ fill: '#fff', stroke: accent.hex, strokeWidth: 2.5, r: 3.5 }}
                        activeDot={{ r: 4.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('camp.overview.assignmentStatus')}</h3>
              <AssignmentStatusDonut
                status={overview.assignmentStatus}
                labels={{
                  completed: String(t('camp.overview.statusCompleted')),
                  late: String(t('camp.overview.statusLate')),
                  missing: String(t('camp.overview.statusMissing')),
                  open: String(t('camp.overview.statusOpen')),
                  empty: String(t('camp.overview.statusEmpty')),
                }}
              />
            </Card>
          </div>

          {/* Suggested topics for teacher review — the itemised
              skills-to-review list, domain chips like the mock rows */}
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-sm font-semibold text-gray-900">{t('camp.overview.suggestedTopics')}</h3>
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {t('camp.overview.suggestedTopicsHint', { threshold: overview.skillsToReview.accuracyThreshold })}
              </span>
            </div>
            {overview.reviewTopics.length === 0 ? (
              <p className="text-sm text-gray-400 pt-2">{t('camp.overview.noTopics')}</p>
            ) : (
              <ul className="divide-y divide-gray-100 mt-2">
                {overview.reviewTopics.map(topic => (
                  <li key={`${topic.section}:${topic.domain}`} className="flex items-center gap-3 py-2.5 text-sm">
                    <StatusPill tone="sky" size="md">{sectionLabel(topic.section)}</StatusPill>
                    <span className="flex-1 text-gray-700 truncate">
                      {domainLabel(program.test_family, topic.domain)}
                    </span>
                    <span className={`text-xs font-medium ${topic.accuracy < 40 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {t('camp.overview.topicAccuracy', { accuracy: topic.accuracy })}
                    </span>
                    <span className="text-xs text-gray-300 w-16 text-right tabular-nums">
                      {t('camp.dashboard.answersLabel', { n: topic.n })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ))}

      {/* ── Students tab — program-wide searchable roster ── */}
      {activeTab === 'students' && (
        <CampStudentsPanel programId={program.id} testFamily={program.test_family} />
      )}

      {/* ── Classrooms tab — grouped-list idiom (classroom header + assignment row cards) ── */}
      {activeTab === 'classrooms' && (classrooms.length === 0 ? (
        <Card>
          <EmptyState
            icon={School}
            title={String(t('camp.noClassrooms'))}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {classrooms.map(room => {
            // undefined = still fetching this tab's assignments
            const rows = assignments[room.id]
            return (
              <div key={room.id} className="space-y-2 sm:space-y-3">
                {/* Classroom header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <School className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" strokeWidth={1.75} />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {room.name}
                    </h3>
                    <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0 tabular-nums">
                      {t('camp.studentCount', { count: room.student_count ?? 0 })}
                      <span className="mx-1.5 text-gray-300">·</span>
                      {t('camp.assignmentCount', { count: rows?.length ?? 0 })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-5 sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 text-xs h-8 px-2.5"
                      onClick={() => setReportsClassroom({ id: room.id, name: room.name })}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {t('camp.reports.title')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 text-xs h-8 px-2.5"
                      onClick={() => openReviewModal(room.id)}
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      {t('camp.review.classReview')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-xs h-8 px-2.5 text-gray-600 hover:text-gray-900"
                      onClick={() =>
                        setOpenDashboards(prev => ({ ...prev, [room.id]: !prev[room.id] }))
                      }
                    >
                      {openDashboards[room.id]
                        ? t('camp.dashboard.hideProgress')
                        : t('camp.dashboard.viewProgress')}
                      {openDashboards[room.id]
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {/* Assignments in this classroom */}
                {rows === undefined ? (
                  <Card className="p-3 sm:p-4 ml-4 sm:ml-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </Card>
                ) : rows.length === 0 ? (
                  <Card className="ml-4 sm:ml-6">
                    <EmptyState
                      icon={ClipboardList}
                      title={String(t('camp.noAssignments'))}
                      size="sm"
                      variant="subtle"
                    />
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {rows.map(a => (
                      <Card key={a.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow ml-4 sm:ml-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{a.title}</h4>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                              {(a.section || a.domain) && (
                                <div className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                  <span>
                                    {[
                                      a.section && sectionLabel(a.section),
                                      a.domain && domainLabel(program.test_family, a.domain),
                                    ].filter(Boolean).join(' · ')}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                <span>
                                  {a.due_at
                                    ? t('camp.dueDateLabel', { date: formatDate(a.due_at) })
                                    : formatDate(a.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm ml-0 sm:ml-4 flex-shrink-0">
                            <StatusPill tone="sky" size="md">
                              {t('camp.questionCountLabel', { count: a.question_count })}
                            </StatusPill>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Expanded tracking panel (P2) */}
                {openDashboards[room.id] && (
                  <div className="ml-4 sm:ml-6">
                    <CampClassroomDashboard classroomId={room.id} testFamily={program.test_family} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

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
              {/* Same DatePicker the sessions/classrooms modals use —
                  native date inputs were the odd one out (Andy: camp UX). */}
              <DatePicker
                value={form.dueDate}
                onChange={value => setForm(prev => ({ ...prev, dueDate: value }))}
                placeholder={String(t('camp.form.dueDate'))}
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

      {/* Class review modal (P3) — type/count picker, then presenter */}
      <ModalShell
        isOpen={reviewClassroomId !== null}
        onClose={() => { if (!reviewSubmitting) setReviewClassroomId(null) }}
        size="md"
        title={String(t('camp.review.title'))}
        subtitle={String(t('camp.review.subtitle', { remaining: quotaRemaining }))}
        closeDisabled={reviewSubmitting}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={() => setReviewClassroomId(null)} disabled={reviewSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="camp-review-form"
              disabled={!isReviewFormValid || reviewSubmitting}
              className={!isReviewFormValid || reviewSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {reviewSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {reviewSubmitting ? t('common.creating') : t('camp.review.start')}
            </Button>
          </ModalShell.Footer>
        }
      >
        <form id="camp-review-form" onSubmit={handleReviewSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('camp.form.section')}</Label>
              <Select
                value={reviewForm.section || 'all'}
                onValueChange={value =>
                  setReviewForm(prev => ({ ...prev, section: value === 'all' ? '' : value, domain: '' }))
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
                value={reviewForm.domain || 'all'}
                onValueChange={value =>
                  setReviewForm(prev => ({ ...prev, domain: value === 'all' ? '' : value }))
                }
                disabled={!reviewForm.section}
              >
                <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="all">{t('camp.form.allDomains')}</SelectItem>
                  {reviewDomains.map(domain => (
                    <SelectItem key={domain} value={domain}>
                      {domainLabel(program.test_family, domain)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('camp.form.questionCount')} <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="number"
              required
              min={1}
              max={MAX_COUNT}
              value={reviewForm.count}
              onChange={e => setReviewForm(prev => ({ ...prev, count: e.target.value }))}
              className="h-10"
            />
            <p className="text-xs text-gray-400">
              {t('camp.review.countHint', { max: MAX_COUNT })}
            </p>
          </div>

          {reviewError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {reviewError}
            </div>
          )}
        </form>
      </ModalShell>

      {reportsClassroom && (
        <CampReportsPanel
          classroomId={reportsClassroom.id}
          classroomName={reportsClassroom.name}
          onClose={() => setReportsClassroom(null)}
        />
      )}

      {presenter && (
        <CampReviewPresenter
          title={presenter.title}
          testFamily={presenter.testFamily}
          questions={presenter.questions}
          onClose={() => setPresenter(null)}
        />
      )}
    </div>
  )
}

/**
 * One program's identity, as the selector renders it — in the trigger
 * (large) and in every dropdown row (compact): family dot + tinted
 * badge, name, date range, quota-remaining chip. One component so the
 * closed card and the open list can never describe a program
 * differently.
 */
/**
 * Assignment-status donut — SVG stroke-dash segments like the marketing
 * mock's Donut, but fed by /api/camp/overview.assignmentStatus. The ring
 * covers only pairs with a settled fate (completed / late / missing);
 * still-open pairs are a footnote, not a slice, so the donut never
 * punishes an assignment that simply isn't due yet. Definitions live in
 * the overview route.
 */
function AssignmentStatusDonut({ status, labels }: {
  status: { completed: number; late: number; missing: number; open: number }
  labels: { completed: string; late: string; missing: string; open: string; empty: string }
}) {
  const total = status.completed + status.late + status.missing
  if (total === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">{labels.empty}</p>
  }
  const R = 26
  const CIRC = 2 * Math.PI * R
  const completedPct = Math.round((100 * status.completed) / total)
  const segments: Array<{ key: string; frac: number; color: string }> = [
    { key: 'completed', frac: status.completed / total, color: '#10b981' },
    { key: 'late', frac: status.late / total, color: '#fbbf24' },
    { key: 'missing', frac: status.missing / total, color: '#e5e7eb' },
  ]
  let offset = 0
  const rows: Array<{ label: string; value: number; dot: string }> = [
    { label: labels.completed, value: status.completed, dot: 'bg-emerald-500' },
    { label: labels.late, value: status.late, dot: 'bg-amber-400' },
    { label: labels.missing, value: status.missing, dot: 'bg-gray-200' },
  ]
  return (
    <div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 72 72" className="w-[84px] h-[84px] flex-shrink-0" role="img" aria-label={labels.completed}>
          {segments.map(seg => {
            const el = (
              <circle
                key={seg.key}
                cx="36" cy="36" r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${seg.frac * CIRC} ${CIRC}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 36 36)"
              />
            )
            offset += seg.frac * CIRC
            return el
          })}
          <text x="36" y="39" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 11, fontWeight: 600 }}>
            {completedPct}%
          </text>
        </svg>
        <ul className="space-y-1.5 flex-1 min-w-0">
          {rows.map(row => (
            <li key={row.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span aria-hidden className={`w-2 h-2 rounded-full flex-shrink-0 ${row.dot}`} />
              <span className="flex-1 truncate">{row.label}</span>
              <span className="font-semibold text-gray-900 tabular-nums">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
      {status.open > 0 && (
        <p className="text-[11px] text-gray-400 mt-3">
          {labels.open.replace('{n}', String(status.open))}
        </p>
      )}
    </div>
  )
}

function ProgramSummary({ program, formatDate, quotaLabel, large = false }: {
  program: CampProgram
  formatDate: (iso: string) => string
  quotaLabel: string
  large?: boolean
}) {
  const accent = familyAccent(program.test_family)
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <span aria-hidden className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${accent.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${large ? 'text-xl sm:text-2xl tracking-tight' : 'text-sm'} font-semibold text-gray-900 truncate`}>
            {program.name}
          </span>
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] leading-none flex-shrink-0 ${accent.badge}`}>
            {program.test_family.toUpperCase()}
          </span>
        </div>
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${large ? 'mt-1' : 'mt-0.5'} text-xs text-gray-500`}>
          {program.starts_on && program.ends_on && (
            <span className="tabular-nums">
              {formatDate(program.starts_on)} – {formatDate(program.ends_on)}
            </span>
          )}
          <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600 tabular-nums">
            {quotaLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
