"use client"

import {
  Calendar,
  Edit,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { AttachmentList } from '@/components/ui/attachment-list'
import type { Assignment, AssignmentGrade } from '@/components/ui/assignments/hooks/useAssignmentsData'

interface AssignmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  viewingAssignment: Assignment | null
  assignmentGrades: AssignmentGrade[]
  viewModalLoading: boolean
  handleEditClick: (assignment: Assignment) => void | Promise<void>
  formatDate: (dateString: string, includeWeekday?: boolean) => string
}

function getTypeIcon(type: string) {
  const sizeClass = "w-3 h-3 sm:w-4 sm:h-4"
  switch (type) {
    case 'quiz':
      return <CheckCircle className={`${sizeClass} text-blue-500`} />
    case 'test':
      return <FileText className={`${sizeClass} text-purple-500`} />
    case 'project':
      return <Building className={`${sizeClass} text-green-500`} />
    default:
      return <BookOpen className={`${sizeClass} text-orange-500`} />
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'quiz':
      return 'bg-blue-100 text-blue-800'
    case 'test':
      return 'bg-purple-100 text-purple-800'
    case 'project':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-orange-100 text-orange-800'
  }
}

export function AssignmentDetailsModal({
  isOpen,
  onClose,
  viewingAssignment,
  assignmentGrades,
  viewModalLoading,
  handleEditClick,
  formatDate,
}: AssignmentDetailsModalProps) {
  const { t } = useTranslation()

  if (!viewingAssignment) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: viewingAssignment.classroom_color || '#6B7280' }}
            />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{viewingAssignment.title}</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Assignment Info */}
            <div className="space-y-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("assignments.assignmentInformation")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("assignments.classroom")}</p>
                      <p className="font-medium text-gray-900">{viewingAssignment.classroom_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("assignments.teacher")}</p>
                      <p className="font-medium text-gray-900">{viewingAssignment.teacher_name}</p>
                    </div>
                  </div>
                  {viewingAssignment.session_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("assignments.sessionDate")}</p>
                        <p className="font-medium text-gray-900">{formatDate(viewingAssignment.session_date)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {getTypeIcon(viewingAssignment.assignment_type)}
                    <div>
                      <p className="text-sm text-gray-600">{t("assignments.type")}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(viewingAssignment.assignment_type)}`}>
                        {t(`assignments.${viewingAssignment.assignment_type}`)}
                      </span>
                    </div>
                  </div>
                  {viewingAssignment.category_name && (
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("assignments.category")}</p>
                        <p className="font-medium text-gray-900">{viewingAssignment.category_name}</p>
                      </div>
                    </div>
                  )}
                  {viewingAssignment.due_date && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("assignments.dueDate")}</p>
                        <p className="font-medium text-gray-900">{formatDate(viewingAssignment.due_date)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {viewingAssignment.description && (
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.descriptionLabel")}</h3>
                  <p className="text-gray-700 leading-relaxed">{viewingAssignment.description}</p>
                </Card>
              )}

              {viewingAssignment.attachments && viewingAssignment.attachments.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <AttachmentList
                    attachments={viewingAssignment.attachments}
                    titleClassName="text-lg font-semibold text-gray-900 mb-4"
                    showDownload={true}
                    showPreview={true}
                  />
                </Card>
              )}
            </div>

            {/* Right Column - Student Submissions */}
            <div className="space-y-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t("assignments.studentSubmissions")} {!viewModalLoading && `(${assignmentGrades.length})`}
                </h3>
                {viewModalLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : assignmentGrades.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{t("assignments.noSubmissionsYet")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentGrades.map((grade) => {
                      const studentName = grade.student_name || 'Unknown Student';
                      const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase()

                      return (
                      <div key={grade.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{studentName}</p>
                            {grade.feedback && (
                              <p className="text-sm text-gray-500 truncate">{grade.feedback}</p>
                            )}
                            {grade.submitted_date && (
                              <p className="text-xs text-gray-400">{t("assignments.submitted")}: {formatDate(grade.submitted_date)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            grade.status === 'submitted' ? 'bg-green-100 text-green-800' :
                            grade.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            grade.status === 'not submitted' ? 'bg-orange-100 text-orange-800' :
                            grade.status === 'excused' ? 'bg-purple-100 text-purple-800' :
                            grade.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {t(`assignments.status.${grade.status === 'not submitted' ? 'notSubmitted' : grade.status}`)}
                          </span>
                          {grade.score != null && (
                            <p className="text-sm font-medium text-gray-900 mt-1">{grade.score}</p>
                          )}
                        </div>
                      </div>
                    )
                    })}

                  </div>
                )}
              </Card>

              {/* Submission Summary */}
              {assignmentGrades.length > 0 && (
                <Card className="p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.submissionSummary")}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {assignmentGrades.filter(g => g.status === 'submitted').length}
                      </p>
                      <p className="text-sm text-green-700">{t("assignments.status.submitted")}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {assignmentGrades.filter(g => g.status === 'not submitted').length}
                      </p>
                      <p className="text-sm text-orange-700">{t("assignments.status.notSubmitted")}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xl sm:text-2xl font-bold text-gray-600">
                        {assignmentGrades.filter(g => g.status === 'pending').length}
                      </p>
                      <p className="text-sm text-gray-700">{t("assignments.status.pending")}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col gap-3 p-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {t("assignments.created")}: {formatDate(viewingAssignment.created_at, false)}
            {viewingAssignment.updated_at !== viewingAssignment.created_at && (
              <span className="ml-4">
                {t("assignments.updated")}: {formatDate(viewingAssignment.updated_at, false)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 flex-wrap">
            <Button
              onClick={() => {
                handleEditClick(viewingAssignment)
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {t("assignments.editAssignment")}
            </Button>
            <Button
              onClick={onClose}
            >
              {t("assignments.close")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
