"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { MoreHorizontal, Edit, Eye, Trash2, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReportStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Reports list — table view with the row-level 3-dots menu shown open
 * on the first row so users can see at a glance that publish / preview /
 * edit / delete live behind it. Mirrors the table at
 * reports-page.tsx:2700-2885 (search bar, status pills, MoreHorizontal
 * dropdown). Header row matches: 학생 / 리포트 / 기간 / 상태.
 */
export function ReportsListDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getReportStudents(language), [language])

  const rows = useMemo(() => ([
    {
      id: 'r1',
      student: students[0],
      name: ko ? '2026년 5월 진척 리포트' : 'May 2026 progress report',
      period: ko ? '2026.05.01 – 2026.05.31' : '2026-05-01 – 2026-05-31',
      status: 'finished' as const,
    },
    {
      id: 'r2',
      student: students[1],
      name: ko ? '2026년 5월 진척 리포트' : 'May 2026 progress report',
      period: ko ? '2026.05.01 – 2026.05.31' : '2026-05-01 – 2026-05-31',
      status: 'draft' as const,
    },
    {
      id: 'r3',
      student: students[2],
      name: ko ? '2026년 4월 진척 리포트' : 'April 2026 progress report',
      period: ko ? '2026.04.01 – 2026.04.30' : '2026-04-01 – 2026-04-30',
      status: 'finished' as const,
    },
  ]), [students, ko])

  const statusPill = (s: 'draft' | 'finished') => (
    s === 'finished'
      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{t('reports.statusFinished')}</span>
      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">{t('reports.statusDraft')}</span>
  )

  return (
    <NonFunctional>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 flex-1">
            <Input
              readOnly
              placeholder={String(t('reports.searchPlaceholder'))}
              className="h-9 max-w-xs"
            />
          </div>
          <Button size="sm" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            {t('reports.createReport')}
          </Button>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">{t('reports.student')}</th>
              <th className="px-4 py-2 font-medium">{t('reports.reportTitle')}</th>
              <th className="px-4 py-2 font-medium">{t('reports.reportPeriod')}</th>
              <th className="px-4 py-2 font-medium">{t('common.status')}</th>
              <th className="px-4 py-2 w-10" aria-label="actions"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{row.student?.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{row.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{row.period}</td>
                <td className="px-4 py-3">{statusPill(row.status)}</td>
                <td className="px-4 py-3 relative">
                  <button
                    type="button"
                    className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100"
                    aria-label="row actions"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
                  {/* Show the dropdown OPEN on the first row so users see
                      what's behind the 3 dots without having to hover. */}
                  {i === 0 && (
                    <div className="absolute right-2 top-10 z-10 w-44 bg-white rounded-xl ring-1 ring-gray-100 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.10)] py-1 text-left">
                      <div className="px-4 py-2 text-sm text-gray-700 flex items-center gap-2 hover:bg-gray-50">
                        <Edit className="w-4 h-4" /> {t('common.edit')}
                      </div>
                      <div className="px-4 py-2 text-sm text-gray-700 flex items-center gap-2 hover:bg-gray-50">
                        <Eye className="w-4 h-4" /> {t('reports.previewReport')}
                      </div>
                      <div className="px-4 py-2 text-sm text-rose-600 flex items-center gap-2 hover:bg-gray-50">
                        <Trash2 className="w-4 h-4" /> {t('common.delete')}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NonFunctional>
  )
}
