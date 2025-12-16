"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { showSuccessToast, showErrorToast } from '@/stores'
import { invalidateSessionsCache } from '@/components/ui/sessions-page'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { invalidateAssignmentsCache } from '@/components/ui/assignments-page'
import { invalidateAttendanceCache } from '@/components/ui/attendance-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'
import { triggerClassroomCreatedNotifications } from '@/lib/notification-triggers'
import { ScheduleBreaksModal } from '@/components/ui/classrooms/ScheduleBreaksModal'
import { ScheduleUpdateModal } from '@/components/ui/classrooms/ScheduleUpdateModal'
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

  console.log(`[Performance] Cleared ${clearedCount} classroom cache entries`)
}

interface Classroom {
  id: string
  name: string
  grade?: string
  subject_id?: string
  subject_name?: string
  teacher_id: string
  teacher_name?: string
  color?: string
  notes?: string
  academy_id: string
  created_at: string
  updated_at: string
  enrolled_students?: { name: string; school_name?: string }[]
  student_count?: number
  schedules?: { id: string; day: string; start_time: string; end_time: string }[]
}

interface ClassroomsPageProps {
  academyId: string
  onNavigateToSessions?: (classroomId?: string) => void
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

interface Schedule {
  id: string
  day: string
  start_time: string
  end_time: string
}

interface Student {
  id: string
  name: string
  user_id: string
  school_name?: string
  phone?: string
  email?: string
  family_name?: string
  parent_names?: string[]
}



export function ClassroomsPage({ academyId, onNavigateToSessions }: ClassroomsPageProps) {
  const { t, language } = useTranslation()
  const { subjects, refreshData: refreshSubjects } = useSubjectData(academyId)
  const { createSubject } = useSubjectActions()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 12
  const [isManager, setIsManager] = useState(false)
  const [userRole, setUserRole] = useState<'manager' | 'teacher' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

  // Check if current user is a manager or teacher for this academy
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUserRole(null)
        setCurrentUserId(null)
        return false
      }

      if (!academyId) {
        console.warn('[Classrooms] No academyId available yet')
        return false
      }

      setCurrentUserId(user.id)

      // Check if user is a manager
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('user_id', user.id)
        .single()

      if (managerData) {
        setUserRole('manager')
        return true
      }

      // Check if user is a teacher
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('user_id', user.id)
        .single()

      if (teacherData) {
        setUserRole('teacher')
        return false // Not a manager, but is a teacher
      }

