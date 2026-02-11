'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Modal } from '@/components/ui/modal'
import { ClassroomSchedule, ScheduleUpdateOptions } from '@/lib/schedule-updates'
import { useTranslation } from '@/hooks/useTranslation'
import { X } from 'lucide-react'

interface ScheduleUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  oldSchedule: ClassroomSchedule
  newSchedule: Partial<ClassroomSchedule>
  onConfirm: (options: ScheduleUpdateOptions) => Promise<void>
}

export function ScheduleUpdateModal({
  isOpen,
  onClose,
  oldSchedule,
  newSchedule,
  onConfirm
}: ScheduleUpdateModalProps) {
  const { t } = useTranslation()
  const [strategy, setStrategy] = useState<'future_only' | 'from_date' | 'materialize_existing'>('future_only')
  // Format today as YYYY-MM-DD
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [effectiveDate, setEffectiveDate] = useState<string>(todayStr)
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm({
        updateStrategy: strategy,
        effectiveDate: strategy === 'from_date' ? effectiveDate : undefined
      })
      onClose()
    } catch (error) {
      console.error('Error applying schedule update:', error)
      alert(t('classrooms.scheduleUpdateError') || 'Error applying schedule changes')
    } finally {
      setIsLoading(false)
    }
  }

  // Format day name with translation
  const getDayName = (day: number | string) => {
    // Map day string to translation key
    const dayMap: { [key: string]: string } = {
      'Sunday': String(t('classrooms.sunday')),
      'Monday': String(t('classrooms.monday')),
      'Tuesday': String(t('classrooms.tuesday')),
      'Wednesday': String(t('classrooms.wednesday')),
      'Thursday': String(t('classrooms.thursday')),
      'Friday': String(t('classrooms.friday')),
      'Saturday': String(t('classrooms.saturday'))
    }

    if (typeof day === 'string') {
      return dayMap[day] || day
    }

    // If numeric, convert to day name first
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = days[day] || String(day)
    return dayMap[dayName] || dayName
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {t('classrooms.scheduleChangeDetected') || 'Schedule Change Detected'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            <p className="font-medium mb-1">{t('classrooms.changingScheduleFrom') || "You're changing the schedule from:"}</p>
            <p className="text-gray-800">
              <span className="font-medium">{getDayName(oldSchedule.day)}</span>
              {' '}
              <span>{oldSchedule.start_time}</span>
              {' '}&rarr;{' '}
              <span className="font-medium">{newSchedule.day ? getDayName(newSchedule.day) : getDayName(oldSchedule.day)}</span>
              {' '}
              <span>{newSchedule.start_time || oldSchedule.start_time}</span>
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 1: Update from today */}
            <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="strategy"
                value="future_only"
                checked={strategy === 'future_only'}
                onChange={(e) => setStrategy(e.target.value as 'future_only' | 'from_date' | 'materialize_existing')}
                className="mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {t('classrooms.updateFromToday') || 'Update from today onwards'}
                  <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    {t('common.recommended') || 'Recommended'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('classrooms.updateFromTodayDesc') || 'New schedule applies starting today. Past virtual sessions keep old time.'}
                </div>
              </div>
            </label>

            {/* Option 2: Update from specific date */}
            <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="strategy"
                value="from_date"
                checked={strategy === 'from_date'}
                onChange={(e) => setStrategy(e.target.value as 'future_only' | 'from_date' | 'materialize_existing')}
                className="mt-1 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {t('classrooms.updateFromSpecificDate') || 'Update from specific date'}
                </div>
                <div className="text-sm text-gray-600 mt-1 mb-2">
                  {t('classrooms.updateFromSpecificDateDesc') || 'Choose when the new schedule starts:'}
                </div>
                {strategy === 'from_date' && (
                  <div className="mt-2">
                    <DatePicker
                      value={effectiveDate}
                      onChange={setEffectiveDate}
                      placeholder={t('sessions.selectDate')}
                    />
                  </div>
                )}
              </div>
            </label>

            {/* Option 3: Keep existing virtual sessions - HIDDEN FOR NOW */}
            {false && (
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="materialize_existing"
                  checked={strategy === 'materialize_existing'}
                  onChange={(e) => setStrategy(e.target.value as 'future_only' | 'from_date' | 'materialize_existing')}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {t('classrooms.keepAllExistingSessions') || 'Keep all existing virtual sessions'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t('classrooms.keepAllExistingSessionsDesc') || 'Convert all future virtual sessions to real sessions with current schedule, then apply new schedule going forward.'}
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex gap-2 justify-end p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (t('common.applying') || 'Applying...') : (t('common.applyChanges') || 'Apply Changes')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
