"use client"

import { Users, Loader2, CheckCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignmentsDatePicker } from '@/components/ui/assignments-page'
import {
  SubmissionStatusPills,
  statusFromShortcut,
  type SubmissionStatus,
} from '@/components/ui/assignments/SubmissionStatusPills'
import type { Assignment, AssignmentGrade } from '@/components/ui/assignments/hooks/useAssignmentsData'

interface SubmissionsGradeModalProps {
  isOpen: boolean
  onClose: () => void
  submissionsAssignment: Assignment | null
  submissionGrades: AssignmentGrade[]
  submissionsModalLoading: boolean
  isSaving: boolean
  updateSubmissionGrade: (gradeId: string, field: keyof AssignmentGrade, value: string | number | null) => void
  saveSubmissionGrades: () => void | Promise<void>
  formatDate: (dateString: string, includeWeekday?: boolean) => string
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
}

export function SubmissionsGradeModal({
  isOpen,
  onClose,
  submissionsAssignment,
  submissionGrades,
  submissionsModalLoading,
  isSaving,
  updateSubmissionGrade,
  saveSubmissionGrades,
  formatDate,
  activeDatePicker,
  setActiveDatePicker,
}: SubmissionsGradeModalProps) {
  const { t, language } = useTranslation()

  // Score → status auto-flip. Typing a number into a row that's still
  // "pending" or "not submitted" (or has no status) flips it to "submitted"
  // because that's the overwhelmingly common path: managers grade work that
  // was submitted. If the row is already excused / overdue / submitted we
  // leave the explicit choice alone.
  const handleScoreChange = useCallback((grade: AssignmentGrade, raw: string) => {
    const next = raw === '' ? null : parseFloat(raw)
    updateSubmissionGrade(grade.id, 'score', Number.isNaN(next) ? null : next)
    if (next !== null && !Number.isNaN(next)) {
      const status = (grade.status || '').toLowerCase()
      if (status === '' || status === 'pending' || status === 'not submitted') {
        updateSubmissionGrade(grade.id, 'status', 'submitted')
      }
    }
  }, [updateSubmissionGrade])

  // Bulk: mark every row as submitted with today's date. Skips rows that are
  // already excused / overdue (those are explicit non-submission states).
  const markAllSubmitted = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    submissionGrades.forEach(grade => {
      const status = (grade.status || '').toLowerCase()
      if (status === 'excused' || status === 'overdue') return
      updateSubmissionGrade(grade.id, 'status', 'submitted')
      if (!grade.submitted_date) {
        updateSubmissionGrade(grade.id, 'submitted_date', today)
      }
    })
  }, [submissionGrades, updateSubmissionGrade])

  // Bulk: apply a common score to every submitted-status row. Used for
  // participation/completion grades where everyone who showed up got the
  // same number. Excludes excused/overdue/not-submitted/pending rows so the
  // manager doesn't accidentally score work that wasn't turned in.
  const [bulkScoreInput, setBulkScoreInput] = useState('')
  const applyBulkScore = useCallback(() => {
    const n = parseFloat(bulkScoreInput)
    if (Number.isNaN(n)) return
    submissionGrades.forEach(grade => {
      const status = (grade.status || '').toLowerCase()
      if (status !== 'submitted') return
      updateSubmissionGrade(grade.id, 'score', n)
    })
    setBulkScoreInput('')
  }, [bulkScoreInput, submissionGrades, updateSubmissionGrade])

  const submittedCount = submissionGrades.filter(
    g => (g.status || '').toLowerCase() === 'submitted'
  ).length

  if (!submissionsAssignment) return null

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
      headerSlot={
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: submissionsAssignment.classroom_color || '#6B7280' }}
          />
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate">{t("assignments.updateSubmissions")} - {submissionsAssignment.title}</h2>
        </div>
      }
      footer={
        <ModalShell.Footer justify="between">
          <div className="text-sm text-gray-500">
            {t("assignments.students")} {submissionGrades.length}명
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              {t("assignments.cancel")}
            </Button>
            <Button onClick={saveSubmissionGrades} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSaving ? t("common.saving") : t("assignments.saveChanges")}
            </Button>
          </div>
        </ModalShell.Footer>
      }
    >
      <div className="space-y-3">
        {submissionsModalLoading ? (
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 flex-1 max-w-md rounded" />
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 flex-1 max-w-sm rounded" />
              </div>
            ))}
          </div>
        ) : submissionGrades.length === 0 ? (
          <EmptyState
            icon={Users}
            title={String(t("assignments.noStudentsFound"))}
            description={String(t("assignments.noStudentsEnrolledMessage"))}
          />
        ) : (
          <>
            {/* Action row: bulk mark submitted + apply common score + keyboard hint */}
            <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={markAllSubmitted}
                className="h-8 px-3 text-xs text-emerald-600 ring-emerald-100 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {t("assignments.markAllSubmitted")}
              </Button>

              {/* Apply a common score to every submitted-status row. Pressing
                  Enter or clicking Apply distributes. The button is disabled
                  until there's a number AND at least one submitted row to
                  receive it — feedback for both common-mistake states. */}
              <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {t("assignments.scoreForAllSubmitted")}
                </span>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulkScoreInput}
                  onChange={(e) => setBulkScoreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyBulkScore()
                    }
                  }}
                  placeholder="0-100"
                  className="h-8 w-20 text-sm"
                  aria-label={String(t("assignments.scoreForAllSubmitted"))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyBulkScore}
                  disabled={bulkScoreInput === '' || Number.isNaN(parseFloat(bulkScoreInput)) || submittedCount === 0}
                  className="h-8 px-3 text-xs"
                  title={
                    submittedCount === 0
                      ? String(t("assignments.noSubmittedRowsToScore"))
                      : String(t("assignments.applyToCount", { count: submittedCount }))
                  }
                >
                  {t("common.apply")}
                  {submittedCount > 0 && (
                    <span className="ml-1 text-gray-400">·{submittedCount}</span>
                  )}
                </Button>
              </div>

              <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-500 ml-auto">
                <span>{t("assignments.gradingKeyboardHint")}</span>
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">S</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">M</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">E</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">O</kbd>
              </div>
            </div>

            {/* Flat dense row layout. Same shape as the attendance modal we
                redesigned earlier: each row is `tabIndex=0` so S/M/E/O sets
                status and ↑/↓ moves between students. Score input intercepts
                its own keypresses (so typing numbers types numbers, not
                triggers status shortcuts) but ↑/↓ still navigates between
                rows from inside the score field. */}
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
              {submissionGrades.map((grade, rowIndex) => (
                <div
                  key={grade.id}
                  tabIndex={0}
                  data-grading-row
                  onKeyDown={(e) => {
                    const target = e.target as HTMLElement
                    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
                    if (isInput) {
                      // Allow row-nav even mid-typing.
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-grading-row]'))
                        const next = rows[rowIndex + (e.key === 'ArrowDown' ? 1 : -1)]
                        if (next) { next.focus(); e.preventDefault() }
                      }
                      return
                    }
                    const status = statusFromShortcut(e.key)
                    if (status) {
                      updateSubmissionGrade(grade.id, 'status', status)
                      e.preventDefault()
                      return
                    }
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-grading-row]'))
                      const next = rows[rowIndex + (e.key === 'ArrowDown' ? 1 : -1)]
                      if (next) { next.focus(); e.preventDefault() }
                    }
                  }}
                  className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 px-4 py-3 hover:bg-gray-50 focus:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                >
                  {/* Student name + attendance badge.
                      The badge tells the manager why this row was pre-filled
                      (the grade status pill is now derived from the absent /
                      excused attendance below). Late and present don't get
                      a badge — those are the normal case. */}
                  <div className="lg:w-44 flex-shrink-0 flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">{grade.student_name}</span>
                    {grade.attendance_status === 'absent' && (
                      <Badge className="bg-rose-50 text-rose-700 hover:bg-red-100 pointer-events-none text-[10px] flex-shrink-0">
                        {t("attendance.absent")}
                      </Badge>
                    )}
                    {grade.attendance_status === 'excused' && (
                      <Badge className="bg-sky-50 text-sky-700 hover:bg-sky-100 pointer-events-none text-[10px] flex-shrink-0">
                        {t("attendance.excused")}
                      </Badge>
                    )}
                  </div>

                  {/* Status pills */}
                  <SubmissionStatusPills
                    value={(grade.status as SubmissionStatus) || 'pending'}
                    onChange={(next) => updateSubmissionGrade(grade.id, 'status', next)}
                    disabled={isSaving}
                  />

                  {/* Score (auto-flips status to submitted) */}
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={grade.score ?? ''}
                    onChange={(e) => handleScoreChange(grade, e.target.value)}
                    placeholder={String(t("assignments.score"))}
                    className="h-8 text-sm w-24 flex-shrink-0"
                  />

                  {/* Submitted/Overdue date — only when status is submitted/overdue */}
                  {(grade.status === 'submitted' || grade.status === 'overdue') && (
                    <div className="lg:w-40 flex-shrink-0">
                      <AssignmentsDatePicker
                        value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                        onChange={(value) => {
                          updateSubmissionGrade(grade.id, 'submitted_date', Array.isArray(value) ? value[0] : value || null)
                        }}
                        fieldId={`${grade.status === 'overdue' ? 'overdue' : 'submitted'}-date-${grade.id}`}
                        height="h-8"
                        shadow="shadow-sm"
                        activeDatePicker={activeDatePicker}
                        setActiveDatePicker={setActiveDatePicker}
                        t={t}
                        language={language}
                      />
                    </div>
                  )}

                  {/* Feedback (single-line by default; grow on focus) */}
                  <Input
                    type="text"
                    value={grade.feedback || ''}
                    onChange={(e) => updateSubmissionGrade(grade.id, 'feedback', e.target.value)}
                    placeholder={String(t("assignments.teacherFeedback"))}
                    className="h-8 text-sm flex-1 min-w-0"
                  />
                </div>
              ))}
            </div>

            {/* Single timestamp footer for the modal as a whole — per-row
                created/updated lines were eating ~24px each and aren't
                actionable here. Managers care about scoring, not record
                metadata. The save button in the footer is the audit trail. */}
            {submissionGrades.some(g => g.created_at) && (
              <p className="mt-3 text-[11px] text-gray-400">
                {(() => {
                  const updated = submissionGrades
                    .map(g => g.updated_at)
                    .filter((d): d is string => !!d)
                    .sort()
                    .pop()
                  return updated
                    ? `${t('assignments.updated')}: ${formatDate(updated, false)}`
                    : ''
                })()}
              </p>
            )}
          </>
        )}
      </div>
    </ModalShell>
  )
}
