"use client"

import { useEffect, useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CampReportView } from '@/components/ui/camp/CampReportView'
import { authHeaders } from '@/lib/auth-headers'
import { campErrorMessage } from '@/lib/camp/error-codes'
import type { CampReportPayload } from '@/lib/camp/report-types'
import { useTranslation } from '@/hooks/useTranslation'

/**
 * Print view for camp reports — every published (not withdrawn) report of
 * one classroom, one per page, optionally narrowed to a reporting period
 * (?periodStart=…&periodEnd=…, periodStart=none for an open start) or to
 * one report (?report=<id>).
 *
 * Replaces window.print() on the whole app, which printed the sidebar,
 * the page behind the modal and the modal itself (camp-dashboard-ux-audit
 * #7). Outside the (app) layout like /print/level-test, so the page is
 * only the reports.
 *
 * Data and authorisation come from /api/camp/reports itself — the list
 * (?classroomId=&include=payload) or one report (?id=) — so who may print
 * is exactly who may read the reports there; nothing is re-derived here.
 */

interface PrintableReport {
  id: string
  classroomId: string
  studentName: string | null
  payload: CampReportPayload
}

interface PageProps {
  params: Promise<{ classroomId: string }>
}

export default function CampReportsPrintPage({ params }: PageProps) {
  const { classroomId } = use(params)
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const reportId = searchParams.get('report')
  const periodStart = searchParams.get('periodStart')
  const periodEnd = searchParams.get('periodEnd')

  const [reports, setReports] = useState<PrintableReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const headers = await authHeaders()
        if (reportId) {
          const res = await fetch(`/api/camp/reports?id=${encodeURIComponent(reportId)}`, { headers })
          const json = await res.json().catch(() => ({}))
          if (!alive) return
          if (!res.ok || !json.report?.payload) {
            setError(campErrorMessage(t, json, String(t('camp.reports.printLoadFailed'))))
            return
          }
          // A report of another classroom is not part of this print view.
          if (json.report.classroomId !== classroomId) {
            setError(String(t('camp.errors.codes.report_not_found')))
            return
          }
          setReports([{ ...json.report, studentName: json.report.payload?.student?.name ?? null }])
          return
        }
        const q = new URLSearchParams({ classroomId, include: 'payload' })
        if (periodStart) q.set('periodStart', periodStart)
        if (periodEnd) q.set('periodEnd', periodEnd)
        const res = await fetch(`/api/camp/reports?${q.toString()}`, { headers })
        const json = await res.json().catch(() => ({}))
        if (!alive) return
        if (!res.ok) {
          setError(campErrorMessage(t, json, String(t('camp.reports.printLoadFailed'))))
          return
        }
        const rows = ((json.reports ?? []) as PrintableReport[]).filter(r => r.payload)
        // Alphabetical, so a stack of printed pages can be handed out in roster order.
        rows.sort((a, b) => (a.studentName ?? '').localeCompare(b.studentName ?? ''))
        setReports(rows)
      } catch (e) {
        console.error('[camp] print load failed:', e)
        if (alive) setError(String(t('camp.reports.printLoadFailed')))
      }
    }
    void load()
    return () => { alive = false }
    // t is stable per language; reloading on a language switch is harmless.
  }, [classroomId, reportId, periodStart, periodEnd, t])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6 text-center text-gray-700">
        {error}
      </div>
    )
  }
  if (!reports) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const classroomName = reports[0]?.payload.classroom?.name ?? ''

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <style jsx global>{`
        @media print {
          @page { margin: 0.5in; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .camp-print-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        }
        .camp-print-page { break-after: page; page-break-after: always; }
        .camp-print-page:last-child { break-after: auto; page-break-after: auto; }
        .camp-print-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-900 truncate">
            {t('camp.reports.printHeading', { classroom: classroomName, count: reports.length })}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => window.close()} className="h-9">
              <X className="w-4 h-4 mr-2" />
              {t('common.close')}
            </Button>
            <Button size="sm" onClick={() => window.print()} disabled={reports.length === 0} className="h-9">
              <Printer className="w-4 h-4 mr-2" />
              {t('camp.reports.print')}
            </Button>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="max-w-4xl mx-auto p-8 my-6 bg-white text-center text-gray-600">
          {t('camp.reports.printEmpty')}
        </div>
      ) : (
        <div className="camp-print-root">
          {reports.map(r => (
            <section key={r.id} className="camp-print-page max-w-4xl mx-auto p-8 my-6 bg-white shadow-sm text-black">
              <CampReportView payload={r.payload} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
