"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle } from 'lucide-react'
import { getStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the Update Submissions / grading modal — mirrors
 * assignments/modals/SubmissionsGradeModal.tsx. Shows the bulk action
 * row (Mark all submitted + Score for all submitted), the keyboard
 * hint chips, and a few student rows with status pills + score + feedback
 * so users see exactly where to enter grades.
 */
type RowStatus = 'submitted' | 'pending' | 'not_submitted' | 'excused' | 'overdue'

interface Row {
  id: string
  name: string
  status: RowStatus
  score?: number | ''
  feedback?: string
}

export function AssignmentGradingDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getStudents(language), [language])

  const rows: Row[] = useMemo(() => ([
    { id: students[0].id, name: students[0].name, status: 'submitted', score: 92, feedback: ko ? '잘 정리되었습니다.' : 'Well organized.' },
    { id: students[1].id, name: students[1].name, status: 'submitted', score: 85, feedback: '' },
    { id: students[2].id, name: students[2].name, status: 'not_submitted' },
    { id: students[3].id, name: students[3].name, status: 'excused' },
  ]), [students, ko])

  const pill = (s: RowStatus) => {
    const map: Record<RowStatus, { cls: string; key: string; letter: string }> = {
      submitted:    { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', key: 'assignments.status.submitted',    letter: 'S' },
      pending:      { cls: 'bg-gray-50 text-gray-700 ring-gray-200',          key: 'assignments.status.pending',      letter: 'P' },
      not_submitted:{ cls: 'bg-amber-50 text-amber-700 ring-amber-200',       key: 'assignments.status.notSubmitted', letter: 'M' },
      excused:      { cls: 'bg-purple-100 text-purple-800 ring-purple-200',   key: 'assignments.status.excused',      letter: 'E' },
      overdue:      { cls: 'bg-rose-50 text-rose-700 ring-rose-200',          key: 'assignments.status.overdue',      letter: 'O' },
    }
    const m = map[s]
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${m.cls}`}>
        <kbd className="font-mono text-[10px] opacity-60">{m.letter}</kbd>
        {t(m.key)}
      </span>
    )
  }

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="4xl"
        headerSlot={
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-5 h-5 rounded-full flex-shrink-0 bg-blue-500" />
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 truncate">
              {t('assignments.updateSubmissions')} — {ko ? '분수 단원평가' : 'Fractions unit quiz'}
            </h2>
          </div>
        }
        footer={
          <ModalShell.Footer justify="between">
            <div className="text-sm text-gray-500">
              {t('assignments.students')} {rows.length}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline">{t('assignments.cancel')}</Button>
              <Button>{t('assignments.saveChanges')}</Button>
            </div>
          </ModalShell.Footer>
        }
      >
        <div className="space-y-3">
          {/* Bulk action row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('assignments.markAllSubmitted')}
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 hidden sm:inline">
                {t('assignments.scoreForAllSubmitted')}
              </span>
              <Input readOnly type="number" value={90} className="h-8 w-20 text-sm" />
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                {t('common.apply')} <span className="ml-1 text-gray-400">·2</span>
              </Button>
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-500 ml-auto">
              <span>{ko ? '키보드: 상태 변경' : 'Keys: change status'}</span>
              {['S','M','E','O'].map(k => (
                <kbd key={k} className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">{k}</kbd>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
            {rows.map(row => (
              <div key={row.id} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                <div className="col-span-3 font-medium text-gray-900 text-sm truncate">{row.name}</div>
                <div className="col-span-3">{pill(row.status)}</div>
                <div className="col-span-2">
                  <Input
                    readOnly
                    type="number"
                    value={row.score ?? ''}
                    placeholder={ko ? '점수' : 'Score'}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    readOnly
                    value={row.feedback ?? ''}
                    placeholder={String(t('assignments.feedbackPlaceholder'))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
