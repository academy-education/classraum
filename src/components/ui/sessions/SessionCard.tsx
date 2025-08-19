"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Calendar,
  Clock,
  Users,
  BookOpen,
  Edit,
  Trash2,
  Eye,
  Monitor,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  substitute_teacher_name?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  date: string
  start_time: string
  end_time: string
  location: 'offline' | 'online'
  notes?: string
  student_count?: number
  assignment_count?: number
}

interface SessionCardProps {
  session: Session
  onEdit: (session: Session) => void
  onDelete: (session: Session) => void
  onViewDetails: (session: Session) => void
  onViewAssignments?: (sessionId: string) => void
  onViewAttendance?: (sessionId: string) => void
  compact?: boolean
}

export const SessionCard = React.memo<SessionCardProps>(({
  session,
  onEdit,
  onDelete,
  onViewDetails,
  onViewAssignments,
  onViewAttendance,
  compact = false
}) => {
  const { t } = useTranslation()

  // Memoized formatting functions
  const formattedDate = React.useMemo(() => {
    const date = new Date(session.date)
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }, [session.date])

  const formattedStartTime = React.useMemo(() => {
    return session.start_time.slice(0, 5) // Remove seconds if present
  }, [session.start_time])

  const formattedEndTime = React.useMemo(() => {
    return session.end_time.slice(0, 5) // Remove seconds if present
  }, [session.end_time])

  // Memoized status display
  const statusDisplay = React.useMemo(() => {
    switch (session.status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
          text: t('sessions.status.completed'),
          className: 'text-green-600 bg-green-50'
        }
      case 'scheduled':
        return {
          icon: <Clock className="w-4 h-4 text-blue-600" />,
          text: t('sessions.status.scheduled'),
          className: 'text-blue-600 bg-blue-50'
        }
      case 'cancelled':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: t('sessions.status.cancelled'),
          className: 'text-red-600 bg-red-50'
        }
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-gray-600" />,
          text: session.status,
          className: 'text-gray-600 bg-gray-50'
        }
    }
  }, [session.status, t])

  // Memoized event handlers
  const handleEdit = React.useCallback(() => {
    onEdit(session)
  }, [onEdit, session])

  const handleDelete = React.useCallback(() => {
    onDelete(session)
  }, [onDelete, session])

  const handleViewDetails = React.useCallback(() => {
    onViewDetails(session)
  }, [onViewDetails, session])

  const handleViewAssignments = React.useCallback(() => {
    onViewAssignments?.(session.id)
  }, [onViewAssignments, session.id])

  const handleViewAttendance = React.useCallback(() => {
    onViewAttendance?.(session.id)
  }, [onViewAttendance, session.id])

  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {session.classroom_color && (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: session.classroom_color }}
              />
            )}
            <h3 className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
              {session.classroom_name || t('sessions.unknownClassroom')}
            </h3>
          </div>
          <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {session.substitute_teacher_name 
              ? `${t('sessions.substitute')}: ${session.substitute_teacher_name}`
              : session.teacher_name || t('sessions.unknownTeacher')
            }
          </p>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.className}`}>
          {statusDisplay.icon}
          {!compact && statusDisplay.text}
        </div>
      </div>

      {/* Session Info */}
      <div className={`space-y-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600 mb-4`}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {formattedDate}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {formattedStartTime} - {formattedEndTime}
        </div>
        <div className="flex items-center gap-2">
          {session.location === 'online' ? (
            <>
              <Monitor className="w-4 h-4" />
              {t('sessions.online')}
            </>
          ) : (
            <>
              <Building className="w-4 h-4" />
              {t('sessions.offline')}
            </>
          )}
        </div>
        {(session.student_count !== undefined || session.assignment_count !== undefined) && (
          <div className="flex items-center gap-4">
            {session.student_count !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {session.student_count} {t('sessions.students')}
              </div>
            )}
            {session.assignment_count !== undefined && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {session.assignment_count} {t('sessions.assignments')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {session.notes && !compact && (
        <div className="text-sm text-gray-600 mb-4 p-2 bg-gray-50 rounded">
          {session.notes}
        </div>
      )}

      {/* Actions */}
      <div className={`flex ${compact ? 'gap-1' : 'gap-2'} flex-wrap`}>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={handleViewDetails}
          className="flex-1"
        >
          <Eye className="w-3 h-3 mr-1" />
          {compact ? t('common.view') : t('sessions.viewDetails')}
        </Button>
        
        {onViewAssignments && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleViewAssignments}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            {compact ? '' : t('sessions.assignments')}
          </Button>
        )}
        
        {onViewAttendance && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleViewAttendance}
          >
            <Users className="w-3 h-3 mr-1" />
            {compact ? '' : t('sessions.attendance')}
          </Button>
        )}
        
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={handleEdit}
        >
          <Edit className="w-3 h-3" />
        </Button>
        
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={handleDelete}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </Card>
  )
})

SessionCard.displayName = 'SessionCard'