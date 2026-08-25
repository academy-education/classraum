"use client"

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { StatusPill, type StatusPillTone } from '@/components/ui/status-pill'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import { CampReportDelivery } from '@/components/ui/camp/CampReportDelivery'
import { CampStudentSessionReview } from '@/components/ui/camp/CampStudentSessionReview'
import type { CampReportPayload } from '@/lib/camp/report-types'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast, showSuccessToast } from '@/stores'
import { ChevronRight, ClipboardList, FileText, Loader2, Printer, Trash2 } from 'lucide-react'

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
  /** Kept for the call sites; CampReportView reads the family from the
   *  payload itself (payload.program.testFamily), so this component no
   *  longer needs it. */
  testFamily: string
  onClose: () => void
}

const STATE_TONES: Record<'not_started' | 'in_progress' | 'done', StatusPillTone> = {
  not_started: 'gray',
  in_progress: 'amber',
  done: 'emerald',
}

export function CampStudentDetail({ classroomId, studentId, studentName, testFamily: _testFamily, onClose }: CampStudentDetailProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [payload, setPayload] = useState<CampReportPayload | null>(null)
  const [lastActivity, setLastActivity] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [reportPreview, setReportPreview] = useState<CampReportPayload | null>(null)
  /** Completed-assignment answer review (GET /api/camp/student-session). */
  const [sessionReview, setSessionReview] = useState<{ sessionId: string; title: string } | null>(null)

  /* Three tabs instead of one long scroll. Everything used to stack in
     a single column — three stat chips, then every assignment, then a
     bar per skill, then two pill clouds — so the teacher scrolled past
     the numbers to reach the work and past the work to reach the
     skills. Split by the question being asked: how is this student
     doing / what have they done / what have we sent home. */
  const [tab, setTab] = useState<'overview' | 'assignments' | 'reports'>('overview')

  /** Reports already generated FOR THIS STUDENT (meta only). Fetched
   *  lazily — most visits to this modal never open the tab. */
  const [reports, setReports] = useState<{ id: string; createdAt: string; periodStart: string | null; periodEnd: string | null }[] | null>(null)
  const [reportsError, setReportsError] = useState(false)
  const [reportsLoading, setReportsLoading] = useState(false)
  /** Report queued for withdrawal — confirmed, because it disappears
   *  from the student's and the parents' lists too, not just ours. */
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [withdrawBusy, setWithdrawBusy] = useState(false)

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
      // The Reports tab has just gone stale — drop the cache so it
      // refetches next time it is opened, rather than showing a list
      // that is missing the report the teacher just made.
      setReports(null)
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

  const loadReports = useCallback(async () => {
    setReportsLoading(true)
    setReportsError(false)
    try {
      const headers = await authHeaders()
      const res = await fetch(
        `/api/camp/reports?classroomId=${classroomId}&studentId=${studentId}`,
        { headers },
      )
      if (!res.ok) throw new Error(String(res.status))
      const json = await res.json()
      setReports((json.reports ?? []).map((r: { id: string; createdAt?: string; created_at?: string; periodStart?: string | null; periodEnd?: string | null }) => ({
        id: r.id,
        createdAt: r.createdAt ?? r.created_at ?? '',
        periodStart: r.periodStart ?? null,
        periodEnd: r.periodEnd ?? null,
      })))
    } catch {
      setReportsError(true)
      setReports([])
    } finally {
      setReportsLoading(false)
    }
  }, [classroomId, studentId])

  useEffect(() => {
    // Only when the tab is actually opened, and only once.
    if (tab === 'reports' && reports === null && !reportsLoading) void loadReports()
  }, [tab, reports, reportsLoading, loadReports])

  /** Open one stored report in the shared printable layout. */
  const openStoredReport = useCallback(async (id: string) => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/camp/reports?id=${id}`, { headers })
      if (!res.ok) throw new Error(String(res.status))
      const json = await res.json()
      if (json.report?.payload) setReportPreview(json.report.payload as CampReportPayload)
      else showErrorToast(String(t('camp.studentDetail.reportsList.loadFailed')))
    } catch {
      showErrorToast(String(t('camp.studentDetail.reportsList.loadFailed')))
    }
  }, [t])


  const confirmWithdraw = useCallback(async () => {
    if (!withdrawing || withdrawBusy) return
    setWithdrawBusy(true)
    try {
      const headers = await authHeaders()
      const res = await fetch(`/api/camp/reports?id=${withdrawing}`, { method: 'DELETE', headers })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        showErrorToast(j.error || String(t('camp.withdrawReport.failed')))
        return
      }
      showSuccessToast(String(t('camp.withdrawReport.done')))
      setWithdrawing(null)
      setReports(null)   // refetch on next open
      void loadReports()
    } catch {
      showErrorToast(String(t('camp.withdrawReport.failed')))
    } finally { setWithdrawBusy(false) }
  }, [withdrawing, withdrawBusy, t, loadReports])

  return (
    <>
      <ModalShell
        isOpen={reportPreview === null && sessionReview === null && withdrawing === null}
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
          <div className="space-y-5">
            {/* Tab strip */}
            <div className="flex items-center gap-1 border-b border-gray-200 -mt-1">
              {(['overview', 'assignments', 'reports'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t(`camp.studentDetail.tabs.${key}`)}
                  {key === 'assignments' && payload.assignments.length > 0 && (
                    <span className="ml-1.5 text-xs text-gray-400 tabular-nums">{payload.assignments.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Overview IS the report. Rendering CampReportView with the
                live payload — rather than a second layout that resembles
                it — is the only way "the modal and the report look the
                same" can stay true: they are one component fed by one
                payload builder (src/lib/camp/reports.ts). A hand-rolled
                copy drifts the first time either is touched. */}
            <div className={tab === 'overview' ? '' : 'hidden'}>
              <CampReportView payload={payload} />
            </div>

            {/* Per-assignment status/score over time */}
            <div className={tab === 'assignments' ? '' : 'hidden'}>
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

            {/* Reports already sent home for this student */}
            <div className={tab === 'reports' ? '' : 'hidden'}>
              {reportsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
                </div>
              ) : reportsError ? (
                <p className="text-sm text-rose-600 py-3">{t('camp.studentDetail.reportsList.loadFailed')}</p>
              ) : (reports ?? []).length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">{t('camp.studentDetail.reportsList.empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-gray-100 overflow-hidden">
                  {(reports ?? []).map(r => (
                    <div key={r.id} className="flex items-stretch bg-white hover:bg-gray-50 transition-colors">
                    <button
                      type="button"
                      onClick={() => void openStoredReport(r.id)}
                      title={String(t('camp.studentDetail.reportsList.open'))}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50 transition-colors cursor-pointer group text-left"
                    >
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.75} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {r.periodStart && r.periodEnd
                            ? t('camp.studentDetail.reportsList.period', {
                                start: formatDate(r.periodStart),
                                end: formatDate(r.periodEnd),
                              })
                            : t('camp.studentDetail.reportsList.open')}
                        </p>
                        {r.createdAt && (
                          <p className="text-xs text-gray-400">
                            {t('camp.studentDetail.reportsList.generated', { date: formatDate(r.createdAt) })}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawing(r.id)}
                      title={String(t('camp.withdrawReport.action'))}
                      aria-label={String(t('camp.withdrawReport.action'))}
                      className="px-3 text-gray-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    </div>
                  ))}
                </div>
              )}
              <CampReportDelivery t={t} />
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell
        isOpen={withdrawing !== null}
        onClose={() => { if (!withdrawBusy) setWithdrawing(null) }}
        size="sm"
        title={String(t('camp.withdrawReport.title'))}
        closeDisabled={withdrawBusy}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={() => setWithdrawing(null)} disabled={withdrawBusy}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmWithdraw()} disabled={withdrawBusy}>
              {withdrawBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('camp.withdrawReport.confirm')}
            </Button>
          </ModalShell.Footer>
        }
      >
        <p className="text-sm text-gray-700">{t('camp.withdrawReport.body')}</p>
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
