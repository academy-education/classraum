"use client"

import React, { memo, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Edit,
  Eye,
  User,
  Mail,
  Phone,
  School,
  Home,
  CheckCircle,
  XCircle,
  BookOpen
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Student } from '@/hooks/useStudentData'

interface StudentCardProps {
  student: Student
  onEdit: (student: Student) => void
  onView: (student: Student) => void
  onToggleStatus: (student: Student) => void
  showActions?: boolean
}

export const StudentCard = memo(function StudentCard({ 
  student, 
  onEdit, 
  onView,
  onToggleStatus,
  showActions = true
}: StudentCardProps) {
  const { t } = useTranslation()

  const formattedJoinDate = useMemo(() => {
    return new Date(student.created_at).toLocaleDateString()
  }, [student.created_at])

  return (
    <Card 
      className={`p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
        student.active ? 'border-green-500' : 'border-red-500'
      }`}
      onClick={() => onView(student)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
            student.active ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
            <div className="flex items-center gap-1">
              {student.active ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                student.active ? 'text-green-600' : 'text-red-600'
              }`}>
                {student.active ? t('students.active') : t('students.inactive')}
              </span>
            </div>
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(student)
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
                onToggleStatus(student)
              }}
              className={`p-1 ${
                student.active 
                  ? 'text-gray-600 hover:text-red-600' 
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              {student.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4" />
          <span className="truncate">{student.email}</span>
        </div>
        
        {student.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{student.phone}</span>
          </div>
        )}
        
        {student.school_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <School className="w-4 h-4" />
            <span>{student.school_name}</span>
          </div>
        )}
        
        {student.family_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Home className="w-4 h-4" />
            <span>{student.family_name}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <BookOpen className="w-4 h-4" />
          <span>
            {t('students.classroomsEnrolled', { count: student.classroom_count || 0 })}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {t('students.joined')}: {formattedJoinDate}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onView(student)
          }}
          className="text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          {t('common.view')}
        </Button>
      </div>
    </Card>
  )
})