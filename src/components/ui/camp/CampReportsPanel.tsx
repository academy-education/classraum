"use client"

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CampReportDelivery } from '@/components/ui/camp/CampReportDelivery'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import type { CampReportPayload } from '@/lib/camp/report-types'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast, showSuccessToast } from '@/stores'
import { FileText, Loader2, Printer, User } from 'lucide-react'

/**
 * Camp P4 — teacher-side reports modal for one camp classroom: list the
 * generated camp reports, generate a fresh batch (one snapshot row per
 * enrolled student, via POST /api/camp/reports/generate), and preview a
 * report in the shared printable layout.
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

export function CampReportsPanel({ classroomId, classroomName, onClose }: CampReportsPanelProps) {
  const { t, language } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reports, setReports] = useState<ReportMeta[]>([])
  const [preview, setPreview] = useState<{ payload: CampReportPayload } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }, [language])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/camp/reports?classroomId=${classroomId}`, { headers: await authHeaders() })
      const json = await res.json().catch(() => ({}))
      setReports(res.ok ? (json.reports ?? []) : [])
    } catch (error) {
      console.error('[camp] failed to load reports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/camp/reports/generate', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ classroomId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        showErrorToast(json.error || String(t('camp.reports.generateFailed')))
        return
      }
      showSuccessToast(String(t('camp.reports.generatedSuccessfully', { count: (json.generated ?? []).length })))
      await fetchReports()
    } catch (error) {
      console.error('[camp] generate reports failed:', error)
      showErrorToast(String(t('camp.reports.generateFailed')))
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
        showErrorToast(String(t('camp.reports.loadFailed')))
        return
      }
      setPreview({ payload: json.report.payload as CampReportPayload })
    } catch (error) {
      console.error('[camp] load report failed:', error)
      showErrorToast(String(t('camp.reports.loadFailed')))
    } finally {
      setPreviewLoading(false)
    }
  }

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
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {generating ? t('camp.reports.generating') : t('camp.reports.generate')}
            </Button>
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
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={String(t('camp.reports.noReports'))}
            description={String(t('camp.reports.noReportsHint'))}
            size="sm"
          />
        ) : (
          <div className="divide-y divide-gray-100 -my-2">
            {reports.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => openPreview(r.id)}
                disabled={previewLoading}
                className="w-full py-3 flex items-center gap-3 text-left hover:bg-gray-50 rounded-lg px-2 -mx-2"
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
            ))}
          </div>
        )}
        <CampReportDelivery t={t} />
      </ModalShell>

      {/* Preview — the shared printable layout */}
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
            <Button onClick={() => window.print()}>
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
