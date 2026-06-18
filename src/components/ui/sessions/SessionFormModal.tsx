"use client"

import { useState, useEffect } from 'react'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Monitor, Building } from 'lucide-react'
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
  /** Render inline (no portal/backdrop). Used by the help center demo. */
  inline?: boolean
}

export function SessionFormModal({
  isOpen,
  onClose,
  onSave,
  session,
  classrooms,
  teachers,
  inline
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
  // Radix Select forbids empty-string values, so we use a sentinel for
  // the "no substitute" option and translate it back to undefined on save.
  const NO_SUBSTITUTE = '__none__'
  const [substituteTeacher, setSubstituteTeacher] = useState<string>(NO_SUBSTITUTE)

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
        setSubstituteTeacher(session.substitute_teacher || NO_SUBSTITUTE)
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
        substitute_teacher: substituteTeacher && substituteTeacher !== NO_SUBSTITUTE ? substituteTeacher : undefined
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      inline={inline}
      size="2xl"
      title={String(session ? t('sessions.editSession') : t('sessions.addSession'))}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="session-form-modal" disabled={!isValid || saving}>
            {saving ? t('common.saving') : (session ? t('common.save') : t('sessions.createSession'))}
          </Button>
        </ModalShell.Footer>
      }
    >
      <form id="session-form-modal" onSubmit={handleSubmit} className="space-y-4">
          {/* Classroom Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('sessions.classroom')} *
            </Label>
            <Select value={classroomId} onValueChange={setClassroomId}>
              <SelectTrigger className="!h-10 w-full rounded-lg">
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
              <DatePicker
                value={date}
                onChange={(v) => setDate(v)}
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('sessions.status')}
              </Label>
              <Select value={status} onValueChange={(value: string) => setStatus(value as "cancelled" | "completed" | "scheduled")}>
                <SelectTrigger className="!h-10 w-full rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">{t('sessions.statusScheduled')}</SelectItem>
                  <SelectItem value="completed">{t('sessions.statusCompleted')}</SelectItem>
                  <SelectItem value="cancelled">{t('sessions.statusCancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('sessions.startTime')} <span className="text-rose-500">*</span>
              </Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="!h-10 w-full rounded-lg">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t('sessions.endTime')} <span className="text-rose-500">*</span>
              </Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="!h-10 w-full rounded-lg">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground/80">
              {t('sessions.location')}
            </Label>
            <Select value={location} onValueChange={(v) => setLocation(v as 'offline' | 'online')}>
              <SelectTrigger className="!h-10 w-full rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {t('sessions.offline')}
                  </div>
                </SelectItem>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    {t('sessions.online')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Substitute Teacher */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              {t('sessions.substituteTeacher')}
            </Label>
            <Select value={substituteTeacher} onValueChange={setSubstituteTeacher}>
              <SelectTrigger className="!h-10 w-full rounded-lg">
                <SelectValue placeholder={String(t('sessions.selectSubstituteTeacher'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUBSTITUTE}>{t('sessions.noSubstitute')}</SelectItem>
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
      </form>
    </ModalShell>
  )
}