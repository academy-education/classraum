"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  X,
  School,
  Edit,
  Users,
  GraduationCap,
  Book,
  Clock,
  Calendar,
  User
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Classroom } from '@/hooks/useClassroomData'

interface ClassroomDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  classroom: Classroom | null
  onEdit: (classroom: Classroom) => void
  onNavigateToSessions?: (classroomId: string) => void
}

export function ClassroomDetailsModal({
  isOpen,
  onClose,
  classroom,
  onEdit,
  onNavigateToSessions
}: ClassroomDetailsModalProps) {
  const { t } = useTranslation()

  if (!isOpen || !classroom) return null

  const getScheduleText = () => {
    if (!classroom.schedules || classroom.schedules.length === 0) {
      return t('classrooms.noSchedule')
    }
    
    return classroom.schedules.map(schedule => {
      const translatedDay = t(`classrooms.${schedule.day.toLowerCase()}`)
      return `${translatedDay} ${schedule.start_time}-${schedule.end_time}`
    }).join(', ')
  }

  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
          console.log('Details modal backdrop clicked - calling onClose')
          onClose()
        } else {
          console.log('Details modal clicked but not backdrop, target:', e.target, 'currentTarget:', e.currentTarget)
        }
      }}
    >
      <div 
        className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 max-h-[90vh] shadow-lg flex flex-col"
        onClick={(e) => {
          // Prevent clicks inside the modal from bubbling up to backdrop
          e.stopPropagation()
        }}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: classroom.color || '#3B82F6' }}
            >
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{classroom.name}</h2>
              <p className="text-sm text-gray-600">{t('classrooms.classroomDetails')}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('classrooms.teacher')}</div>
                    <div className="text-sm text-gray-600">{classroom.teacher_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('classrooms.grade')}</div>
                    <div className="text-sm text-gray-600">{classroom.grade || t('classrooms.noGrade')}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('classrooms.subject')}</div>
                    <div className="text-sm text-gray-600">{classroom.subject || t('classrooms.noSubject')}</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('classrooms.enrolledStudents')}</div>
                    <div className="text-sm text-gray-600">
                      {t('classrooms.studentsEnrolled', { count: classroom.student_count || 0 })}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{t('classrooms.schedule')}</div>
                    <div className="text-sm text-gray-600">{getScheduleText()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {classroom.notes && (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">{t('classrooms.notes')}</div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{classroom.notes}</p>
                </div>
              </div>
            )}

            {/* Enrolled Students */}
            {classroom.enrolled_students && classroom.enrolled_students.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-3">{t('classrooms.studentList')}</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {classroom.enrolled_students.map((student, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        {student.school_name && (
                          <div className="text-xs text-gray-500">{student.school_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule Details */}
            {classroom.schedules && classroom.schedules.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-900 mb-3">{t('classrooms.scheduleDetails')}</div>
                <div className="space-y-2">
                  {classroom.schedules.map((schedule, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {t(`classrooms.${schedule.day.toLowerCase()}`)}
                      </span>
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
          <div className="flex gap-3">
            {onNavigateToSessions && (
              <Button 
                variant="outline"
                onClick={() => {
                  onNavigateToSessions(classroom.id)
                  onClose()
                }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('classrooms.viewSessions')}
              </Button>
            )}
            <Button onClick={(e) => {
              console.log('Details modal edit button clicked')
              e.preventDefault()
              e.stopPropagation()
              console.log('About to call onEdit with classroom:', classroom.name)
              onEdit(classroom)
              console.log('onEdit called')
            }}>
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}