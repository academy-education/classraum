"use client"

import { useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { CampReportPayload, CampReportSkill } from '@/lib/camp/report-types'
import { CalendarDays, TrendingUp, Award, AlertTriangle, ClipboardList, Target } from 'lucide-react'

/**
 * Camp P4 — the camp report layout, shared by the teacher preview
 * (CampPage modal, printable) and the parent/student mobile view
 * (read-only). Renders ONLY the snapshot payload — no live queries, so
 * every viewer sees the numbers frozen at generation time.
 *
 * `payload.completion` is teacher-only: the API strips it (null) for
 * parents and students, and this component simply omits the block when
 * it is null — no role logic here.
 */

interface CampReportViewProps {
  payload: CampReportPayload
}

const trackClass = 'w-full h-2 bg-gray-100 rounded-full overflow-hidden'

function barColor(accuracy: number): string {
  if (accuracy >= 80) return 'bg-emerald-500'
  if (accuracy >= 60) return 'bg-sky-500'
  if (accuracy >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

export function CampReportView({ payload }: CampReportViewProps) {
  const { t, language } = useTranslation()

  const formatDate = useCallback((iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  const domainLabel = useCallback((skill: Pick<CampReportSkill, 'domain'>) =>
    payload.program.testFamily === 'sat' ? skill.domain : String(t(`camp.tasks.${skill.domain}`)),
  [payload.program.testFamily, t])

  const doneAssignments = payload.assignments.filter(a => a.state === 'done' && a.scorePct !== null)
  const periodStart = formatDate(payload.period.start)
  const periodEnd = formatDate(payload.period.end)

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Student header */}
      <div className="border-b border-gray-100 pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {t('camp.reports.reportTitle', { family: payload.program.testFamily.toUpperCase() })}
        </p>
        <h2 className="text-xl font-bold text-gray-900 mt-1">
          {payload.student.name ?? payload.student.email ?? '—'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {payload.program.name} · {payload.classroom.name}
        </p>
        {(periodStart || periodEnd) && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.75} />
            {[periodStart, periodEnd].filter(Boolean).join(' – ')}
          </p>
        )}
      </div>

      {/* Overall standing */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('camp.reports.overallAccuracy')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {payload.cohort.studentAccuracy !== null ? `${payload.cohort.studentAccuracy}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('camp.reports.classStanding')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {payload.cohort.percentile !== null
              ? String(t('camp.reports.percentile', { p: payload.cohort.percentile }))
              : '—'}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {t('camp.reports.cohortSize', { n: payload.cohort.n })}
          </p>
        </div>
      </div>

      {/* Teacher-only completion (stripped to null for families) */}
      {payload.completion !== null && (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 print:break-inside-avoid">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('camp.reports.completionTeacherOnly')}
          </p>
          <div className="flex items-center gap-3">
            <div className={trackClass}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${payload.completion.rate}%` }} />
            </div>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {payload.completion.done}/{payload.completion.total} · {payload.completion.rate}%
            </span>
          </div>
        </div>
      )}

      {/* Score trend */}
      <div className="print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('camp.reports.scoreTrend')}</h3>
        {doneAssignments.length === 0 ? (
          <p className="text-sm text-gray-400">{t('camp.reports.noCompletedAssignments')}</p>
        ) : (
          <div className="space-y-2">
            {doneAssignments.map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{a.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {formatDate(a.completedAt) ?? formatDate(a.createdAt)}
                  </p>
                </div>
                <div className="w-28 sm:w-40">
                  <div className={trackClass}>
                    <div className={`h-full rounded-full ${barColor(a.scorePct!)}`} style={{ width: `${a.scorePct}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                  {a.correctCount}/{a.totalCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accuracy by skill */}
      <div className="print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('camp.reports.accuracyBySkill')}</h3>
        {payload.skills.length === 0 ? (
          <p className="text-sm text-gray-400">{t('camp.reports.noGradedAnswers')}</p>
        ) : (
          <div className="space-y-2">
            {payload.skills.map(s => (
              <div key={`${s.section}:${s.domain}`} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{domainLabel(s)}</p>
                  <p className="text-[11px] text-gray-400">
                    {t(`camp.sections.${s.section}`)} · n={s.total}
                  </p>
                </div>
                <div className="w-28 sm:w-40">
                  <div className={trackClass}>
                    <div className={`h-full rounded-full ${barColor(s.accuracy)}`} style={{ width: `${s.accuracy}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">{s.accuracy}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strengths / weaknesses */}
      {(payload.strengths.length > 0 || payload.weaknesses.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 print:break-inside-avoid">
          <div className="rounded-xl bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('camp.reports.strengths')}
            </p>
            {payload.strengths.length === 0 ? (
              <p className="text-xs text-gray-400">{t('camp.reports.notEnoughData')}</p>
            ) : (
              <ul className="space-y-1">
                {payload.strengths.map(s => (
                  <li key={`${s.section}:${s.domain}`} className="text-sm text-gray-700 flex justify-between gap-2">
                    <span className="truncate">{domainLabel(s)}</span>
                    <span className="font-semibold text-emerald-700">{s.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl bg-rose-50/60 p-4">
            <p className="text-xs font-semibold text-rose-700 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('camp.reports.weaknesses')}
            </p>
            {payload.weaknesses.length === 0 ? (
              <p className="text-xs text-gray-400">{t('camp.reports.notEnoughData')}</p>
            ) : (
              <ul className="space-y-1">
                {payload.weaknesses.map(s => (
                  <li key={`${s.section}:${s.domain}`} className="text-sm text-gray-700 flex justify-between gap-2">
                    <span className="truncate">{domainLabel(s)}</span>
                    <span className="font-semibold text-rose-700">{s.accuracy}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Mock tests */}
      {payload.mockTests.length > 0 && (
        <div className="print:break-inside-avoid">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('camp.reports.mockTests')}</h3>
          <div className="divide-y divide-gray-100">
            {payload.mockTests.map(m => (
              <div key={m.sessionId} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">
                    {m.section ? t(`camp.sections.${m.section}`) : t('camp.reports.mockTest')}
                  </p>
                  <p className="text-[11px] text-gray-400">{formatDate(m.completedAt)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {m.correctCount !== null && m.totalCount !== null ? `${m.correctCount}/${m.totalCount}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-gray-300 print:text-gray-400">
        {t('camp.reports.generatedAt', { date: formatDate(payload.generatedAt) ?? payload.generatedAt })}
      </p>
    </div>
  )
}
