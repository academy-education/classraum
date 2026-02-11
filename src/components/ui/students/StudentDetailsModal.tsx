"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import {
  X,
  Edit,
  User,
  Mail,
  Phone,
  School,
  Home,
  CheckCircle,
  XCircle,
  BookOpen,
  Users
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Student, Classroom } from '@/hooks/useStudentData'

interface StudentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
  onEdit: (student: Student) => void
  getStudentClassrooms: (studentId: string) => Promise<Classroom[]>
}

export function StudentDetailsModal({
  isOpen,
  onClose,
  student,
  onEdit,
  getStudentClassrooms
}: StudentDetailsModalProps) {
  const { t } = useTranslation()
  const [studentClassrooms, setStudentClassrooms] = useState<Classroom[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)

  const loadStudentClassrooms = useCallback(async () => {
    if (!student) return

    setLoadingClassrooms(true)
    try {
      const classrooms = await getStudentClassrooms(student.user_id)
      setStudentClassrooms(classrooms)
    } catch (error) {
      console.error('Error loading student classrooms:', error)
      setStudentClassrooms([])
    } finally {
      setLoadingClassrooms(false)
    }
  }, [student, getStudentClassrooms])

  useEffect(() => {
    if (isOpen && student) {
      loadStudentClassrooms()
    }
  }, [isOpen, student, loadStudentClassrooms])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (!student) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {t('students.studentDetails')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(student)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Info Card */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white ${
                    student.active ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <User className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{student.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      {student.active ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        student.active ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {student.active ? t('students.active') : t('students.inactive')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {t('students.joined')}: {formatDate(student.created_at)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                      {t('students.contactInfo')}
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">{t('students.email')}</div>
                          <div className="font-medium">{student.email}</div>
                        </div>
                      </div>

                      {student.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">{t('students.phone')}</div>
                            <div className="font-medium">{student.phone}</div>
                          </div>
                        </div>
                      )}

                      {student.school_name && (
                        <div className="flex items-center gap-3">
                          <School className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="text-sm text-gray-500">{t('students.school')}</div>
                            <div className="font-medium">{student.school_name}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-lg border-b border-gray-200 pb-2">
                      {t('students.familyInfo')}
                    </h4>

                    {student.family_name ? (
                      <div className="flex items-center gap-3">
                        <Home className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">{t('students.family')}</div>
                          <div className="font-medium">{student.family_name}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-gray-500">
                        <Home className="w-5 h-5" />
                        <div className="text-sm">{t('students.noFamilyAssigned')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Stats Card */}
            <div className="space-y-6">
              <Card className="p-6">
                <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {t('students.enrollmentStats')}
                </h4>

                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {student.classroom_count || 0}
                    </div>
                    <div className="text-sm text-blue-600">
                      {t('students.classroomsEnrolled', { count: student.classroom_count || 0 })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Enrolled Classrooms */}
          <div className="mt-8">
            <Card className="p-6">
              <h4 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('students.enrolledClassrooms')}
              </h4>

              {loadingClassrooms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">{t('common.loading')}</span>
                </div>
              ) : studentClassrooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentClassrooms.map(classroom => (
                    <div
                      key={classroom.id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: classroom.color || '#3B82F6' }}
                        />
                        <h5 className="font-medium text-gray-900">{classroom.name}</h5>
                      </div>
                      {classroom.teacher_name && (
                        <div className="text-sm text-gray-600">
                          {t('classrooms.teacher')}: {classroom.teacher_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <div className="text-sm">{t('students.noClassroomsEnrolled')}</div>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              onClick={() => onEdit(student)}
              className="bg-primary text-white"
            >
              <Edit className="w-4 h-4 mr-1" />
              {t('common.edit')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