      setUserRole(null)
      return false
    } catch (error) {
      console.error('Error checking user role:', error)
      setUserRole(null)
      setCurrentUserId(null)
      return false
    }
  }, [academyId])

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
        alert(result.error?.message || 'Failed to create subject')
      }
    } catch (error) {
      console.error('Error creating subject:', error)
      alert('Failed to create subject')
    } finally {
      setIsCreatingSubject(false)
    }
  }


  const fetchClassrooms = useCallback(async () => {
    if (!academyId) return

    // PERFORMANCE: Check cache first (cache all classrooms, not per page)
    const cacheKey = `classrooms-${academyId}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Cache hit:', {
          classrooms: parsed.classrooms?.length || 0,
          totalCount: parsed.totalCount || 0
        })
        setClassrooms(parsed.classrooms)
        setTotalCount(parsed.totalCount || 0)
        setInitialized(true)
        setLoading(false)
        return parsed.classrooms
      } else {
        console.log('⏰ Cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Cache miss, fetching from database')
    }

    setInitialized(true)

    try {
      // Fetch all classrooms (no server-side pagination)
      const { data, error, count } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact' })
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Update total count
      setTotalCount(count || 0)
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        setClassrooms([])
        setLoading(false)
        return
      }
      
      // Batch queries to avoid N+1 pattern
      const classroomIds = data.map(classroom => classroom.id)
      const teacherIds = [...new Set(data.map(classroom => classroom.teacher_id).filter(Boolean))]
      const subjectIds = [...new Set(data.map(classroom => classroom.subject_id).filter(Boolean))]
      
      // Execute all queries in parallel
      const [teachersData, studentsData, schedulesData, subjectsData] = await Promise.all([
        // Get all teacher names at once
        teacherIds.length > 0 ? supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds) : Promise.resolve({ data: [] }),
        
        // Get all enrolled students for all classrooms
        classroomIds.length > 0 ? supabase
          .from('classroom_students')
          .select(`
            classroom_id,
            student_id,
            students!inner(
              users!inner(
                name
              ),
              school_name
            )
          `)
          .in('classroom_id', classroomIds) : Promise.resolve({ data: [] }),
        
        // Get all schedules for all classrooms
        classroomIds.length > 0 ? supabase
          .from('classroom_schedules')
          .select('*')
          .in('classroom_id', classroomIds)
          .order('day') : Promise.resolve({ data: [] }),
        
        // Get all subject names at once
        subjectIds.length > 0 ? supabase
          .from('subjects')
          .select('id, name')
          .in('id', subjectIds) : Promise.resolve({ data: [] })
      ])

      // Create lookup maps for efficient data association
      const teacherMap = new Map(
        (teachersData.data || []).map(teacher => [teacher.id, teacher.name])
      )
      
      const subjectMap = new Map(
        (subjectsData.data || []).map(subject => [subject.id, subject.name])
      )
      
      const studentsMap = new Map()
      ;(studentsData.data || []).forEach((enrollment: Record<string, unknown>) => {
        if (!studentsMap.has(enrollment.classroom_id as string)) {
          studentsMap.set(enrollment.classroom_id as string, [])
        }
        studentsMap.get(enrollment.classroom_id as string).push({
          name: (enrollment.students as { users?: { name?: string } })?.users?.name || 'Unknown Student',
          school_name: (enrollment.students as { school_name?: string })?.school_name
        })
      })
      
      const schedulesMap = new Map()
      ;(schedulesData.data || []).forEach((schedule: { classroom_id: string; day: string; start_time: string; end_time: string; room?: string }) => {
        if (!schedulesMap.has(schedule.classroom_id)) {
          schedulesMap.set(schedule.classroom_id, [])
        }
        schedulesMap.get(schedule.classroom_id).push(schedule)
      })

      // Build final classroom data with efficient lookups
      const classroomsWithDetails = data.map(classroom => {
        const studentData = studentsMap.get(classroom.id) || []
        return {
          ...classroom,
          teacher_name: teacherMap.get(classroom.teacher_id) || 'Unknown Teacher',
          subject_name: classroom.subject_id ? subjectMap.get(classroom.subject_id) : undefined,
          enrolled_students: studentData,
          student_count: studentData.length,
          schedules: schedulesMap.get(classroom.id) || []
        }
      })

      setClassrooms(classroomsWithDetails)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          classrooms: classroomsWithDetails,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Classrooms cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache classrooms:', cacheError)
      }

      return classroomsWithDetails
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      setClassrooms([])
      return []
    } finally {
      setLoading(false)
    }
  }, [academyId])

  const fetchTeachers = useCallback(async () => {
    try {
      // Fetch both teachers and managers for this academy
      const [teachersResult, managersResult] = await Promise.all([
        // Get teachers
        supabase
          .from('teachers')
          .select(`
            user_id,
            users!inner(
              id,
              name
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true),
        
        // Get managers  
        supabase
          .from('managers')
          .select(`
            user_id,
            users!inner(
              id,
              name
            )
          `)
          .eq('academy_id', academyId)
      ])

      const teachersData: Teacher[] = []

      // Add teachers
      if (teachersResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const teachers = teachersResult.data.map((teacher: any) => ({
          id: teacher.users.id,
          name: teacher.users.name,
          user_id: teacher.user_id
        }))
        teachersData.push(...teachers)
      }

      // Add managers
      if (managersResult.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const managers = managersResult.data.map((manager: any) => ({
          id: manager.users.id,
          name: `${manager.users.name} (${t('auth.form.roles.manager')})`,
          user_id: manager.user_id
        }))
        teachersData.push(...managers)
      }

      // Remove duplicates (in case someone is both teacher and manager)
      const uniqueTeachers = teachersData.filter((teacher, index, self) => 
        index === self.findIndex(t => t.user_id === teacher.user_id)
      )
      
      setTeachers(uniqueTeachers)
    } catch (error) {
      console.error('Error fetching teachers and managers:', error)
      setTeachers([])
    }
  }, [academyId, t])

  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          phone,
          school_name,
          users!inner(
            id,
            name,
            email
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) {
        console.error('Error fetching students:', error)
        setStudents([])
        return
      }

      // Get family information for all students
      const studentUserIds = data?.map((s: any) => s.user_id) || []
      const { data: familyData } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          families!inner(
            id,
            name
          )
        `)
        .in('user_id', studentUserIds)

      // Get parent names for each family
      const familyIds = [...new Set(familyData?.map((fm: any) => fm.families.id) || [])]
      const { data: parentData } = await supabase
        .from('family_members')
        .select(`
          family_id,
          users!inner(
            name
          )
        `)
        .eq('role', 'parent')
        .in('family_id', familyIds)

      // Build a map of user_id to family info
      const familyMap = new Map()
      familyData?.forEach((fm: any) => {
        const parents = parentData?.filter((p: any) => p.family_id === fm.families.id).map((p: any) => p.users.name) || []
        familyMap.set(fm.user_id, {
          family_name: fm.families.name,
          parent_names: parents
        })
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const studentsData = data?.map((student: any) => {
        const familyInfo = familyMap.get(student.user_id) || {}
        return {
          id: student.users.id,
          name: student.users.name,
          user_id: student.user_id,
          school_name: student.school_name,
          phone: student.phone,
          email: student.users.email,
          family_name: familyInfo.family_name,
          parent_names: familyInfo.parent_names
        }
      }) || []

      setStudents(studentsData)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    }
  }, [academyId])

  useEffect(() => {
    if (academyId) {
      // Check if page was refreshed - if so, clear caches to force fresh data
      const wasRefreshed = clearCachesOnRefresh(academyId)
      if (wasRefreshed) {
        markRefreshHandled()
        console.log('🔄 [Classrooms] Page refresh detected - fetching fresh data')
      }

      // Only show loading on initial load and navigation, not on true tab return
      if (!simpleTabDetection.isTrueTabReturn()) {
        setLoading(true)
      }

      fetchClassrooms()
      fetchTeachers()
      fetchStudents()

      // Check if user is manager
      checkUserRole().then(setIsManager)
    }
  }, [academyId, fetchClassrooms, fetchTeachers, fetchStudents, checkUserRole])

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
        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: classroomId,
          student_id: studentId
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
        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: editingClassroom.id,
          student_id: studentId
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
        const studentInserts = selectedStudents.map(studentId => ({
          classroom_id: editingClassroom.id,
          student_id: studentId
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
  const filteredClassrooms = classrooms.filter(classroom => {
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
  })

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
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (student.school_name && student.school_name.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  )

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom)
    setShowDeleteModal(true)
  }

  const handleTogglePause = async (classroom: Classroom) => {
    try {
      setLoading(true)

      // Toggle the paused field
      const { error } = await supabase
        .from('classrooms')
        .update({ paused: !classroom.paused })
        .eq('id', classroom.id)

      if (error) throw error

      if (classroom.paused) {
        showSuccessToast(t('classrooms.unpauseSuccess'))
      } else {
        showSuccessToast(t('classrooms.pauseSuccess'))
      }

      // Invalidate caches and refresh data
      invalidateClassroomsCache(academyId)
      invalidateSessionsCache(academyId)
      await fetchClassrooms()
    } catch (error) {
      console.error('Error toggling pause:', error)
      showErrorToast(t('classrooms.pauseError'))
    } finally {
      setLoading(false)
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
    // Convert student objects back to user_ids for editing
    const studentUserIds = classroom.enrolled_students?.map(student => {
      // Find the user_id from the students array
      const foundStudent = students.find(s => s.name === student.name)
      return foundStudent?.user_id
    }).filter((id): id is string => Boolean(id)) || []
    setSelectedStudents(studentUserIds)
    
    // Fetch existing schedules from database
    try {
      const { data: existingSchedules, error } = await supabase
        .from('classroom_schedules')
        .select('*')
        .eq('classroom_id', classroom.id)
        .order('day', { ascending: true })
      
      if (error) {
        setSchedules([])
      } else {
        // Convert database schedules to UI format
        const formattedSchedules = (existingSchedules || []).map(schedule => ({
          id: schedule.id,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))
        setSchedules(formattedSchedules)
      }
    } catch {
      setSchedules([])
    }
    
    setShowEditModal(true)
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


  const TimePickerComponent = ({ 
    value, 
    onChange, 
    scheduleId, 
    field 
  }: { 
    value: string
    onChange: (value: string) => void
    scheduleId: string
    field: string
  }) => {
    const pickerId = `${scheduleId}-${field}`
    const isOpen = activeTimePicker === pickerId
    const timePickerRef = useRef<HTMLDivElement>(null)
    
    const currentTime = value || '09:00'
    const [hours, minutes] = currentTime.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
    // const ampmTranslated = parseInt(hours) >= 12 ? t('classrooms.pm') : t('classrooms.am')

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
    }, [isOpen])
    
    const setTime = (newHour: number, newMinute: number, newAmpm: string) => {
      let hour24 = newHour
      if (newAmpm === 'PM' && newHour !== 12) {
        hour24 += 12
      } else if (newAmpm === 'AM' && newHour === 12) {
        hour24 = 0
      }
      
      const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`
      onChange(timeString)
      // Don't close the picker here anymore
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
            className={`absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 ${
              field === 'end_time' ? 'right-0' : 'left-0'
            }`}
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
          <Button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("classrooms.createClassroom")}
          </Button>
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.createClassroom")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowModal(false)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">

            <form id="classroom-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.classroomName")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={String(t("classrooms.enterClassroomName"))}
                  className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.grade")}
                  </Label>
                  <Input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    placeholder={String(t("classrooms.enterGrade"))}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.subject")}
                  </Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => {
                      if (value === 'add-new' && isManager) {
                        setShowInlineSubjectCreate(true)
                      } else {
                        handleInputChange('subject_id', value)
                      }
                    }}
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={String(t("classrooms.selectSubject"))} />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                      {isManager && (
                        <SelectItem value="add-new">
                          <Plus className="w-4 h-4 inline mr-2" />
                          {t("subjects.addSubject")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {showInlineSubjectCreate && (
                    <div className="space-y-2 mt-2">
                      <Input
                        type="text"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder={String(t("subjects.enterSubjectName"))}
                        className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isCreatingSubject}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateSubject()
                          } else if (e.key === 'Escape') {
                            setShowInlineSubjectCreate(false)
                            setNewSubjectName('')
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCreateSubject}
                          disabled={!newSubjectName.trim() || isCreatingSubject}
                          size="sm"
                        >
                          {isCreatingSubject ? t('common.saving') : t('common.create')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowInlineSubjectCreate(false)
                            setNewSubjectName('')
                          }}
                          size="sm"
                          disabled={isCreatingSubject}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hide teacher dropdown for teachers - they can only create for themselves */}
              {userRole !== 'teacher' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.teacher")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={handleTeacherChange}
                    required
                    onOpenChange={(open) => {
                      if (!open) setTeacherSearchQuery('')
                    }}
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={String(t("classrooms.selectTeacher"))} />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={String(t("common.search"))}
                            value={teacherSearchQuery}
                            onChange={(e) => setTeacherSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {teachers.filter(teacher =>
                          teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                        ).map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                        {teachers.filter(teacher =>
                          teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {t("common.noResults")}
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              )}


              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.color")}
                </Label>
                <div className="p-4 bg-gray-50 rounded-lg border border-border">
                  {/* Current Color Display - Shows the selected color */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-white shadow-sm"
                      style={{ backgroundColor: formData.color }}
                    />
                    <div>
                      <Label className="text-sm font-medium text-foreground">{t("classrooms.selectedColor")}</Label>
                      <p className="text-xs text-foreground/60">{colorNames[formData.color] || formData.color}</p>
                    </div>
                  </div>
                  
                  {/* Preset Colors Grid */}
                  <div>
                    <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.presetColors")}</Label>
                    <div className="grid grid-cols-6 gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleInputChange('color', color)}
                          className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  {customColors.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColors")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {customColors.map((color) => (
                          <div key={color} className="relative group">
                            <button
                              type="button"
                              onClick={() => handleInputChange('color', color)}
                              className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomColor(color)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-xs hover:bg-red-600"
                              title={String(t("classrooms.removeColor"))}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Color Picker */}
                  <div className="mt-4">
                    <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColor")}</Label>
                    <div className="flex gap-2">
                      {/* Custom color picker button - only shows color from picker, not from preset */}
                      <button
                        type="button"
                        onClick={openColorPicker}
                        className="w-10 h-10 rounded-lg shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg transform border-2 border-white ring-0 focus:ring-0 focus:outline-none"
                        style={{ backgroundColor: previewColor || '#FFFFFF' }}
                        title={String(t("classrooms.customColor"))}
                      />
                      {/* Hex input field */}
                      <Input
                        type="text"
                        value={customColorInput}
                        onChange={(e) => {
                          const value = e.target.value
                          setCustomColorInput(value)
                          if (isValidHexColor(value)) {
                            handleInputChange('color', value)
                          }
                        }}
                        onBlur={() => {
                          // Reset to current color if invalid
                          if (!isValidHexColor(customColorInput)) {
                            setCustomColorInput(formData.color)
                          } else {
                            // Set preview when user finishes typing a valid hex
                            setPreviewColor(customColorInput)
                          }
                        }}
                        placeholder={String(t("classrooms.enterHexCode"))}
                        className="h-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 font-mono uppercase flex-1"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.classSchedule")}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSchedule}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("classrooms.addSchedule")}
                  </Button>
                </div>
                
                {schedules.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t("classrooms.noSchedulesAdded")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule, index) => (
                      <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-sm font-medium text-foreground/80">
                            {t("classrooms.schedule")} {index + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSchedule(schedule.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.day")}</Label>
                            <Select
                              value={schedule.day}
                              onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                            >
                              <SelectTrigger className="h-9 text-sm bg-white focus:border-primary data-[state=open]:border-primary">
                                <SelectValue>
                                  {schedule.day ? getTranslatedDay(schedule.day) : ''}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="z-[70]">
                                {daysOfWeek.map((day) => {
                                  const translatedDay = getTranslatedDay(day)
                                  return (
                                    <SelectItem key={day} value={day}>
                                      <span>{translatedDay}</span>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.startTime")}</Label>
                              <TimePickerComponent
                                value={schedule.start_time}
                                onChange={(value) => updateSchedule(schedule.id, 'start_time', value)}
                                scheduleId={schedule.id}
                                field="start_time"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.endTime")}</Label>
                              <TimePickerComponent
                                value={schedule.end_time}
                                onChange={(value) => updateSchedule(schedule.id, 'end_time', value)}
                                scheduleId={schedule.id}
                                field="end_time"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Enrollment Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.studentEnrollment")}
                </Label>
                <div className="border border-border rounded-lg bg-gray-50 p-4">
                  {students.length === 0 ? (
                    <div className="text-center py-4">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("classrooms.noStudentsAvailable")}</p>
                    </div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder={String(t("classrooms.searchStudents"))}
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                        {filteredStudents.length === 0 ? (
                          <div className="text-center py-4">
                            <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">{t("classrooms.noStudentsFound")}</p>
                          </div>
                        ) : (
                          filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                          />
                          <div className="flex-1 min-w-0 relative">
                            <div className="flex items-center justify-between">
                              <span
                                className="text-sm font-medium text-gray-900 truncate cursor-default"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setTooltipPosition({
                                    x: rect.right + 10,
                                    y: rect.top
                                  })
                                  setHoveredStudent(student.id)
                                }}
                                onMouseLeave={() => setHoveredStudent(null)}
                              >
                                {student.name}
                              </span>
                              {student.school_name && (
                                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                  {student.school_name}
                                </span>
                              )}
                            </div>
                            {/* Student Tooltip */}
                            {hoveredStudent === student.id && (
                              <div
                                className="fixed z-[90] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px] animate-in fade-in duration-150"
                                style={{
                                  left: `${tooltipPosition.x}px`,
                                  top: `${tooltipPosition.y}px`
                                }}
                              >
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-semibold text-gray-700">{student.name}</span>
                                  </div>
                                  {student.phone && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-gray-500 min-w-[60px]">{t("classrooms.phone")}:</span>
                                      <span className="text-gray-900">{student.phone}</span>
                                    </div>
                                  )}
                                  {student.email && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-gray-500 min-w-[60px]">{t("classrooms.email")}:</span>
                                      <span className="text-gray-900 break-all">{student.email}</span>
                                    </div>
                                  )}
                                  {student.family_name && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-gray-500 min-w-[60px]">{t("classrooms.family")}:</span>
                                      <span className="text-gray-900">{student.family_name}</span>
                                    </div>
                                  )}
                                  {student.parent_names && student.parent_names.length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-gray-500 min-w-[60px]">{t("classrooms.parents")}:</span>
                                      <span className="text-gray-900">{student.parent_names.join(', ')}</span>
                                    </div>
                                  )}
                                  {!student.phone && !student.email && !student.family_name && (
                                    <div className="text-gray-400 italic text-xs">
                                      {t("classrooms.noAdditionalInfo")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                          ))
                        )}
                      </div>
                    </>
                  )}
                  
                  {selectedStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        {selectedStudents.length} {selectedStudents.length === 1 ? t("classrooms.studentSelected") : t("classrooms.studentsSelected")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.notes")}
                </Label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                  placeholder={String(t("classrooms.additionalNotes"))}
                />
              </div>
            </form>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                form="classroom-form"
                className="flex-1"
                disabled={!formData.name || !formData.teacher_id || isCreating}
              >
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isCreating ? t("common.creating") : t("classrooms.createClassroom")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Classroom Confirmation Modal */}
      {showDeleteModal && classroomToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.deleteConfirmTitle")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDeleteModal(false)
                  setClassroomToDelete(null)
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                {t("classrooms.deleteConfirmMessage")}
              </p>
            </div>

            <div className="flex items-center gap-3 p-6 pt-0">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setClassroomToDelete(null)
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button 
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {t("classrooms.deleteConfirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Classroom Modal */}
      {showEditModal && editingClassroom && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg border border-border w-full max-w-3xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.editClassroom")}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowEditModal(false)
                  setEditingClassroom(null)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="edit-classroom-form" onSubmit={handleEditSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.classroomName")} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={String(t("classrooms.enterClassroomName"))}
                    className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.grade")}
                    </Label>
                    <Input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      placeholder={String(t("classrooms.enterGrade"))}
                      className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.subject")}
                    </Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) => {
                        if (value === 'add-new' && isManager) {
                          setShowInlineSubjectCreate(true)
                        } else {
                          setFormData({ ...formData, subject_id: value })
                        }
                      }}
                    >
                      <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                        <SelectValue placeholder={String(t("classrooms.selectSubject"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        {subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                        {isManager && (
                          <SelectItem value="add-new">
                            <Plus className="w-4 h-4 inline mr-2" />
                            {t("subjects.addSubject")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    
                    {showInlineSubjectCreate && (
                      <div className="space-y-2 mt-2">
                        <Input
                          type="text"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          placeholder={String(t("subjects.enterSubjectName"))}
                          className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                          disabled={isCreatingSubject}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateSubject()
                            } else if (e.key === 'Escape') {
                              setShowInlineSubjectCreate(false)
                              setNewSubjectName('')
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleCreateSubject}
                            disabled={!newSubjectName.trim() || isCreatingSubject}
                            size="sm"
                          >
                            {isCreatingSubject ? t('common.saving') : t('common.create')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowInlineSubjectCreate(false)
                              setNewSubjectName('')
                            }}
                            size="sm"
                            disabled={isCreatingSubject}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hide teacher dropdown for teachers - they can only edit their own classrooms */}
                {userRole !== 'teacher' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.teacher")} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.teacher_id}
                      onValueChange={(value) => {
                        const selectedTeacher = teachers.find(t => t.user_id === value)
                        setFormData({
                          ...formData,
                          teacher_id: value,
                          teacher_name: selectedTeacher?.name || ''
                        })
                      }}
                      required
                      onOpenChange={(open) => {
                        if (!open) setTeacherSearchQuery('')
                      }}
                    >
                      <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                        <SelectValue placeholder={String(t("classrooms.selectTeacher"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={String(t("common.search"))}
                              value={teacherSearchQuery}
                              onChange={(e) => setTeacherSearchQuery(e.target.value)}
                              className="pl-8 h-8"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {teachers.filter(teacher =>
                            teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                          ).map((teacher) => (
                            <SelectItem key={teacher.user_id} value={teacher.user_id}>
                              {teacher.name}
                            </SelectItem>
                          ))}
                          {teachers.filter(teacher =>
                            teacher.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              {t("common.noResults")}
                            </div>
                          )}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                )}


                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.color")}
                  </Label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-border">
                    {/* Current Color Display */}
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg border-2 border-white shadow-sm"
                        style={{ backgroundColor: formData.color }}
                      />
                      <div>
                        <Label className="text-sm font-medium text-foreground">{t("classrooms.selectedColor")}</Label>
                        <p className="text-xs text-foreground/60">{formData.color}</p>
                      </div>
                    </div>
                    
                    {/* Preset Colors Grid */}
                    <div>
                      <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.presetColors")}</Label>
                      <div className="grid grid-cols-6 gap-2">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    {customColors.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColors")}</Label>
                        <div className="flex flex-wrap gap-2">
                          {customColors.map((color) => (
                            <div key={color} className="relative group">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, color })}
                                className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                              <button
                                type="button"
                                onClick={() => removeCustomColor(color)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-xs hover:bg-red-600"
                                title={String(t("classrooms.removeColor"))}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Color Picker */}
                    <div className="mt-4">
                      <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColor")}</Label>
                      <div className="flex gap-2">
                        {/* Custom color picker button */}
                        <button
                          type="button"
                          onClick={openColorPicker}
                          className="w-10 h-10 rounded-lg shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg transform border-2 border-white ring-0 focus:ring-0 focus:outline-none"
                          style={{ backgroundColor: formData.color }}
                          title={String(t("classrooms.customColor"))}
                        />
                        {/* Hex input field */}
                        <Input
                          type="text"
                          value={customColorInput}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          onBlur={() => {
                            // Reset to current color if invalid
                            if (!isValidHexColor(customColorInput)) {
                              setCustomColorInput(formData.color)
                            }
                          }}
                          placeholder={String(t("classrooms.enterHexCode"))}
                          className="h-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 font-mono uppercase flex-1"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-foreground/80">
                      {t("classrooms.classSchedule")}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addSchedule}
                      className="h-8 px-2 text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t("classrooms.addSchedule")}
                    </Button>
                  </div>
                  
                  {schedules.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">{t("classrooms.noSchedulesAdded")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedules.map((schedule, index) => (
                        <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-medium text-foreground/80">
                              {t("classrooms.schedule")} {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSchedule(schedule.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-gray-500" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.day")}</Label>
                              <Select
                                value={schedule.day}
                                onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                              >
                                <SelectTrigger className="h-9 text-sm bg-white focus:border-primary data-[state=open]:border-primary">
                                  <SelectValue>
                                    {schedule.day ? getTranslatedDay(schedule.day) : ''}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-[70]">
                                  {daysOfWeek.map((day) => {
                                    const translatedDay = getTranslatedDay(day)
                                    return (
                                      <SelectItem key={day} value={day}>
                                        <span>{translatedDay}</span>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.startTime")}</Label>
                                <TimePickerComponent
                                  value={schedule.start_time}
                                  onChange={(value) => updateSchedule(schedule.id, 'start_time', value)}
                                  scheduleId={schedule.id}
                                  field="start_time"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.endTime")}</Label>
                                <TimePickerComponent
                                  value={schedule.end_time}
                                  onChange={(value) => updateSchedule(schedule.id, 'end_time', value)}
                                  scheduleId={schedule.id}
                                  field="end_time"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.notes")}
                  </Label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={String(t("classrooms.additionalNotes"))}
                  />
                </div>

                {/* Student Enrollment Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("classrooms.studentEnrollment")}
                  </Label>
                  <div className="border border-border rounded-lg bg-gray-50 p-4">
                    {students.length === 0 ? (
                      <div className="text-center py-4">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t("classrooms.noStudentsAvailable")}</p>
                      </div>
                    ) : (
                      <>
                        {/* Search Bar */}
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            type="text"
                            placeholder={String(t("classrooms.searchStudents"))}
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                          />
                        </div>
                        
                        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                          {filteredStudents.length === 0 ? (
                            <div className="text-center py-4">
                              <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">{t("classrooms.noStudentsFound")}</p>
                            </div>
                          ) : (
                            filteredStudents.map((student) => (
                              <label
                                key={student.id}
                                className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.includes(student.user_id)}
                                  onChange={() => {
                                    if (selectedStudents.includes(student.user_id)) {
                                      setSelectedStudents(selectedStudents.filter(id => id !== student.user_id))
                                    } else {
                                      setSelectedStudents([...selectedStudents, student.user_id])
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                />
                                <div className="flex-1 min-w-0 relative">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="text-sm font-medium text-gray-900 truncate cursor-default"
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setTooltipPosition({
                                          x: rect.right + 10,
                                          y: rect.top
                                        })
                                        setHoveredStudent(student.id)
                                      }}
                                      onMouseLeave={() => setHoveredStudent(null)}
                                    >
                                      {student.name}
                                    </span>
                                    {student.school_name && (
                                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                        {student.school_name}
                                      </span>
                                    )}
                                  </div>
                                  {/* Student Tooltip */}
                                  {hoveredStudent === student.id && (
                                    <div
                                      className="fixed z-[90] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px] animate-in fade-in duration-150"
                                      style={{
                                        left: `${tooltipPosition.x}px`,
                                        top: `${tooltipPosition.y}px`
                                      }}
                                    >
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="font-semibold text-gray-700">{student.name}</span>
                                        </div>
                                        {student.phone && (
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-500 min-w-[60px]">{t("classrooms.phone")}:</span>
                                            <span className="text-gray-900">{student.phone}</span>
                                          </div>
                                        )}
                                        {student.email && (
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-500 min-w-[60px]">{t("classrooms.email")}:</span>
                                            <span className="text-gray-900 break-all">{student.email}</span>
                                          </div>
                                        )}
                                        {student.family_name && (
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-500 min-w-[60px]">{t("classrooms.family")}:</span>
                                            <span className="text-gray-900">{student.family_name}</span>
                                          </div>
                                        )}
                                        {student.parent_names && student.parent_names.length > 0 && (
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-500 min-w-[60px]">{t("classrooms.parents")}:</span>
                                            <span className="text-gray-900">{student.parent_names.join(', ')}</span>
                                          </div>
                                        )}
                                        {!student.phone && !student.email && !student.family_name && (
                                          <div className="text-gray-400 italic text-xs">
                                            {t("classrooms.noAdditionalInfo")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}
                    
                    {selectedStudents.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          {selectedStudents.length} {selectedStudents.length === 1 ? t("classrooms.studentSelected") : t("classrooms.studentsSelected")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingClassroom(null)
                              setSchedules([])
                  setSelectedStudents([])
                  setActiveTimePicker(null)
                  setStudentSearchQuery('')
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                form="edit-classroom-form"
                className="flex-1"
                disabled={!formData.name || !formData.teacher_id || isSaving}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSaving ? t("common.saving") : t("classrooms.saveChanges")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Details Modal */}
      {showDetailsModal && selectedClassroom && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-6xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded-full" 
                  style={{ backgroundColor: selectedClassroom.color || '#6B7280' }}
                />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedClassroom.name}</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedClassroom(null)
                }}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Classroom Info & Enrollment */}
                <div className="space-y-6">
                  {/* Classroom Information Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <School className="w-5 h-5" />
                      {t("classrooms.classroomInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.grade")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.grade || t("classrooms.notSpecified")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.subject")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.subject_name || t("classrooms.notSpecified")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.teacher")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroom.teacher_name || t("classrooms.notAssigned")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.schedule")}</p>
                          <div className="font-medium text-gray-900">
                            {selectedClassroom.schedules && selectedClassroom.schedules.length > 0 ? (
                              selectedClassroom.schedules.map((schedule, index) => {
                                const dayName = getTranslatedDay(schedule.day)
                                const startTime = formatTime(schedule.start_time)
                                const endTime = formatTime(schedule.end_time)
                                return (
                                  <div key={index}>
                                    {dayName} {startTime} - {endTime}
                                  </div>
                                )
                              })
                            ) : (
                              <span>{t("classrooms.notSpecified")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Notes Card */}
                  {selectedClassroom.notes && (
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("classrooms.notes")}</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedClassroom.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Enrollment */}
                <div className="space-y-6">
                  {/* Student Enrollment Card */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("classrooms.studentEnrollment")} ({selectedClassroom.student_count || 0})
                    </h3>
                    {!selectedClassroom.enrolled_students || selectedClassroom.enrolled_students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("classrooms.noStudentsEnrolled")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClassroom.enrolled_students.map((student, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{student.name}</p>
                              </div>
                            </div>
                            {student.school_name && (
                              <div className="text-sm text-gray-500">
                                {student.school_name}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("classrooms.created")}: {new Date(selectedClassroom.created_at).toLocaleDateString()}
                {selectedClassroom.updated_at !== selectedClassroom.created_at && (
                  <span className="ml-4">
                    {t("classrooms.updated")}: {new Date(selectedClassroom.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleEditClick(selectedClassroom)
                  }}
                >
                  <Edit className="w-4 h-4" />
                  {t("classrooms.editClassroom")}
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedClassroom(null)
                  }}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Color Picker Modal */}
      {showColorPicker && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]"
          onClick={() => setShowColorPicker(false)}
        >
          <div
            className="bg-white rounded-xl border border-border w-full max-w-md mx-4 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("classrooms.customColor")}</h2>
              <button
                onClick={() => setShowColorPicker(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Color Picker Content */}
            <div className="p-6 space-y-6">
              {/* Current Color Preview */}
              {!pickerStartedFromPreset && (
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-xl border-4 border-white shadow-lg"
                    style={{ backgroundColor: hslToHex(pickerHue, pickerSaturation, pickerLightness) }}
                  />
                  <div>
                    <Label className="text-sm font-medium text-gray-900">{t("classrooms.selectedColorLabel")}</Label>
                    <p className="text-xl sm:text-2xl font-mono font-bold text-gray-700">{hslToHex(pickerHue, pickerSaturation, pickerLightness)}</p>
                  </div>
                </div>
              )}

              {/* Color Sheet - 2D Saturation/Lightness Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{t("classrooms.colorSheet")}</Label>
                <div
                  className="relative w-full h-48 rounded-lg overflow-hidden cursor-crosshair border-2 border-gray-200"
                  style={{
                    background: `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, hsl(${pickerHue}, 100%, 50%))`
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    const saturation = Math.round((x / rect.width) * 100)
                    const lightness = Math.round(100 - (y / rect.height) * 100)
                    setPickerSaturation(saturation)
                    setPickerLightness(lightness)
                    setPickerStartedFromPreset(false)
                  }}
                >
                  {/* Cursor indicator */}
                  <div
                    className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none"
                    style={{
                      left: `calc(${pickerSaturation}% - 8px)`,
                      top: `calc(${100 - pickerLightness}% - 8px)`
                    }}
                  />
                </div>
              </div>

              {/* Hue Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">{t("classrooms.hue")}</Label>
                  <span className="text-sm text-gray-500">{pickerHue}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={pickerHue}
                  onChange={(e) => {
                    setPickerHue(Number(e.target.value))
                    setPickerStartedFromPreset(false)
                  }}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                  }}
                />
              </div>

              {/* Hex Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">{t("classrooms.hexCode")}</Label>
                <Input
                  type="text"
                  value={customColorInput}
                  onChange={(e) => {
                    const value = e.target.value.trim()
                    setCustomColorInput(value)
                    if (isValidHexColor(value)) {
                      const hsl = hexToHsl(value)
                      setPickerHue(hsl.h)
                      setPickerSaturation(hsl.s)
                      setPickerLightness(hsl.l)
                      setPickerStartedFromPreset(false)
                    }
                  }}
                  placeholder="#000000"
                  className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowColorPicker(false)}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={applyPickerColor}
                className="flex-1 bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white hover:shadow-lg transition-all"
              >
                {t("classrooms.applyColor")}
              </Button>
            </div>
          </div>
        </div>
      )}

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
          onConfirm={handleScheduleUpdateConfirm}
        />
      )}
    </div>
  )
}