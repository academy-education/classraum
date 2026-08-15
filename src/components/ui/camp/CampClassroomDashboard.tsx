"use client"

import { useCallback, useEffect, useState } from 'react'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { Loader2, BarChart3 } from 'lucide-react'

/**
 * Camp P2 — per-classroom tracking panel, rendered inside a classroom
 * card on CampPage when the teacher expands it. All numbers come from
 * GET /api/camp/dashboard (service-role reads; camp tables are
 * client-read-only per migration 082, and study_attempts never were
 * client-readable for teachers).
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

const STATE_STYLES: Record<DashboardStudentStatus['state'], string> = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }
  if (error || !data) {
    return <p className="text-sm text-rose-600 py-3">{t('camp.dashboard.loadFailed')}</p>
  }
  if (data.roster.length === 0) {
    return <p className="text-sm text-gray-400 py-3">{t('camp.dashboard.noStudents')}</p>
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-6">
      {/* Roster × assignment status table */}
      {data.assignments.length === 0 ? (
        <p className="text-sm text-gray-400">{t('camp.noAssignments')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">{t('camp.dashboard.student')}</th>
                {data.assignments.map(a => (
                  <th key={a.id} className="py-2 px-3 font-medium min-w-[140px]">
                    <div className="normal-case text-gray-700 font-semibold truncate max-w-[180px]" title={a.title}>
                      {a.title}
                    </div>
                    {/* Completion bar per assignment */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${a.completion.pct}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400 normal-case tracking-normal">
                        {t('camp.dashboard.completionLabel', { done: a.completion.done, total: a.completion.total })}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.roster.map(student => (
                <tr key={student.studentId}>
                  <td className="py-2.5 pr-4 font-medium text-gray-900 whitespace-nowrap">
                    {student.name ?? student.email ?? '—'}
                  </td>
                  {data.assignments.map(a => {
                    const status = a.students.find(s => s.studentId === student.studentId)
                    const state = status?.state ?? 'not_started'
                    return (
                      <td key={a.id} className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATE_STYLES[state]}`}>
                          {stateLabel(state)}
                          {state === 'done' && status?.correctCount != null && status?.totalCount != null && (
                            <span className="font-semibold">{status.correctCount}/{status.totalCount}</span>
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accuracy by skill */}
      <div>
        <div className="flex items-center gap-2 mb-2">
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
                <div className="w-24 flex-shrink-0 text-right text-xs text-gray-500">
                  {skill.accuracy}%
                  <span className="text-gray-300 ml-1">{skill.correct}/{skill.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills to review */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('camp.dashboard.skillsToReview')}</h4>
        <p className="text-xs text-gray-400 mb-2">
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
                <span className="text-xs text-gray-300 w-14 text-right">
                  {t('camp.dashboard.answersLabel', { n: skill.n })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
