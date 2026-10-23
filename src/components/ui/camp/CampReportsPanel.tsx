"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CampReportDelivery } from '@/components/ui/camp/CampReportDelivery'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { ErrorState } from '@/components/ui/common/ErrorState'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import type { CampReportPayload } from '@/lib/camp/report-types'
import { authHeaders } from '@/lib/auth-headers'
import { campErrorMessage } from '@/lib/camp/error-codes'
import { useTranslation } from '@/hooks/useTranslation'
import { useConfirm } from '@/hooks/useConfirm'
import { showErrorToast, showSuccessToast } from '@/stores'
import { FileText, Loader2, Printer, Undo2, User } from 'lucide-react'

/**
 * Camp P4 — teacher-side reports modal for one camp classroom: list the
 * generated camp reports grouped by reporting period, generate a fresh
 * batch (one snapshot row per enrolled student, via POST
 * /api/camp/reports/generate), preview one, withdraw one (DELETE
 * /api/camp/reports, the same call the student modal uses), and print —
 * one report, one period, or all — through /print/camp-reports, never
 * window.print() over the whole app.
 */

interface ReportMeta {
  id: string
  studentId: string
  studentName: string | null
  studentEmail: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

interface CampReportsPanelProps {
  classroomId: string
  classroomName: string
  onClose: () => void
}

/** One reporting period's reports — the unit a teacher generates and prints. */
interface PeriodGroup {
  key: string
  periodStart: string | null
  periodEnd: string | null
  reports: ReportMeta[]
  latest: string
}

function printHref(classroomId: string, q: Record<string, string> = {}) {
  const qs = new URLSearchParams(q).toString()
  return `/print/camp-reports/${classroomId}${qs ? `?${qs}` : ''}`
}

export function CampReportsPanel({ classroomId, classroomName, onClose }: CampReportsPanelProps) {
  const { t, language } = useTranslation()
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  /** A failed load is NOT "no reports yet" — it says so and offers a retry. */
  const [loadError, setLoadError] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [reports, setReports] = useState<ReportMeta[]>([])
  const [preview, setPreview] = useState<{ id: string; payload: CampReportPayload } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  const formatDate = useCallback((iso: string) => {
    // A bare YYYY-MM-DD is a Korean calendar date; noon keeps any browser timezone on that day.
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso)
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res = await fetch(`/api/camp/reports?classroomId=${classroomId}`, { headers: await authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoadError(true)
        return
      }
      setReports(json.reports ?? [])
    } catch (error) {
      console.error('[camp] failed to load reports:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => { fetchReports() }, [fetchReports])

  /** Newest period first; within a period, by student name. */
  const groups = useMemo<PeriodGroup[]>(() => {
    const byKey = new Map<string, PeriodGroup>()
    for (const r of reports) {
      const key = `${r.periodStart ?? 'none'}|${r.periodEnd ?? 'none'}`
      const g = byKey.get(key) ?? { key, periodStart: r.periodStart, periodEnd: r.periodEnd, reports: [], latest: r.createdAt }
      g.reports.push(r)
      if (r.createdAt > g.latest) g.latest = r.createdAt
      byKey.set(key, g)
    }
    const list = [...byKey.values()]
    for (const g of list) {
      g.reports.sort((a, b) => (a.studentName ?? a.studentEmail ?? '').localeCompare(b.studentName ?? b.studentEmail ?? ''))
    }
    return list.sort((a, b) =>
      (b.periodEnd ?? '').localeCompare(a.periodEnd ?? '') || b.latest.localeCompare(a.latest))
  }, [reports])

  const periodLabel = useCallback((g: { periodStart: string | null; periodEnd: string | null }) => {
    if (g.periodStart && g.periodEnd) {
      return String(t('camp.reports.periodRange', { start: formatDate(g.periodStart), end: formatDate(g.periodEnd) }))
    }
    if (g.periodEnd) return String(t('camp.reports.periodUntil', { end: formatDate(g.periodEnd) }))
    return String(t('camp.reports.periodNone'))
  }, [t, formatDate])

  const handleGenerate = async () => {
    if (generating) return
    // Publishing is immediate and visible to families, so ask first (camp-dashboard-ux-audit 3.3).
    const ok = await confirm({
      title: String(t('camp.reports.publishConfirmTitle')),
      description: String(t('camp.reports.publishConfirmBody')),
      confirmText: String(t('camp.reports.publishConfirmCta')),
      variant: 'info',
    })
    if (!ok) return
    setGenerating(true)
    try {
      const res = await fetch('/api/camp/reports/generate', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ classroomId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        /* A batch can fail part-way: the reports written before the failure
           exist and parents can already see them. Refresh so the list shows
           them, and say how many went out — returning before the refresh
           hid reports that were live. */
        const partial = Array.isArray(json.generated) ? json.generated.length : 0
        showErrorToast(partial > 0
          ? String(t('camp.reports.generatePartial', { count: partial }))
          : campErrorMessage(t, json, String(t('camp.reports.generateFailed'))))
        if (partial > 0) await fetchReports()
        return
      }
      showSuccessToast(String(t('camp.reports.generatedSuccessfully', { count: (json.generated ?? []).length })))
      await fetchReports()
    } catch (error) {
      console.error('[camp] generate reports failed:', error)
      showErrorToast(String(t('camp.reports.generateFailed')))
      // The request may have landed before the connection dropped.
      await fetchReports()
    } finally {
      setGenerating(false)
    }
  }

  const openPreview = async (id: string) => {
    if (previewLoading) return
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/camp/reports?id=${id}`, { headers: await authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.report?.payload) {
        showErrorToast(campErrorMessage(t, json, String(t('camp.reports.loadFailed'))))
        return
      }
      setPreview({ id, payload: json.report.payload as CampReportPayload })
    } catch (error) {
      console.error('[camp] load report failed:', error)
      showErrorToast(String(t('camp.reports.loadFailed')))
    } finally {
      setPreviewLoading(false)
    }
  }

  const withdraw = async (r: ReportMeta) => {
    if (withdrawingId) return
    const ok = await confirm({
      title: String(t('camp.withdrawReport.title')),
      description: String(t('camp.withdrawReport.body')),
      confirmText: String(t('camp.withdrawReport.confirm')),
      variant: 'danger',
    })
    if (!ok) return
    setWithdrawingId(r.id)
    try {
      const res = await fetch(`/api/camp/reports?id=${r.id}`, { method: 'DELETE', headers: await authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        showErrorToast(campErrorMessage(t, json, String(t('camp.withdrawReport.failed'))))
        return
      }
      showSuccessToast(String(t('camp.withdrawReport.done')))
      setReports(prev => prev.filter(x => x.id !== r.id))
    } catch {
      showErrorToast(String(t('camp.withdrawReport.failed')))
    } finally {
      setWithdrawingId(null)
    }
  }

  // Plain window.open (as /print/level-test does) so the print page's Close can window.close() it.
  const openPrint = (href: string) => { window.open(href, '_blank') }

  return (
    <>
      <ModalShell
        isOpen={preview === null}
        onClose={() => { if (!generating) onClose() }}
        size="md"
        title={String(t('camp.reports.title'))}
        subtitle={classroomName}
        closeDisabled={generating}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={onClose} disabled={generating}>
              {t('common.close')}
            </Button>
            <div className="flex items-center gap-2">
              {reports.length > 0 && (
                <Button variant="outline" onClick={() => openPrint(printHref(classroomId))}>
                  <Printer className="w-4 h-4 mr-2" />
                  {t('camp.reports.printAll')}
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={generating || loadError}>
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {generating ? t('camp.reports.generating') : t('camp.reports.generate')}
              </Button>
            </div>
          </ModalShell.Footer>
        }
      >
        {loading ? (
          <div className="divide-y divide-gray-100 -my-2 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="py-3 flex items-center gap-3 px-2 -mx-2">
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <ErrorState size="sm" onRetry={() => { void fetchReports() }} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={String(t('camp.reports.noReports'))}
            description={String(t('camp.reports.noReportsHint'))}
            size="sm"
          />
        ) : (
          <div className="space-y-5">
            {groups.map(g => (
              <div key={g.key}>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 truncate">
                    {periodLabel(g)}
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-400 tabular-nums">
                      {t('camp.reports.periodCount', { count: g.reports.length })}
                    </span>
                  </h4>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0"
                    onClick={() => openPrint(printHref(classroomId, {
                      periodStart: g.periodStart ?? 'none',
                      ...(g.periodEnd ? { periodEnd: g.periodEnd } : {}),
                    }))}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {t('camp.reports.printPeriod')}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {g.reports.map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(r.id)}
                        disabled={previewLoading}
                        className="flex-1 min-w-0 py-3 flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {r.studentName ?? r.studentEmail ?? r.studentId}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t('camp.reports.generatedOn', { date: formatDate(r.createdAt) })}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                        onClick={() => void withdraw(r)}
                        disabled={withdrawingId !== null}
                        title={String(t('camp.withdrawReport.action'))}
                      >
                        {withdrawingId === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Undo2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />}
                        {t('camp.withdrawReport.action')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <CampReportDelivery t={t} />
      </ModalShell>

      {/* Preview — the shared report layout; Print opens this report alone in the print view. */}
      <ModalShell
        isOpen={preview !== null}
        onClose={() => setPreview(null)}
        size="lg"
        title={String(t('camp.reports.previewTitle'))}
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={() => setPreview(null)}>
              {t('common.back')}
            </Button>
            <Button onClick={() => preview && openPrint(printHref(classroomId, { report: preview.id }))}>
              <Printer className="w-4 h-4 mr-2" />
              {t('camp.reports.print')}
            </Button>
          </ModalShell.Footer>
        }
      >
        {preview && (
          <div className="camp-report-print-area">
            <CampReportView payload={preview.payload} />
          </div>
        )}
      </ModalShell>
    </>
  )
}
