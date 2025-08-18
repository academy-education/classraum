"use client"

import { Button } from '@/components/ui/button'
import { Grid3X3, CalendarDays } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface SessionsViewToggleProps {
  viewMode: 'card' | 'calendar'
  onViewModeChange: (mode: 'card' | 'calendar') => void
}

export function SessionsViewToggle({ viewMode, onViewModeChange }: SessionsViewToggleProps) {
  const { t } = useTranslation()

  return (
    <div className="flex rounded-lg border p-1 bg-gray-50">
      <Button
        variant={viewMode === 'card' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('card')}
        className="flex items-center gap-2 rounded-md"
      >
        <Grid3X3 className="w-4 h-4" />
        {t('sessions.cardView')}
      </Button>
      <Button
        variant={viewMode === 'calendar' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('calendar')}
        className="flex items-center gap-2 rounded-md"
      >
        <CalendarDays className="w-4 h-4" />
        {t('sessions.calendarView')}
      </Button>
    </div>
  )
}