"use client"

import { Card } from '@/components/ui/card'
import { StatusPill } from '@/components/ui/status-pill'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import type { CampDailyPoint } from '@/lib/camp/daily'
import { Users, CheckCircle2, Target, AlertTriangle, ChevronRight, BellRing } from 'lucide-react'

/**
 * The camp Overview tab: four stat cards, the average-score trend, the
 * assignment-status donut and the suggested-topics card.
 *
 * Split out of CampPage, which had reached 1,936 lines and was the file
 * everything camp-shaped landed in. Pure presentation — it takes the
 * /api/camp/overview payload plus the label helpers and renders them,
 * so it holds no fetching and no state and reads on its own.
 *
 * The donut is passed IN rather than imported: its component lives
 * beside CampPage and keeping one definition matters more than keeping
 * this file self-contained.
 */

/* The overview payload is shaped by /api/camp/overview and consumed
   only here; typing it structurally would duplicate the route's own
   shape and drift from it. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CampOverviewPanelProps {
  /** null while loading — the skeleton below belongs to this component. */
  overview: any
  program: any
  formatDate: (iso: string) => string
  sectionLabel: (section: string) => string
  domainLabel: (family: string, domain: string) => string
  t: (key: string, params?: Record<string, string | number | undefined>) => string | string[]
  language: string
  /** Family palette from CampPage's familyAccent() — passed in so the
   *  SAT/TOEFL colours have one source, not two. */
  accent: { dot: string; badge: string; hex: string }
  donut: React.ReactNode
  /** Open the student drill-down for a Needs-attention row. */
  onOpenStudent: (row: CampAttentionRow) => void
  /** Switch to the Students tab with the Overdue filter ("N more"). */
  onShowOverdueStudents: () => void
}

/** One /api/camp/overview `needsAttention` row (definitions: src/lib/camp/metrics.ts). */
export interface CampAttentionRow {
  studentId: string
  name: string | null
  email: string | null
  classroomId: string
  classroomName: string
  overdue: number
  late: number
  missing: number
  dueTodayNotStarted: number
}

/** Daily-trend series: key in CampDailyPoint, label key, colour. One colour per metric, all on a 0-100 axis. */
const DAILY_SERIES: Array<{ key: 'completionPct' | 'attendancePct' | 'avgScorePct'; label: string; color: string }> = [
  { key: 'completionPct', label: 'camp.daily.completion', color: '#10b981' },
  { key: 'attendancePct', label: 'camp.daily.attendance', color: '#f59e0b' },
  { key: 'avgScorePct', label: 'camp.daily.score', color: '#1776db' },
]

/** The n behind each metric on a day, so a 100% from one student never reads like a 100% from thirty. */
function dailyDetail(p: CampDailyPoint, key: typeof DAILY_SERIES[number]['key'], t: CampOverviewPanelProps['t']): string {
  if (key === 'completionPct') return String(t('camp.daily.completionN', { done: p.completed, n: p.due }))
  if (key === 'attendancePct') return String(t('camp.daily.attendanceN', { done: p.attended, n: p.attendanceMarked }))
  return String(t('camp.daily.scoreN', { n: p.scoreN }))
}

/**
 * One point per KST camp day (GET /api/camp/overview `daily`). A null value is a GAP: recharts breaks the line
 * there (connectNulls stays off) and the tooltip says "No data", because a day with nothing due, no register
 * taken or no graded work did not score 0.
 */
