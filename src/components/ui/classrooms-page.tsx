"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useClassroomsData } from '@/components/ui/classrooms/hooks/useClassroomsData'
import type { Classroom, Teacher, Student, Schedule } from '@/components/ui/classrooms/hooks/useClassroomsData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  School,
  Plus,
  Edit,
  Trash2,
  Users,
  GraduationCap,
  Book,
  X,
  Search,
  Clock,
  Calendar,
  Loader2,
  CalendarOff,
  Pause,
  Play
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { showSuccessToast, showErrorToast } from '@/stores'
import { invalidateSessionsCache } from '@/components/ui/sessions-page'
import { invalidateAssignmentsCache } from '@/components/ui/assignments-page'
import { invalidateAttendanceCache } from '@/components/ui/attendance-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'
import { triggerClassroomCreatedNotifications } from '@/lib/notification-triggers'
import { ScheduleBreaksModal } from '@/components/ui/classrooms/ScheduleBreaksModal'
import { ScheduleUpdateModal } from '@/components/ui/classrooms/ScheduleUpdateModal'
import { ClassroomCreateModal } from '@/components/ui/classrooms/modals/ClassroomCreateModal'
import { ClassroomEditModal } from '@/components/ui/classrooms/modals/ClassroomEditModal'
import { ClassroomDeleteModal } from '@/components/ui/classrooms/modals/ClassroomDeleteModal'
import { ClassroomDetailsModal } from '@/components/ui/classrooms/modals/ClassroomDetailsModal'
import { ClassroomColorPickerModal } from '@/components/ui/classrooms/modals/ClassroomColorPickerModal'
import {
  updateClassroomSchedule,
  requiresScheduleUpdateModal,
  type ClassroomSchedule,
  type ScheduleUpdateOptions
} from '@/lib/schedule-updates'

// Cache invalidation function for classrooms
export const invalidateClassroomsCache = (academyId: string) => {
  // Clear all page caches for this academy (classrooms-academyId-page1, page2, etc.)
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`classrooms-${academyId}-page`) ||
        key.includes(`classrooms-${academyId}-page`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

}

interface ClassroomsPageProps {
  academyId: string
  onNavigateToSessions?: (classroomId?: string) => void
}

// Extracted outside ClassroomsPage to avoid hooks-in-nested-component issues
interface TimePickerComponentProps {
  value: string
  onChange: (value: string) => void
  scheduleId: string
  field: string
  activeTimePicker: string | null
  setActiveTimePicker: (v: string | null) => void
  formatTime: (time: string) => string
}

