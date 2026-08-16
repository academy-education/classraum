"use client"

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import { CampStudentSessionReview } from '@/components/ui/camp/CampStudentSessionReview'
import type { CampReportPayload } from '@/lib/camp/report-types'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast, showSuccessToast } from '@/stores'
import { BarChart3, ChevronRight, ClipboardList, FileText, Loader2, Printer } from 'lucide-react'

/**
 * Per-student drill-down modal, opened from the classroom progress table
 * (CampClassroomDashboard). Everything comes LIVE from
 * GET /api/camp/student, which builds the same payload a camp report
 * snapshots (one shared implementation in src/lib/camp/reports.ts), so
 * what the teacher sees here is exactly what a report generated right
 * now would say.
 *
 * The footer shortcut generates that report (POST
 * /api/camp/reports/generate for just this student) and opens it in the
 * shared printable layout.
 */

interface CampStudentDetailProps {
  classroomId: string
  studentId: string
  studentName: string
  testFamily: string
  onClose: () => void
}

const STATE_TONES: Record<'not_started' | 'in_progress' | 'done', StatusPillTone> = {
  not_started: 'gray',
  in_progress: 'amber',
  done: 'emerald',
}

export function CampStudentDetail({ classroomId, studentId, studentName, testFamily, onClose }: CampStudentDetailProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [payload, setPayload] = useState<CampReportPayload | null>(null)
  const [lastActivity, setLastActivity] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reportPreview, setReportPreview] = useState<CampReportPayload | null>(null)
  /** Completed-assignment answer review (GET /api/camp/student-session). */
  const [sessionReview, setSessionReview] = useState<{ sessionId: string; title: string } | null>(null)

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(
          `/api/camp/student?classroomId=${classroomId}&studentId=${studentId}`,
          { headers: await authHeaders() },
        )
        if (!res.ok) throw new Error(`student ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setPayload(json.payload as CampReportPayload)
          setLastActivity((json.lastActivity as string | null) ?? null)
        }
      } catch (e) {
        console.error('[camp] student detail load failed:', e)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [classroomId, studentId])

  const sectionLabel = useCallback(
    (section: string) => String(t(`camp.sections.${section}`)),
    [t],
  )
  const domainLabel = useCallback(
    (domain: string) => (testFamily === 'sat' ? domain : String(t(`camp.tasks.${domain}`))),
    [t, testFamily],
  )
  const stateLabel = useCallback(
    (state: 'not_started' | 'in_progress' | 'done') => String(t(`camp.dashboard.state.${state}`)),
    [t],
  )

  /** Generate this student's report, then open it in the printable view. */
  const handleGenerateReport = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const headers = await authHeaders()
      const res = await fetch('/api/camp/reports/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ classroomId, studentId }),
      })
      const json = await res.json().catch(() => ({}))
      const reportId = json.generated?.[0]?.id as string | undefined
      if (!res.ok || !reportId) {
        showErrorToast(json.error || String(t('camp.reports.generateFailed')))
        return
      }
      showSuccessToast(String(t('camp.reports.generatedSuccessfully', { count: 1 })))
      const view = await fetch(`/api/camp/reports?id=${reportId}`, { headers })
      const viewJson = await view.json().catch(() => ({}))
      if (!view.ok || !viewJson.report?.payload) {
        showErrorToast(String(t('camp.reports.loadFailed')))
        return
      }
      setReportPreview(viewJson.report.payload as CampReportPayload)
    } catch (e) {
      console.error('[camp] generate student report failed:', e)
      showErrorToast(String(t('camp.reports.generateFailed')))
    } finally {
      setGenerating(false)
    }
  }

  const strengths = payload?.strengths ?? []
  const weaknesses = payload?.weaknesses ?? []

  return (
    <>
      <ModalShell
        isOpen={reportPreview === null && sessionReview === null}
        onClose={() => { if (!generating) onClose() }}
        size="lg"
        title={studentName}
        subtitle={
          lastActivity
            ? String(t('camp.studentDetail.lastActivity', { date: formatDate(lastActivity) }))
            : String(t('camp.studentDetail.noActivityYet'))
        }
        closeDisabled={generating}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={onClose} disabled={generating}>
              {t('common.close')}
            </Button>
            <Button onClick={handleGenerateReport} disabled={generating || loading || error}>
              {generating
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <FileText className="w-4 h-4 mr-2" />}
              {generating ? t('camp.reports.generating') : t('camp.studentDetail.generateReport')}
            </Button>
          </ModalShell.Footer>
        }
      >
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl flex-1" />
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : error || !payload ? (
          <p className="text-sm text-rose-600 py-3">{t('camp.studentDetail.loadFailed')}</p>
        ) : (
          <div className="space-y-6">
            {/* Summary chips — overall accuracy, completion, standing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  {t('camp.reports.overallAccuracy')}
                </p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">
                  {payload.cohort.studentAccuracy !== null ? `${payload.cohort.studentAccuracy}%` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  {t('camp.studentDetail.assignmentsDone')}
                </p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">
                  {payload.completion
                    ? `${payload.completion.done}/${payload.completion.total}`
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 mb-1">
                  {t('camp.reports.classStanding')}
                </p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">
                  {payload.cohort.percentile !== null
                    ? String(t('camp.reports.percentile', { p: payload.cohort.percentile }))
                    : '—'}
                </p>
              </div>
            </div>

            {/* Per-assignment status/score over time */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                <h4 className="text-sm font-semibold text-gray-900">{t('camp.studentDetail.assignments')}</h4>
              </div>
              {payload.assignments.length === 0 ? (
                <p className="text-sm text-gray-400">{t('camp.noAssignments')}</p>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100 overflow-hidden">
                  {payload.assignments.map(a => {
                    // A completed assignment row opens the question-by-
                    // question answer review of the student's session.
                    const reviewable = a.state === 'done' && !!a.sessionId
                    const rowBody = (
                      <>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                          <p className="text-xs text-gray-400">
                            {a.completedAt
                              ? formatDate(a.completedAt)
                              : a.dueAt
                                ? String(t('camp.dueDateLabel', { date: formatDate(a.dueAt) }))
                                : formatDate(a.createdAt)}
                          </p>
                        </div>
                        {a.state === 'done' && a.correctCount !== null && a.totalCount !== null && (
                          <span className="text-sm text-gray-600 tabular-nums flex-shrink-0">
                            {a.correctCount}/{a.totalCount}
                            {a.scorePct !== null && (
                              <span className="text-gray-400 ml-1">({a.scorePct}%)</span>
                            )}
                          </span>
                        )}
                        <StatusPill tone={STATE_TONES[a.state]} size="md">
                          {stateLabel(a.state)}
                        </StatusPill>
                      </>
                    )
                    return reviewable ? (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSessionReview({ sessionId: a.sessionId!, title: a.title })}
                        title={String(t('camp.studentSession.open'))}
                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        {rowBody}
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                      </button>
                    ) : (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                        {rowBody}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Accuracy by domain — same bar idiom as the classroom panel */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                <h4 className="text-sm font-semibold text-gray-900">{t('camp.dashboard.accuracyBySkill')}</h4>
              </div>
              {payload.skills.length === 0 ? (
                <p className="text-sm text-gray-400">{t('camp.reports.noGradedAnswers')}</p>
              ) : (
                <div className="space-y-2">
                  {payload.skills.map(skill => (
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
            </div>

            {/* Strengths / focus areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('camp.reports.strengths')}</h4>
                {strengths.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('camp.reports.notEnoughData')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map(s => (
                      <StatusPill key={`${s.section}:${s.domain}`} tone="emerald" size="md">
                        {domainLabel(s.domain)} · {s.accuracy}%
                      </StatusPill>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('camp.reports.weaknesses')}</h4>
                {weaknesses.length === 0 ? (
                  <p className="text-sm text-gray-400">{t('camp.reports.notEnoughData')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {weaknesses.map(s => (
                      <StatusPill key={`${s.section}:${s.domain}`} tone="rose" size="md">
                        {domainLabel(s.domain)} · {s.accuracy}%
                      </StatusPill>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ModalShell>

      {/* Freshly generated report — shared printable layout */}
      <ModalShell
        isOpen={reportPreview !== null}
        onClose={() => setReportPreview(null)}
        size="lg"
        title={String(t('camp.reports.previewTitle'))}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={() => setReportPreview(null)}>
              {t('common.back')}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              {t('camp.reports.print')}
            </Button>
          </ModalShell.Footer>
        }
      >
        {reportPreview && (
          <div className="camp-report-print-area">
            <CampReportView payload={reportPreview} />
          </div>
        )}
      </ModalShell>

      {/* Question-by-question answer review for one completed session */}
      {sessionReview && (
        <CampStudentSessionReview
          sessionId={sessionReview.sessionId}
          studentName={studentName}
          assignmentTitle={sessionReview.title}
          onClose={() => setSessionReview(null)}
        />
      )}
    </>
  )
}