export function DailyTrendChart({ points, t, formatDate, language }: {
  points: CampDailyPoint[]
  t: CampOverviewPanelProps['t']
  formatDate: (iso: string) => string
  language: string
}) {
  return (
    <Card className="p-4 sm:p-5" data-testid="camp-daily-trend">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-gray-900">{t('camp.daily.title')}</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-3">{t('camp.daily.hint')}</p>
      {points.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">{t('camp.daily.empty')}</p>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const p = (payload[0] as { payload: CampDailyPoint }).payload
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                      <p className="font-medium text-gray-900 mb-1">{formatDate(`${label}T00:00:00`)}</p>
                      {DAILY_SERIES.map(sr => (
                        <p key={sr.key} className="flex items-center gap-2 text-gray-600">
                          <span aria-hidden className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sr.color }} />
                          <span>{t(sr.label)}:</span>
                          {p[sr.key] === null ? (
                            <span className="text-gray-400">{t('camp.daily.noData')}</span>
                          ) : (
                            <span className="font-semibold text-gray-900 tabular-nums">{p[sr.key]}%</span>
                          )}
                          {p[sr.key] !== null && <span className="text-gray-400 tabular-nums">({dailyDetail(p, sr.key, t)})</span>}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => <span className="text-gray-600">{t(value)}</span>}
              />
              {DAILY_SERIES.map(sr => (
                <Line
                  key={sr.key}
                  type="monotone"
                  dataKey={sr.key}
                  name={sr.label}
                  stroke={sr.color}
                  strokeWidth={2}
                  connectNulls={false}
                  dot={{ r: 2.5, fill: '#fff', stroke: sr.color, strokeWidth: 2 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

/** Rows shown before the card hands off to the Students tab. */
const ATTENTION_LIMIT = 8

function NeedsAttentionCard({ rows, t, onOpenStudent, onShowOverdueStudents }: {
  rows: CampAttentionRow[]
  t: CampOverviewPanelProps['t']
  onOpenStudent: CampOverviewPanelProps['onOpenStudent']
  onShowOverdueStudents: () => void
}) {
  const shown = rows.slice(0, ATTENTION_LIMIT)
  const more = rows.length - shown.length
  return (
    <Card className="p-4 sm:p-5" data-testid="camp-needs-attention">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${rows.length > 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
          <BellRing className={`w-3.5 h-3.5 ${rows.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`} strokeWidth={2.25} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{t('camp.attention.title')}</h3>
        {rows.length > 0 && (
          <span className="ml-1 text-xs font-semibold text-rose-600 tabular-nums">{rows.length}</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mb-2">{t('camp.attention.hint')}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">{t('camp.attention.empty')}</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {shown.map(r => (
              <li key={`${r.classroomId}:${r.studentId}`}>
                <button
                  type="button"
                  onClick={() => onOpenStudent(r)}
                  title={String(t('camp.studentDetail.open'))}
                  className="w-full flex items-center gap-3 py-2.5 text-left text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50 rounded-md px-1 -mx-1 transition-colors group"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-gray-900 truncate">{r.name ?? r.email ?? '—'}</span>
                    <span className="block text-xs text-gray-400 truncate">{r.classroomName}</span>
                  </span>
                  {r.overdue > 0 && (
                    <StatusPill tone="rose" size="md">{t('camp.attention.overdue', { n: r.overdue })}</StatusPill>
                  )}
                  {r.dueTodayNotStarted > 0 && (
                    <StatusPill tone="amber" size="md">{t('camp.attention.dueToday', { n: r.dueTodayNotStarted })}</StatusPill>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          {more > 0 && (
            <button
              type="button"
              onClick={onShowOverdueStudents}
              className="mt-2 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              {t('camp.attention.more', { n: more })}
            </button>
          )}
        </>
      )}
    </Card>
  )
}

export function CampOverviewPanel({
  overview, program, formatDate, sectionLabel, domainLabel, t, language, accent, donut,
  onOpenStudent, onShowOverdueStudents,
}: CampOverviewPanelProps) {
  if (overview === null) {
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 sm:p-5 animate-pulse">
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
          <Card key={i} className="p-4 sm:p-5 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-40 bg-gray-100 rounded" />
          </Card>
        ))}
      </div>
    </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* First, before the numbers: who to chase today. */}
      <NeedsAttentionCard
        rows={(overview.needsAttention ?? []) as CampAttentionRow[]}
        t={t}
        onOpenStudent={onOpenStudent}
        onShowOverdueStudents={onShowOverdueStudents}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t('camp.overview.studentsEnrolled')}
            </p>
            <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {overview.studentsEnrolled}
            </p>
            <p className="text-sm text-gray-400">
              {t('camp.overview.ofCap', { cap: overview.studentCap })}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t('camp.overview.completion')}
            </p>
            <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
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

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t('camp.overview.averageScore')}
            </p>
            <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {overview.averageScorePct !== null ? `${overview.averageScorePct}%` : '—'}
            </p>
            <p className="text-sm text-gray-400">
              {overview.scoredSessions > 0
                ? t('camp.overview.gradedSessions', { n: overview.scoredSessions })
                : t('camp.overview.noGradedSessions')}
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t('camp.overview.skillsToReview')}
            </p>
            <span aria-hidden className={`ml-auto w-1.5 h-1.5 rounded-full ${accent.dot}`} />
          </div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
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
        <Card className="p-4 sm:p-5">
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

        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('camp.overview.assignmentStatus')}</h3>
          {donut}
        </Card>
      </div>

      {/* Daily progress: completion of the day's due work, attendance, average score (with n), one point per day */}
      <DailyTrendChart
        points={(overview.daily ?? []) as CampDailyPoint[]}
        t={t}
        formatDate={formatDate}
        language={language}
      />

      {/* Suggested topics for teacher review — the itemised
          skills-to-review list, domain chips like the mock rows */}
      <Card className="p-4 sm:p-5">
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
            {overview.reviewTopics.map((topic: any) => (
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
  )
}
