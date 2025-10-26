"use client"

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  School,
  Edit,
  Trash2,
  Users,
  GraduationCap,
  Book,
  Clock,
  Calendar,
  Pause,
  Play
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Classroom } from '@/hooks/useClassroomData'

interface ClassroomCardProps {
  classroom: Classroom
  onEdit: (classroom: Classroom) => void
  onDelete: (classroom: Classroom) => void
  onViewDetails: (classroom: Classroom) => void
  onNavigateToSessions?: (classroomId: string) => void
  onTogglePause?: (classroom: Classroom) => void
}

export function ClassroomCard({
  classroom,
  onEdit,
  onDelete,
  onViewDetails,
  onNavigateToSessions,
  onTogglePause
}: ClassroomCardProps) {
  const { t } = useTranslation()

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
    <Card
      key={classroom.id}
      className={`p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${classroom.is_paused ? 'opacity-60' : ''}`}
      style={{ borderLeftColor: classroom.color || '#3B82F6' }}
      onClick={() => onViewDetails(classroom)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white relative"
            style={{ backgroundColor: classroom.color || '#3B82F6' }}
          >
            <School className="w-6 h-6" />
            {classroom.is_paused && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <Pause className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{classroom.name}</h3>
              {classroom.is_paused && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                  {t('classrooms.paused')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{classroom.teacher_name}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {onTogglePause && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onTogglePause(classroom)
              }}
              className={`${classroom.is_paused ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}`}
              title={classroom.is_paused ? t('classrooms.unpause') : t('classrooms.pause')}
            >
              {classroom.is_paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(classroom)
            }}
            className="text-gray-600 hover:text-blue-600"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(classroom)
            }}
            className="text-gray-600 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <GraduationCap className="w-4 h-4" />
          <span>{classroom.grade || t('classrooms.noGrade')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Book className="w-4 h-4" />
          <span>{classroom.subject || t('classrooms.noSubject')}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{t('classrooms.studentsEnrolled', { count: classroom.student_count || 0 })}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="truncate">{getScheduleText()}</span>
        </div>
      </div>
      
      {classroom.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 line-clamp-2">{classroom.notes}</p>
        </div>
      )}
      
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails(classroom)
          }}
          className="flex-1"
        >
          <Calendar className="w-4 h-4 mr-2" />
          {t('classrooms.viewDetails')}
        </Button>
        
        {onNavigateToSessions && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onNavigateToSessions(classroom.id)
            }}
            className="flex-1"
          >
            <School className="w-4 h-4 mr-2" />
            {t('classrooms.viewSessions')}
          </Button>
        )}
      </div>
    </Card>
  )
}