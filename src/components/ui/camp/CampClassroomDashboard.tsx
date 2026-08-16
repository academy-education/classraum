"use client"

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { CampStudentDetail } from '@/components/ui/camp/CampStudentDetail'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { BarChart3, Users, ClipboardList } from 'lucide-react'

/**
 * Camp P2 — per-classroom tracking panel, rendered under a classroom
 * group on CampPage when the teacher expands it. All numbers come from
 * GET /api/camp/dashboard (service-role reads; camp tables are
 * client-read-only per migration 082, and study_attempts never were
 * client-readable for teachers).
 *
 * Table shell + header/cell classes mirror the shared DataTable
 * (src/components/ui/dashboard/DataTable.tsx); status pills are the
 * shared StatusPill.
 */

interface DashboardStudentStatus {
  studentId: string
  state: 'not_started' | 'in_progress' | 'done'
  correctCount: number | null
  totalCount: number | null
}

interface DashboardAssignment {
  id: string
  title: string
  section: string | null
  domain: string | null
  questionCount: number
  dueAt: string | null
  students: DashboardStudentStatus[]
  completion: { done: number; inProgress: number; notStarted: number; total: number; pct: number }
}

interface DashboardSkill {
  section: string
  domain: string
  correct: number
  total: number
  accuracy: number
}

interface DashboardReviewSkill {
  section: string
  domain: string
  wrongRate: number
  n: number
}

interface DashboardData {
  roster: Array<{ studentId: string; name: string | null; email: string | null }>
  assignments: DashboardAssignment[]
  skills: DashboardSkill[]
  skillsToReview: DashboardReviewSkill[]
  minAnswersForRanking: number
}

const STATE_TONES: Record<DashboardStudentStatus['state'], StatusPillTone> = {
  not_started: 'gray',
  in_progress: 'amber',
  done: 'emerald',
}

interface CampClassroomDashboardProps {
  classroomId: string
  testFamily: string
}

