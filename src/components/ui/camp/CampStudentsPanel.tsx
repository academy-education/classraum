"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { CampStudentDetail } from '@/components/ui/camp/CampStudentDetail'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Users } from 'lucide-react'
import { studentCategory, type CampStudentCategory, type CampStudentWorkSummary } from '@/lib/camp/metrics'

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
 * does per assignment (done only when EVERYTHING is done), except that
 * anything overdue wins and shows as Overdue.
 *
 * Overdue / not started / on track come from src/lib/camp/metrics.ts
 * (the server sends each row's `work` summary), the same definitions the
 * overview's donut and Needs-attention card use.
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
  work: CampStudentWorkSummary
}

export type CampStudentsFilter = 'all' | CampStudentCategory
type SortKey = 'name' | 'completion' | 'average' | 'lastActive' | 'overdue'
const FILTERS: CampStudentsFilter[] = ['all', 'overdue', 'not_started', 'on_track']

const displayName = (r: StudentsRow) => r.name ?? r.email ?? ''
const completionRatio = (r: StudentsRow) => (r.completion.total > 0 ? r.completion.done / r.completion.total : -1)

/** Ascending comparator per column; nulls (no score, never active) always sort last, whichever direction. */
function compareRows(key: SortKey, a: StudentsRow, b: StudentsRow): number {
  switch (key) {
    case 'name': return displayName(a).localeCompare(displayName(b))
    case 'completion': return completionRatio(a) - completionRatio(b)
    case 'overdue': return a.work.overdue - b.work.overdue
    case 'average': return (a.avgScorePct ?? 0) - (b.avgScorePct ?? 0)
    case 'lastActive': return (a.lastActive ?? '').localeCompare(b.lastActive ?? '')
  }
}
const nullField = (key: SortKey, r: StudentsRow) =>
  (key === 'average' && r.avgScorePct === null) || (key === 'lastActive' && r.lastActive === null)

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
  /** Classrooms this viewer may manage (generate reports, withdraw them). The drill-down hides those actions
   *  for a colleague's student instead of offering a button that 403s. */
  manageableClassroomIds: string[]
  /** Filter to open on (the overview's donut links here with one). */
  initialFilter?: CampStudentsFilter
}

export function CampStudentsPanel({ programId, testFamily, manageableClassroomIds, initialFilter = 'all' }: CampStudentsPanelProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [rows, setRows] = useState<StudentsRow[]>([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<{ classroomId: string; studentId: string; name: string } | null>(null)
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<CampStudentsFilter>(initialFilter)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' })
  useEffect(() => { setFilter(initialFilter) }, [initialFilter])

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
  }, [programId, reload])

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      (r.name ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      r.classroomName.toLowerCase().includes(q))
  }, [rows, search])

  /** Chip counts follow the search box, so a chip never promises rows the table then hides. */
  const counts = useMemo(() => {
    const c: Record<CampStudentsFilter, number> = { all: searched.length, overdue: 0, not_started: 0, on_track: 0 }
    for (const r of searched) c[studentCategory(r.work)] += 1
    return c
  }, [searched])

  const filtered = useMemo(() => {
    const list = filter === 'all' ? searched : searched.filter(r => studentCategory(r.work) === filter)
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const na = nullField(sort.key, a)
      const nb = nullField(sort.key, b)
      if (na !== nb) return na ? 1 : -1
      const c = na ? 0 : compareRows(sort.key, a, b)
      return (c * sign) ||
        displayName(a).localeCompare(displayName(b)) ||
        a.classroomName.localeCompare(b.classroomName)
    })
  }, [searched, filter, sort])

  const toggleSort = (key: SortKey) =>
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      // Most overdue first on first click; the other columns start ascending.
      : { key, dir: key === 'overdue' ? 'desc' : 'asc' })

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
    return (
      <Card>
        <ErrorState size="sm" title={String(t('camp.students.loadFailed'))} onRetry={() => setReload(n => n + 1)} />
      </Card>
    )
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

      <div role="group" aria-label={String(t('camp.students.filters.label'))} className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            data-filter={f}
            onClick={() => setFilter(f)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
              filter === f
                ? (f === 'overdue' ? 'bg-rose-600 text-white ring-rose-600' : 'bg-primary text-white ring-primary')
                : 'bg-white text-gray-600 ring-gray-200 hover:ring-gray-300'
            }`}
          >
            {t(`camp.students.filters.${f}`)}
            <span className={`tabular-nums ${filter === f ? 'text-white/80' : 'text-gray-400'}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title={String(t(searched.length === 0 ? 'camp.students.noMatches' : 'camp.students.noFilterMatches'))}
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
                  {([
                    ['camp.dashboard.student', 'name'],
                    ['camp.students.classroom', null],
                    ['camp.students.completion', 'completion'],
                    ['camp.students.avgScore', 'average'],
                    ['camp.students.lastActive', 'lastActive'],
                    ['camp.students.overdueCount', 'overdue'],
                    ['camp.students.status', null],
                  ] as Array<[string, SortKey | null]>).map(([label, key]) => {
                    const active = key !== null && sort.key === key
                    return (
                      <th
                        key={label}
                        scope="col"
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                        className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 text-left whitespace-nowrap"
                      >
                        {key === null ? t(label) : (
                          <button
                            type="button"
                            data-sort={key}
                            onClick={() => toggleSort(key)}
                            title={String(t('camp.students.sortBy', { column: String(t(label)) }))}
                            className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-gray-800 ${active ? 'text-gray-900' : ''}`}
                          >
                            {t(label)}
                            {active
                              ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)
                              : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                          </button>
                        )}
                      </th>
                    )
                  })}
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
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {r.work.overdue > 0
                        ? <span className="font-semibold text-rose-600">{r.work.overdue}</span>
                        : <span className="text-gray-300">0</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.work.overdue > 0 ? (
                        <StatusPill tone="rose" size="md">{t('camp.metrics.overdue')}</StatusPill>
                      ) : (
                        <StatusPill tone={STATE_TONES[rowState(r)]} size="md">
                          {stateLabel(rowState(r))}
                        </StatusPill>
                      )}
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
          canManage={manageableClassroomIds.includes(detail.classroomId)}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
