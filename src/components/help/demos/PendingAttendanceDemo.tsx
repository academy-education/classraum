"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AttendanceStatusPills, type AttendanceStatus } from '@/components/ui/attendance/AttendanceStatusPills'
import { CheckCircle, Users, Clock } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

/**
 * Update Attendance modal — composed from the same building blocks the
 * real attendance-page.tsx uses (ModalShell, AttendanceStatusPills,
 * Input, Button). The live modal is inline JSX in attendance-page.tsx
 * rather than a standalone component, so this is a faithful
 * reconstruction using the same primitives.
 *
 * Layout matches attendance-page.tsx around line 1590: header with the
 * classroom color dot + title, body with the flat row-per-student
 * layout, "Mark all present" quick action, keyboard-shortcut legend,
 * and the same footer (Cancel + Save Changes + Save & Next).
 */

interface Row {
  id: string
  student_name: string
  status: AttendanceStatus
  note: string
}

function initialRowsFor(lang: string): Row[] {
  if (lang === 'korean') {
    return [
      { id: 'r1', student_name: '박앨리스', status: 'present', note: '' },
      { id: 'r2', student_name: '조브라이언', status: 'late', note: '버스 지연' },
      { id: 'r3', student_name: '임클로이', status: 'pending', note: '' },
      { id: 'r4', student_name: '한다니엘', status: 'absent', note: '병결' },
      { id: 'r5', student_name: '박에단', status: 'excused', note: '가족 행사' },
    ]
  }
  return [
    { id: 'r1', student_name: 'Alice Park', status: 'present', note: '' },
    { id: 'r2', student_name: 'Brian Cho', status: 'late', note: 'Bus delay' },
    { id: 'r3', student_name: 'Chloe Lim', status: 'pending', note: '' },
    { id: 'r4', student_name: 'Daniel Han', status: 'absent', note: 'Sick' },
    { id: 'r5', student_name: 'Ethan Park', status: 'excused', note: 'Family event' },
  ]
}

export function PendingAttendanceDemo() {
  const { t, language } = useTranslation()
  // Reset rows when the language flips so names/notes stay consistent
  // with the active locale (and stay editable through useState).
  const [rows, setRows] = useState<Row[]>(() => initialRowsFor(language))
  const [seededLang, setSeededLang] = useState(language)
  if (seededLang !== language) {
    setSeededLang(language)
    setRows(initialRowsFor(language))
  }

  const updateStatus = (id: string, status: AttendanceStatus) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
  const updateNote = (id: string, note: string) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, note } : r)))

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="6xl"
        headerSlot={
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex-shrink-0 bg-sky-400" />
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate">
              {t('attendance.updateAttendance')} - {language === 'korean' ? '4학년 수학' : 'Grade 4 Math'}
            </h2>
          </div>
        }
        bodyPadding={false}
        footer={
          <ModalShell.Footer justify="between">
            <div className="text-sm text-gray-500">{rows.length} {t('common.students')}</div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <Button variant="outline">{t('common.cancel')}</Button>
              <Button>{t('common.saveChanges')}</Button>
              {(() => {
                const nextLabel = language === 'korean' ? 'SAT 준비반' : 'SAT Prep'
                return (
                  <Button variant="default" title={`${t('attendance.saveAndNext')} → ${nextLabel}`}>
                    {t('attendance.saveAndNext')}
                    <span className="ml-1.5 text-xs opacity-70">→ {nextLabel}</span>
                  </Button>
                )
              })()}
            </div>
          </ModalShell.Footer>
        }
      >
        <div className="p-6">
          {/* Sample missing-students callout (1 entry so the section is shown) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">{t('attendance.missingStudents')} (1)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="font-medium text-gray-900">{language === 'korean' ? '이피오나' : 'Fiona Lee'}</span>
                <Button size="sm" variant="outline" className="text-amber-600 border-orange-300 hover:bg-orange-100">
                  {t('attendance.addStudent')}
                </Button>
              </div>
            </div>
          </div>

          {/* Attendance list */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs text-emerald-600 ring-emerald-100 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('sessions.markAllPresent')}
            </Button>
            <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Keyboard:</span>
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">P</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">A</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">L</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">E</kbd>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
            {rows.map(r => (
              <div
                key={r.id}
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 py-2.5 hover:bg-gray-50"
              >
                <div className="md:w-44 lg:w-56 flex-shrink-0 truncate text-sm font-medium text-gray-900">
                  {r.student_name}
                </div>
                <AttendanceStatusPills
                  value={r.status}
                  onChange={next => updateStatus(r.id, next)}
                />
                <Input
                  value={r.note}
                  onChange={e => updateNote(r.id, e.target.value)}
                  placeholder={String(t('attendance.teacherNote'))}
                  className="h-8 text-sm flex-1 min-w-0"
                />
              </div>
            ))}
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
