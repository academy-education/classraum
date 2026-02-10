"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { X, School, GraduationCap, Book, Clock, Users } from 'lucide-react'

interface Classroom {
  id: string
  name: string
  color?: string
  grade?: string
  subject?: string
  teacher_name?: string | null
  teacher_id?: string
  notes?: string
  created_at?: string
  updated_at?: string
  student_count?: number
  enrolled_students?: Array<{
    name: string
    school_name?: string
  }>
}

interface StudentsClassroomDetailsModalProps {
  isOpen: boolean
  classroom: Classroom | null
  t: (key: string) => string
  onClose: () => void
}

export function StudentsClassroomDetailsModal({
  isOpen,
  classroom,
  t,
  onClose
}: StudentsClassroomDetailsModalProps) {
  if (!classroom) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: classroom.color || '#6B7280' }}
            />
            <h2 className="text-2xl font-bold text-gray-900">{classroom.name}</h2>
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
                  {t("students.classroomInformation")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("students.grade")}</p>
                      <p className="font-medium text-gray-900">{classroom.grade || t('students.notSpecified')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Book className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("students.subject")}</p>
                      <p className="font-medium text-gray-900">{classroom.subject || t('students.notSpecified')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">{t("students.teacher")}</p>
                      <p className="font-medium text-gray-900">{classroom.teacher_name || t('students.notAssigned')}</p>
                    </div>
                  </div>

                  {classroom.created_at && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">{t("students.created")}</p>
                        <p className="font-medium text-gray-900">
                          {new Date(classroom.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Notes Card */}
              {classroom.notes && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("students.notes")}</h3>
                  <p className="text-gray-700 leading-relaxed">{classroom.notes}</p>
                </Card>
              )}
            </div>

            {/* Right Column - Student Enrollment */}
            <div className="space-y-6">
              {/* Student Enrollment Card */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t("students.studentEnrollment")} ({classroom.student_count || 0})
                </h3>
                {!classroom.enrolled_students || classroom.enrolled_students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{t("students.noStudentsEnrolledClassroom")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classroom.enrolled_students.map((student, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {student.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
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
            {classroom.created_at && (
              <>
                {t("students.created")}: {new Date(classroom.created_at).toLocaleDateString()}
                {classroom.updated_at !== classroom.created_at && classroom.updated_at && (
                  <span className="ml-4">
                    {t("students.updated")}: {new Date(classroom.updated_at).toLocaleDateString()}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
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