export function CampClassroomDashboard({ classroomId, testFamily }: CampClassroomDashboardProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState(false)
  /** Student drill-down modal (per-assignment history, per-domain
   *  accuracy, report shortcut) — opened by clicking a roster row. */
  const [detailStudent, setDetailStudent] = useState<{ id: string; name: string } | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/camp/dashboard?classroomId=${classroomId}`, {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new Error(`dashboard ${res.status}`)
      setData(await res.json())
    } catch (e) {
      console.error('[camp] dashboard load failed:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const sectionLabel = useCallback(
    (section: string) => String(t(`camp.sections.${section}`)),
    [t],
  )
  const domainLabel = useCallback(
    (domain: string) => (testFamily === 'sat' ? domain : String(t(`camp.tasks.${domain}`))),
    [t, testFamily],
  )
  const stateLabel = useCallback(
    (state: DashboardStudentStatus['state']) => String(t(`camp.dashboard.state.${state}`)),
    [t],
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Roster table skeleton — DataTable loading idiom */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="bg-gray-50/60 px-4 py-3">
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded" style={{ width: `${60 + ((i * 7) % 30)}%` }} />
              </div>
            ))}
          </div>
        </div>
        {/* Skills card skeleton */}
        <Card className="p-4 sm:p-5">
          <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="flex-1 h-2 bg-gray-100 rounded-full" />
                <div className="h-4 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }
  if (error || !data) {
    return <p className="text-sm text-rose-600 py-3">{t('camp.dashboard.loadFailed')}</p>
  }
  if (data.roster.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title={String(t('camp.dashboard.noStudents'))}
          size="sm"
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Roster × assignment status table — DataTable shell idiom */}
      {data.assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={String(t('camp.noAssignments'))}
            size="sm"
            variant="subtle"
          />
        </Card>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60">
                <tr>
                  <th scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 text-left">
                    {t('camp.dashboard.student')}
                  </th>
                  {data.assignments.map(a => (
                    <th key={a.id} scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 text-left min-w-[140px]">
                      <div className="normal-case tracking-normal text-xs text-gray-700 font-semibold truncate max-w-[180px]" title={a.title}>
                        {a.title}
                      </div>
                      {/* Completion bar per assignment */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${a.completion.pct}%` }} />
                        </div>
                        <span className="text-[11px] font-medium text-gray-400 normal-case tracking-normal">
                          {t('camp.dashboard.completionLabel', { done: a.completion.done, total: a.completion.total })}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.roster.map(student => (
                  <tr key={student.studentId} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDetailStudent({
                          id: student.studentId,
                          name: student.name ?? student.email ?? '—',
                        })}
                        className="text-gray-900 font-medium hover:text-primary hover:underline underline-offset-2 transition-colors"
                        title={String(t('camp.studentDetail.open'))}
                      >
                        {student.name ?? student.email ?? '—'}
                      </button>
                    </td>
                    {data.assignments.map(a => {
                      const status = a.students.find(s => s.studentId === student.studentId)
                      const state = status?.state ?? 'not_started'
                      return (
                        <td key={a.id} className="px-4 py-3 text-gray-900">
                          <StatusPill tone={STATE_TONES[state]} size="md" className="gap-1.5">
                            {stateLabel(state)}
                            {state === 'done' && status?.correctCount != null && status?.totalCount != null && (
                              <span className="tabular-nums">{status.correctCount}/{status.totalCount}</span>
                            )}
                          </StatusPill>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accuracy by skill */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
          <h4 className="text-sm font-semibold text-gray-900">{t('camp.dashboard.accuracyBySkill')}</h4>
        </div>
        {data.skills.length === 0 ? (
          <p className="text-sm text-gray-400">{t('camp.dashboard.noResultsYet')}</p>
        ) : (
          <div className="space-y-2">
            {data.skills.map(skill => (
              <div key={`${skill.section}:${skill.domain}`} className="flex items-center gap-3">
                <div className="w-56 flex-shrink-0 text-xs text-gray-600 truncate" title={`${sectionLabel(skill.section)} · ${domainLabel(skill.domain)}`}>
                  <span className="text-gray-400">{sectionLabel(skill.section)}</span>
                  <span className="mx-1 text-gray-300">·</span>
                  {domainLabel(skill.domain)}
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${skill.accuracy >= 70 ? 'bg-emerald-500' : skill.accuracy >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${skill.accuracy}%` }}
                  />
                </div>
                <div className="w-24 flex-shrink-0 text-right text-xs text-gray-500 tabular-nums">
                  {skill.accuracy}%
                  <span className="text-gray-300 ml-1">{skill.correct}/{skill.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Skills to review */}
      <Card className="p-4 sm:p-5">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('camp.dashboard.skillsToReview')}</h4>
        <p className="text-xs text-gray-400 mb-3">
          {t('camp.dashboard.skillsToReviewHint', { min: data.minAnswersForRanking })}
        </p>
        {data.skillsToReview.length === 0 ? (
          <p className="text-sm text-gray-400">{t('camp.dashboard.notEnoughAnswers')}</p>
        ) : (
          <ol className="space-y-1.5">
            {data.skillsToReview.map((skill, i) => (
              <li key={`${skill.section}:${skill.domain}`} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-gray-700 truncate">
                  <span className="text-gray-400">{sectionLabel(skill.section)}</span>
                  <span className="mx-1 text-gray-300">·</span>
                  {domainLabel(skill.domain)}
                </span>
                <span className={`text-xs font-medium ${skill.wrongRate >= 50 ? 'text-rose-600' : skill.wrongRate >= 25 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {t('camp.dashboard.wrongRateLabel', { rate: skill.wrongRate })}
                </span>
                <span className="text-xs text-gray-300 w-14 text-right tabular-nums">
                  {t('camp.dashboard.answersLabel', { n: skill.n })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Per-student drill-down (live, not a snapshot) */}
      {detailStudent && (
        <CampStudentDetail
          classroomId={classroomId}
          studentId={detailStudent.id}
          studentName={detailStudent.name}
          testFamily={testFamily}
          onClose={() => setDetailStudent(null)}
        />
      )}
    </div>
  )
}
