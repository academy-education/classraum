"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Search, Calendar, Clock } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSessionData } from '@/hooks/useSessionData'

// Import extracted components
import { SessionFormModal } from './sessions/SessionFormModal'
import { SessionCard } from './sessions/SessionCard'
import { SessionsCalendarView } from './sessions/SessionsCalendarView'
import { SessionsViewToggle } from './sessions/SessionsViewToggle'

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
  substitute_teacher?: string
  created_at: string
  updated_at: string
  student_count?: number
  assignment_count?: number
}

interface SessionsPageProps {
  academyId: string
  filterClassroomId?: string
  filterDate?: string
  onNavigateToAssignments?: (sessionId: string) => void
  onNavigateToAttendance?: (sessionId: string) => void
}

export function SessionsPageRefactored({
  academyId,
  filterClassroomId,
  filterDate,
  onNavigateToAssignments,
  onNavigateToAttendance
}: SessionsPageProps) {
  const { t } = useTranslation()
  
  // Use custom hook for data management
  const {
    sessions,
    classrooms,
    teachers,
    sessionStats,
    loading,
    createSession,
    updateSession,
    deleteSession
  } = useSessionData(academyId, filterClassroomId, filterDate)

  // UI state
  const [viewMode, setViewMode] = useState<'card' | 'calendar'>('card')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Modal state
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)

  // Filter sessions based on search
  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions
    
    return sessions.filter(session =>
      session.classroom_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [sessions, searchQuery])

  // Memoized handlers
  const handleSaveSession = React.useCallback(async (sessionData: Partial<Session>) => {
    try {
      if (editingSession?.id) {
        await updateSession(editingSession.id, sessionData)
      } else {
        await createSession(sessionData)
      }
      setEditingSession(null)
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }, [editingSession?.id, updateSession, createSession])

  const handleEditSession = React.useCallback((session: Session) => {
    setEditingSession(session)
    setShowSessionModal(true)
  }, [])

  const handleDeleteSession = React.useCallback(async (session: Session) => {
    if (confirm(t('sessions.confirmDelete'))) {
      try {
        await deleteSession(session.id)
      } catch (error) {
        console.error('Error deleting session:', error)
      }
    }
  }, [deleteSession, t])

  const handleViewDetails = React.useCallback((session: Session) => {
    // This would open a session details modal
    console.log('View details for session:', session)
  }, [])

  const handleCalendarDateClick = React.useCallback((date: Date) => {
    setSelectedDate(date)
    // Could open a modal showing sessions for that day
  }, [])

  const handleCalendarSessionClick = React.useCallback((session: Session) => {
    handleViewDetails(session)
  }, [handleViewDetails])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('sessions.title')}</h1>
          <p className="text-gray-600">{t('sessions.description')}</p>
        </div>
        <Button onClick={() => setShowSessionModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('sessions.addSession')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('sessions.totalSessions')}</p>
              <p className="text-2xl font-bold">{sessionStats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('sessions.todaySessions')}</p>
              <p className="text-2xl font-bold">{sessionStats.today}</p>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('sessions.thisWeek')}</p>
              <p className="text-2xl font-bold">{sessionStats.thisWeek}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('sessions.completed')}</p>
              <p className="text-2xl font-bold">{sessionStats.completed}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('sessions.searchSessions')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View Toggle */}
        <SessionsViewToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>

      {/* Content based on view mode */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">{t('common.loading')}</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <SessionsCalendarView
          sessions={filteredSessions}
          selectedDate={selectedDate || undefined}
          onDateClick={handleCalendarDateClick}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSessionClick={handleCalendarSessionClick as any}
        />
      ) : (
        <div>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? t('sessions.noSessionsFound') : t('sessions.noSessionsYet')}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? t('sessions.tryDifferentSearch')
                  : t('sessions.getStartedBySessions')
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowSessionModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('sessions.createFirstSession')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onEdit={handleEditSession as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onDelete={handleDeleteSession as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onViewDetails={handleViewDetails as any}
                  onViewAssignments={onNavigateToAssignments}
                  onViewAttendance={onNavigateToAttendance}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session Form Modal */}
      <SessionFormModal
        isOpen={showSessionModal}
        onClose={() => {
          setShowSessionModal(false)
          setEditingSession(null)
        }}
        onSave={handleSaveSession}
        session={editingSession}
        academyId={academyId}
        classrooms={classrooms}
        teachers={teachers}
      />
    </div>
  )
}