"use client"

import React, { memo, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  CheckCircle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Assignment } from '@/hooks/useAssignmentData'

interface AssignmentCardProps {
  assignment: Assignment
  onEdit: (assignment: Assignment) => void
  onDelete: (assignment: Assignment) => void
  onView: (assignment: Assignment) => void
  onViewSubmissions: (assignment: Assignment) => void
}

export const AssignmentCard = memo(function AssignmentCard({ 
  assignment, 
  onEdit, 
  onDelete, 
  onView,
  onViewSubmissions 
}: AssignmentCardProps) {
  const { t } = useTranslation()

  const { typeIcon, typeColor, isOverdue, formattedDueDate, formattedSessionDate } = useMemo(() => {
    const getTypeIcon = () => {
      switch (assignment.assignment_type) {
        case 'quiz':
          return <CheckCircle className="w-4 h-4" />
        case 'homework':
          return <BookOpen className="w-4 h-4" />
        case 'test':
          return <GraduationCap className="w-4 h-4" />
        case 'project':
          return <FileText className="w-4 h-4" />
        default:
          return <FileText className="w-4 h-4" />
      }
    }

    const getTypeColor = () => {
      switch (assignment.assignment_type) {
        case 'quiz':
          return 'bg-blue-100 text-blue-800'
        case 'homework':
          return 'bg-green-100 text-green-800'
        case 'test':
          return 'bg-red-100 text-red-800'
        case 'project':
          return 'bg-purple-100 text-purple-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString()
    }

    return {
      typeIcon: getTypeIcon(),
      typeColor: getTypeColor(),
      isOverdue: assignment.due_date && new Date(assignment.due_date) < new Date(),
      formattedDueDate: assignment.due_date ? formatDate(assignment.due_date) : null,
      formattedSessionDate: assignment.session_date ? formatDate(assignment.session_date) : null
    }
  }, [assignment.assignment_type, assignment.due_date, assignment.session_date])

  return (
    <Card 
      className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4"
      style={{ borderLeftColor: assignment.classroom_color || '#3B82F6' }}
      onClick={() => onView(assignment)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{assignment.title}</h3>
          <p className="text-sm text-gray-600">{assignment.classroom_name}</p>
        </div>
        
        <div className="flex gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(assignment)
            }}
            className="text-gray-600 hover:text-blue-600 p-1"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(assignment)
            }}
            className="text-gray-600 hover:text-red-600 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
            {typeIcon}
            {t(`assignments.type.${assignment.assignment_type}`)}
          </div>
        </div>
        
        {assignment.teacher_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <GraduationCap className="w-4 h-4" />
            <span>{assignment.teacher_name}</span>
          </div>
        )}
        
        {formattedSessionDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formattedSessionDate}</span>
            {assignment.session_time && (
              <>
                <Clock className="w-4 h-4 ml-2" />
                <span>{assignment.session_time}</span>
              </>
            )}
          </div>
        )}
        
        {formattedDueDate && (
          <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            <Clock className="w-4 h-4" />
            <span>
              {t('assignments.dueDate')}: {formattedDueDate}
              {isOverdue && ` (${t('assignments.overdue')})`}
            </span>
          </div>
        )}
        
        {assignment.category_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{assignment.category_name}</span>
          </div>
        )}
      </div>
      
      {assignment.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 line-clamp-2">{assignment.description}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>
            {assignment.submitted_count || 0} / {assignment.student_count || 0} {t('assignments.submitted')}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onViewSubmissions(assignment)
          }}
          className="text-xs"
        >
          {t('assignments.viewSubmissions')}
        </Button>
      </div>
    </Card>
  )
})