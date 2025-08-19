"use client"

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

interface SessionsCalendarViewProps {
  sessions: Session[]
  selectedDate?: Date
  onDateClick: (date: Date) => void
  onSessionClick?: (session: Session) => void
}

export const SessionsCalendarView = React.memo<SessionsCalendarViewProps>(({
  sessions,
  selectedDate,
  onDateClick,
  onSessionClick
}) => {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and how many days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()
    
    // Create calendar grid
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return {
      year,
      month,
      days,
      monthName: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }
  }, [currentDate])

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    
    sessions.forEach(session => {
      const dateKey = session.date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(session)
    })
    
    return grouped
  }, [sessions])

  // Memoized utility functions
  const getSessionsForDate = React.useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    return sessionsByDate[dateKey] || []
  }, [sessionsByDate])

  const navigateMonth = React.useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }, [])

  const isToday = React.useCallback((date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  const isSelected = React.useCallback((date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }, [selectedDate])

  const getStatusColor = React.useCallback((status: Session['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'scheduled': return 'bg-blue-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }, [])

  // Day of week headers
  const dayHeaders = [
    t('common.days.sunday'),
    t('common.days.monday'),
    t('common.days.tuesday'),
    t('common.days.wednesday'),
    t('common.days.thursday'),
    t('common.days.friday'),
    t('common.days.saturday')
  ]

  return (
    <div className="bg-white rounded-lg border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {calendarData.monthName}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            {t('common.today')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayHeaders.map((day, index) => (
            <div
              key={index}
              className="p-2 text-sm font-medium text-gray-600 text-center"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.days.map((date, index) => {
            if (!date) {
              return <div key={index} className="p-2 h-24" />
            }

            const dayEvents = getSessionsForDate(date)
            const hasEvents = dayEvents.length > 0

            return (
              <button
                key={index}
                onClick={() => onDateClick(date)}
                className={`
                  p-2 h-24 border rounded text-left hover:bg-gray-50 transition-colors
                  ${isToday(date) ? 'bg-blue-50 border-blue-200' : 'border-gray-200'}
                  ${isSelected(date) ? 'bg-blue-100 border-blue-300' : ''}
                  ${hasEvents ? 'border-gray-300' : ''}
                `}
              >
                <div className="font-medium text-sm mb-1">
                  {date.getDate()}
                </div>
                
                {/* Sessions for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((session, sessionIndex) => (
                    <div
                      key={sessionIndex}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSessionClick?.(session)
                      }}
                      className={`
                        text-xs p-1 rounded truncate cursor-pointer hover:opacity-80
                        ${getStatusColor(session.status)} text-white
                      `}
                      style={{ backgroundColor: session.classroom_color || undefined }}
                    >
                      {session.start_time.slice(0, 5)} {session.classroom_name}
                    </div>
                  ))}
                  
                  {/* Show "+X more" if there are more sessions */}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 2} {t('common.more')}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            {t('sessions.status.scheduled')}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            {t('sessions.status.completed')}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            {t('sessions.status.cancelled')}
          </div>
        </div>
      </div>
    </div>
  )
})

SessionsCalendarView.displayName = 'SessionsCalendarView'