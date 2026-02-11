"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { X, Loader2 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'
import { showSuccessToast, showErrorToast } from '@/stores'
import { DatePicker } from '@/components/ui/date-picker'

interface Classroom {
  id: string
  name: string
  color?: string
}

interface ScheduleBreaksModalProps {
  isOpen: boolean
  onClose: () => void
  academyId: string
  onSuccess?: () => void
}

export function ScheduleBreaksModal({
  isOpen,
  onClose,
  academyId,
  onSuccess
}: ScheduleBreaksModalProps) {
  const { t } = useTranslation()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassrooms, setSelectedClassrooms] = useState<Set<string>>(new Set())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingClassrooms, setLoadingClassrooms] = useState(true)

  // Load classrooms
  useEffect(() => {
    if (isOpen) {
      fetchClassrooms()
    }
  }, [isOpen, academyId])

  const fetchClassrooms = async () => {
    try {
      setLoadingClassrooms(true)
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, color')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      showErrorToast(t('scheduleBreaks.errorLoadingClassrooms'))
    } finally {
      setLoadingClassrooms(false)
    }
  }

  const handleClassroomToggle = (classroomId: string) => {
    const newSelected = new Set(selectedClassrooms)
    if (newSelected.has(classroomId)) {
      newSelected.delete(classroomId)
    } else {
      newSelected.add(classroomId)
    }
    setSelectedClassrooms(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedClassrooms.size === classrooms.length) {
      setSelectedClassrooms(new Set())
    } else {
      setSelectedClassrooms(new Set(classrooms.map(c => c.id)))
    }
  }

  const handleSubmit = async () => {
    if (selectedClassrooms.size === 0) {
      showErrorToast(t('scheduleBreaks.selectClassrooms'))
      return
    }

    if (!startDate || !endDate) {
      showErrorToast(t('scheduleBreaks.selectDates'))
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      showErrorToast(t('scheduleBreaks.invalidDateRange'))
      return
    }

    try {
      setLoading(true)

      // Create schedule breaks for each selected classroom
      const breaks = Array.from(selectedClassrooms).map(classroomId => ({
        classroom_id: classroomId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null
      }))

      const { error } = await supabase
        .from('schedule_breaks')
        .insert(breaks)

      if (error) throw error

      showSuccessToast(t('scheduleBreaks.success'))
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error creating schedule breaks:', error)
      showErrorToast(t('scheduleBreaks.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedClassrooms(new Set())
    setStartDate('')
    setEndDate('')
    setReason('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('scheduleBreaks.title')}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4 space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium text-foreground/80">
                {t('scheduleBreaks.startDate')} <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                value={startDate}
                onChange={(value) => setStartDate(value)}
                placeholder={t('sessions.selectDate')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm font-medium text-foreground/80">
                {t('scheduleBreaks.endDate')} <span className="text-red-500">*</span>
              </Label>
              <DatePicker
                value={endDate}
                onChange={(value) => setEndDate(value)}
                placeholder={t('sessions.selectDate')}
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-foreground/80">
              {t('scheduleBreaks.reason')}
            </Label>
            <Input
              id="reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('scheduleBreaks.reasonPlaceholder')}
              className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Classroom Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground/80">
                {t('scheduleBreaks.selectClassrooms')} <span className="text-red-500">*</span>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={loadingClassrooms}
                className="h-8 text-xs"
              >
                {selectedClassrooms.size === classrooms.length
                  ? t('common.deselectAll')
                  : t('common.selectAll')}
              </Button>
            </div>

            {loadingClassrooms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : classrooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('scheduleBreaks.noClassrooms')}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {classrooms.map((classroom) => (
                  <label
                    key={classroom.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClassrooms.has(classroom.id)}
                      onChange={() => handleClassroomToggle(classroom.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: classroom.color || '#6B7280' }}
                      />
                      <span className="text-sm font-medium text-gray-900">{classroom.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {selectedClassrooms.size > 0 && (
              <p className="text-sm text-gray-600">
                {t('scheduleBreaks.selectedCount', { count: selectedClassrooms.size.toString() })}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('scheduleBreaks.create')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
