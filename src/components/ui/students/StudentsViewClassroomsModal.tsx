"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { X, Eye, BookOpen } from 'lucide-react'
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
  if (!isOpen || !student) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 shadow-lg">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {t("students.classrooms")} - {student.name}
          </h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-6">
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
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("students.noClassroomsEnrolled")}</h3>
                <p className="text-gray-600">
                  {t("students.studentNotEnrolledYet")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}