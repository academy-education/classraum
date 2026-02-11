"use client"

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { X, Clock, MapPin, Monitor, Building } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Session {
  id?: string
  classroom_id: string
  status: 'scheduled' | 'completed' | 'cancelled'
  date: string
  start_time: string
  end_time: string
  location: 'offline' | 'online'
  notes?: string
  substitute_teacher?: string
}

interface Classroom {
  id: string
  name: string
  color?: string
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

interface SessionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (sessionData: Partial<Session>) => void
  session?: Session | null
  classrooms: Classroom[]
  teachers: Teacher[]
}

export function SessionFormModal({
  isOpen,
  onClose,
  onSave,
  session,
  classrooms,
  teachers
}: SessionFormModalProps) {
  const { t } = useTranslation()

  // Form state
  const [classroomId, setClassroomId] = useState('')
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'cancelled'>('scheduled')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState<'offline' | 'online'>('offline')
  const [notes, setNotes] = useState('')
  const [substituteTeacher, setSubstituteTeacher] = useState('')

  // Loading state
  const [saving, setSaving] = useState(false)

  // Initialize form when session or modal state changes
  useEffect(() => {
    if (isOpen) {
      if (session) {
        // Edit mode
        setClassroomId(session.classroom_id)
        setStatus(session.status)
        setDate(session.date)
        setStartTime(session.start_time)
        setEndTime(session.end_time)
        setLocation(session.location)
        setNotes(session.notes || '')
        setSubstituteTeacher(session.substitute_teacher || '')
      } else {
        // Create mode - set defaults
        const today = new Date()
        setClassroomId('')
        setStatus('scheduled')
        setDate(today.toISOString().split('T')[0])
        setStartTime('09:00')
        setEndTime('10:00')
        setLocation('offline')
        setNotes('')
        setSubstituteTeacher('')
      }
    }
  }, [isOpen, session])

  // Validate form
  const isValid = classroomId && date && startTime && endTime

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setSaving(true)
    try {
      const sessionData: Partial<Session> = {
        classroom_id: classroomId,
        status,
        date,
        start_time: startTime,
        end_time: endTime,
        location,
        notes: notes || undefined,
        substitute_teacher: substituteTeacher || undefined
      }

      if (session?.id) {
        sessionData.id = session.id
      }

      await onSave(sessionData)
      onClose()
    } catch (error) {
      console.error('Error saving session:', error)
    } finally {
      setSaving(false)
    }
  }

  // Generate time options
  const generateTimeOptions = () => {
    const times = []
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {session ? t('sessions.editSession') : t('sessions.addSession')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* Classroom Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('sessions.classroom')} *
            </Label>
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger>
                <SelectValue placeholder={String(t('sessions.selectClassroom'))} />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map(classroom => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    <div className="flex items-center gap-2">
                      {classroom.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: classroom.color }}
                        />
                      )}
                      {classroom.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('sessions.date')} *
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('sessions.status')}
              </Label>
              <Select value={status} onValueChange={(value: string) => setStatus(value as "cancelled" | "completed" | "scheduled")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t('sessions.status.scheduled')}</SelectItem>
                  <SelectItem value="completed">{t('sessions.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('sessions.status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('sessions.startTime')} *
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('sessions.endTime')} *
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              <MapPin className="w-4 h-4 inline mr-1" />
              {t('sessions.location')}
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="location"
                  value="offline"
                  checked={location === 'offline'}
                  onChange={(e) => setLocation(e.target.value as 'offline')}
                  className="mr-2"
                />
                <Building className="w-4 h-4 mr-1" />
                {t('sessions.offline')}
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="location"
                  value="online"
                  checked={location === 'online'}
                  onChange={(e) => setLocation(e.target.value as 'online')}
                  className="mr-2"
                />
                <Monitor className="w-4 h-4 mr-1" />
                {t('sessions.online')}
              </label>
            </div>
          </div>

          {/* Substitute Teacher */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('sessions.substituteTeacher')}
            </Label>
            <Select value={substituteTeacher} onValueChange={setSubstituteTeacher}>
              <SelectTrigger>
                <SelectValue placeholder={String(t('sessions.selectSubstituteTeacher'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('sessions.noSubstitute')}</SelectItem>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.user_id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('sessions.notes')}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={String(t('sessions.notesPlaceholder'))}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button size="sm" type="submit" disabled={!isValid || saving}>
            {saving ? t('common.saving') : (session ? t('common.save') : t('sessions.createSession'))}
          </Button>
        </div>
      </form>
    </Modal>
  )
}