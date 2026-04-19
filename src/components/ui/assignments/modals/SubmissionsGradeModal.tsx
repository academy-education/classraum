"use client"

import { Users, X, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignmentsDatePicker } from '@/components/ui/assignments-page'
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

  if (!submissionsAssignment) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: submissionsAssignment.classroom_color || '#6B7280' }}
            />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t("assignments.updateSubmissions")} - {submissionsAssignment.title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="space-y-4">
            {submissionsModalLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                      <div className="lg:col-span-1">
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="lg:col-span-1">
                        <Skeleton className="h-3 w-12 mb-1" />
                        <Skeleton className="h-9 w-full rounded" />
                      </div>
                      <div className="lg:col-span-1">
                        <Skeleton className="h-3 w-12 mb-1" />
                        <Skeleton className="h-9 w-full rounded" />
                      </div>
                      <div className="lg:col-span-3">
                        <Skeleton className="h-3 w-16 mb-1" />
                        <Skeleton className="h-9 w-full rounded" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : submissionGrades.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">{t("assignments.noStudentsFound")}</p>
                <p className="text-gray-600">{t("assignments.noStudentsEnrolledMessage")}</p>
              </div>
            ) : (
              submissionGrades.map((grade) => (
                <Card key={grade.id} className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                    {/* Student Name */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium text-gray-700">{grade.student_name}</Label>
                        {grade.attendance_status === 'absent' && (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 pointer-events-none text-xs">
                            {t("attendance.absent")}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-1">
                      <Label className="text-xs text-gray-500 mb-1 block">{t("common.status")}</Label>
                      <Select
                        value={grade.status}
                        onValueChange={(value) => updateSubmissionGrade(grade.id, 'status', value)}
                      >
                        <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("assignments.status.pending")}</SelectItem>
                          <SelectItem value="submitted">{t("assignments.status.submitted")}</SelectItem>
                          <SelectItem value="not submitted">{t("assignments.status.notSubmitted")}</SelectItem>
                          <SelectItem value="excused">{t("assignments.status.excused")}</SelectItem>
                          <SelectItem value="overdue">{t("assignments.status.overdue")}</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Submitted Date - Show when status is submitted */}
                      {grade.status === 'submitted' && (
                        <div className="mt-2">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.submittedDate")}</Label>
                          <AssignmentsDatePicker
                            value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                            onChange={(value) => {
                              updateSubmissionGrade(grade.id, 'submitted_date', Array.isArray(value) ? value[0] : value || null)
                            }}
                            fieldId={`submitted-date-${grade.id}`}
                            height="h-10"
                            shadow="shadow-sm"
                            activeDatePicker={activeDatePicker}
                            setActiveDatePicker={setActiveDatePicker}
                            t={t}
                            language={language}
                          />
                        </div>
                      )}

                      {/* Overdue Date - Show when status is overdue */}
                      {grade.status === 'overdue' && (
                        <div className="mt-2">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.overdueDate")}</Label>
                          <AssignmentsDatePicker
                            value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                            onChange={(value) => {
                              updateSubmissionGrade(grade.id, 'submitted_date', Array.isArray(value) ? value[0] : value || null)
                            }}
                            fieldId={`overdue-date-${grade.id}`}
                            height="h-10"
                            shadow="shadow-sm"
                            activeDatePicker={activeDatePicker}
                            setActiveDatePicker={setActiveDatePicker}
                            t={t}
                            language={language}
                          />
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div className="lg:col-span-1">
                      <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.score")}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={grade.score ?? ''}
                        onChange={(e) => updateSubmissionGrade(grade.id, 'score', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0-100"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Feedback */}
                    <div className="lg:col-span-3">
                      <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.feedback")}</Label>
                      <textarea
                        value={grade.feedback || ''}
                        onChange={(e) => updateSubmissionGrade(grade.id, 'feedback', e.target.value)}
                        placeholder={String(t("assignments.teacherFeedback"))}
                        className="flex min-h-[4.5rem] w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 sm:gap-6 text-xs text-gray-500">
                    {grade.created_at && (
                      <span>{t("assignments.created")}: {formatDate(grade.created_at, false)}</span>
                    )}
                    {grade.updated_at && grade.updated_at !== grade.created_at && (
                      <span>{t("assignments.updated")}: {formatDate(grade.updated_at, false)}</span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {t("assignments.students")} {submissionGrades.length}명
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {t("assignments.cancel")}
            </Button>
            <Button
              onClick={saveSubmissionGrades}
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isSaving ? t("common.saving") : t("assignments.saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
