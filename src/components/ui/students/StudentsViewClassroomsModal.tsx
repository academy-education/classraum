"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Eye, BookOpen } from 'lucide-react'
import { Student } from '@/hooks/useStudentData'

interface Classroom {
  id: string
  name: string
  grade?: string
  subject?: string
  color?: string
  notes?: string
  teacher_id?: string
  teacher_name?: string | null
  created_at?: string
  updated_at?: string
  student_count?: number
  enrolled_students?: Array<{
    name: string
    school_name?: string
  }>
}

interface StudentsViewClassroomsModalProps {
  isOpen: boolean
  student: Student | null
  classrooms: Classroom[]
  t: (key: string, params?: Record<string, string | number | undefined>) => string
  onClose: () => void
  onViewDetails: (classroom: Classroom) => void
}

export function StudentsViewClassroomsModal({
  isOpen,
  student,
  classrooms,
  t,
  onClose,
  onViewDetails
}: StudentsViewClassroomsModalProps) {
  if (!student) return null

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={`${t("students.classrooms")} - ${student.name}`}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </ModalShell.Footer>
      }
    >
        {classrooms.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('students.classroomsAssigned', { count: classrooms.length })}
            </p>
            <div className="grid gap-4">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg mb-2">{classroom.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t("students.grade")}:</span>
                              <span>{classroom.grade}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{t("students.subject")}:</span>
                              <span>{classroom.subject}</span>
                            </div>
                            {classroom.teacher_name && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{t("students.teacher")}:</span>
                                <span>{classroom.teacher_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(classroom)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {t("students.view")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title={t("students.noClassroomsEnrolled")}
            description={t("students.studentNotEnrolledYet")}
          />
        )}
    </ModalShell>
  )
}
