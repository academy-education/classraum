"use client"

import {
  School,
  Edit,
  Users,
  GraduationCap,
  Book,
  X,
  Calendar,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import type { Classroom } from '@/components/ui/classrooms/hooks/useClassroomsData'

interface ClassroomDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedClassroom: Classroom | null
  formatTime: (time: string) => string
  getTranslatedDay: (day: string) => string
  onEditClick: (classroom: Classroom) => void
}

export function ClassroomDetailsModal({
  isOpen,
  onClose,
  selectedClassroom,
  formatTime,
  getTranslatedDay,
  onEditClick,
}: ClassroomDetailsModalProps) {
  const { t } = useTranslation()

  if (!selectedClassroom) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="6xl"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: selectedClassroom.color || '#6B7280' }}
            />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedClassroom.name}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Classroom Info & Enrollment */}
            <div className="space-y-6">
              {/* Classroom Information Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <School className="w-5 h-5" />
                  {t("classrooms.classroomInformation")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("classrooms.grade")}</p>
                      <p className="font-medium text-gray-900">{selectedClassroom.grade || t("classrooms.notSpecified")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Book className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("classrooms.subject")}</p>
                      <p className="font-medium text-gray-900">{selectedClassroom.subject_name || t("classrooms.notSpecified")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("classrooms.teacher")}</p>
                      <p className="font-medium text-gray-900">{selectedClassroom.teacher_name || t("classrooms.notAssigned")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("classrooms.schedule")}</p>
                      <div className="font-medium text-gray-900">
                        {selectedClassroom.schedules && selectedClassroom.schedules.length > 0 ? (
                          selectedClassroom.schedules.map((schedule, index) => {
                            const dayName = getTranslatedDay(schedule.day)
                            const startTime = formatTime(schedule.start_time)
                            const endTime = formatTime(schedule.end_time)
                            return (
                              <div key={index}>
                                {dayName} {startTime} - {endTime}
                              </div>
                            )
                          })
                        ) : (
                          <span>{t("classrooms.notSpecified")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes Card */}
              {selectedClassroom.notes && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("classrooms.notes")}</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedClassroom.notes}</p>
                </Card>
              )}
            </div>

            {/* Right Column - Student Enrollment */}
            <div className="space-y-6">
              {/* Student Enrollment Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t("classrooms.studentEnrollment")} ({selectedClassroom.student_count || 0})
                </h3>
                {!selectedClassroom.enrolled_students || selectedClassroom.enrolled_students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{t("classrooms.noStudentsEnrolled")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedClassroom.enrolled_students.map((student, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                          </div>
                        </div>
                        {student.school_name && (
                          <div className="text-sm text-gray-500">
                            {student.school_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {t("classrooms.created")}: {new Date(selectedClassroom.created_at).toLocaleDateString()}
            {selectedClassroom.updated_at !== selectedClassroom.created_at && (
              <span className="ml-4">
                {t("classrooms.updated")}: {new Date(selectedClassroom.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onEditClick(selectedClassroom)
              }}
            >
              <Edit className="w-4 h-4" />
              {t("classrooms.editClassroom")}
            </Button>
            <Button
              onClick={onClose}
            >
              {t("common.close")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