export function TimePickerComponent({
  value,
  onChange,
  scheduleId,
  field,
  activeTimePicker,
  setActiveTimePicker,
  formatTime,
}: TimePickerComponentProps) {
  const { t } = useTranslation()
  const pickerId = `${scheduleId}-${field}`
  const isOpen = activeTimePicker === pickerId
  const timePickerRef = useRef<HTMLDivElement>(null)

  const currentTime = value || '09:00'
  const [hours, minutes] = currentTime.split(':')
  const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setActiveTimePicker(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, setActiveTimePicker])

  const setTime = (newHour: number, newMinute: number, newAmpm: string) => {
    let hour24 = newHour
    if (newAmpm === 'PM' && newHour !== 12) {
      hour24 += 12
    } else if (newAmpm === 'AM' && newHour === 12) {
      hour24 = 0
    }

    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
    onChange(timeString)
  }

  return (
    <div className="relative" ref={timePickerRef}>
      <button
        type="button"
        onClick={() => setActiveTimePicker(isOpen ? null : pickerId)}
        className={`w-full h-9 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
          isOpen ? 'border-primary' : 'border-border focus:border-primary'
        }`}
      >
        {formatTime(value)}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 ${
            field === 'end_time' ? 'right-0' : 'left-0'
          }`}
          style={{ zIndex: 9999 }}
        >
            <div className="grid grid-cols-3 gap-3">
            {/* Hours */}
            <div>
              <Label className="text-xs text-foreground/60 mb-2 block">{t("classrooms.hour")}</Label>
              <div className="max-h-48 overflow-y-scroll scrollbar-hide">
                {[...Array(12)].map((_, i) => {
                  const hour = i + 1
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => setTime(hour, parseInt(minutes), ampm)}
                      className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                        hour12 === hour ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {hour}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Minutes */}
            <div>
              <Label className="text-xs text-foreground/60 mb-2 block">{t("classrooms.min")}</Label>
              <div className="max-h-48 overflow-y-scroll scrollbar-hide">
                {[...Array(60)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTime(hour12, i, ampm)}
                    className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                      parseInt(minutes) === i ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {i.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div>
              <Label className="text-xs text-foreground/60 mb-2 block">{t("classrooms.period")}</Label>
              <div className="space-y-1">
                {[{key: 'am', label: t('classrooms.am')}, {key: 'pm', label: t('classrooms.pm')}].map(period => (
                  <button
                    key={period.key}
                    type="button"
                    onClick={() => setTime(hour12, parseInt(minutes), period.key.toUpperCase())}
                    className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                      ampm === period.key.toUpperCase() ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



export function ClassroomsPage({ academyId, onNavigateToSessions }: ClassroomsPageProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const { subjects, refreshData: refreshSubjects } = useSubjectData(academyId)
  const { createSubject } = useSubjectActions()

  // Data fetching hook
  const {
    classrooms, setClassrooms,
    teachers,
    students,
    loading,
    initialized,
    userRole,
    currentUserId,
    isManager,
    totalCount,
    fetchClassrooms,
  } = useClassroomsData(academyId)

  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const [showInlineSubjectCreate, setShowInlineSubjectCreate] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [isCreatingSubject, setIsCreatingSubject] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editModalLoading, setEditModalLoading] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showScheduleBreaksModal, setShowScheduleBreaksModal] = useState(false)
  const [showScheduleUpdateModal, setShowScheduleUpdateModal] = useState(false)
  const [scheduleUpdateData, setScheduleUpdateData] = useState<{
    oldSchedules: ClassroomSchedule[]
    newSchedules: Schedule[]
  } | null>(null)
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [classroomSearchQuery, setClassroomSearchQuery] = useState('')
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [pauseFilter, setPauseFilter] = useState<'active' | 'paused' | 'all'>('active')

  // Student tooltip state
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    subject_id: '',
    teacher_id: '',
    teacher_name: '',
    color: '#3B82F6',
    notes: ''
  })

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [classroomSearchQuery, pauseFilter])

  const presetColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#64748B', // Slate
    '#DC2626'  // Red-600
  ]

  const colorNames: { [key: string]: string } = {
    '#3B82F6': String(t('classrooms.blue')),
    '#EF4444': String(t('classrooms.red')),
    '#10B981': String(t('classrooms.green')),
    '#F59E0B': String(t('classrooms.yellow')),
    '#8B5CF6': String(t('classrooms.purple')),
    '#EC4899': String(t('classrooms.pink')),
    '#06B6D4': String(t('classrooms.cyan')),
    '#84CC16': String(t('classrooms.lime')),
    '#F97316': String(t('classrooms.orange')),
    '#6366F1': String(t('classrooms.indigo')),
    '#64748B': String(t('classrooms.slate')),
    '#DC2626': String(t('classrooms.crimson'))
  }

  // Custom color state and management
  const [customColors, setCustomColors] = useState<string[]>([])
  const [customColorInput, setCustomColorInput] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [pickerHue, setPickerHue] = useState(210)
  const [pickerSaturation, setPickerSaturation] = useState(100)
  const [pickerLightness, setPickerLightness] = useState(50)
  const [pickerStartedFromPreset, setPickerStartedFromPreset] = useState(false)
  const [previewColor, setPreviewColor] = useState<string | null>(null) // Store the color picked from color picker

  // Load custom colors from database
  const loadCustomColors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('academy_custom_colors')
        .select('color')
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading custom colors:', error)
        return
      }

      if (data) {
        setCustomColors(data.map(item => item.color))
      }
    } catch (error) {
      console.error('Error loading custom colors:', error)
    }
  }, [academyId])

  useEffect(() => {
    if (academyId) {
      loadCustomColors()
    }
  }, [academyId, loadCustomColors])

  // Validate hex color
  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  // Convert HSL to HEX
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
  }

  // Convert HEX to HSL
  const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0, s = 0

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Update color from picker
  const updateColorFromPicker = () => {
    const hex = hslToHex(pickerHue, pickerSaturation, pickerLightness)
    setCustomColorInput(hex)
    handleInputChange('color', hex)
    setPreviewColor(hex) // Set preview color when picked from color picker
  }

  // Open color picker with current color
  const openColorPicker = () => {
    // Check if current color is a preset color (기본 색상)
    const normalizedCurrentColor = formData.color.toUpperCase()
    const normalizedPresets = presetColors.map(c => c.toUpperCase())
    const isPresetColor = normalizedPresets.includes(normalizedCurrentColor)

    // Only update picker sliders if the current color is NOT a preset color
    if (!isPresetColor) {
      const hsl = hexToHsl(formData.color)
      setPickerHue(hsl.h)
      setPickerSaturation(hsl.s)
      setPickerLightness(hsl.l)
      setCustomColorInput(formData.color)
      setPickerStartedFromPreset(false)
    } else {
      // Reset to default picker state if current color is a preset
      setPickerHue(0)
      setPickerSaturation(0)
      setPickerLightness(50)
      setCustomColorInput('')
      setPickerStartedFromPreset(true)
    }

    setShowColorPicker(true)
  }

  // Apply color from picker
  const applyPickerColor = () => {
    const hex = hslToHex(pickerHue, pickerSaturation, pickerLightness)
    handleInputChange('color', hex)
    setPreviewColor(hex) // Update preview color
    setCustomColorInput(hex) // Update hex input field
    // Note: Color is saved to database when classroom is created/updated, not here
    setShowColorPicker(false)
  }

  // Save custom color to database
  const saveCustomColor = async (color: string) => {
    if (!isValidHexColor(color)) return

    // Don't save if the color is already in the default preset colors (기본 색상)
    // Normalize color to uppercase for comparison
    const normalizedColor = color.toUpperCase()
    const normalizedPresets = presetColors.map(c => c.toUpperCase())
    if (normalizedPresets.includes(normalizedColor)) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('academy_custom_colors')
        .upsert({
          academy_id: academyId,
          color: color,
          created_by: user?.id
        }, {
          onConflict: 'academy_id,color',
          ignoreDuplicates: true
        })

      if (error) {
        console.error('Error saving custom color:', error)
        return
      }

      // Refresh the custom colors list
      await loadCustomColors()
    } catch (error) {
      console.error('Error saving custom color:', error)
    }
  }

  // Remove custom color with usage check
  const removeCustomColor = async (color: string) => {
    try {
      // Check if color is being used by any classroom
      const { count, error: countError } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact', head: true })
        .eq('academy_id', academyId)
        .eq('color', color)
        .is('deleted_at', null)

      if (countError) {
        showErrorToast(String(t('common.error')), countError.message)
        return
      }

      if (count && count > 0) {
        const description = String(t('classrooms.colorInUseDescription'))
          .replace('{{count}}', String(count))
          .replace('{{plural}}', count > 1 ? 's' : '')
        showErrorToast(
          String(t('classrooms.colorInUse')),
          description
        )
        return
      }

      // Safe to delete
      const { error: deleteError } = await supabase
        .from('academy_custom_colors')
        .delete()
        .eq('academy_id', academyId)
        .eq('color', color)

      if (deleteError) {
        showErrorToast(String(t('common.error')), deleteError.message)
        return
      }

      // Update local state
      setCustomColors(prev => prev.filter(c => c !== color))
      showSuccessToast(String(t('classrooms.colorDeleted')), '')
    } catch (error) {
      console.error('Error removing custom color:', error)
      showErrorToast(String(t('common.error')), 'Failed to remove color')
    }
  }

  // Handle custom color input change
  const handleCustomColorChange = (color: string) => {
    let formattedColor = color.trim()

    // Add # if missing
    if (formattedColor && !formattedColor.startsWith('#')) {
      formattedColor = '#' + formattedColor
    }

    setCustomColorInput(formattedColor)

    // If valid, apply and save
    if (isValidHexColor(formattedColor)) {
      handleInputChange('color', formattedColor)
      saveCustomColor(formattedColor)
    }
  }

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  // Direct day translations as fallback
  const dayTranslations: Record<string, Record<string, string>> = {
    english: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    },
    korean: {
      monday: '월요일',
      tuesday: '화요일',
      wednesday: '수요일',
      thursday: '목요일',
      friday: '금요일',
      saturday: '토요일',
      sunday: '일요일'
    }
  }

  // Helper function to get translated day name
  const getTranslatedDay = (day: string) => {
    if (!day) return ''
    const dayKey = day.toLowerCase()
    
    // Try to get the translation from the t function first
    const translated = t(`classrooms.${dayKey}`)
    
    // If translation fails (returns the key), use direct fallback
    if (translated === `classrooms.${dayKey}` || !translated || String(translated).startsWith('classrooms.')) {
      // Use direct translation based on current language
      return dayTranslations[language]?.[dayKey] || day
    }
    
    return String(translated)
  }

  // Handle inline subject creation
  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return

    setIsCreatingSubject(true)
    try {
      const result = await createSubject({
        name: newSubjectName.trim(),
        academy_id: academyId
      })

      if (result.success) {
        await refreshSubjects()
        setFormData({ ...formData, subject_id: result.data?.id || '' })
        setNewSubjectName('')
        setShowInlineSubjectCreate(false)
      } else {
        toast({ title: result.error?.message || 'Failed to create subject', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error creating subject:', error)
      toast({ title: String(t('classrooms.failedToCreateSubject')), variant: 'destructive' })
    } finally {
      setIsCreatingSubject(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation is handled by disabled button state
    if (!formData.name || !formData.teacher_id) {
      return
    }

    setIsCreating(true)

    try {
      // Direct user ID assignment - no need to create teacher records for managers
      const teacherId = formData.teacher_id

      // Create the classroom in the database
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name: formData.name,
          grade: formData.grade || null,
          subject_id: formData.subject_id || null,
          teacher_id: teacherId,
          color: formData.color,
          notes: formData.notes || null,
          academy_id: academyId
        })
        .select('*')
        .single()

      if (classroomError) {
        showErrorToast(String(t('classrooms.errorCreating')), classroomError.message)
        return
      }

      const classroomId = classroomData.id

      // Step 2: Create classroom schedules if any exist
      if (schedules.length > 0) {
        const scheduleInserts = schedules.map(schedule => ({
          classroom_id: classroomId,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))

        const { error: scheduleError } = await supabase
          .from('classroom_schedules')
          .insert(scheduleInserts)

        if (scheduleError) {
          showErrorToast(String(t('classrooms.errorCreatingSchedules')), scheduleError.message)
          return
        }
      }

      // Step 3: Create classroom-student relationships if any students are selected
      if (selectedStudents.length > 0) {
        // Look up student_record_ids for all students
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('academy_id', academyId)
          .in('user_id', selectedStudents)

        const studentRecordMap = new Map(
          studentRecords?.map(s => [s.user_id, s.id]) || []
        )

        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: classroomId,
          student_id: studentId,
          student_record_id: studentRecordMap.get(studentId)
        }))

        const { error: studentError } = await supabase
          .from('classroom_students')
          .insert(studentInserts)

        if (studentError) {
          showErrorToast(String(t('classrooms.errorEnrollingStudents')), studentError.message)
          return
        }
      }

      // Step 4: Save custom color to academy custom colors
      if (formData.color) {
        await saveCustomColor(formData.color)
      }

      // Step 5: Trigger classroom creation notifications
      try {
        await triggerClassroomCreatedNotifications(classroomId)
        // Trigger notification refetch for all users
        window.dispatchEvent(new CustomEvent('notificationCreated'))
      } catch (notificationError) {
        console.error('Error sending classroom creation notifications:', notificationError)
        // Don't fail the classroom creation if notification fails
      }

      // Invalidate caches BEFORE fetching so new classroom appears immediately
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateAssignmentsCache(academyId)
      invalidateAttendanceCache(academyId)

      // Step 4: Refresh the classroom list to get updated student data
      fetchClassrooms()
      setShowModal(false)

      // Reset form
      setFormData({
        name: '',
        grade: '',
        subject_id: '',
        teacher_id: '',
        teacher_name: '',
        color: '#3B82F6',
        notes: ''
      })
      setSchedules([])
      setSelectedStudents([])
      setActiveTimePicker(null)
      setStudentSearchQuery('')

      showSuccessToast(String(t('classrooms.createdSuccessfully')), `"${formData.name}" ${String(t('classrooms.createdDescription'))}`)

    } catch (error) {
      showErrorToast(String(t('classrooms.unexpectedError')), (error as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  // Helper function to apply schedule updates (direct delete/insert)
  const applyScheduleUpdates = async (classroomId: string, newSchedules: Schedule[]) => {
    // Delete existing schedules
    const { error: deleteScheduleError } = await supabase
      .from('classroom_schedules')
      .delete()
      .eq('classroom_id', classroomId)

    if (deleteScheduleError) {
      showErrorToast(String(t('classrooms.errorUpdatingSchedules')), deleteScheduleError.message)
      throw deleteScheduleError
    }

    // Insert new schedules
    if (newSchedules.length > 0) {
      const scheduleInserts = newSchedules.map(schedule => ({
        classroom_id: classroomId,
        day: schedule.day,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      }))

      const { error: scheduleError } = await supabase
        .from('classroom_schedules')
        .insert(scheduleInserts)

      if (scheduleError) {
        showErrorToast(String(t('classrooms.errorUpdatingSchedules')), scheduleError.message)
        throw scheduleError
      }
    }
  }

  // Handle schedule update modal confirmation
  const handleScheduleUpdateConfirm = async (options: ScheduleUpdateOptions) => {
    if (!scheduleUpdateData || !editingClassroom) return

    setIsSaving(true)
    try {
      const { oldSchedules, newSchedules } = scheduleUpdateData

      // Apply the update strategy for each changed schedule
      for (const newSchedule of newSchedules) {
        const oldSchedule = oldSchedules.find(s => s.day === newSchedule.day)

        if (oldSchedule && requiresScheduleUpdateModal(
          oldSchedule,
          {
            day: newSchedule.day,
            start_time: newSchedule.start_time,
            end_time: newSchedule.end_time
          }
        )) {
          // Schedule changed - apply user's chosen strategy
          const result = await updateClassroomSchedule(
            oldSchedule.id,
            {
              day: newSchedule.day,
              start_time: newSchedule.start_time,
              end_time: newSchedule.end_time
            },
            options
          )

          if (!result.success) {
            showErrorToast(String(t('classrooms.errorUpdatingSchedules')), result.error?.message || 'Unknown error')
            return
          }
        } else if (!oldSchedule) {
          // New schedule added - just insert it
          const { error } = await supabase
            .from('classroom_schedules')
            .insert({
              classroom_id: editingClassroom.id,
              day: newSchedule.day,
              start_time: newSchedule.start_time,
              end_time: newSchedule.end_time
            })

          if (error) {
            showErrorToast(String(t('classrooms.errorUpdatingSchedules')), error.message)
            return
          }
        }
      }

      // Handle deleted schedules (schedules in old but not in new)
      for (const oldSchedule of oldSchedules) {
        const stillExists = newSchedules.find(s => s.day === oldSchedule.day)
        if (!stillExists) {
          const { error } = await supabase
            .from('classroom_schedules')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', oldSchedule.id)

          if (error) {
            showErrorToast(String(t('classrooms.errorUpdatingSchedules')), error.message)
            return
          }
        }
      }

      // Update classroom-student relationships (same as before)
      const { error: deleteStudentError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', editingClassroom.id)

      if (deleteStudentError) {
        showErrorToast(String(t('classrooms.errorUpdatingStudents')), deleteStudentError.message)
        return
      }

      if (selectedStudents.length > 0) {
        // Look up student_record_ids for all students
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('academy_id', academyId)
          .in('user_id', selectedStudents)

        const studentRecordMap = new Map(
          studentRecords?.map(s => [s.user_id, s.id]) || []
        )

        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: editingClassroom.id,
          student_id: studentId,
          student_record_id: studentRecordMap.get(studentId)
        }))

        const { error: studentError } = await supabase
          .from('classroom_students')
          .insert(studentInserts)

        if (studentError) {
          showErrorToast(String(t('classrooms.errorUpdatingStudents')), studentError.message)
          return
        }
      }

      // Invalidate caches and refresh
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateAssignmentsCache(academyId)
      invalidateAttendanceCache(academyId)

      const updatedClassrooms = await fetchClassrooms()

      if (showDetailsModal && selectedClassroom && editingClassroom) {
        const updatedClassroom = updatedClassrooms?.find((c: any) => c.id === editingClassroom.id)
        if (updatedClassroom) {
          setSelectedClassroom(updatedClassroom)
        }
      }

      // Close modals and reset
      setShowScheduleUpdateModal(false)
      setScheduleUpdateData(null)
      setShowEditModal(false)
      setEditingClassroom(null)
      setFormData({
        name: '',
        grade: '',
        subject_id: '',
        teacher_id: '',
        teacher_name: '',
        color: '#3B82F6',
        notes: ''
      })
      setSchedules([])
      setSelectedStudents([])
      setActiveTimePicker(null)
      setStudentSearchQuery('')

      showSuccessToast(String(t('classrooms.updatedSuccessfully')), `"${editingClassroom.name}" ${String(t('classrooms.updatedDescription'))}`)

    } catch (error) {
      showErrorToast(String(t('classrooms.unexpectedError')), (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingClassroom) return

    // Validation is handled by disabled button state
    if (!formData.name || !formData.teacher_id) {
      return
    }

    setIsSaving(true)
    try {
      // Direct user ID assignment - no need to create teacher records for managers
      const teacherId = formData.teacher_id

      // Update the classroom in the database
      const { error: classroomError } = await supabase
        .from('classrooms')
        .update({
          name: formData.name,
          grade: formData.grade || null,
          subject_id: formData.subject_id || null,
          teacher_id: teacherId,
          color: formData.color,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClassroom.id)

      if (classroomError) {
        showErrorToast(String(t('classrooms.errorUpdating')), classroomError.message)
        return
      }

      // Save custom color to academy custom colors
      if (formData.color) {
        await saveCustomColor(formData.color)
      }

      // Step 2: Fetch existing schedules and check if they changed
      const { data: existingSchedules, error: fetchScheduleError } = await supabase
        .from('classroom_schedules')
        .select('*')
        .eq('classroom_id', editingClassroom.id)
        .is('deleted_at', null)

      if (fetchScheduleError) {
        showErrorToast(String(t('classrooms.errorFetchingSchedules')), fetchScheduleError.message)
        return
      }

      // Check if any schedule changed
      let scheduleChanged = false

      // Check if count differs
      if (existingSchedules.length !== schedules.length) {
        scheduleChanged = true
      } else {
        // Check if any individual schedule changed
        for (const newSchedule of schedules) {
          const oldSchedule = existingSchedules.find(
            s => s.day === newSchedule.day
          )

          if (!oldSchedule) {
            scheduleChanged = true
            break
          }

          if (requiresScheduleUpdateModal(
            oldSchedule as ClassroomSchedule,
            {
              day: newSchedule.day,
              start_time: newSchedule.start_time,
              end_time: newSchedule.end_time
            }
          )) {
            scheduleChanged = true
            break
          }
        }
      }

      // If schedules changed, show modal and pause the save process
      if (scheduleChanged && existingSchedules.length > 0) {
        setScheduleUpdateData({
          oldSchedules: existingSchedules as ClassroomSchedule[],
          newSchedules: schedules
        })
        setShowScheduleUpdateModal(true)
        setIsSaving(false)
        return
      }

      // If no schedule changes OR no existing schedules, proceed with direct update
      await applyScheduleUpdates(editingClassroom.id, schedules)

      // Step 3: Update classroom-student relationships
      const { error: deleteStudentError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', editingClassroom.id)

      if (deleteStudentError) {
        showErrorToast(String(t('classrooms.errorUpdatingStudents')), deleteStudentError.message)
        return
      }

      if (selectedStudents.length > 0) {
        // Look up student_record_ids for all students
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('academy_id', academyId)
          .in('user_id', selectedStudents)

        const studentRecordMap = new Map(
          studentRecords?.map(s => [s.user_id, s.id]) || []
        )

        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: editingClassroom.id,
          student_id: studentId,
          student_record_id: studentRecordMap.get(studentId)
        }))

        const { error: studentError } = await supabase
          .from('classroom_students')
          .insert(studentInserts)

        if (studentError) {
          showErrorToast(String(t('classrooms.errorUpdatingStudents')), studentError.message)
          return
        }
      }

      // Invalidate caches BEFORE fetching so classroom updates appear immediately
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateAssignmentsCache(academyId)
      invalidateAttendanceCache(academyId)

      // Refresh the classrooms list and get the updated data
      const updatedClassrooms = await fetchClassrooms()

      // Update selectedClassroom with fresh data if details modal is open
      if (showDetailsModal && selectedClassroom && editingClassroom) {
        // Find the updated classroom in the refreshed classrooms array
        const updatedClassroom = updatedClassrooms?.find((c: any) => c.id === editingClassroom.id)
        if (updatedClassroom) {
          setSelectedClassroom(updatedClassroom)
        }
      }

      // Close the modal and reset form
      setShowEditModal(false)
      setEditingClassroom(null)
      setFormData({
        name: '',
        grade: '',
        subject_id: '',
        teacher_id: '',
        teacher_name: '',
        color: '#3B82F6',
        notes: ''
      })
      setSchedules([])
      setSelectedStudents([])
      setActiveTimePicker(null)
      setStudentSearchQuery('')

      showSuccessToast(String(t('classrooms.updatedSuccessfully')), String(t('classrooms.updatedDescription')))

    } catch (error) {
      showErrorToast(String(t('classrooms.unexpectedError')), (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = teachers.find(t => t.id === teacherId)
    setFormData(prev => ({ 
      ...prev, 
      teacher_id: teacherId,
      teacher_name: selectedTeacher?.name || ''
    }))
  }

  const addSchedule = () => {
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:00'
    }
    setSchedules(prev => [...prev, newSchedule])
  }

  const removeSchedule = (id: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== id))
  }

  const updateSchedule = (id: string, field: keyof Schedule, value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === id ? { ...schedule, [field]: value } : schedule
    ))
  }

  // Filter classrooms based on search query and pause status
  const filteredClassrooms = useMemo(() => classrooms.filter(classroom => {
    // First apply pause filter
    if (pauseFilter === 'active' && classroom.paused) return false
    if (pauseFilter === 'paused' && !classroom.paused) return false

    // Then apply search query
    if (!classroomSearchQuery) return true

    return (
      classroom.name.toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
      classroom.teacher_name?.toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
      classroom.grade?.toLowerCase().includes(classroomSearchQuery.toLowerCase()) ||
      classroom.subject_name?.toLowerCase().includes(classroomSearchQuery.toLowerCase())
    )
  }), [classrooms, pauseFilter, classroomSearchQuery])

  // Paginate the filtered classrooms
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedClassrooms = filteredClassrooms.slice(startIndex, endIndex)
  const filteredTotalCount = filteredClassrooms.length

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Filter students based on search query
  const filteredStudents = useMemo(() => students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (student.school_name && student.school_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  ), [students, studentSearchQuery])

  // Filter teachers based on search query (used in dropdowns)
  const filteredTeachers = useMemo(() => teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  ), [teachers, teacherSearchQuery])

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom)
    setShowDeleteModal(true)
  }

  const handleTogglePause = async (classroom: Classroom) => {
    const newPausedState = !classroom.paused

    // Optimistic update - update UI immediately
    setClassrooms(prev => prev.map(c =>
      c.id === classroom.id ? { ...c, paused: newPausedState } : c
    ))

    try {
      // Update database in background
      const { error } = await supabase
        .from('classrooms')
        .update({ paused: newPausedState })
        .eq('id', classroom.id)

      if (error) throw error

      if (classroom.paused) {
        showSuccessToast(t('classrooms.unpauseSuccess'))
      } else {
        showSuccessToast(t('classrooms.pauseSuccess'))
      }

      // Invalidate caches so next fetch gets fresh data
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
    } catch (error) {
      console.error('Error toggling pause:', error)
      showErrorToast(t('classrooms.pauseError'))

      // Revert optimistic update on error
      setClassrooms(prev => prev.map(c =>
        c.id === classroom.id ? { ...c, paused: classroom.paused } : c
      ))
    }
  }

  const handleCreateClick = () => {
    // Reset form first
    setFormData({
      name: '',
      grade: '',
      subject_id: '',
      teacher_id: '',
      teacher_name: '',
      color: '#3B82F6',
      notes: ''
    })
    setSchedules([])
    setSelectedStudents([])

    // If user is a teacher, auto-set their ID as the teacher
    if (userRole === 'teacher' && currentUserId) {
      setFormData(prev => ({
        ...prev,
        teacher_id: currentUserId
      }))
    }

    setShowModal(true)
  }

  const handleEditClick = async (classroom: Classroom) => {
    // Teachers can only edit their own classrooms
    if (userRole === 'teacher' && classroom.teacher_id !== currentUserId) {
      showErrorToast(String(t('classrooms.noPermission')), String(t('classrooms.canOnlyEditOwnClassrooms')))
      return
    }

    // Open modal immediately with loading skeleton for schedules
    setEditingClassroom(classroom)
    setFormData({
      name: classroom.name,
      grade: classroom.grade || '',
      subject_id: classroom.subject_id || '',
      teacher_id: classroom.teacher_id,
      teacher_name: classroom.teacher_name || '',
      color: classroom.color || '#3B82F6',
      notes: classroom.notes || ''
    })
    const studentUserIds = classroom.enrolled_students?.map(student => {
      // Prefer matching by user_id (reliable), fall back to name matching (legacy data)
      if (student.user_id) return student.user_id
      const foundStudent = students.find(s => s.name === student.name)
      return foundStudent?.user_id
    }).filter((id): id is string => Boolean(id)) || []
    setSelectedStudents(studentUserIds)
    setSchedules([])
    setEditModalLoading(true)
    setShowEditModal(true)

    // Fetch schedules in background
    try {
      const { data: existingSchedules, error } = await supabase
        .from('classroom_schedules')
        .select('*')
        .eq('classroom_id', classroom.id)
        .order('day', { ascending: true })

      if (error) {
        setSchedules([])
      } else {
        setSchedules((existingSchedules || []).map(schedule => ({
          id: schedule.id,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        })))
      }
    } catch {
      setSchedules([])
    } finally {
      setEditModalLoading(false)
    }
  }

  const handleDetailsClick = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setShowDetailsModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!classroomToDelete || !classroomToDelete.id) {
      showErrorToast(String(t('classrooms.noClassroomSelected')), '')
      return
    }

    try {
      const { error } = await supabase
        .from('classrooms')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', classroomToDelete.id)
        .select()

      if (error) {
        showErrorToast(String(t('classrooms.errorDeleting')), error.message)
        return
      }

      // Remove from local state
      setClassrooms(prev => prev.filter(c => c.id !== classroomToDelete.id))
      setShowDeleteModal(false)
      setClassroomToDelete(null)

      showSuccessToast(String(t('classrooms.deletedSuccessfully')), String(t('classrooms.deletedDescription')))

      // Invalidate caches so deleted classroom is removed from related pages and appears in archive
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateAssignmentsCache(academyId)
      invalidateAttendanceCache(academyId)
      invalidateArchiveCache(academyId)

    } catch (error) {
      showErrorToast(String(t('classrooms.unexpectedError')), (error as Error).message)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return '12:00 AM'
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampmTranslated = parseInt(hours) >= 12 ? t('classrooms.pm') : t('classrooms.am')
    return `${hour12}:${minutes} ${ampmTranslated}`
  }

  const formatScheduleDisplay = (schedules: { day: string; start_time: string; end_time: string }[] | undefined) => {
    if (!schedules || schedules.length === 0) return null
    
    return schedules.map(schedule => {
      const dayName = getTranslatedDay(schedule.day)
      const startTime = formatTime(schedule.start_time)
      const endTime = formatTime(schedule.end_time)
      return `${dayName} ${startTime} - ${endTime}`
    })
  }


  const ClassroomSkeleton = () => (
    <Card className="p-6 hover:shadow-md transition-shadow flex flex-col h-full animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
        <div className="h-9 bg-gray-200 rounded w-full"></div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("classrooms.title")}</h1>
            <p className="text-gray-500">{t("classrooms.description")}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
              <CalendarOff className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("scheduleBreaks.button")}
            </Button>
            <Button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("classrooms.createClassroom")}
            </Button>
          </div>
        </div>

        {/* Stats Card Skeleton */}
        <div className="mb-8">
          <Card className="w-full sm:w-80 p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
        </div>

        {/* Search Bar Skeleton */}
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Classrooms Grid Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <ClassroomSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("classrooms.title")}</h1>
          <p className="text-gray-500">{t("classrooms.description")}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            onClick={() => setShowScheduleBreaksModal(true)}
          >
            <CalendarOff className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("scheduleBreaks.button")}
          </Button>
          <Button
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            onClick={handleCreateClick}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("classrooms.createClassroom")}
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="mb-8">
        <Card className="w-full sm:w-80 p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-purple-500">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">
              {classroomSearchQuery || pauseFilter !== 'active' ? "검색 결과" : t("classrooms.totalActiveClassrooms")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {filteredTotalCount}
              </p>
              <p className="text-sm text-gray-500">
                {filteredTotalCount === 1 ? t("classrooms.classroom") : t("classrooms.classrooms")}
              </p>
            </div>
            {(classroomSearchQuery || pauseFilter !== 'all') && (
              <p className="text-xs text-gray-500">전체 {totalCount}개 중</p>
            )}
          </div>
        </Card>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            type="text"
            placeholder={language === 'korean' ? "클래스룸 검색..." : "Search classrooms..."}
            value={classroomSearchQuery}
            onChange={(e) => setClassroomSearchQuery(e.target.value)}
            className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>

        {/* Pause Status Filter */}
        <Select
          value={pauseFilter}
          onValueChange={(value: 'active' | 'paused' | 'all') => {
            setPauseFilter(value)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
            <SelectValue placeholder={String(t("classrooms.allClassrooms"))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{t("classrooms.activeClassrooms")}</SelectItem>
            <SelectItem value="paused">{t("classrooms.pausedClassrooms")}</SelectItem>
            <SelectItem value="all">{t("classrooms.allClassrooms")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Classrooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {paginatedClassrooms.map((classroom) => (
          <Card key={classroom.id} className={`p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col h-full ${classroom.paused ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full relative"
                  style={{ backgroundColor: classroom.color || '#6B7280' }}
                >
                  {classroom.paused && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-500 rounded-full flex items-center justify-center">
                      <Pause className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{classroom.name}</h3>
                  {classroom.teacher_name && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mt-1">
                      <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{classroom.teacher_name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleTogglePause(classroom)}
                  title={classroom.paused ? t('classrooms.unpause') : t('classrooms.pause')}
                >
                  {classroom.paused ? (
                    <Play className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  ) : (
                    <Pause className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleEditClick(classroom)}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleDeleteClick(classroom)}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 flex-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
<span>
                  {language === 'korean' 
                    ? `${t("classrooms.students")} ${classroom.student_count || 0}명`
                    : `${classroom.student_count || 0} ${t("classrooms.students")}`
                  }
                </span>
              </div>

              {classroom.grade && classroom.grade.trim() && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
<span>
                    {language === 'korean' 
                      ? `${classroom.grade}${t("classrooms.grade")}`
                      : `${t("classrooms.grade")} ${classroom.grade}`
                    }
                  </span>
                </div>
              )}

              {classroom.subject_name && classroom.subject_name.trim() && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <Book className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{classroom.subject_name}</span>
                </div>
              )}

              {formatScheduleDisplay(classroom.schedules) && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <div className="flex flex-col">
                    {formatScheduleDisplay(classroom.schedules)?.map((scheduleText, index) => (
                      <span key={index}>{scheduleText}</span>
                    ))}
                  </div>
                </div>
              )}

              {classroom.notes && (
                <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-gray-600">{classroom.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2">
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => handleDetailsClick(classroom)}
              >
                {t("common.viewDetails")}
              </Button>
              <Button
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => onNavigateToSessions?.(classroom.id)}
              >
                {t("classrooms.viewSessions")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredTotalCount > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              {t("classrooms.pagination.previous")}
            </Button>
            <Button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
              variant="outline"
            >
              {t("classrooms.pagination.next")}
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t("classrooms.pagination.showing")}
                <span className="font-medium"> {Math.min(((currentPage - 1) * itemsPerPage) + 1, filteredTotalCount)} </span>
                {t("classrooms.pagination.to")}
                <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredTotalCount)} </span>
                {t("classrooms.pagination.of")}
                <span className="font-medium"> {filteredTotalCount} </span>
                {t("classrooms.pagination.classrooms")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("classrooms.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("classrooms.pagination.next")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!initialized ? null : classrooms.length === 0 ? (
        <Card className="p-12 text-center gap-2">
          <School className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">{t("classrooms.noClassrooms")}</h3>
          <p className="text-gray-500 mb-2">{t("classrooms.createFirstClassroom")}</p>
          <Button
            className="flex items-center gap-2 mx-auto"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4" />
            {t("classrooms.createClassroom")}
          </Button>
        </Card>
      ) : filteredClassrooms.length === 0 && classroomSearchQuery ? (
        <Card className="p-12 text-center gap-2">
          <Search className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">검색 결과가 없습니다</h3>
          <p className="text-gray-500 mb-2">
            &ldquo;{classroomSearchQuery}&rdquo;에 해당하는 클래스룸이 없습니다. 다른 검색어를 시도해보세요.
          </p>
          <Button 
            variant="outline"
            className="flex items-center gap-2 mx-auto"
            onClick={() => setClassroomSearchQuery('')}
          >
            <X className="w-4 h-4" />
            {t("classrooms.clearSearch")}
          </Button>
        </Card>
      ) : null}

      {/* Add Classroom Modal */}
      <ClassroomCreateModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSchedules([])
          setSelectedStudents([])
          setActiveTimePicker(null)
          setStudentSearchQuery('')
        }}
        formData={formData}
        setFormData={setFormData}
        schedules={schedules}
        selectedStudents={selectedStudents}
        setSelectedStudents={setSelectedStudents}
        teachers={teachers}
        filteredTeachers={filteredTeachers}
        students={students}
        filteredStudents={filteredStudents}
        subjects={subjects}
        customColors={customColors}
        presetColors={presetColors}
        colorNames={colorNames}
        previewColor={previewColor}
        setPreviewColor={setPreviewColor}
        customColorInput={customColorInput}
        setCustomColorInput={setCustomColorInput}
        isCreating={isCreating}
        isManager={isManager}
        userRole={userRole}
        showInlineSubjectCreate={showInlineSubjectCreate}
        setShowInlineSubjectCreate={setShowInlineSubjectCreate}
        newSubjectName={newSubjectName}
        setNewSubjectName={setNewSubjectName}
        isCreatingSubject={isCreatingSubject}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        teacherSearchQuery={teacherSearchQuery}
        setTeacherSearchQuery={setTeacherSearchQuery}
        activeTimePicker={activeTimePicker}
        setActiveTimePicker={setActiveTimePicker}
        daysOfWeek={daysOfWeek}
        getTranslatedDay={getTranslatedDay}
        formatTime={formatTime}
        isValidHexColor={isValidHexColor}
        handleInputChange={handleInputChange}
        handleTeacherChange={handleTeacherChange}
        handleSubmit={handleSubmit}
        handleCreateSubject={handleCreateSubject}
        toggleStudentSelection={toggleStudentSelection}
        addSchedule={addSchedule}
        removeSchedule={removeSchedule}
        updateSchedule={updateSchedule}
        removeCustomColor={removeCustomColor}
        openColorPicker={openColorPicker}
      />

      {/* Delete Classroom Confirmation Modal */}
      <ClassroomDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setClassroomToDelete(null)
        }}
        classroomToDelete={classroomToDelete}
        isSaving={isSaving}
        handleDeleteConfirm={handleDeleteConfirm}
      />

      {/* Edit Classroom Modal */}
      <ClassroomEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingClassroom(null)
          setSchedules([])
          setSelectedStudents([])
          setActiveTimePicker(null)
          setStudentSearchQuery('')
        }}
        editingClassroom={editingClassroom}
        formData={formData}
        setFormData={setFormData}
        schedules={schedules}
        selectedStudents={selectedStudents}
        setSelectedStudents={setSelectedStudents}
        teachers={teachers}
        filteredTeachers={filteredTeachers}
        students={students}
        filteredStudents={filteredStudents}
        subjects={subjects}
        customColors={customColors}
        presetColors={presetColors}
        customColorInput={customColorInput}
        setCustomColorInput={setCustomColorInput}
        editModalLoading={editModalLoading}
        isSaving={isSaving}
        isManager={isManager}
        userRole={userRole}
        showInlineSubjectCreate={showInlineSubjectCreate}
        setShowInlineSubjectCreate={setShowInlineSubjectCreate}
        newSubjectName={newSubjectName}
        setNewSubjectName={setNewSubjectName}
        isCreatingSubject={isCreatingSubject}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        teacherSearchQuery={teacherSearchQuery}
        setTeacherSearchQuery={setTeacherSearchQuery}
        activeTimePicker={activeTimePicker}
        setActiveTimePicker={setActiveTimePicker}
        daysOfWeek={daysOfWeek}
        getTranslatedDay={getTranslatedDay}
        formatTime={formatTime}
        isValidHexColor={isValidHexColor}
        handleCustomColorChange={handleCustomColorChange}
        handleEditSubmit={handleEditSubmit}
        handleCreateSubject={handleCreateSubject}
        addSchedule={addSchedule}
        removeSchedule={removeSchedule}
        updateSchedule={updateSchedule}
        removeCustomColor={removeCustomColor}
        openColorPicker={openColorPicker}
      />

      {/* Classroom Details Modal */}
      <ClassroomDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedClassroom(null)
        }}
        selectedClassroom={selectedClassroom}
        formatTime={formatTime}
        getTranslatedDay={getTranslatedDay}
        onEditClick={handleEditClick}
      />

      {/* Custom Color Picker Modal */}
      <ClassroomColorPickerModal
        isOpen={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        pickerHue={pickerHue}
        setPickerHue={setPickerHue}
        pickerSaturation={pickerSaturation}
        setPickerSaturation={setPickerSaturation}
        pickerLightness={pickerLightness}
        setPickerLightness={setPickerLightness}
        pickerStartedFromPreset={pickerStartedFromPreset}
        setPickerStartedFromPreset={setPickerStartedFromPreset}
        customColorInput={customColorInput}
        setCustomColorInput={setCustomColorInput}
        hslToHex={hslToHex}
        hexToHsl={hexToHsl}
        isValidHexColor={isValidHexColor}
        applyPickerColor={applyPickerColor}
      />

      {/* Schedule Breaks Modal */}
      <ScheduleBreaksModal
        isOpen={showScheduleBreaksModal}
        onClose={() => setShowScheduleBreaksModal(false)}
        academyId={academyId}
        onSuccess={() => {
          // Invalidate sessions cache so virtual sessions are regenerated
          invalidateSessionsCache(academyId)
        }}
      />

      {/* Schedule Update Modal */}
      {scheduleUpdateData && scheduleUpdateData.oldSchedules.length > 0 && (
        <ScheduleUpdateModal
          isOpen={showScheduleUpdateModal}
          onClose={() => {
            setShowScheduleUpdateModal(false)
            setScheduleUpdateData(null)
            setIsSaving(false)
          }}
          oldSchedule={scheduleUpdateData.oldSchedules[0]}
          newSchedule={{
            day: scheduleUpdateData.newSchedules[0]?.day || scheduleUpdateData.oldSchedules[0].day,
            start_time: scheduleUpdateData.newSchedules[0]?.start_time || scheduleUpdateData.oldSchedules[0].start_time,
            end_time: scheduleUpdateData.newSchedules[0]?.end_time || scheduleUpdateData.oldSchedules[0].end_time
          }}
          allOldSchedules={scheduleUpdateData.oldSchedules}
          allNewSchedules={scheduleUpdateData.newSchedules}
          onConfirm={handleScheduleUpdateConfirm}
        />
      )}
    </div>
  )
}