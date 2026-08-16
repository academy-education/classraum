"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { CampStudentDetail } from '@/components/ui/camp/CampStudentDetail'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { Search, Users } from 'lucide-react'

/**
 * Camp Students tab — the student-first view of a program. One
 * searchable table across ALL of the program's classrooms (name,
 * classroom, completion, average score, last active, status), where a
 * row click opens the existing CampStudentDetail drill-down (stats,
 * weaknesses, answer review, report shortcut).
 *
 * Data: GET /api/camp/students?programId= — one row per
 * (classroom, student) pair, aggregated by the same loader every other
 * camp surface uses, so the list always agrees with the drill-down.
 *
 * Table shell mirrors CampClassroomDashboard's DataTable idiom; the
 * status chip derives one state per row the same way the roster table
 * does per assignment (done only when EVERYTHING is done).
 */

interface StudentsRow {
  studentId: string
  name: string | null
  email: string | null
  classroomId: string
  classroomName: string
  completion: { done: number; total: number }
  avgScorePct: number | null
  lastActive: string | null
  states: { done: number; inProgress: number; notStarted: number }
}

/** One chip per row: everything done → done; anything touched →
 *  in progress; untouched (or no assignments yet) → not started. */
function rowState(r: StudentsRow): 'not_started' | 'in_progress' | 'done' {
  if (r.completion.total > 0 && r.states.done === r.completion.total) return 'done'
  if (r.states.done > 0 || r.states.inProgress > 0) return 'in_progress'
  return 'not_started'
}

const STATE_TONES: Record<'not_started' | 'in_progress' | 'done', StatusPillTone> = {
  not_started: 'gray',
  in_progress: 'amber',
  done: 'emerald',
}

interface CampStudentsPanelProps {
  programId: string
  testFamily: string
}

export function CampStudentsPanel({ programId, testFamily }: CampStudentsPanelProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<StudentsRow[]>([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<{ classroomId: string; studentId: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/camp/students?programId=${programId}`, {
          headers: await authHeaders(),
        })
        if (!res.ok) throw new Error(`students ${res.status}`)
        const json = await res.json()
        if (!cancelled) setRows((json.students ?? []) as StudentsRow[])
      } catch (e) {
        console.error('[camp] students load failed:', e)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [programId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      r.classroomName.toLowerCase().includes(q))
  }, [rows, search])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  const stateLabel = (state: 'not_started' | 'in_progress' | 'done') =>
    String(t(`camp.dashboard.state.${state}`))

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-100 rounded-lg w-full sm:w-80" />
        <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="bg-gray-50/60 px-4 py-3">
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 bg-gray-100 rounded" style={{ width: `${55 + ((i * 9) % 35)}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return <p className="text-sm text-rose-600 py-3">{t('camp.dashboard.loadFailed')}</p>
  }
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title={String(t('camp.dashboard.noStudents'))} />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search — filters name/email/classroom locally */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={String(t('camp.students.searchPlaceholder'))}
          className="h-10 pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title={String(t('camp.students.noMatches'))}
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
                  {[
                    t('camp.dashboard.student'),
                    t('camp.students.classroom'),
                    t('camp.students.completion'),
                    t('camp.students.avgScore'),
                    t('camp.students.lastActive'),
                    t('camp.students.status'),
                  ].map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 text-left whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr
                    key={`${r.classroomId}:${r.studentId}`}
                    className="transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() => setDetail({
                      classroomId: r.classroomId,
                      studentId: r.studentId,
                      name: r.name ?? r.email ?? '—',
                    })}
                    title={String(t('camp.studentDetail.open'))}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">{r.name ?? r.email ?? '—'}</span>
                      {r.name && r.email && (
                        <span className="block text-xs text-gray-400">{r.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{r.classroomName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${r.completion.total > 0 ? Math.round((100 * r.completion.done) / r.completion.total) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                          {r.completion.done}/{r.completion.total}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 tabular-nums">
                      {r.avgScorePct !== null ? `${r.avgScorePct}%` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {r.lastActive ? formatDate(r.lastActive) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill tone={STATE_TONES[rowState(r)]} size="md">
                        {stateLabel(rowState(r))}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing drill-down modal — stats, weaknesses, answer review, report */}
      {detail && (
        <CampStudentDetail
          classroomId={detail.classroomId}
          studentId={detail.studentId}
          studentName={detail.name}
          testFamily={testFamily}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
