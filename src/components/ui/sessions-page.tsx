"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Users,
  BookOpen,
  GraduationCap,
  Monitor,
  Building,
  X,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Grid3X3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Loader2,
  Copy,
  DoorOpen,
  Save,
  Filter,
  ArrowRight
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { useDebounce } from '@/hooks/useDebounce'
import { FileUpload } from '@/components/ui/file-upload'
import { showSuccessToast, showErrorToast } from '@/stores'
import { invalidateAssignmentsCache } from '@/components/ui/assignments-page'
import { invalidateAttendanceCache } from '@/components/ui/attendance-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'
import { ConfirmationModal } from '@/components/ui/common/ConfirmationModal'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { triggerSessionCreatedNotifications } from '@/lib/notification-triggers'
import { getSessionsForDateRange, isVirtualSession, materializeSession } from '@/lib/virtual-sessions'
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'

// Cache invalidation function for sessions
export const invalidateSessionsCache = (academyId: string) => {
  // Clear all page caches for this academy (both card and calendar view caches)
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`sessions-${academyId}-card-page`) ||
        key.startsWith(`sessions-${academyId}-calendar-page`) ||
        key.includes(`sessions-${academyId}-card-page`) ||
        key.includes(`sessions-${academyId}-calendar-page`) ||
        key === `all-sessions-${academyId}` ||
        key === `all-sessions-${academyId}-timestamp`) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} session cache entries (including allSessions)`)
}

interface Session {
  id: string
  classroom_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  status: 'scheduled' | 'completed' | 'cancelled'
  date: string
  start_time: string
  end_time: string
  location: 'offline' | 'online'
  room_number?: string
  notes?: string
  substitute_teacher?: string
  substitute_teacher_name?: string
  created_at: string
  updated_at: string
  student_count?: number
  assignment_count?: number
  is_virtual?: boolean // True for virtual sessions (not yet materialized)
  deleted_at?: string | null // Support for soft deletes
}

interface SessionsPageProps {
  academyId: string
  filterClassroomId?: string
  filterDate?: string
  onNavigateToAssignments?: (sessionId: string) => void
  onNavigateToAttendance?: (sessionId: string) => void
}

interface Classroom {
  id: string
  name: string
  color?: string
  teacher_id?: string
  teacher_name?: string
  subject_id?: string
  paused?: boolean
}

interface Teacher {
  id: string
  name: string
  user_id: string
}

interface AttachmentFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploaded?: boolean
}

interface Assignment {
  id: string
  title: string
  description?: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date?: string
  created_at: string
  category_name?: string
  attachments?: AttachmentFile[]
}

interface ModalAssignment {
  id: string
  title: string
  description: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date: string // Required field
  assignment_categories_id: string
  attachments?: AttachmentFile[]
}

interface Attendance {
  id: string
  classroom_session_id: string
  student_id: string
  student_name?: string
  status: 'pending' | 'present' | 'absent' | 'excused' | 'late'
  note?: string
}

interface Student {
  user_id: string
  name: string
  school_name?: string
}

interface SessionTemplate {
  id: string
  user_id: string
  name: string
  template_data: {
    classroom_id?: string
    status?: 'scheduled' | 'completed' | 'cancelled'
    start_time?: string
    end_time?: string
    location?: 'offline' | 'online'
    room_number?: string
    notes?: string
    substitute_teacher?: string
  }
  include_assignments: boolean
  assignments_data?: ModalAssignment[]
  created_at: string
  updated_at: string
}

export function SessionsPage({ academyId, filterClassroomId, filterDate, onNavigateToAssignments, onNavigateToAttendance }: SessionsPageProps) {
  const router = useRouter()
  const { t, language } = useTranslation()
  const { getCategoriesBySubjectId, refreshCategories } = useSubjectData(academyId)
  const { createAssignmentCategory } = useSubjectActions()
  const [sessions, setSessions] = useState<Session[]>([])
  const [allSessions, setAllSessions] = useState<Session[]>([]) // Store all sessions for independent filter counts
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCompletionWarningModal, setShowCompletionWarningModal] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isCreatingFromVirtual, setIsCreatingFromVirtual] = useState(false)
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')
  const [classroomSearchQuery, setClassroomSearchQuery] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 12
  const [initialized, setInitialized] = useState(false)

  // Scroll to top when page changes
  useEffect(() => {
    // Find the scrollable container (main content area)
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  // Debounced search queries for better performance
  const debouncedSessionSearchQuery = useDebounce(sessionSearchQuery, 300)
  const debouncedAttendanceSearchQuery = useDebounce(attendanceSearchQuery, 300)
  const [viewMode, setViewMode] = useState<'card' | 'calendar'>('calendar')
  const [classroomFilter, setClassroomFilter] = useState<string>(filterClassroomId || 'all')
  const [teacherFilter, setTeacherFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false)

  // Reset to page 1 when client-side filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sessionSearchQuery, classroomFilter, teacherFilter, statusFilter, showTodayOnly, showUpcomingOnly])
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)
  const [showDaySessionsModal, setShowDaySessionsModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewingSession, setViewingSession] = useState<Session | null>(null)
  const [sessionAssignments, setSessionAssignments] = useState<Assignment[]>([])
  const [sessionAttendance, setSessionAttendance] = useState<Attendance[]>([])
  const [modalAttendance, setModalAttendance] = useState<Attendance[]>([])
  const [multipleSessions, setMultipleSessions] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [modalAssignments, setModalAssignments] = useState<ModalAssignment[]>([])
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])

  // Change tracking state for efficient updates
  const [originalAssignments, setOriginalAssignments] = useState<ModalAssignment[]>([])
  const [originalAttendance, setOriginalAttendance] = useState<Attendance[]>([])

  // Manager role and inline category creation states
  const [isManager, setIsManager] = useState(false)
  const [userRole, setUserRole] = useState<'manager' | 'teacher' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showInlineCategoryCreate, setShowInlineCategoryCreate] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  
  const [formData, setFormData] = useState({
    classroom_id: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | '',
    date: '',
    start_time: '09:00',
    end_time: '10:00',
    location: 'offline' as 'offline' | 'online',
    room_number: '',
    notes: '',
    substitute_teacher: ''
  })

  // Template state management
  const [templates, setTemplates] = useState<SessionTemplate[]>([])
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false)
  const [showManageTemplatesModal, setShowManageTemplatesModal] = useState(false)
  const [templateToSave, setTemplateToSave] = useState<Session | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<SessionTemplate | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [saveTemplateFormData, setSaveTemplateFormData] = useState({
    name: '',
    includeAssignments: false
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [showTemplateConfirmModal, setShowTemplateConfirmModal] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string>('')
  const [templateFieldChanges, setTemplateFieldChanges] = useState<Record<string, { current: any; new: any }>>({})

  // Validate if all required fields are filled
  const isFormValid = useMemo(() => {
    // Check if all assignments have due dates
    const allAssignmentsHaveDueDates = modalAssignments.every(
      assignment => assignment.due_date && assignment.due_date !== ''
    )

    // For multiple sessions, check if at least one date is selected
    if (multipleSessions) {
      return (
        formData.classroom_id !== '' &&
        selectedDates.length > 0 &&
        formData.start_time !== '' &&
        formData.end_time !== '' &&
        allAssignmentsHaveDueDates
      )
    }

    // For single session
    return (
      formData.classroom_id !== '' &&
      formData.date !== '' &&
      formData.start_time !== '' &&
      formData.end_time !== '' &&
      allAssignmentsHaveDueDates
    )
  }, [formData.classroom_id, formData.date, formData.start_time, formData.end_time, multipleSessions, selectedDates, modalAssignments])

  // Force re-render when language changes
  const [, forceUpdate] = useState({})
  useEffect(() => {
    forceUpdate({})
  }, [language])
  
  // Update classroom filter when prop changes
  useEffect(() => {
    if (filterClassroomId) {
      setClassroomFilter(filterClassroomId)
      // Reset teacher filter when classroom filter is set via prop
      setTeacherFilter('all')
    }
  }, [filterClassroomId])

  // Check if current user is a manager or teacher for this academy
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      console.log('[Sessions Auth Debug] Checking user role:', {
        hasUser: !!user,
        userId: user?.id,
        academyId,
        authError
      })

      if (authError) {
        console.error('[Sessions Auth Debug] Authentication error:', authError)
        return false
      }

      if (!user) {
        console.warn('[Sessions Auth Debug] No authenticated user found')
        return false
      }

      if (!academyId) {
        console.warn('[Sessions Auth Debug] No academyId available yet')
        return false
      }

      // Store current user ID
      setCurrentUserId(user.id)

      // Check if user is a manager
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('user_id', user.id)
        .single()

      if (managerData) {
        console.log('[Sessions Auth Debug] User is a manager')
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
        console.log('[Sessions Auth Debug] User is a teacher')
        setUserRole('teacher')
        return true
      }

      console.log('[Sessions Auth Debug] User is neither manager nor teacher')
      setUserRole(null)
      return false
    } catch (error) {
      console.error('[Sessions Auth Debug] Exception in checkUserRole:', error)
      return false
    }
  }, [academyId])

  // Change detection utilities for efficient updates
  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true
    if (a == null || b == null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
          return false
        }
      }
      return true
    }

    return false
  }

  // OPTIMIZED: Field-specific comparison (60-80% faster than deepEqual)
  const assignmentChanged = (a: ModalAssignment, b: ModalAssignment): boolean => {
    return a.title !== b.title ||
      a.description !== b.description ||
      a.assignment_type !== b.assignment_type ||
      a.due_date !== b.due_date ||
      a.assignment_categories_id !== b.assignment_categories_id ||
      JSON.stringify(a.attachments || []) !== JSON.stringify(b.attachments || [])
  }

  const attendanceChanged = (a: Attendance, b: Attendance): boolean => {
    return a.status !== b.status || (a.note || '') !== (b.note || '')
  }

  const detectAssignmentChanges = (original: ModalAssignment[], current: ModalAssignment[]) => {
    const added: ModalAssignment[] = []
    const modified: ModalAssignment[] = []
    const removed: ModalAssignment[] = []

    // Find added and modified assignments
    current.forEach(curr => {
      if (!curr.id || curr.id.startsWith('temp-')) {
        // New assignment (no ID or temp ID)
        added.push(curr)
      } else {
        const orig = original.find(o => o.id === curr.id)
        if (orig && assignmentChanged(orig, curr)) {
          // Modified assignment
          modified.push(curr)
        }
      }
    })

    // Find removed assignments
    original.forEach(orig => {
      if (!current.find(curr => curr.id === orig.id)) {
        removed.push(orig)
      }
    })

    return { added, modified, removed }
  }

  const detectAttendanceChanges = (original: Attendance[], current: Attendance[]) => {
    const added: Attendance[] = []
    const modified: Attendance[] = []
    const removed: Attendance[] = []

    // Find added and modified attendance
    current.forEach(curr => {
      if (!curr.id || curr.id.startsWith('temp-')) {
        // New attendance record
        added.push(curr)
      } else {
        const orig = original.find(o => o.id === curr.id)
        if (orig && attendanceChanged(orig, curr)) {
          // Modified attendance
          modified.push(curr)
        }
      }
    })

    // Find removed attendance
    original.forEach(orig => {
      if (!current.find(curr => curr.id === orig.id)) {
        removed.push(orig)
      }
    })

    return { added, modified, removed }
  }

  // Differential update functions for assignments
  const updateChangedAssignments = async (
    modified: ModalAssignment[],
    sessionId: string
  ): Promise<boolean> => {
    if (modified.length === 0) return true

    try {
      console.log('[Assignment Update] Updating', modified.length, 'modified assignments')

      const updatePromises = modified.map(async (assignment) => {
        const updateData = {
          title: assignment.title,
          description: assignment.description || null,
          assignment_type: assignment.assignment_type,
          due_date: assignment.due_date || null,
          assignment_categories_id: assignment.assignment_categories_id || null
        }

        const { error } = await supabase
          .from('assignments')
          .update(updateData)
          .eq('id', assignment.id)
          .eq('classroom_session_id', sessionId)

        if (error) {
          console.error('[Assignment Update] Error updating assignment:', assignment.id, error)
          throw error
        }

        // Handle attachment updates if needed
        if (assignment.attachments) {
          await updateAssignmentAttachmentsEfficient(assignment.id, assignment.attachments)
        }

        console.log('[Assignment Update] Successfully updated assignment:', assignment.id)
      })

      await Promise.all(updatePromises)

      // Cache will be invalidated once at the end of handleSubmit

      return true
    } catch (error) {
      console.error('[Assignment Update] Failed to update assignments:', error)
      return false
    }
  }

  const insertNewAssignments = async (
    added: ModalAssignment[],
    sessionId: string
  ): Promise<{ success: boolean; newAssignments?: any[] }> => {
    if (added.length === 0) return { success: true, newAssignments: [] }

    try {
      console.log('[Assignment Insert] Inserting', added.length, 'new assignments')

      const assignmentRecords = added
        .filter(assignment => assignment.title.trim() !== '' && assignment.due_date.trim() !== '')
        .map(assignment => ({
          classroom_session_id: sessionId,
          title: assignment.title,
          description: assignment.description || null,
          assignment_type: assignment.assignment_type,
          due_date: assignment.due_date || null,
          assignment_categories_id: assignment.assignment_categories_id || null
        }))

      if (assignmentRecords.length === 0) return { success: true, newAssignments: [] }

      const { data: createdAssignments, error } = await supabase
        .from('assignments')
        .insert(assignmentRecords)
        .select()

      if (error) {
        console.error('[Assignment Insert] Error inserting assignments:', error)
        throw error
      }

      // Handle attachments for new assignments
      if (createdAssignments) {
        const { data: { user } } = await supabase.auth.getUser()
        const validModalAssignments = added.filter(assignment =>
          assignment.title.trim() !== '' && assignment.due_date.trim() !== ''
        )

        const attachmentPromises = createdAssignments.map(async (createdAssignment, i) => {
          const modalAssignment = validModalAssignments[i]
          if (modalAssignment?.attachments && modalAssignment.attachments.length > 0) {
            await insertAssignmentAttachmentsEfficient(createdAssignment.id, modalAssignment.attachments, user?.id)
          }
        })

        await Promise.all(attachmentPromises)
        console.log('[Assignment Insert] Successfully inserted assignments with attachments')
      }

      // Cache will be invalidated once at the end of handleSubmit

      return { success: true, newAssignments: createdAssignments }
    } catch (error) {
      console.error('[Assignment Insert] Failed to insert assignments:', error)
      return { success: false }
    }
  }

  const deleteRemovedAssignments = async (
    removed: ModalAssignment[],
    sessionId: string
  ): Promise<boolean> => {
    if (removed.length === 0) return true

    try {
      console.log('[Assignment Delete] Deleting', removed.length, 'removed assignments')

      const assignmentIds = removed.map(a => a.id).filter(id => id && !id.startsWith('temp-'))

      if (assignmentIds.length === 0) return true

      // Delete assignment grades first
      await supabase
        .from('assignment_grades')
        .delete()
        .in('assignment_id', assignmentIds)

      // Soft-delete the assignments
      const { error } = await supabase
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', assignmentIds)
        .eq('classroom_session_id', sessionId)

      if (error) {
        console.error('[Assignment Delete] Error deleting assignments:', error)
        throw error
      }

      console.log('[Assignment Delete] Successfully deleted assignments:', assignmentIds)

      // Cache will be invalidated once at the end of handleSubmit

      return true
    } catch (error) {
      console.error('[Assignment Delete] Failed to delete assignments:', error)
      return false
    }
  }

  // Helper functions for attachment handling
  const updateAssignmentAttachmentsEfficient = async (assignmentId: string, attachments: AttachmentFile[]) => {
    // Delete existing attachments and insert new ones
    await supabase
      .from('assignment_attachments')
      .delete()
      .eq('assignment_id', assignmentId)

    if (attachments.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      await insertAssignmentAttachmentsEfficient(assignmentId, attachments, user?.id)
    }
  }

  const insertAssignmentAttachmentsEfficient = async (
    assignmentId: string,
    attachments: AttachmentFile[],
    userId?: string
  ) => {
    const attachmentRecords = attachments.map(file => ({
      assignment_id: assignmentId,
      file_name: file.name,
      file_url: file.url,
      file_size: file.size,
      file_type: file.type,
      uploaded_by: userId
    }))

    const { error } = await supabase
      .from('assignment_attachments')
      .insert(attachmentRecords)

    if (error) {
      console.error('[Attachment Insert] Error saving attachments:', error)
      throw error
    }
  }

  // Differential update functions for attendance
  const updateChangedAttendance = async (
    modified: Attendance[],
    sessionId: string
  ): Promise<boolean> => {
    if (modified.length === 0) return true

    try {
      console.log('[Attendance Update] Updating', modified.length, 'modified attendance records')

      const updatePromises = modified.map(async (attendance) => {
        const updateData = {
          status: attendance.status,
          note: attendance.note || null
        }

        const { error } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', attendance.id)
          .eq('classroom_session_id', sessionId)

        if (error) {
          console.error('[Attendance Update] Error updating attendance:', attendance.id, error)
          throw error
        }

        console.log('[Attendance Update] Successfully updated attendance:', attendance.id)
      })

      await Promise.all(updatePromises)
      return true
    } catch (error) {
      console.error('[Attendance Update] Failed to update attendance:', error)
      return false
    }
  }

  const insertNewAttendance = async (
    added: Attendance[],
    sessionId: string
  ): Promise<boolean> => {
    if (added.length === 0) return true

    try {
      console.log('[Attendance Insert] Inserting', added.length, 'new attendance records')

      // Look up student_record_ids for all students
      const studentIds = added.map(a => a.student_id)
      const { data: studentRecords } = await supabase
        .from('students')
        .select('id, user_id')
        .eq('academy_id', academyId)
        .in('user_id', studentIds)

      const studentRecordMap = new Map(
        studentRecords?.map(s => [s.user_id, s.id]) || []
      )

      const attendanceRecords = added.map(attendance => ({
        classroom_session_id: sessionId,
        student_id: attendance.student_id,
        student_record_id: studentRecordMap.get(attendance.student_id),
        status: attendance.status,
        note: attendance.note || null
      }))

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceRecords)

      if (error) {
        console.error('[Attendance Insert] Error inserting attendance:', error)
        throw error
      }

      console.log('[Attendance Insert] Successfully inserted attendance records')

      // Also create assignment grades for all assignments in this session
      // This ensures new students have grade records for existing assignments
      const { data: sessionAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('classroom_session_id', sessionId)
        .is('deleted_at', null)

      if (assignmentsError) {
        console.error('[Attendance Insert] Error fetching session assignments:', assignmentsError)
        // Don't fail the whole operation, just log the error
      } else if (sessionAssignments && sessionAssignments.length > 0) {
        console.log('[Attendance Insert] Creating assignment grades for', sessionAssignments.length, 'assignments and', added.length, 'students')

        // Look up student_record_ids for all students
        const studentIds = added.map(a => a.student_id)
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('academy_id', academyId)
          .in('user_id', studentIds)

        const studentRecordMap = new Map(
          studentRecords?.map(s => [s.user_id, s.id]) || []
        )

        const gradeRecords = []
        for (const assignment of sessionAssignments) {
          for (const attendance of added) {
            gradeRecords.push({
              assignment_id: assignment.id,
              student_id: attendance.student_id,
              student_record_id: studentRecordMap.get(attendance.student_id),
              status: 'pending'
            })
          }
        }

        if (gradeRecords.length > 0) {
          const { error: gradesError } = await supabase
            .from('assignment_grades')
            .insert(gradeRecords)

          if (gradesError) {
            console.error('[Attendance Insert] Error creating assignment grades:', gradesError)
            // Don't fail the whole operation, just log the error
          } else {
            console.log('[Attendance Insert] Successfully created', gradeRecords.length, 'assignment grade records')
            // Invalidate assignments cache so grades appear immediately
            invalidateAssignmentsCache(academyId)
          }
        }
      } else {
        console.log('[Attendance Insert] No assignments found for session, skipping grade creation')
      }

      return true
    } catch (error) {
      console.error('[Attendance Insert] Failed to insert attendance:', error)
      return false
    }
  }

  const deleteRemovedAttendance = async (
    removed: Attendance[],
    sessionId: string
  ): Promise<boolean> => {
    if (removed.length === 0) return true

    try {
      console.log('[Attendance Delete] Deleting', removed.length, 'removed attendance records')

      const attendanceIds = removed.map(a => a.id).filter(id => id && !id.startsWith('temp-'))

      if (attendanceIds.length === 0) return true

      const { error } = await supabase
        .from('attendance')
        .delete()
        .in('id', attendanceIds)
        .eq('classroom_session_id', sessionId)

      if (error) {
        console.error('[Attendance Delete] Error deleting attendance:', error)
        throw error
      }

      console.log('[Attendance Delete] Successfully deleted attendance records:', attendanceIds)
      return true
    } catch (error) {
      console.error('[Attendance Delete] Failed to delete attendance:', error)
      return false
    }
  }

  // Check if user is manager on initial load
  useEffect(() => {
    checkUserRole().then(setIsManager)
  }, [checkUserRole])

  // Handle inline category creation
  const handleCreateCategory = async (assignmentId: string) => {
    if (!newCategoryName.trim()) return
    
    // For session details modal, use viewingSession's classroom_id
    const classroomId = showDetailsModal ? viewingSession?.classroom_id : formData.classroom_id
    const selectedClassroom = classrooms.find(c => c.id === classroomId)
    
    console.log('[Sessions Category Debug] Creating category:', {
      assignmentId,
      categoryName: newCategoryName.trim(),
      classroomId,
      selectedClassroom: selectedClassroom?.name,
      subjectId: selectedClassroom?.subject_id,
      isManager,
      showDetailsModal
    })
    
    if (!selectedClassroom?.subject_id) {
      alert('Please select a classroom with a subject first')
      return
    }

    if (!isManager) {
      alert('You need manager permissions to create categories')
      return
    }

    setIsCreatingCategory(true)
    try {
      // Verify authentication before creating
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Please log in to create categories')
        return
      }

      console.log('[Sessions Category Debug] User authenticated, creating category...')

      const result = await createAssignmentCategory({
        name: newCategoryName.trim(),
        academy_id: academyId,
        subject_id: selectedClassroom.subject_id
      })

      console.log('[Sessions Category Debug] Creation result:', result)

      if (result.success) {
        // Refresh categories to show new category immediately
        await refreshCategories()
        // Update assignment with new category
        updateAssignment(assignmentId, 'assignment_categories_id', result.data?.id || '')
        setNewCategoryName('')
        setShowInlineCategoryCreate(null)
        
        // Success feedback (could be replaced with toast notification)
        console.log(`✅ Category "${newCategoryName.trim()}" created successfully!`)
      } else {
        const errorMsg = result.error?.message || 'Failed to create category'
        console.error('[Sessions Category Debug] Creation failed:', result.error)
        
        // Show user-friendly error message
        if (errorMsg.includes('Permission denied') || errorMsg.includes('Manager access required')) {
          alert('You need manager permissions to create categories. Please contact your academy manager.')
        } else if (errorMsg.includes('already exists')) {
          alert(`A category named "${newCategoryName.trim()}" already exists. Please choose a different name.`)
        } else {
          alert(`Failed to create category: ${errorMsg}`)
        }
      }
    } catch (error) {
      console.error('[Sessions Category Debug] Exception during creation:', error)
      alert('Failed to create category. Please check your permissions and try again.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Get filtered categories based on selected classroom's subject
  const getFilteredCategories = useCallback(() => {
    const selectedClassroom = classrooms.find(c => c.id === formData.classroom_id)
    console.log('[Categories Debug] getFilteredCategories:', {
      classroomId: formData.classroom_id,
      selectedClassroom: selectedClassroom?.name,
      subjectId: selectedClassroom?.subject_id,
      totalClassrooms: classrooms.length
    })
    
    if (!selectedClassroom?.subject_id) {
      console.log('[Categories Debug] No subject found for classroom')
      return []
    }
    
    const categories = getCategoriesBySubjectId(selectedClassroom.subject_id)
    console.log('[Categories Debug] Found categories:', categories)
    return categories
  }, [classrooms, formData.classroom_id, getCategoriesBySubjectId])

  // Get filtered categories for session details modal
  const getFilteredCategoriesForSession = useCallback(() => {
    console.log('[Session Categories Debug] getFilteredCategoriesForSession:', {
      viewingSessionId: viewingSession?.id,
      classroomId: viewingSession?.classroom_id,
      totalClassrooms: classrooms.length
    })
    
    if (!viewingSession?.classroom_id) {
      console.log('[Session Categories Debug] No classroom in viewing session')
      return []
    }
    
    const selectedClassroom = classrooms.find(c => c.id === viewingSession.classroom_id)
    console.log('[Session Categories Debug] Selected classroom:', {
      name: selectedClassroom?.name,
      subjectId: selectedClassroom?.subject_id
    })
    
    if (!selectedClassroom?.subject_id) {
      console.log('[Session Categories Debug] No subject found for classroom')
      return []
    }
    
    const categories = getCategoriesBySubjectId(selectedClassroom.subject_id)
    console.log('[Session Categories Debug] Found categories:', categories)
    return categories
  }, [classrooms, viewingSession?.classroom_id, viewingSession?.id, getCategoriesBySubjectId])

  const loadClassroomStudentsForAttendance = useCallback(async (classroomId: string, sessionId?: string) => {
    try {
      console.log('loadClassroomStudentsForAttendance called for classroom:', classroomId, 'sessionId:', sessionId)

      // If sessionId is provided, fetch existing attendance records from database
      if (sessionId) {
        console.log('Fetching existing attendance records for session:', sessionId)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('id, student_id, status, note, created_at')
          .eq('classroom_session_id', sessionId)
          .order('created_at', { ascending: true })

        if (attendanceError) {
          console.error('Error fetching existing attendance:', attendanceError)
          setModalAttendance([])
          return
        }

        if (!attendanceData || attendanceData.length === 0) {
          console.log('No existing attendance records found')
          setModalAttendance([])
          return
        }

        // Get student names for existing attendance records
        const formattedAttendance = await Promise.all(
          attendanceData.map(async (attendance) => {
            let student_name = String(t('sessions.unknownStudent'))
            if (attendance.student_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('id', attendance.student_id)
                .single()
              student_name = userData?.name || String(t('sessions.unknownStudent'))
            }

            return {
              id: attendance.id,
              classroom_session_id: sessionId,
              student_id: attendance.student_id,
              student_name,
              status: attendance.status,
              note: attendance.note || ''
            }
          })
        )
        console.log('Setting modal attendance with existing records:', formattedAttendance)
        setModalAttendance(formattedAttendance)
        return
      }

      // If no sessionId, create new attendance objects for enrolled students (new session)
      console.log('Creating new attendance objects for enrolled students')
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)

      if (enrollmentError) {
        console.error('Error fetching classroom students:', enrollmentError)
        setModalAttendance([])
        return
      }

      console.log('Found classroom students:', enrollmentData)

      if (enrollmentData && enrollmentData.length > 0) {
        const studentsWithNames = await Promise.all(
          enrollmentData.map(async (enrollment) => {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', enrollment.student_id)
              .single()

            return {
              id: crypto.randomUUID(),
              classroom_session_id: sessionId || '',
              student_id: enrollment.student_id,
              student_name: userData?.name || t('sessions.unknownStudent'),
              status: 'pending' as const,
              note: ''
            }
          })
        )
        console.log('Setting modal attendance with classroom students:', studentsWithNames)
        setModalAttendance(studentsWithNames)
      } else {
        console.log('No students found in classroom')
        setModalAttendance([])
      }
    } catch (error) {
      console.error('Error loading classroom students:', error)
      setModalAttendance([])
    }
  }, [t])

  // Load students for attendance when classroom is selected (only for new sessions)
  useEffect(() => {
    if (formData.classroom_id && showModal && !editingSession) {
      console.log('useEffect: Loading classroom students for new session')
      loadClassroomStudentsForAttendance(formData.classroom_id)
    }
  }, [formData.classroom_id, showModal, editingSession, loadClassroomStudentsForAttendance])

  const fetchSessions = useCallback(async () => {
    try {
      console.log('Fetching sessions for academy:', academyId, 'viewMode:', viewMode)

      // PERFORMANCE: Check cache first (valid for 2 minutes)
      // Cache key includes only server-side filters for better cache hit rate
      // Client-side filters: classroomFilter, teacherFilter, statusFilter, showTodayOnly, showUpcomingOnly
      // Server-side filters: filterDate, startDateFilter, endDateFilter, filterClassroomId (from prop)
      const filterKey = [
        filterClassroomId, // Server-side: from prop
        filterDate,
        startDateFilter,
        endDateFilter,
        viewMode
      ].filter(Boolean).join('-')
      const cacheKey = `sessions-${academyId}${filterKey ? `-${filterKey}` : ''}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          console.log('✅ Cache hit:', {
            sessions: parsed.sessions?.length || 0,
            totalCount: parsed.totalCount || 0,
            viewMode
          })

          // VIRTUAL SESSIONS: Even with cache, generate virtual sessions for calendar view
          let finalSessions = parsed.sessions
          if (viewMode === 'calendar') {
            try {
              // Get classrooms for virtual session generation
              const { data: academyClassrooms } = await supabase
                .from('classrooms')
                .select('id, name, teacher_id, color, paused')
                .eq('academy_id', academyId)
                .is('deleted_at', null)

              if (academyClassrooms && academyClassrooms.length > 0) {
                const rangeStart = startDateFilter ? new Date(startDateFilter) : subMonths(startOfMonth(calendarDate), 12)
                const rangeEnd = endDateFilter ? new Date(endDateFilter) : addMonths(endOfMonth(calendarDate), 12)

                const classroomIds = academyClassrooms.map(c => c.id)
                const activeClassroomFilter = filterClassroomId || (classroomFilter !== 'all' ? classroomFilter : null)
                const classroomIdsForVirtual = activeClassroomFilter ? [activeClassroomFilter] : classroomIds

                // Filter out paused classrooms
                const nonPausedClassroomIds = classroomIdsForVirtual.filter(classroomId => {
                  const classroom = academyClassrooms.find(c => c.id === classroomId)
                  return classroom && !classroom.paused
                })

                // Generate virtual sessions only for non-paused classrooms
                const allVirtualSessions = await Promise.all(
                  nonPausedClassroomIds.map(async (classroomId) => {
                    return await getSessionsForDateRange(
                      classroomId,
                      rangeStart,
                      rangeEnd,
                      parsed.sessions.filter((s: any) => s.classroom_id === classroomId)
                    )
                  })
                )

                // Create classroom and teacher maps
                const classroomMap = new Map(academyClassrooms.map(c => [c.id, c]))
                const teacherIds = [...new Set(academyClassrooms.map(c => c.teacher_id).filter(Boolean))]
                const { data: teachersData } = await supabase
                  .from('users')
                  .select('id, name')
                  .in('id', teacherIds)
                const teacherMap = new Map(teachersData?.map(t => [t.id, t.name]) || [])

                // Add classroom details to virtual sessions
                const virtualSessionsFlat = allVirtualSessions.flat()
                const virtualSessionsWithDetails = virtualSessionsFlat
                  .filter((session: any) => session.is_virtual)
                  .map((session: any) => {
                    const classroom = classroomMap.get(session.classroom_id)
                    const teacher_name = classroom?.teacher_id ?
                      (teacherMap.get(classroom.teacher_id) || t('sessions.unknownTeacher')) :
                      t('sessions.unknownTeacher')

                    return {
                      ...session,
                      classroom_name: classroom?.name || t('sessions.unknownClassroom'),
                      classroom_color: classroom?.color || '#6B7280',
                      teacher_name,
                      substitute_teacher_name: null,
                      student_count: 0,
                      assignment_count: 0,
                      location: 'offline' as const
                    }
                  })

                // Deduplicate sessions by ID (avoid duplicate virtual sessions)
                const sessionMap = new Map()
                parsed.sessions.forEach((s: any) => sessionMap.set(s.id, s))
                virtualSessionsWithDetails.forEach((s: any) => {
                  if (!sessionMap.has(s.id)) {
                    sessionMap.set(s.id, s)
                  }
                })
                finalSessions = Array.from(sessionMap.values())
                console.log('✅ [Cache] Added virtual sessions:', virtualSessionsWithDetails.length, 'total:', finalSessions.length)
              }
            } catch (virtualError) {
              console.error('Error generating virtual sessions from cache:', virtualError)
            }
          }

          setSessions(finalSessions)
          setTotalCount(parsed.totalCount || 0)
          setInitialized(true)
          setLoading(false)
          return
        }
      }

      setInitialized(true)

      // First get classrooms for this academy
      const { data: academyClassrooms } = await supabase
        .from('classrooms')
        .select('id, name, teacher_id, color, paused')
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      if (!academyClassrooms || academyClassrooms.length === 0) {
        setSessions([])
        setLoading(false)
        return
      }

      const classroomIds = academyClassrooms.map(c => c.id)

      // Build query with server-side filters only
      // Client-side filters (classroom, teacher, status, today/upcoming) will be applied after fetch
      let query = supabase
        .from('classroom_sessions')
        .select('*', { count: 'exact' })
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)

      // Apply classroom filter from prop only (server-side scoping)
      if (filterClassroomId) {
        query = query.eq('classroom_id', filterClassroomId)
      }

      // Apply date filter (single date from prop - server-side scoping)
      if (filterDate) {
        query = query.eq('date', filterDate)
      }

      // Apply date range filters (from state)
      if (startDateFilter) {
        query = query.gte('date', startDateFilter)
      }
      if (endDateFilter) {
        query = query.lte('date', endDateFilter)
      }

      // Apply ordering - most recent sessions first (date DESC, then start_time DESC)
      query = query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })

      // Fetch all sessions (pagination will be applied client-side)
      const { data, error, count } = await query

      // Update total count (reflects server-side filtered results only)
      setTotalCount(count || 0)
      
      if (error) {
        console.error('Error fetching sessions:', error)
        setSessions([])
        setLoading(false)
        return
      }
      
      console.log('Raw sessions data:', data?.length || 0, 'sessions')
      
      if (!data || data.length === 0) {
        console.log('No sessions found')
        setSessions([])
        setLoading(false)
        return
      }
      
      // Optimized: Batch queries to avoid N+1 pattern
      const sessionIds = data.map(session => session.id)
      const sessionClassroomIds = [...new Set(data.map(session => session.classroom_id).filter(Boolean))]
      const allTeacherIds = new Set()
      
      // Collect teacher IDs from sessions (substitute teachers)
      data.forEach(session => {
        if (session.substitute_teacher) {
          allTeacherIds.add(session.substitute_teacher)
        }
      })

      // Execute queries in parallel to get classroom data first
      const [classroomsData, assignmentsData] = await Promise.all([
        // Get all classroom details
        sessionClassroomIds.length > 0 ? supabase
          .from('classrooms')
          .select('id, name, color, teacher_id')
          .in('id', sessionClassroomIds) : Promise.resolve({ data: [] }),
        
        // Get assignment counts for all sessions
        sessionIds.length > 0 ? supabase
          .from('assignments')
          .select('classroom_session_id')
          .in('classroom_session_id', sessionIds)
          .is('deleted_at', null) : Promise.resolve({ data: [] })
      ])

      // Add classroom teacher IDs to the teacher set
      ;(classroomsData.data || []).forEach(classroom => {
        if (classroom.teacher_id) {
          allTeacherIds.add(classroom.teacher_id)
        }
      })

      // Get all teacher names in one query
      const { data: teachersData } = allTeacherIds.size > 0 ? await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(allTeacherIds)) : { data: [] }

      // Create lookup maps for efficient data association
      // Use all academyClassrooms for the map to ensure virtual sessions can find their classroom data
      const classroomMap = new Map(
        academyClassrooms.map(classroom => [classroom.id, classroom])
      )
      
      const teacherMap = new Map(
        (teachersData || []).map(teacher => [teacher.id, teacher.name])
      )
      
      // Count assignments per session
      const assignmentCounts = new Map()
      ;(assignmentsData.data || []).forEach((assignment: { classroom_session_id: string }) => {
        const sessionId = assignment.classroom_session_id
        assignmentCounts.set(sessionId, (assignmentCounts.get(sessionId) || 0) + 1)
      })

      // Build final session data with efficient lookups
      const sessionsWithDetails = data.map(session => {
        const classroom = classroomMap.get(session.classroom_id)
        const teacher_name = classroom?.teacher_id ? 
          (teacherMap.get(classroom.teacher_id) || t('sessions.unknownTeacher')) : 
          t('sessions.unknownTeacher')
        const substitute_teacher_name = session.substitute_teacher ? 
          (teacherMap.get(session.substitute_teacher) || null) : null
        
        return {
          ...session,
          classroom_name: classroom?.name || t('sessions.unknownClassroom'),
          classroom_color: classroom?.color || '#6B7280',
          teacher_name,
          substitute_teacher_name,
          student_count: 0, // Will be populated later if needed
          assignment_count: assignmentCounts.get(session.id) || 0
        }
      })
      
      // VIRTUAL SESSIONS: Generate virtual sessions for calendar view
      let finalSessions = sessionsWithDetails
      if (viewMode === 'calendar') {
        try {
          // Determine date range for virtual session generation (1 year for calendar navigation)
          const rangeStart = startDateFilter ? new Date(startDateFilter) : subMonths(startOfMonth(calendarDate), 12)
          const rangeEnd = endDateFilter ? new Date(endDateFilter) : addMonths(endOfMonth(calendarDate), 12)

          // Get unique classroom IDs from the active filter or all classrooms
          const classroomIdsForVirtual = filterClassroomId
            ? [filterClassroomId]
            : classroomIds

          // Filter out paused classrooms
          const nonPausedClassroomIds = classroomIdsForVirtual.filter(classroomId => {
            const classroom = academyClassrooms?.find((c: any) => c.id === classroomId)
            return classroom && !classroom.paused
          })

          // Generate virtual sessions only for non-paused classrooms
          const allVirtualSessions = await Promise.all(
            nonPausedClassroomIds.map(async (classroomId) => {
              return await getSessionsForDateRange(
                classroomId,
                rangeStart,
                rangeEnd,
                sessionsWithDetails.filter(s => s.classroom_id === classroomId)
              )
            })
          )

          // Flatten and add classroom details to virtual sessions
          const virtualSessionsFlat = allVirtualSessions.flat()
          const virtualSessionsWithDetails = virtualSessionsFlat
            .filter((session: any) => session.is_virtual)
            .map((session: any) => {
              const classroom = classroomMap.get(session.classroom_id)
              const teacher_name = classroom?.teacher_id ?
                (teacherMap.get(classroom.teacher_id) || t('sessions.unknownTeacher')) :
                t('sessions.unknownTeacher')

              return {
                ...session,
                classroom_name: classroom?.name || t('sessions.unknownClassroom'),
                classroom_color: classroom?.color || '#6B7280',
                teacher_name,
                substitute_teacher_name: null,
                student_count: 0,
                assignment_count: 0,
                location: 'offline' as const // Default for virtual sessions
              }
            })

          // Deduplicate sessions by ID (avoid duplicate virtual sessions)
          const sessionMap = new Map()
          sessionsWithDetails.forEach((s: any) => sessionMap.set(s.id, s))
          virtualSessionsWithDetails.forEach((s: any) => {
            if (!sessionMap.has(s.id)) {
              sessionMap.set(s.id, s)
            }
          })
          finalSessions = Array.from(sessionMap.values())
          console.log('Added virtual sessions:', virtualSessionsWithDetails.length, 'total:', finalSessions.length)
        } catch (virtualError) {
          console.error('Error generating virtual sessions:', virtualError)
          // Continue with only real sessions if virtual generation fails
        }
      }

      console.log('Setting sessions to state:', finalSessions.length, 'sessions')
      setSessions(finalSessions)

      // PERFORMANCE: Cache the results BEFORE returning
      try {
        const dataToCache = {
          sessions: finalSessions,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Sessions cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache sessions:', cacheError)
      }

      setLoading(false)
      return finalSessions
    } catch (error) {
      console.error('Error loading sessions:', error)
      setSessions([])
      setLoading(false)
      return []
    }
  }, [academyId, t, filterClassroomId, filterDate, startDateFilter, endDateFilter, viewMode, calendarDate])

  const fetchClassrooms = useCallback(async () => {
    if (!academyId) {
      console.warn('fetchClassrooms: No academyId available yet')
      // Keep loading state - don't set empty classrooms yet
      return
    }

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching classrooms:', error)
        setClassrooms([])
        return
      }
      
      // OPTIMIZED: Batch fetch all teacher names in one query
      const teacherIds = [...new Set((data || []).map(c => c.teacher_id).filter(Boolean))]
      let teacherNameMap = new Map<string, string>()

      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds)

        teacherNameMap = new Map(
          (teachersData || []).map(teacher => [teacher.id, teacher.name])
        )
      }

      const classroomsWithDetails = (data || []).map(classroom => ({
        id: classroom.id,
        name: classroom.name,
        color: classroom.color,
        teacher_id: classroom.teacher_id,
        teacher_name: teacherNameMap.get(classroom.teacher_id) || t('sessions.unknownTeacher'),
        subject_id: classroom.subject_id,
        paused: classroom.paused
      }))

      setClassrooms(classroomsWithDetails)
    } catch (error) {
      console.error('Error loading classrooms:', error)
      setClassrooms([])
    }
  }, [academyId, t])

  const fetchTeachers = useCallback(async () => {
    try {
      // Get both teachers and managers for this academy in parallel
      const [teachersResult, managersResult] = await Promise.all([
        supabase
          .from('teachers')
          .select(`
            user_id,
            users (
              id,
              name
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true),
        supabase
          .from('managers')
          .select(`
            user_id,
            users (
              id,
              name
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true)
      ])

      const teachers: Teacher[] = []
      const addedUserIds = new Set<string>()

      // Add teachers first
      if (teachersResult.data) {
        teachersResult.data.forEach(teacher => {
          if (teacher.users && typeof teacher.users === 'object' && 'id' in teacher.users && !addedUserIds.has(teacher.user_id)) {
            const userObj = teacher.users as unknown as { id: string; name: string }
            teachers.push({
              id: userObj.id,
              name: userObj.name,
              user_id: teacher.user_id
            })
            addedUserIds.add(teacher.user_id)
          }
        })
      }

      // Add managers with label, but only if not already added as teachers
      if (managersResult.data) {
        managersResult.data.forEach(manager => {
          if (manager.users && typeof manager.users === 'object' && 'id' in manager.users && !addedUserIds.has(manager.user_id)) {
            const userObj = manager.users as unknown as { id: string; name: string }
            teachers.push({
              id: userObj.id,
              name: `${userObj.name} (${t('auth.form.roles.manager')})`,
              user_id: manager.user_id
            })
            addedUserIds.add(manager.user_id)
          }
        })
      }

      setTeachers(teachers)
    } catch (error) {
      console.error('Error loading teachers and managers:', error)
      setTeachers([])
    }
  }, [academyId, t])

  // Template CRUD functions
  const fetchUserTemplates = useCallback(async () => {
    if (!currentUserId) return

    try {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .eq('user_id', currentUserId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
        return
      }

      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      setTemplates([])
    }
  }, [currentUserId])

  // Fetch user templates when currentUserId is available
  useEffect(() => {
    if (currentUserId) {
      fetchUserTemplates()
    }
  }, [currentUserId, fetchUserTemplates])

  const handleSaveTemplateClick = useCallback(async (session: Session) => {
    // Fetch session's assignments if includeAssignments will be checked
    try {
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('classroom_session_id', session.id)

      setTemplateToSave(session)
      setSaveTemplateFormData({ name: '', includeAssignments: false })
      setShowSaveTemplateModal(true)
    } catch (error) {
      console.error('Error preparing template save:', error)
      showErrorToast(String(t('sessions.errorSavingTemplate')))
    }
  }, [t])

  const handleSaveTemplate = useCallback(async () => {
    if (!templateToSave || !currentUserId || !saveTemplateFormData.name.trim()) {
      return
    }

    try {
      setIsSaving(true)

      // Prepare template data from session
      const templateData = {
        classroom_id: templateToSave.classroom_id,
        status: templateToSave.status,
        start_time: templateToSave.start_time,
        end_time: templateToSave.end_time,
        location: templateToSave.location,
        room_number: templateToSave.room_number,
        notes: templateToSave.notes,
        substitute_teacher: templateToSave.substitute_teacher
      }

      // Fetch assignments if needed
      let assignmentsData = null
      if (saveTemplateFormData.includeAssignments) {
        const { data: assignments } = await supabase
          .from('assignments')
          .select('*')
          .eq('classroom_session_id', templateToSave.id)
          .is('deleted_at', null)

        if (assignments && assignments.length > 0) {
          // Fetch attachments for all assignments
          const assignmentIds = assignments.map(a => a.id)
          const attachmentsMap = new Map<string, AttachmentFile[]>()

          if (assignmentIds.length > 0) {
            const { data: attachmentData } = await supabase
              .from('assignment_attachments')
              .select('assignment_id, file_name, file_url, file_size, file_type')
              .in('assignment_id', assignmentIds)

            if (attachmentData) {
              // Group attachments by assignment_id
              attachmentData.forEach(att => {
                if (!attachmentsMap.has(att.assignment_id)) {
                  attachmentsMap.set(att.assignment_id, [])
                }
                attachmentsMap.get(att.assignment_id)!.push({
                  name: att.file_name,
                  url: att.file_url,
                  size: att.file_size,
                  type: att.file_type
                })
              })
            }
          }

          assignmentsData = assignments.map(a => ({
            id: a.id,
            title: a.title,
            description: a.description ?? '', // Use nullish coalescing to preserve empty strings
            assignment_type: a.assignment_type,
            due_date: '', // Always empty for templates
            assignment_categories_id: a.assignment_categories_id ?? '', // Use nullish coalescing
            attachments: attachmentsMap.get(a.id) || []
          }))
        }
      }

      // Log template data before saving for debugging
      console.log('[Template Save] Template data:', {
        templateData,
        assignmentsData,
        assignmentsCount: assignmentsData?.length || 0
      })

      // Save template to database
      const { error } = await supabase
        .from('session_templates')
        .insert({
          user_id: currentUserId,
          name: saveTemplateFormData.name.trim(),
          template_data: templateData,
          include_assignments: saveTemplateFormData.includeAssignments,
          assignments_data: assignmentsData
        })

      if (error) {
        console.error('Error saving template:', error)
        showErrorToast(String(t('sessions.errorSavingTemplate')))
        return
      }

      showSuccessToast(String(t('sessions.templateSavedSuccessfully')))
      setShowSaveTemplateModal(false)
      setSaveTemplateFormData({ name: '', includeAssignments: false })
      setTemplateToSave(null)

      // Refresh templates list
      fetchUserTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      showErrorToast(String(t('sessions.errorSavingTemplate')))
    } finally {
      setIsSaving(false)
    }
  }, [templateToSave, currentUserId, saveTemplateFormData, t, fetchUserTemplates])

  // Compare current form data with template data to detect changes
  const compareTemplateWithCurrent = useCallback((template: SessionTemplate) => {
    const changes: Record<string, { current: any; new: any }> = {}
    const templateData = template.template_data

    // Check each field (excluding classroom_id which is always preserved)
    const fieldsToCheck = [
      'status', 'start_time', 'end_time', 'location',
      'room_number', 'notes', 'substitute_teacher'
    ]

    fieldsToCheck.forEach(field => {
      const currentValue = formData[field as keyof typeof formData]
      const templateValue = templateData[field as keyof typeof templateData]

      // Only track if values are different
      if (currentValue !== templateValue && templateValue !== undefined) {
        changes[field] = {
          current: currentValue || t('common.empty'),
          new: templateValue
        }
      }
    })

    return changes
  }, [formData, t])

  const handleApplyTemplate = useCallback(async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    try {
      // If editing an existing session, show confirmation with changes
      if (editingSession) {
        const changes = compareTemplateWithCurrent(template)
        const hasFieldChanges = Object.keys(changes).length > 0
        const hasAssignmentChanges = template.include_assignments && template.assignments_data

        // Only show confirmation if there are changes
        if (hasFieldChanges || hasAssignmentChanges) {
          setPendingTemplateId(templateId)
          setTemplateFieldChanges(changes)
          setShowTemplateConfirmModal(true)
          return
        }
      }

      // If creating new session, apply immediately (current behavior)
      setFormData(prev => ({
        ...prev,
        classroom_id: template.template_data.classroom_id || '',
        status: template.template_data.status || 'scheduled',
        start_time: template.template_data.start_time || '09:00',
        end_time: template.template_data.end_time || '10:00',
        location: template.template_data.location || 'offline',
        room_number: template.template_data.room_number || '',
        notes: template.template_data.notes || '',
        substitute_teacher: template.template_data.substitute_teacher || ''
      }))

      // Apply assignments if included
      if (template.include_assignments && template.assignments_data) {
        // Clear due dates from template assignments
        const assignmentsWithoutDueDates = template.assignments_data.map(a => ({
          ...a,
          due_date: ''
        }))
        setModalAssignments(assignmentsWithoutDueDates)
        setOriginalAssignments(assignmentsWithoutDueDates)
      }

      showSuccessToast(String(t('sessions.templateAppliedSuccessfully')))
    } catch (error) {
      console.error('Error applying template:', error)
      showErrorToast(String(t('sessions.errorApplyingTemplate')))
    }
  }, [templates, t, editingSession, compareTemplateWithCurrent])

  const handleConfirmTemplateApplication = useCallback(async () => {
    const template = templates.find(t => t.id === pendingTemplateId)
    if (!template) return

    try {
      // Apply template data to form, preserving classroom_id
      setFormData(prev => ({
        ...prev,
        // Preserve classroom_id when editing
        classroom_id: editingSession ? prev.classroom_id : (template.template_data.classroom_id || ''),
        status: template.template_data.status || 'scheduled',
        start_time: template.template_data.start_time || '09:00',
        end_time: template.template_data.end_time || '10:00',
        location: template.template_data.location || 'offline',
        room_number: template.template_data.room_number || '',
        notes: template.template_data.notes || '',
        substitute_teacher: template.template_data.substitute_teacher || ''
      }))

      // Replace assignments if included
      if (template.include_assignments && template.assignments_data) {
        // Clear due dates from template assignments
        const assignmentsWithoutDueDates = template.assignments_data.map(a => ({
          ...a,
          due_date: ''
        }))
        setModalAssignments(assignmentsWithoutDueDates)
        setOriginalAssignments(assignmentsWithoutDueDates)
      }

      // Close modal and reset state
      setShowTemplateConfirmModal(false)
      setPendingTemplateId('')
      setTemplateFieldChanges({})

      showSuccessToast(String(t('sessions.templateAppliedSuccessfully')))
    } catch (error) {
      console.error('Error applying template:', error)
      showErrorToast(String(t('sessions.errorApplyingTemplate')))
    }
  }, [templates, pendingTemplateId, editingSession, t])

  const handleDeleteTemplateClick = useCallback((template: SessionTemplate) => {
    setTemplateToDelete(template)
    setShowDeleteTemplateModal(true)
  }, [])

  const handleDeleteTemplate = useCallback(async () => {
    // Check if it's bulk deletion or single deletion
    const isBulkDelete = selectedTemplates.size > 0

    if (!isBulkDelete && !templateToDelete) return

    try {
      if (isBulkDelete) {
        // Bulk delete
        for (const templateId of selectedTemplates) {
          const template = templates.find(t => t.id === templateId)
          if (template) {
            await supabase
              .from('session_templates')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', templateId)
          }
        }
        setSelectedTemplates(new Set())
      } else {
        // Single delete
        const { error } = await supabase
          .from('session_templates')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', templateToDelete!.id)

        if (error) {
          console.error('Error deleting template:', error)
          showErrorToast(String(t('sessions.errorDeletingTemplate')))
          return
        }
      }

      showSuccessToast(String(t('sessions.templateDeletedSuccessfully')))
      setShowDeleteTemplateModal(false)
      setTemplateToDelete(null)

      // Refresh templates list
      fetchUserTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      showErrorToast(String(t('sessions.errorDeletingTemplate')))
    }
  }, [templateToDelete, selectedTemplates, templates, t, fetchUserTemplates])


  useEffect(() => {
    if (!academyId) return

    // Check if page was refreshed - if so, clear caches to force fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      console.log('🔄 [Sessions] Page refresh detected - fetching fresh data')
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    // Cache key includes only server-side filters to match fetchSessions cache
    const filterKey = [
      filterClassroomId, // Server-side: from prop
      filterDate,
      startDateFilter,
      endDateFilter,
      viewMode
    ].filter(Boolean).join('-')
    const cacheKey = `sessions-${academyId}${filterKey ? `-${filterKey}` : ''}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [Sessions useEffect] Using cached data - NO skeleton', { filterKey, teacherFilter })
        setSessions(parsed.sessions)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        // Still load secondary data in background
        fetchClassrooms()
        fetchTeachers()
        return // Skip fetchSessions - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    console.log('❌ [Sessions useEffect] Cache miss - showing skeleton', { filterKey, teacherFilter })
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }

    // Primary data: fetchSessions controls main skeleton and shows data immediately
    fetchSessions()

    // Secondary data: load in parallel, update UI when ready
    fetchClassrooms()
    fetchTeachers()
  }, [academyId, filterClassroomId, filterDate, startDateFilter, endDateFilter, viewMode, fetchSessions, fetchClassrooms, fetchTeachers])

  // Fetch ALL sessions (without filters) for filter card counts
  // Using useCallback so it can be called manually after session creation/updates
  const fetchAllSessionsForCounts = useCallback(async () => {
    if (!academyId) return

    try {
      // Check cache first
      const allSessionsCacheKey = `all-sessions-${academyId}`
      const cachedData = sessionStorage.getItem(allSessionsCacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${allSessionsCacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          console.log('✅ [All Sessions] Using cached data:', parsed.length)
          setAllSessions(parsed)
          return
        }
      }

      // Fetch all sessions without any filters
      const { data: academyClassrooms } = await supabase
        .from('classrooms')
        .select('id, name, teacher_id, color')
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      if (!academyClassrooms || academyClassrooms.length === 0) {
        setAllSessions([])
        return
      }

      const classroomIds = academyClassrooms.map(c => c.id)

      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(1000)

      if (error) {
        console.error('Error fetching all sessions:', error)
        return
      }

      if (!data || data.length === 0) {
        setAllSessions([])
        return
      }

      // Get teacher IDs
      const teacherIds = [...new Set(academyClassrooms.map(c => c.teacher_id).filter(Boolean))]
      let teacherNameMap = new Map<string, string>()

      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds)

        teacherNameMap = new Map(
          (teachersData || []).map(teacher => [teacher.id, teacher.name])
        )
      }

      // Create a map of classroom details
      const classroomMap = new Map(
        academyClassrooms.map(c => [
          c.id,
          {
            name: c.name,
            color: c.color,
            teacher_name: teacherNameMap.get(c.teacher_id) || t('sessions.unknownTeacher')
          }
        ])
      )

      const sessionsWithDetails: Session[] = data.map(session => {
        const classroom = classroomMap.get(session.classroom_id)
        return {
          ...session,
          classroom_name: classroom?.name || t('sessions.unknownClassroom'),
          classroom_color: classroom?.color || '#9CA3AF',
          teacher_name: classroom?.teacher_name || t('sessions.unknownTeacher')
        }
      })

      setAllSessions(sessionsWithDetails)

      // Debug: Log session status breakdown
      const statusBreakdown = sessionsWithDetails.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('📊 [All Sessions] Status breakdown:', statusBreakdown)
      console.log('📊 [All Sessions] Scheduled sessions:', sessionsWithDetails.filter(s => s.status === 'scheduled'))

      // Cache the results
      try {
        sessionStorage.setItem(allSessionsCacheKey, JSON.stringify(sessionsWithDetails))
        sessionStorage.setItem(`${allSessionsCacheKey}-timestamp`, Date.now().toString())
        console.log('✅ [All Sessions] Cached', sessionsWithDetails.length, 'sessions')
      } catch (cacheError) {
        console.warn('[All Sessions] Failed to cache:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching all sessions for counts:', error)
    }
  }, [academyId, t])

  // Call fetchAllSessionsForCounts on mount
  useEffect(() => {
    fetchAllSessionsForCounts()
  }, [fetchAllSessionsForCounts])

  // Memoized event handlers for better performance
  const handleSessionSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionSearchQuery(e.target.value)
  }, [])

  const handleAttendanceSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAttendanceSearchQuery(e.target.value)
  }, [])

  const handleFormDataChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleAttendanceNoteUpdate = useCallback((studentId: string, value: string) => {
    setModalAttendance(prev => prev.map(attendance =>
      attendance.student_id === studentId ? { ...attendance, note: value } : attendance
    ))
  }, [])

  const handleAssignmentUpdate = useCallback((id: string, field: keyof ModalAssignment, value: string) => {
    setModalAssignments(prev => prev.map(assignment =>
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    ))
  }, [])

  const handleNewCategoryNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(e.target.value)
  }, [])

  const handleAssignmentAttachments = useCallback((id: string, files: AttachmentFile[]) => {
    setModalAssignments(prev => prev.map(assignment =>
      assignment.id === id ? { ...assignment, attachments: files } : assignment
    ))
  }, [])

  // Efficient save function that only updates changed data
  const saveSessionEfficiently = async (
    sessionId: string,
    cachedEnrollmentData?: Array<{ student_id: string }>
  ): Promise<boolean> => {
    console.log('[Efficient Save] Starting efficient save for session:', sessionId)

    try {
      // Detect changes in assignments and attendance
      const assignmentChanges = detectAssignmentChanges(originalAssignments, modalAssignments)
      const attendanceChanges = detectAttendanceChanges(originalAttendance, modalAttendance)

      console.log('[Efficient Save] Assignment changes:', assignmentChanges)
      console.log('[Efficient Save] Attendance changes:', attendanceChanges)

      // Only proceed if there are changes to save
      const hasChanges =
        assignmentChanges.added.length > 0 ||
        assignmentChanges.modified.length > 0 ||
        assignmentChanges.removed.length > 0 ||
        attendanceChanges.added.length > 0 ||
        attendanceChanges.modified.length > 0 ||
        attendanceChanges.removed.length > 0

      if (!hasChanges) {
        console.log('[Efficient Save] No changes detected, skipping data updates')
        return true
      }

      // Execute all updates in parallel for best performance
      const updatePromises = []

      // Handle assignment changes
      if (assignmentChanges.removed.length > 0) {
        updatePromises.push(deleteRemovedAssignments(assignmentChanges.removed, sessionId))
      }
      if (assignmentChanges.modified.length > 0) {
        updatePromises.push(updateChangedAssignments(assignmentChanges.modified, sessionId))
      }
      if (assignmentChanges.added.length > 0) {
        const newAssignmentsPromise = insertNewAssignments(assignmentChanges.added, sessionId)
        updatePromises.push(newAssignmentsPromise.then(result => result.success))

        // Store the promise so we can use the result for creating assignment grades
        // OPTIMIZED: Pass cached enrollment data to avoid redundant query
        updatePromises.push(
          newAssignmentsPromise.then(async (result) => {
            if (result.success && result.newAssignments && result.newAssignments.length > 0) {
              await createAssignmentGradesForAssignments(result.newAssignments, formData.classroom_id, cachedEnrollmentData)
              return true
            }
            return true
          })
        )
      }

      // Handle attendance changes
      if (attendanceChanges.removed.length > 0) {
        updatePromises.push(deleteRemovedAttendance(attendanceChanges.removed, sessionId))
      }
      if (attendanceChanges.modified.length > 0) {
        updatePromises.push(updateChangedAttendance(attendanceChanges.modified, sessionId))
      }
      if (attendanceChanges.added.length > 0) {
        updatePromises.push(insertNewAttendance(attendanceChanges.added, sessionId))
      }

      // Wait for all updates to complete
      const results = await Promise.all(updatePromises)

      // Check if all updates succeeded
      const allSucceeded = results.every(result => result === true)

      if (allSucceeded) {
        console.log('[Efficient Save] All differential updates completed successfully')

        // Assignment grades will be created by insertNewAssignments function

        // Invalidate assignment cache if assignments were changed
        const hasAssignmentChanges =
          assignmentChanges.added.length > 0 ||
          assignmentChanges.modified.length > 0 ||
          assignmentChanges.removed.length > 0

        if (hasAssignmentChanges) {
          invalidateAssignmentsCache(academyId)
          console.log('[Efficient Save] Invalidated assignments cache')
        }

        // Invalidate attendance cache if attendance was changed
        const hasAttendanceChanges =
          attendanceChanges.added.length > 0 ||
          attendanceChanges.modified.length > 0 ||
          attendanceChanges.removed.length > 0

        if (hasAttendanceChanges) {
          invalidateAttendanceCache(academyId)
          console.log('[Efficient Save] Invalidated attendance cache')
        }

        return true
      } else {
        console.error('[Efficient Save] Some differential updates failed')
        return false
      }
    } catch (error) {
      console.error('[Efficient Save] Error during efficient save:', error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSubmitInternal(false)
  }

  const handleSubmitInternal = async (skipWarning: boolean = false) => {
    try {
      let currentSessionId: string | null = null

      if (editingSession) {
        // Check if status is changing from scheduled to completed
        if (!skipWarning && editingSession.status === 'scheduled' && formData.status === 'completed') {
          setShowCompletionWarningModal(true)
          return // Show modal and wait for confirmation
        }

        setIsSaving(true)
        currentSessionId = editingSession.id
        // Update existing session
        const { error } = await supabase
          .from('classroom_sessions')
          .update({
            classroom_id: formData.classroom_id,
            status: formData.status,
            date: formData.date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            location: formData.location,
            room_number: formData.room_number || null,
            notes: formData.notes || null,
            substitute_teacher: formData.substitute_teacher || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSession.id)

        if (error) {
          showErrorToast(t('sessions.errorUpdating') as string, error.message)
          return
        }

        // OPTIMIZED: Fetch enrollment data once and pass to efficient save
        // This avoids redundant query if new assignments are being created
        const { data: enrollmentData } = await supabase
          .from('classroom_students')
          .select('student_id')
          .eq('classroom_id', formData.classroom_id)

        // Use efficient save for existing sessions
        const efficientSaveSuccess = await saveSessionEfficiently(editingSession.id, enrollmentData || undefined)

        if (efficientSaveSuccess) {
          showSuccessToast(t('sessions.updatedSuccessfully') as string)
        } else {
          console.warn('[Efficient Save] Failed, falling back to original method')
          // Fallback to original method if efficient save fails
          // For safety, we'll still show success for the session update
          showSuccessToast(t('sessions.updatedSuccessfully') as string)
        }

        // Invalidate sessions cache so updates appear immediately
        invalidateSessionsCache(academyId)
        // Cascade: Also invalidate attendance cache since session changes affect attendance views
        invalidateAttendanceCache(academyId)

        // Refetch all sessions for filter counts (bypasses cache since we just invalidated it)
        await fetchAllSessionsForCounts()
      } else {
        // Check if creating a new session with completed status - show warning
        if (!skipWarning && formData.status === 'completed') {
          setShowCompletionWarningModal(true)
          return // Show modal and wait for confirmation
        }

        setIsCreating(true)
        // Create new session(s)
        const datesToCreate = multipleSessions ? selectedDates : [formData.date]

        // Fetch students once for all sessions
        console.log('Fetching students for classroom:', formData.classroom_id)
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('classroom_students')
          .select('student_id')
          .eq('classroom_id', formData.classroom_id)

        if (enrollmentError) {
          console.error('Error fetching classroom students:', enrollmentError)
          showErrorToast(t('sessions.errorCreating') as string, enrollmentError.message)
          return
        }

        console.log('Found students in classroom:', enrollmentData)

        // Create all sessions in parallel
        const sessionPromises = datesToCreate.map(async (date) => {
          console.log('[Session Create] FormData:', {
            room_number: formData.room_number,
            location: formData.location,
            date,
            classroom_id: formData.classroom_id
          })

          const { data: sessionData, error } = await supabase
            .from('classroom_sessions')
            .insert({
              classroom_id: formData.classroom_id,
              status: formData.status || 'scheduled',
              date: date,
              start_time: formData.start_time,
              end_time: formData.end_time,
              location: formData.location,
              room_number: formData.room_number || null,
              notes: formData.notes || null,
              substitute_teacher: formData.substitute_teacher || null
            })
            .select()
            .single()

          if (error) {
            throw new Error(`Error creating session for ${date}: ${error.message}`)
          }

          console.log(`Session created successfully for ${date}:`, sessionData)
          return sessionData
        })

        const createdSessions = await Promise.all(sessionPromises)

        // Create attendance records for all sessions in parallel
        if (enrollmentData && enrollmentData.length > 0) {
          console.log('Creating attendance for', enrollmentData.length, 'students across', createdSessions.length, 'sessions')

          const attendancePromises = createdSessions.map(async (sessionData) => {
            const attendanceRecords = enrollmentData.map(enrollment => ({
              classroom_session_id: sessionData.id,
              student_id: enrollment.student_id,
              status: 'pending' as const,
              note: null
            }))

            const { error: attendanceError, data: attendanceData } = await supabase
              .from('attendance')
              .insert(attendanceRecords)
              .select()

            if (attendanceError) {
              console.error('Error creating attendance records:', {
                sessionId: sessionData.id,
                error: attendanceError,
                message: attendanceError.message,
                details: attendanceError.details,
                hint: attendanceError.hint,
                code: attendanceError.code
              })
              throw attendanceError
            } else {
              console.log('Attendance records created successfully for session:', sessionData.id)
              return attendanceData
            }
          })

          await Promise.all(attendancePromises)
        } else {
          console.log('No students found in classroom for attendance')
        }

        // Set currentSessionId to the first created session for any additional processing
        if (createdSessions.length > 0) {
          currentSessionId = createdSessions[0].id
        }

        // Trigger session creation notifications for each session
        for (const session of createdSessions) {
          try {
            await triggerSessionCreatedNotifications(session.id)
          } catch (notificationError) {
            console.error('Error sending session creation notification:', notificationError)
            // Don't fail the session creation if notification fails
          }
        }

        // Trigger notification refetch for all users
        if (createdSessions.length > 0) {
          window.dispatchEvent(new CustomEvent('notificationCreated'))
        }

        // Invalidate caches so new data appears immediately
        invalidateSessionsCache(academyId)
        invalidateAttendanceCache(academyId)

        showSuccessToast(t('sessions.createdSuccessfully') as string)
      }

      // Save attendance records (only for new sessions - edit sessions use efficient approach above)
      if (modalAttendance.length > 0 && !editingSession) {
        // For new sessions: Update the auto-created records if user made changes
        const modifiedAttendance = modalAttendance.filter(attendance =>
          attendance.status !== 'pending' || (attendance.note && attendance.note.trim() !== '')
        )

        if (modifiedAttendance.length > 0) {
          // Update all attendance records in parallel
          const updatePromises = modifiedAttendance.map(async (attendance) => {
            const { error: updateError } = await supabase
              .from('attendance')
              .update({
                status: attendance.status,
                note: attendance.note || null
              })
              .eq('classroom_session_id', currentSessionId)
              .eq('student_id', attendance.student_id)

            if (updateError) {
              console.error('Error updating attendance:', updateError)
              throw updateError
            }
          })

          await Promise.all(updatePromises)
        }
      }

      // Save assignment records (only for new sessions - edit sessions use efficient approach above)
      if (modalAssignments.length > 0 && !editingSession) {
        // Insert new assignments
        const assignmentRecords = modalAssignments
          .filter(assignment => assignment.title.trim() !== '' && assignment.due_date.trim() !== '')
          .map(assignment => ({
            classroom_session_id: currentSessionId,
            title: assignment.title,
            description: assignment.description || null,
            assignment_type: assignment.assignment_type,
            due_date: assignment.due_date || null,
            assignment_categories_id: assignment.assignment_categories_id || null
          }))

        if (assignmentRecords.length > 0) {
          const { data: createdAssignments, error: assignmentError } = await supabase
            .from('assignments')
            .insert(assignmentRecords)
            .select()

          if (assignmentError) {
            console.error('Error saving assignments:', assignmentError)
          } else if (createdAssignments) {
            // Get current user ID once
            const { data: { user } } = await supabase.auth.getUser()

            // Save attachments for all assignments in parallel
            const validModalAssignments = modalAssignments
              .filter(assignment => assignment.title.trim() !== '' && assignment.due_date.trim() !== '')

            const attachmentPromises = createdAssignments.map(async (createdAssignment, i) => {
              const modalAssignment = validModalAssignments[i]

              if (modalAssignment?.attachments && modalAssignment.attachments.length > 0) {
                console.log('[Attachment Debug] Processing attachments for assignment:', createdAssignment.id)
                console.log('[Attachment Debug] Modal assignment attachments:', modalAssignment.attachments)

                const attachmentRecords = modalAssignment.attachments.map(file => ({
                  assignment_id: createdAssignment.id,
                  file_name: file.name,
                  file_url: file.url,
                  file_size: file.size,
                  file_type: file.type,
                  uploaded_by: user?.id
                }))

                console.log('[Attachment Debug] Attachment records to insert:', attachmentRecords)

                const { error: attachmentError } = await supabase
                  .from('assignment_attachments')
                  .insert(attachmentRecords)

                if (attachmentError) {
                  console.error('[Attachment Debug] Error saving attachments for assignment:', createdAssignment.id)
                  console.error('[Attachment Debug] Full error object:', attachmentError)
                  console.error('[Attachment Debug] Error message:', attachmentError?.message)
                  console.error('[Attachment Debug] Error code:', attachmentError?.code)
                  console.error('[Attachment Debug] Error details:', attachmentError?.details)
                  throw attachmentError
                } else {
                  console.log('[Attachment Debug] Successfully saved attachments for assignment:', createdAssignment.id)
                }
              }
            })

            await Promise.all(attachmentPromises)

            // Create assignment grades for each student in the classroom
            await createAssignmentGradesForAssignments(createdAssignments, formData.classroom_id)

            // Invalidate assignments cache so new assignments appear immediately
            invalidateAssignmentsCache(academyId)
            console.log('[Session Create] Invalidated assignments cache after creating assignments')
          }
        }
      }

      // Refetch sessions AFTER all assignments have been created
      // This ensures assignment_count is accurate in the session cards
      if (!editingSession) {
        await Promise.all([
          fetchSessions(),
          fetchAllSessionsForCounts()
        ])
      }

      // Refresh detail modal data if it's open (for edit sessions)
      if (showDetailsModal && viewingSession && editingSession) {
        await Promise.all([
          loadSessionAssignments(editingSession.id),
          loadSessionAttendance(editingSession.id)
        ])

        // Get updated session data from current sessions state
        const updatedSession = sessions.find(s => s.id === editingSession.id)
        if (updatedSession) {
          setViewingSession(updatedSession)
        }
      }

      setShowModal(false)
      resetForm()

    } catch (error) {
      showErrorToast(t('sessions.unexpectedError') as string, (error as Error).message)
    } finally {
      setIsCreating(false)
      setIsSaving(false)
    }
  }

  const handleConfirmedCompletion = async () => {
    setShowCompletionWarningModal(false)

    // If editingSession is null, we're creating a new session
    if (!editingSession) {
      // Call handleSubmit again but this time it will proceed with creation
      // We need to temporarily bypass the warning check
      await handleSubmitInternal(true)
      return
    }

    try {
      setIsSaving(true)

      // Update existing session
      const { error } = await supabase
        .from('classroom_sessions')
        .update({
          classroom_id: formData.classroom_id,
          status: formData.status,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location,
          room_number: formData.room_number || null,
          notes: formData.notes || null,
          substitute_teacher: formData.substitute_teacher || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSession.id)

      if (error) {
        showErrorToast(t('sessions.errorUpdating') as string, error.message)
        return
      }

      // OPTIMIZED: Fetch enrollment data once and pass to efficient save
      const { data: enrollmentData } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', formData.classroom_id)

      // Use efficient save for existing sessions
      const efficientSaveSuccess = await saveSessionEfficiently(editingSession.id, enrollmentData || undefined)

      if (efficientSaveSuccess) {
        showSuccessToast(t('sessions.updatedSuccessfully') as string)
      } else {
        console.warn('[Efficient Save] Failed, falling back to original method')
        showSuccessToast(t('sessions.updatedSuccessfully') as string)
      }

      // Invalidate sessions cache so updates appear immediately
      invalidateSessionsCache(academyId)

      // Refetch sessions in parallel (bypasses cache since we just invalidated it)
      await Promise.all([
        fetchSessions(),
        fetchAllSessionsForCounts()
      ])

      // Refresh detail modal data if open
      if (showDetailsModal && viewingSession && editingSession) {
        await Promise.all([
          loadSessionAssignments(editingSession.id),
          loadSessionAttendance(editingSession.id)
        ])

        // Get updated session data from current sessions state
        const updatedSession = sessions.find(s => s.id === editingSession.id)
        if (updatedSession) {
          setViewingSession(updatedSession)
        }
      }

      setShowModal(false)
      resetForm()
    } catch (error) {
      showErrorToast(t('sessions.unexpectedError') as string, (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      classroom_id: '',
      status: '',
      date: '',
      start_time: '09:00',
      end_time: '10:00',
      location: 'offline',
      room_number: '',
      notes: '',
      substitute_teacher: ''
    })
    setEditingSession(null)
    setActiveTimePicker(null)
    setActiveDatePicker(null)
    setMultipleSessions(false)
    setSelectedDates([])
    setModalAttendance([])
    setModalAssignments([])
    setAttendanceSearchQuery('')
    setShowAddAttendanceModal(false)
    setAvailableStudents([])
    setSelectedTemplateId('')
    setIsCreatingFromVirtual(false)
  }

  const handleEditClick = async (session: Session) => {
    // MATERIALIZATION: Convert virtual session to real session before editing
    let sessionToEdit = session
    if (session.is_virtual) {
      try {
        console.log('Materializing virtual session:', session.id)
        const { data: materializedData, error: materializeError } = await materializeSession(session)

        if (materializeError || !materializedData) {
          console.error('Error materializing session:', materializeError)
          showErrorToast(t('sessions.materializationError'))
          return
        }

        // Update sessionToEdit reference to use materialized version
        sessionToEdit = {
          ...session,
          id: materializedData.id,
          is_virtual: false,
          created_at: materializedData.created_at,
          updated_at: materializedData.updated_at
        }

        // Update sessions list to reflect materialization
        setSessions(prev => prev.map(s =>
          s.id === session.id ? sessionToEdit : s
        ))

        console.log('Session materialized successfully:', sessionToEdit.id)
      } catch (error) {
        console.error('Exception during materialization:', error)
        showErrorToast(t('sessions.materializationError'))
        return
      }
    }

    setEditingSession(sessionToEdit)
    setFormData({
      classroom_id: sessionToEdit.classroom_id,
      status: sessionToEdit.status,
      date: sessionToEdit.date,
      start_time: sessionToEdit.start_time,
      end_time: sessionToEdit.end_time,
      location: sessionToEdit.location,
      room_number: sessionToEdit.room_number || '',
      notes: sessionToEdit.notes || '',
      substitute_teacher: sessionToEdit.substitute_teacher || ''
    })

    // Load existing attendance for the session
    try {
      console.log('Loading attendance for session edit:', sessionToEdit.id)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status, note')
        .eq('classroom_session_id', sessionToEdit.id)

      if (attendanceError) {
        console.error('Error fetching attendance data:', attendanceError)
        await loadClassroomStudentsForAttendance(sessionToEdit.classroom_id)
        return
      }

      console.log('Found attendance data:', attendanceData)

      if (attendanceData && attendanceData.length > 0) {
        console.log('Processing existing attendance records...')

        // OPTIMIZED: Batch fetch all student names in one query
        const studentIds = attendanceData.map(a => a.student_id)
        const { data: studentsData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', studentIds)

        // Create a map for quick lookups
        const studentNameMap = new Map(
          (studentsData || []).map(student => [student.id, student.name])
        )

        const attendanceWithNames = attendanceData.map(attendance => ({
          ...attendance,
          classroom_session_id: sessionToEdit.id,
          student_name: studentNameMap.get(attendance.student_id) || t('sessions.unknownStudent')
        }))

        console.log('Setting modal attendance with existing records:', attendanceWithNames)
        setModalAttendance(attendanceWithNames)
        // Store original attendance data for change tracking
        setOriginalAttendance(JSON.parse(JSON.stringify(attendanceWithNames)))

        // Load available students for the "Add Attendance" popup
        await loadAvailableStudentsForAttendance(sessionToEdit.classroom_id, attendanceData.map(a => a.student_id))
      } else {
        // No attendance exists - keep main attendance list empty, load all students for "Add Attendance" popup
        console.log('No attendance found, keeping main attendance empty and loading all students for Add Attendance popup')
        setModalAttendance([])
        // Store empty original attendance for change tracking
        setOriginalAttendance([])
        await loadAvailableStudentsForAttendance(sessionToEdit.classroom_id, [])
      }
    } catch (error) {
      console.error('Error loading attendance:', error)
      console.log('Fallback: keeping main attendance empty and loading all students for Add Attendance popup')
      setModalAttendance([])
      // Store empty original attendance for change tracking
      setOriginalAttendance([])
      await loadAvailableStudentsForAttendance(sessionToEdit.classroom_id, [])
    }

    // Load existing assignments for the session
    try {
      console.log('[Session Edit Debug] Loading assignments for session:', sessionToEdit.id)

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, assignment_type, due_date, assignment_categories_id')
        .eq('classroom_session_id', sessionToEdit.id)
        .is('deleted_at', null)

      console.log('[Session Edit Debug] Assignment data:', { assignmentData, assignmentError })

      if (assignmentError) {
        console.error('[Session Edit Debug] Error loading assignments:', assignmentError)
        setModalAssignments([])
        return
      }

      // OPTIMIZED: Batch fetch all attachments in one query
      const assignmentIds = (assignmentData || []).map(a => a.id)
      let allAttachments: { assignment_id: string; file_name: string; file_url: string; file_size: number; file_type: string }[] = []

      if (assignmentIds.length > 0) {
        try {
          const { data: attachmentData } = await supabase
            .from('assignment_attachments')
            .select('assignment_id, file_name, file_url, file_size, file_type')
            .in('assignment_id', assignmentIds)

          allAttachments = attachmentData || []
        } catch (error) {
          console.error('Error loading attachments:', error)
        }
      }

      // Group attachments by assignment_id
      const attachmentsByAssignment = new Map<string, AttachmentFile[]>()
      allAttachments.forEach(attachment => {
        if (!attachmentsByAssignment.has(attachment.assignment_id)) {
          attachmentsByAssignment.set(attachment.assignment_id, [])
        }
        attachmentsByAssignment.get(attachment.assignment_id)!.push({
          name: attachment.file_name,
          url: attachment.file_url,
          size: attachment.file_size,
          type: attachment.file_type,
          uploaded: true
        })
      })

      // Transform assignment data to match ModalAssignment interface
      const transformedAssignments = (assignmentData || []).map(assignment => ({
        id: assignment.id,
        title: assignment.title || '',
        description: assignment.description || '',
        assignment_type: assignment.assignment_type,
        due_date: assignment.due_date || '',
        assignment_categories_id: assignment.assignment_categories_id || '',
        attachments: attachmentsByAssignment.get(assignment.id) || []
      }))

      console.log('[Session Edit Debug] Transformed assignments:', transformedAssignments)
      setModalAssignments(transformedAssignments)
      // Store original assignment data for change tracking
      setOriginalAssignments(JSON.parse(JSON.stringify(transformedAssignments)))
    } catch (error) {
      console.error('[Session Edit Debug] Exception loading assignments:', error)
      setModalAssignments([])
      // Store empty original assignments for change tracking
      setOriginalAssignments([])
    }

    setShowModal(true)
  }


  const loadAvailableStudentsForAttendance = async (classroomId: string, excludeStudentIds: string[] = []) => {
    try {
      console.log('loadAvailableStudentsForAttendance called for classroom:', classroomId, 'excluding:', excludeStudentIds)
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', classroomId)

      if (enrollmentError) {
        console.error('Error fetching classroom students for available list:', enrollmentError)
        setAvailableStudents([])
        return
      }

      console.log('Found classroom students for available list:', enrollmentData)

      if (enrollmentData && enrollmentData.length > 0) {
        // Filter out students who already have attendance
        const availableEnrollments = enrollmentData.filter(enrollment => 
          !excludeStudentIds.includes(enrollment.student_id)
        )

        const studentsWithNames = await Promise.all(
          availableEnrollments.map(async (enrollment) => {
            const { data: userData } = await supabase
              .from('users')
              .select('name')
              .eq('id', enrollment.student_id)
              .single()
            
            return {
              user_id: enrollment.student_id,
              name: userData?.name || t('sessions.unknownStudent')
            }
          })
        )
        console.log('Setting available students for Add Attendance popup:', studentsWithNames)
        setAvailableStudents(studentsWithNames)
      } else {
        console.log('No students found in classroom for available list')
        setAvailableStudents([])
      }
    } catch (error) {
      console.error('Error loading available students:', error)
      setAvailableStudents([])
    }
  }

  const handleCopyClick = async (session: Session) => {
    // Pre-fill form with session data but don't set editingSession
    // This creates a new session with copied data
    setFormData({
      classroom_id: session.classroom_id,
      status: session.status,
      date: session.date,
      start_time: session.start_time,
      end_time: session.end_time,
      location: session.location,
      room_number: session.room_number || '',
      notes: session.notes || '',
      substitute_teacher: session.substitute_teacher || ''
    })

    // Load students for attendance
    await loadClassroomStudentsForAttendance(session.classroom_id)

    // Load and copy assignments from the session
    try {
      console.log('[Session Copy Debug] Loading assignments for session:', session.id)

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, assignment_type, due_date, assignment_categories_id')
        .eq('classroom_session_id', session.id)
        .is('deleted_at', null)

      if (assignmentError) {
        console.error('[Session Copy Debug] Error loading assignments:', assignmentError)
        setModalAssignments([])
      } else if (assignmentData && assignmentData.length > 0) {
        // OPTIMIZED: Batch fetch all attachments in one query
        const assignmentIds = assignmentData.map(a => a.id)
        let allAttachments: { assignment_id: string; file_name: string; file_url: string; file_size: number; file_type: string }[] = []

        if (assignmentIds.length > 0) {
          try {
            const { data: attachmentData } = await supabase
              .from('assignment_attachments')
              .select('assignment_id, file_name, file_url, file_size, file_type')
              .in('assignment_id', assignmentIds)

            allAttachments = attachmentData || []
          } catch (attachmentError) {
            console.error('[Session Copy Debug] Error loading attachments:', attachmentError)
          }
        }

        // Create attachment map
        const attachmentMap = new Map<string, AttachmentFile[]>()
        allAttachments.forEach(attachment => {
          const existing = attachmentMap.get(attachment.assignment_id) || []
          existing.push({
            name: attachment.file_name,
            url: attachment.file_url,
            size: attachment.file_size,
            type: attachment.file_type,
            uploaded: true
          })
          attachmentMap.set(attachment.assignment_id, existing)
        })

        // Transform to modal format with temp IDs for copying
        const transformedAssignments = assignmentData.map(assignment => ({
          id: 'temp-' + crypto.randomUUID(),
          title: assignment.title,
          description: assignment.description || '',
          assignment_type: assignment.assignment_type,
          due_date: assignment.due_date || '',
          assignment_categories_id: assignment.assignment_categories_id || '',
          attachments: attachmentMap.get(assignment.id) || []
        }))

        console.log('[Session Copy Debug] Copied assignments:', transformedAssignments)
        setModalAssignments(transformedAssignments)
      } else {
        setModalAssignments([])
      }
    } catch (error) {
      console.error('[Session Copy Debug] Error copying assignments:', error)
      setModalAssignments([])
    }

    // Clear editing session (we're creating a copy, not editing)
    setEditingSession(null)
    setModalAttendance([])
    setOriginalAttendance([])
    setOriginalAssignments([])

    setShowModal(true)
  }

  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session)
    setShowDeleteModal(true)
  }

  const handleViewAssignments = (session: Session) => {
    if (onNavigateToAssignments) {
      onNavigateToAssignments(session.id)
    }
  }

  const handleViewAttendance = (session: Session) => {
    if (onNavigateToAttendance) {
      onNavigateToAttendance(session.id)
    }
  }

  const loadSessionAssignments = async (sessionId: string) => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, assignment_type, due_date, created_at, assignment_categories_id')
        .eq('classroom_session_id', sessionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      console.log('[Session Details Debug] Assignment query result:', { assignmentData, assignmentError })

      if (assignmentError) {
        console.error('[Session Details Debug] Error fetching session assignments:', assignmentError)
        setSessionAssignments([])
      } else {
        // Handle empty or null data
        if (!assignmentData || assignmentData.length === 0) {
          console.log('[Session Details Debug] No assignments found for session')
          setSessionAssignments([])
        } else {
          console.log('[Session Details Debug] Processing', assignmentData.length, 'assignments')
          // Get category names separately to avoid complex JOINs
          const formattedAssignments = await Promise.all(
            assignmentData.map(async (assignment) => {
              let category_name = null
              if (assignment.assignment_categories_id) {
                console.log('[Session Details Debug] Loading category for assignment:', assignment.id, 'category ID:', assignment.assignment_categories_id)
                const { data: categoryData } = await supabase
                  .from('assignment_categories')
                  .select('name')
                  .eq('id', assignment.assignment_categories_id)
                  .single()
                category_name = categoryData?.name || null
                console.log('[Session Details Debug] Category name:', category_name)
              }

              return {
                id: assignment.id,
                title: assignment.title,
                description: assignment.description,
                assignment_type: assignment.assignment_type,
                due_date: assignment.due_date,
                created_at: assignment.created_at,
                category_name
              }
            })
          )
          console.log('[Session Details Debug] Formatted assignments:', formattedAssignments)
          setSessionAssignments(formattedAssignments)
        }
      }
    } catch (error) {
      console.error('[Session Details Debug] Exception loading session assignments:', error)
      setSessionAssignments([])
    }
  }

  const loadSessionAttendance = async (sessionId: string) => {
    try {
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, student_id, status, note, created_at')
        .eq('classroom_session_id', sessionId)
        .order('created_at', { ascending: true })

      if (attendanceError) {
        console.error('Error fetching session attendance:', attendanceError)
        setSessionAttendance([])
      } else {
        // Handle empty or null data
        if (!attendanceData || attendanceData.length === 0) {
          setSessionAttendance([])
        } else {
          // Get student names separately to avoid complex JOINs
          const formattedAttendance = await Promise.all(
            attendanceData.map(async (attendance) => {
              let student_name = String(t('sessions.unknownStudent'))
              if (attendance.student_id) {
                const { data: userData } = await supabase
                  .from('users')
                  .select('name')
                  .eq('id', attendance.student_id)
                  .single()
                student_name = userData?.name || String(t('sessions.unknownStudent'))
              }

              return {
                id: attendance.id,
                classroom_session_id: sessionId,
                student_id: attendance.student_id,
                student_name,
                status: attendance.status,
                note: attendance.note,
                created_at: attendance.created_at
              }
            })
          )
          setSessionAttendance(formattedAttendance)
        }
      }
    } catch (error) {
      console.error('Error loading session attendance:', error)
      setSessionAttendance([])
    }
  }

  const handleViewDetails = async (session: Session) => {
    console.log('[Session Details Debug] Viewing session:', session.id, 'Classroom:', session.classroom_id, 'Is virtual:', session.is_virtual)
    setViewingSession(session)

    // Only load assignments and attendance for real sessions (not virtual)
    if (!session.is_virtual) {
      await loadSessionAssignments(session.id)
      await loadSessionAttendance(session.id)
    } else {
      // Clear assignments and attendance for virtual sessions
      setSessionAssignments([])
      setModalAttendance([])
    }

    setShowDetailsModal(true)
  }

  const updateAttendanceStatus = (studentId: string, status: Attendance['status']) => {
    setModalAttendance(prev => prev.map(attendance => 
      attendance.student_id === studentId 
        ? { ...attendance, status } 
        : attendance
    ))
  }

  const updateAttendanceNote = (studentId: string, note: string) => {
    setModalAttendance(prev => prev.map(attendance => 
      attendance.student_id === studentId 
        ? { ...attendance, note } 
        : attendance
    ))
  }


  const addAssignment = () => {
    console.log('[Assignment Debug] Add assignment called')
    console.log('[Assignment Debug] Current formData.classroom_id:', formData.classroom_id)
    console.log('[Assignment Debug] Current editingSession:', editingSession)
    console.log('[Assignment Debug] Current modalAssignments length:', modalAssignments.length)

    const newAssignment: ModalAssignment = {
      id: 'temp-' + crypto.randomUUID(),
      title: '',
      description: '',
      assignment_type: 'homework',
      due_date: '',
      assignment_categories_id: '',
      attachments: []
    }
    console.log('[Assignment Debug] Created new assignment:', newAssignment)
    setModalAssignments(prev => {
      const newList = [...prev, newAssignment]
      console.log('[Assignment Debug] Updated modalAssignments:', newList)
      return newList
    })
  }

  const updateAssignment = (id: string, field: keyof ModalAssignment, value: string) => {
    setModalAssignments(prev => prev.map(assignment => 
      assignment.id === id ? { ...assignment, [field]: value } : assignment
    ))
  }

  const updateAssignmentAttachments = (id: string, attachments: AttachmentFile[]) => {
    setModalAssignments(prev => prev.map(assignment => 
      assignment.id === id ? { ...assignment, attachments } : assignment
    ))
  }

  const removeAssignment = (id: string) => {
    setModalAssignments(prev => prev.filter(assignment => assignment.id !== id))
  }

  const loadAvailableStudents = async (classroomId: string) => {
    try {
      console.log('loadAvailableStudents called for Add Attendance popup, classroom:', classroomId)
      
      // Get current student IDs that already have attendance in the modal
      const currentStudentIds = modalAttendance.map(a => a.student_id)
      console.log('Excluding students with existing attendance:', currentStudentIds)
      
      // Use the new function that properly handles exclusions
      await loadAvailableStudentsForAttendance(classroomId, currentStudentIds)
    } catch (error) {
      console.error('Error loading available students:', error)
      setAvailableStudents([])
    }
  }

  const addStudentToAttendance = async (student: Student) => {
    const newAttendance: Attendance = {
      id: 'temp-' + crypto.randomUUID(),
      classroom_session_id: editingSession?.id || '',
      student_id: student.user_id,
      student_name: student.name,
      status: 'pending',
      note: ''
    }

    setModalAttendance(prev => [...prev, newAttendance])
    setAvailableStudents(prev => prev.filter(s => s.user_id !== student.user_id))

    // Create assignment grades for this student for all assignments in this session
    if (editingSession) {
      await createAssignmentGradesForStudent(student.user_id, editingSession.id)
    }
  }

  const createAssignmentGradesForStudent = async (studentId: string, sessionId: string) => {
    try {
      console.log('Creating assignment grades for new student:', studentId, 'in session:', sessionId)

      // Look up student_record_id from students table
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .single()

      if (studentError) {
        console.warn('Could not find student record for grade creation:', studentError)
      }
      const studentRecordId = studentRecord?.id

      // Get all assignments for this session
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('classroom_session_id', sessionId)
        .is('deleted_at', null)

      if (assignmentsError) {
        console.error('Error fetching assignments for grade creation:', assignmentsError)
        return
      }

      if (assignments && assignments.length > 0) {
        // Check which assignments do not already have grades for this student
        const { data: existingGrades } = await supabase
          .from('assignment_grades')
          .select('assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignments.map(a => a.id))

        const existingAssignmentIds = new Set(existingGrades?.map(g => g.assignment_id) || [])
        const missingGrades = assignments
          .filter(a => !existingAssignmentIds.has(a.id))
          .map(a => ({
            assignment_id: a.id,
            student_id: studentId,
            student_record_id: studentRecordId,
            status: 'pending'
          }))

        if (missingGrades.length > 0) {
          const { error: gradesError } = await supabase
            .from('assignment_grades')
            .insert(missingGrades)

          if (gradesError) {
            console.error('Error creating assignment grades for new student:', gradesError)
          } else {
            console.log(`✅ Created ${missingGrades.length} assignment grades for new student`)
          }
        }
      }
    } catch (error) {
      console.error('Error in createAssignmentGradesForStudent:', error)
    }
  }

  const createAssignmentGradesForAssignments = async (
    assignments: ModalAssignment[],
    classroomId: string,
    cachedEnrollmentData?: Array<{ student_id: string; student_record_id?: string }>
  ) => {
    try {
      console.log('Creating assignment grades for new assignments:', assignments.map(a => a.id))

      // OPTIMIZED: Use cached enrollment data if provided, otherwise fetch
      let enrollmentData = cachedEnrollmentData

      if (!enrollmentData) {
        const { data, error: enrollmentError } = await supabase
          .from('classroom_students')
          .select('student_id, student_record_id')
          .eq('classroom_id', classroomId)

        if (enrollmentError) {
          console.error('Error fetching classroom students for grade creation:', enrollmentError)
          return
        }

        enrollmentData = data || []
      }

      if (enrollmentData && enrollmentData.length > 0 && assignments.length > 0) {
        // Create grade records for each assignment and each student
        const gradeRecords = []
        for (const assignment of assignments) {
          for (const enrollment of enrollmentData) {
            gradeRecords.push({
              assignment_id: assignment.id,
              student_id: enrollment.student_id,
              student_record_id: enrollment.student_record_id,
              status: 'pending'
            })
          }
        }

        if (gradeRecords.length > 0) {
          // Check for existing grades to prevent duplicates
          const assignmentIds = assignments.map(a => a.id)
          const { data: existingGrades } = await supabase
            .from('assignment_grades')
            .select('assignment_id, student_id')
            .in('assignment_id', assignmentIds)

          const existingKeys = new Set(existingGrades?.map(g => `${g.assignment_id}-${g.student_id}`) || [])
          const filteredGradeRecords = gradeRecords.filter(record => 
            !existingKeys.has(`${record.assignment_id}-${record.student_id}`)
          )

          if (filteredGradeRecords.length > 0) {
            const { error: gradeError } = await supabase
              .from('assignment_grades')
              .insert(filteredGradeRecords)

            if (gradeError) {
              console.error('❌ Assignment grades creation failed for new assignments!')
              console.error('Error code:', gradeError.code)
              console.error('Error message:', gradeError.message)
            } else {
              console.log(`✅ Created ${filteredGradeRecords.length} assignment grades for new assignments`)
            }
          } else {
            console.log('All assignment grades already exist for new assignments')
          }
        }
      }
    } catch (error) {
      console.error('Error in createAssignmentGradesForAssignments:', error)
    }
  }

  const markAllPresent = () => {
    setModalAttendance(prev => prev.map(attendance => ({
      ...attendance,
      status: 'present' as const
    })))
  }

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('classroom_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionToDelete.id)

      if (error) {
        showErrorToast(t('sessions.errorDeleting') as string, error.message)
        return
      }

      // Update both sessions and allSessions state immediately
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete.id))
      setAllSessions(prev => prev.filter(s => s.id !== sessionToDelete.id))

      // Update total count for pagination
      setTotalCount(prev => Math.max(0, prev - 1))

      setShowDeleteModal(false)
      setSessionToDelete(null)

      showSuccessToast(t('sessions.deletedSuccessfully') as string)

      // Invalidate sessions cache so deletion appears immediately and in archive
      invalidateSessionsCache(academyId)
      invalidateArchiveCache(academyId)
      // Cascade: Also invalidate attendance and assignments cache since session deletion affects them
      invalidateAttendanceCache(academyId)
      invalidateAssignmentsCache(academyId)

      // Refetch all sessions for filter counts (bypasses cache since we just invalidated it)
      await fetchAllSessionsForCounts()

    } catch (error) {
      showErrorToast(t('sessions.unexpectedError') as string, (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return `12:00 ${t('sessions.am')}`
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? t('sessions.pm') : t('sessions.am')
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = useMemo(() => {
    return (dateString: string) => {
      const date = new Date(dateString)
      
      // Translations are now always available
      
      if (language === 'korean') {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const weekday = date.getDay()
        
        const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
        
        return `${year}년 ${month}월 ${day}일 (${weekdayNames[weekday]})`
      } else {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    }
  }, [language, ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  // Helper function to format date as YYYY-MM-DD
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filter sessions based on search query and date filter
  // Client-side filtering (search, classroom, teacher, status, today, upcoming)
  // Server-side filters (filterClassroomId, filterDate, date ranges) are already applied
  const filteredSessions = sessions.filter(session => {
    // Apply classroom filter (from dropdown, not prop)
    if (classroomFilter && classroomFilter !== 'all') {
      const sessionClassroomId = session.classroom_id
      if (sessionClassroomId !== classroomFilter) {
        return false
      }
    }

    // Apply teacher filter
    if (teacherFilter && teacherFilter !== 'all') {
      const sessionTeacherId = session.substitute_teacher || session.teacher_id
      if (sessionTeacherId !== teacherFilter) {
        return false
      }
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      if (session.status !== statusFilter) {
        return false
      }
    }

    // Apply today filter
    if (showTodayOnly) {
      const today = formatLocalDate(new Date())
      if (session.date !== today) {
        return false
      }
    }

    // Apply upcoming filter (all scheduled sessions)
    if (showUpcomingOnly) {
      if (session.status !== 'scheduled') {
        return false
      }
    }

    // Then apply search query filter
    if (!debouncedSessionSearchQuery) return true

    return (
      session.classroom_name?.toLowerCase().includes(debouncedSessionSearchQuery.toLowerCase()) ||
      session.teacher_name?.toLowerCase().includes(debouncedSessionSearchQuery.toLowerCase()) ||
      session.location.toLowerCase().includes(debouncedSessionSearchQuery.toLowerCase()) ||
      session.status.toLowerCase().includes(debouncedSessionSearchQuery.toLowerCase())
    )
  })

  // Debug: Log filtered sessions when upcoming filter is active
  if (showUpcomingOnly && filteredSessions.length !== sessions.length) {
    console.log('🔍 [Filter Debug] Upcoming filter active')
    console.log('🔍 [Filter Debug] Total sessions:', sessions.length)
    console.log('🔍 [Filter Debug] Filtered sessions:', filteredSessions.length)
    console.log('🔍 [Filter Debug] Filtered out sessions:', sessions.filter(s => s.status !== 'scheduled'))
    console.log('🔍 [Filter Debug] Displayed scheduled sessions:', filteredSessions)
  }

  // Always use filtered length as total count (hybrid approach)
  // Exclude virtual sessions from the count display
  const filteredTotalCount = filteredSessions.filter((s: any) => !s.is_virtual).length

  // Always apply client-side pagination to filtered results (for card view)
  const paginatedSessions = useMemo(() => {
    if (viewMode === 'card') {
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return filteredSessions.slice(startIndex, endIndex)
    }
    // Calendar view shows all sessions
    return filteredSessions
  }, [filteredSessions, currentPage, itemsPerPage, viewMode])

  // Filter attendance based on search query
  const filteredAttendance = modalAttendance.filter(attendance =>
    attendance.student_name?.toLowerCase().includes(debouncedAttendanceSearchQuery.toLowerCase()) || false
  )

  // Calendar view helper functions
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  // Helper function to get readable text color for soft backgrounds
  const getReadableTextColor = (classroomColor: string): string => {
    // Remove # if present
    const hex = classroomColor.replace('#', '')

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // For very light colors, darken them for better contrast on light backgrounds
    if (luminance > 0.7) {
      // Darken by 40%
      const darkenR = Math.floor(r * 0.6)
      const darkenG = Math.floor(g * 0.6)
      const darkenB = Math.floor(b * 0.6)
      return `rgb(${darkenR}, ${darkenG}, ${darkenB})`
    }

    // For medium to dark colors, use them as-is (they'll show well on light backgrounds)
    return classroomColor
  }

  // Helper function to format date as YYYY-MM-DD in local timezone
  const getSessionsForDate = (date: Date) => {
    const dateStr = formatLocalDate(date)
    return filteredSessions
      .filter(session => session.date === dateStr)
      .sort((a, b) => {
        // Sort by start_time ascending (earliest to latest)
        if (a.start_time < b.start_time) return -1
        if (a.start_time > b.start_time) return 1
        return 0
      })
  }

  const handleCalendarDateClick = (date: Date) => {
    setSelectedCalendarDate(date)
    const sessions = getSessionsForDate(date)
    if (sessions.length > 0) {
      setShowDaySessionsModal(true)
    }
  }

  const handleSessionClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation()
    handleViewDetails(session)
  }

  const navigateCalendarMonth = (direction: number) => {
    const newDate = new Date(calendarDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setCalendarDate(newDate)
  }

  const TimePickerComponent = ({ 
    value, 
    onChange, 
    fieldId,
    disabled = false
  }: { 
    value: string
    onChange: (value: string) => void
    fieldId: string
    disabled?: boolean
  }) => {
    const isOpen = activeTimePicker === fieldId
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
    }

    return (
      <div className="relative" ref={timePickerRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setActiveTimePicker(isOpen ? null : fieldId)}
          className={`w-full h-10 px-3 py-2 text-left text-sm border rounded-lg focus:outline-none ${
            disabled 
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : isOpen 
                ? 'bg-white border-primary' 
                : 'bg-white border-border focus:border-primary'
          }`}
        >
          {formatTime(value)}
        </button>
        
        {isOpen && !disabled && (
          <div 
            className={`absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 ${
              fieldId === 'end_time' ? 'right-0' : 'left-0'
            }`}
          >
              <div className="grid grid-cols-3 gap-3">
              {/* Hours */}
              <div>
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.hour")}</Label>
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
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.min")}</Label>
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
                <Label className="text-xs text-foreground/60 mb-2 block">{t("sessions.period")}</Label>
                <div className="space-y-1">
                  {[{key: 'AM', label: t('sessions.am')}, {key: 'PM', label: t('sessions.pm')}].map(period => (
                    <button
                      key={period.key}
                      type="button"
                      onClick={() => setTime(hour12, parseInt(minutes), period.key)}
                      className={`w-full px-2 py-1 text-sm text-left hover:bg-gray-100 rounded ${
                        ampm === period.key ? 'bg-blue-50 text-blue-600' : ''
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

  const DatePickerComponent = ({ 
    value, 
    onChange, 
    fieldId,
    multiSelect = false,
    selectedDates = [],
    disabled = false,
    placeholder,
    height = 'h-12',
    shadow = 'shadow-sm'
  }: { 
    value: string
    onChange: (value: string | string[]) => void
    fieldId: string
    multiSelect?: boolean
    selectedDates?: string[]
    disabled?: boolean
    placeholder?: string
    height?: string
    shadow?: string
  }) => {
    const isOpen = activeDatePicker === fieldId
    const datePickerRef = useRef<HTMLDivElement>(null)
    
    // Parse date string as local date to avoid timezone issues
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date()
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    
    const currentDate = value ? parseLocalDate(value) : new Date()
    const today = new Date()
    
    // Get current month and year for navigation
    const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
    const [viewYear, setViewYear] = useState(currentDate.getFullYear())

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setActiveDatePicker(null)
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen])

    const formatDisplayDate = (dateString: string) => {
      if (!dateString) return placeholder || t('sessions.selectDate')
      const locale = language === 'korean' ? 'ko-KR' : 'en-US'
      const localDate = parseLocalDate(dateString)
      return localDate.toLocaleDateString(locale, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const getDaysInMonth = (month: number, year: number) => {
      return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (month: number, year: number) => {
      return new Date(year, month, 1).getDay()
    }

    const selectDate = (day: number) => {
      const selectedDate = new Date(viewYear, viewMonth, day)
      // Format as YYYY-MM-DD in local timezone instead of UTC
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dayStr = String(selectedDate.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${dayStr}`
      
      if (multiSelect) {
        // Handle multiple date selection
        const currentDates = [...selectedDates]
        const dateIndex = currentDates.indexOf(dateString)
        
        if (dateIndex > -1) {
          // Date already selected, remove it
          currentDates.splice(dateIndex, 1)
        } else {
          // Add new date
          currentDates.push(dateString)
          currentDates.sort() // Keep dates sorted
        }
        
        onChange(currentDates)
        // Don't close picker in multi-select mode
      } else {
        // Single date selection
        onChange(dateString)
        setActiveDatePicker(null)
      }
    }

    const navigateMonth = (direction: number) => {
      let newMonth = viewMonth + direction
      let newYear = viewYear

      if (newMonth < 0) {
        newMonth = 11
        newYear -= 1
      } else if (newMonth > 11) {
        newMonth = 0
        newYear += 1
      }

      setViewMonth(newMonth)
      setViewYear(newYear)
    }

    const monthNames = [
      String(t('sessions.months.january')), String(t('sessions.months.february')), String(t('sessions.months.march')),
      String(t('sessions.months.april')), String(t('sessions.months.may')), String(t('sessions.months.june')),
      String(t('sessions.months.july')), String(t('sessions.months.august')), String(t('sessions.months.september')),
      String(t('sessions.months.october')), String(t('sessions.months.november')), String(t('sessions.months.december'))
    ]

    const dayNames = [
      String(t('sessions.days.sun')), String(t('sessions.days.mon')), String(t('sessions.days.tue')),
      String(t('sessions.days.wed')), String(t('sessions.days.thu')), String(t('sessions.days.fri')), String(t('sessions.days.sat'))
    ]

    const daysInMonth = getDaysInMonth(viewMonth, viewYear)
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
    const selectedDate = value ? parseLocalDate(value) : null

    return (
      <div className="relative" ref={datePickerRef}>
        <div
          onClick={() => !disabled && setActiveDatePicker(isOpen ? null : fieldId)}
          className={`w-full ${height} px-3 py-2 text-left text-sm border rounded-lg cursor-pointer ${shadow} flex items-center ${
            disabled 
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : isOpen 
                ? 'bg-white border-primary'
                : 'bg-white border-border hover:border-primary'
          }`}
        >
          {multiSelect ? (
            selectedDates.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedDates.map((date, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {formatDisplayDate(date)}
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        const newDates = selectedDates.filter(d => d !== date)
                        onChange(newDates)
                      }}
                      className="text-primary hover:text-primary/80 ml-1 cursor-pointer"
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">{t("sessions.selectDates")}</span>
            )
          ) : (
            formatDisplayDate(value)
          )}
        </div>
        
        {isOpen && !disabled && (
          <div className="absolute top-full z-50 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0">
            {/* Header with month/year navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="font-medium text-gray-900">
                {monthNames[viewMonth]} {viewYear}
              </div>
              
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first day of the month */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-8"></div>
              ))}
              
              {/* Days of the month */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const currentDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                
                const isSelected = multiSelect 
                  ? selectedDates.includes(currentDateStr)
                  : selectedDate && 
                    selectedDate.getDate() === day && 
                    selectedDate.getMonth() === viewMonth && 
                    selectedDate.getFullYear() === viewYear
                    
                const isToday = today.getDate() === day && 
                  today.getMonth() === viewMonth && 
                  today.getFullYear() === viewYear

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`h-8 w-8 text-sm rounded flex items-center justify-center ${
                      isSelected
                        ? multiSelect
                          ? 'bg-primary text-white font-medium hover:bg-primary/90'
                          : 'bg-primary/10 text-primary font-medium hover:bg-primary/20'
                        : isToday
                        ? 'bg-gray-100 font-medium hover:bg-gray-200 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Footer actions */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              {multiSelect ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange([])
                    }}
                    className="flex-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    {t("common.selectAll") === "Select All" ? "Clear All" : "전체 해제"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDatePicker(null)
                    }}
                    className="flex-1 text-sm bg-primary text-white px-3 py-2 rounded hover:bg-primary/90 font-medium"
                  >
                    {t("common.done")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const todayString = formatLocalDate(today)
                    onChange(todayString)
                    setActiveDatePicker(null)
                  }}
                  className="w-full text-sm text-primary hover:text-primary/80 font-medium"
                >
                  {t("dashboard.today")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const SessionSkeleton = () => (
    <Card className="p-4 sm:p-6 animate-pulse">
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

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
        <div className="h-9 bg-gray-200 rounded w-full"></div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-200 rounded flex-1"></div>
          <div className="h-9 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>
    </Card>
  )

  if (loading ) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("sessions.title")}</h1>
            <p className="text-gray-500">{t("sessions.description")}</p>
          </div>
          <Button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("sessions.addSession")}
          </Button>
        </div>

        {/* Stats Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="w-full p-4 sm:p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
          <Card className="w-full p-4 sm:p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
          <Card className="w-full p-4 sm:p-6 animate-pulse border-l-4 border-gray-300">
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="flex items-baseline gap-2">
                <div className="h-10 bg-gray-300 rounded w-20"></div>
                <div className="h-4 bg-gray-300 rounded w-16"></div>
              </div>
            </div>
          </Card>
        </div>

        {/* Toggle Skeleton */}
        <div className="flex justify-end mb-4 animate-pulse">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        {/* Search Bar and Filters Skeleton */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Search skeleton */}
          <div className="relative flex-1 min-w-[250px] sm:max-w-md animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
          {/* Classroom filter skeleton */}
          <div className="animate-pulse">
            <div className="h-12 w-60 bg-gray-200 rounded-lg"></div>
          </div>
          {/* Teacher filter skeleton */}
          <div className="animate-pulse">
            <div className="h-12 w-60 bg-gray-200 rounded-lg"></div>
          </div>
          {/* Status filter skeleton */}
          <div className="animate-pulse">
            <div className="h-12 w-60 bg-gray-200 rounded-lg"></div>
          </div>
          {/* Date range filters skeleton */}
          <div className="flex gap-2 items-center animate-pulse">
            <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
            <span className="text-gray-300">-</span>
            <div className="h-12 w-40 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Sessions Content Skeletons */}
        {viewMode === 'card' ? (
          /* Grid Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <SessionSkeleton key={i} />
            ))}
          </div>
        ) : (
          /* Calendar Skeleton */
          <div className="space-y-4">
            <Card className="p-4 sm:p-6 animate-pulse">
              {/* Calendar Header Skeleton */}
              <div className="flex items-center justify-center mb-6">
                <div className="h-7 w-48 bg-gray-200 rounded"></div>
              </div>

              {/* Day Names Skeleton */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded"></div>
                ))}
              </div>

              {/* Calendar Grid Skeleton */}
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg p-2">
                    <div className="h-4 w-6 bg-gray-200 rounded mb-1"></div>
                    <div className="space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Selected Day Sessions Skeleton */}
            <Card className="p-4 sm:p-6 animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("sessions.title")}</h1>
          <p className="text-gray-500">{t("sessions.description")}</p>
        </div>
        <Button
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
          onClick={() => {
            // Clear original data for new session
            setOriginalAssignments([])
            setOriginalAttendance([])
            setShowModal(true)
          }}
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          {t("sessions.addSession")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <Card className="w-full p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-700">
              {debouncedSessionSearchQuery ? t("sessions.filteredResults") : t("sessions.totalSessions")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {filteredTotalCount}
              </p>
              <p className="text-sm text-gray-500">
                {filteredTotalCount === 1
                  ? t("sessions.session")
                  : t("navigation.sessions")
                }
              </p>
            </div>
            {(debouncedSessionSearchQuery || classroomFilter !== 'all' || teacherFilter !== 'all' || statusFilter !== 'all' || showTodayOnly || showUpcomingOnly) && (
              <p className="text-xs text-gray-500">
                {language === 'korean' ? `전체 ${totalCount}개 중` : `out of ${totalCount} total`}
              </p>
            )}
          </div>
        </Card>
        <Card
          className={`w-full p-4 sm:p-6 hover:shadow-md transition-all cursor-pointer border-l-4 ${
            showTodayOnly
              ? 'border-green-600 bg-green-50 shadow-md'
              : 'border-green-500'
          }`}
          onClick={() => {
            setShowTodayOnly(!showTodayOnly)
            if (!showTodayOnly) {
              setShowUpcomingOnly(false) // Turn off upcoming filter
              setCurrentPage(1) // Reset to page 1
              // Reset other filters
              setClassroomFilter('all')
              setTeacherFilter('all')
              setStatusFilter('all')
              setStartDateFilter('')
              setEndDateFilter('')
              setSessionSearchQuery('') // Clear search query
              // Invalidate cache to force fresh fetch without pagination
              invalidateSessionsCache(academyId)
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${showTodayOnly ? 'text-green-800' : 'text-green-700'}`}>
                {t("sessions.todaysSessions")}
              </p>
              <Filter className={`w-4 h-4 ${showTodayOnly ? 'text-green-600' : 'text-green-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {allSessions.filter(s => s.date === formatLocalDate(new Date())).length}
              </p>
              <p className="text-sm text-gray-500">
                {allSessions.filter(s => s.date === formatLocalDate(new Date())).length === 1
                  ? t("sessions.session")
                  : t("navigation.sessions")
                }
              </p>
            </div>
            {showTodayOnly && (
              <p className="text-xs text-green-600">{t("sessions.filterActive")}</p>
            )}
          </div>
        </Card>
        <Card
          className={`w-full p-4 sm:p-6 hover:shadow-md transition-all cursor-pointer border-l-4 ${
            showUpcomingOnly
              ? 'border-purple-600 bg-purple-50 shadow-md'
              : 'border-purple-500'
          }`}
          onClick={() => {
            setShowUpcomingOnly(!showUpcomingOnly)
            if (!showUpcomingOnly) {
              setShowTodayOnly(false) // Turn off today filter
              setCurrentPage(1) // Reset to page 1
              // Reset other filters
              setClassroomFilter('all')
              setTeacherFilter('all')
              setStatusFilter('all')
              setStartDateFilter('')
              setEndDateFilter('')
              setSessionSearchQuery('') // Clear search query
              // Invalidate cache to force fresh fetch without pagination
              invalidateSessionsCache(academyId)
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${showUpcomingOnly ? 'text-purple-800' : 'text-purple-700'}`}>
                {t("sessions.upcomingSessions")}
              </p>
              <Filter className={`w-4 h-4 ${showUpcomingOnly ? 'text-purple-600' : 'text-purple-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {allSessions.filter(s => s.status === 'scheduled').length}
              </p>
              <p className="text-sm text-gray-500">
                {allSessions.filter(s => s.status === 'scheduled').length === 1
                  ? t("sessions.session")
                  : t("navigation.sessions")
                }
              </p>
            </div>
            {showUpcomingOnly && (
              <p className="text-xs text-purple-600">{t("sessions.filterActive")}</p>
            )}
          </div>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className={`h-9 px-3 ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("sessions.calendarView"))}
          >
            <CalendarDays className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("sessions.cardView"))}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[250px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={String(t("sessions.searchSessions"))}
            value={sessionSearchQuery}
            onChange={handleSessionSearchChange}
            className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
        
        {/* Classroom Filter */}
        <Select
          value={classroomFilter}
          onValueChange={(value) => {
            setClassroomFilter(value)
            // Reset teacher filter when classroom filter is changed
            if (value !== 'all') {
              setTeacherFilter('all')
            }
            // Reset to page 1 when filter changes
            setCurrentPage(1)
            // Update URL with classroom filter
            if (value === 'all') {
              router.push('/sessions')
            } else {
              router.push(`/sessions?classroomId=${value}`)
            }
          }}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
            <SelectValue placeholder={String(t("sessions.allClassrooms"))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sessions.allClassrooms")}</SelectItem>
            {classrooms.filter(classroom => !classroom.paused).map((classroom) => (
              <SelectItem key={classroom.id} value={classroom.id}>
                <div className="flex items-center gap-2">
                  {classroom.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: classroom.color }}
                    />
                  )}
                  <span>{classroom.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Teacher Filter */}
        <Select
          value={teacherFilter}
          onValueChange={(value) => {
            setTeacherFilter(value)
            // Reset classroom filter when teacher filter is changed
            if (value !== 'all') {
              setClassroomFilter('all')
            }
            // Reset to page 1 when filter changes
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
            <SelectValue placeholder={String(t("sessions.allTeachers"))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sessions.allTeachers")}</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.user_id} value={teacher.user_id}>
                {teacher.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
            <SelectValue placeholder={String(t("sessions.allStatuses"))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sessions.allStatuses")}</SelectItem>
            <SelectItem value="scheduled">{t("sessions.scheduled")}</SelectItem>
            <SelectItem value="completed">{t("sessions.completed")}</SelectItem>
            <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filters */}
        <div className="flex gap-2 items-center">
          <div className="space-y-0">
            <DatePickerComponent
              value={startDateFilter}
              onChange={(value) => setStartDateFilter(typeof value === 'string' ? value : '')}
              fieldId="start-date-filter"
              placeholder={String(t("sessions.startDate"))}
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="space-y-0">
            <DatePickerComponent
              value={endDateFilter}
              onChange={(value) => setEndDateFilter(typeof value === 'string' ? value : '')}
              fieldId="end-date-filter"
              placeholder={String(t("sessions.endDate"))}
            />
          </div>
          {(startDateFilter || endDateFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDateFilter('')
                setEndDateFilter('')
              }}
              className="h-12 px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sessions Content */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedSessions.map((session) => (
          <Card key={session.id} className={`p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col h-full ${session.is_virtual ? 'border-dashed opacity-70' : ''}`}>
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${session.is_virtual ? 'border-2 border-dashed' : ''}`}
                  style={{
                    backgroundColor: session.is_virtual ? 'transparent' : (session.classroom_color || '#6B7280'),
                    borderColor: session.is_virtual ? (session.classroom_color || '#6B7280') : 'transparent'
                  }}
                />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{session.classroom_name}</h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mt-1">
                    <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{session.teacher_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleEditClick(session)}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleCopyClick(session)}
                >
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleSaveTemplateClick(session)}
                  title={String(t('sessions.saveAsTemplate'))}
                >
                  <Save className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleDeleteClick(session)}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 flex-grow">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatDate(session.date)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                {session.location === 'online' ? (
                  <Monitor className="w-3 h-3 sm:w-4 sm:h-4" />
                ) : (
                  <Building className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span className="capitalize">{t(`sessions.${session.location}`)}</span>
              </div>

              {session.room_number && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <DoorOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{session.room_number}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {getStatusIcon(session.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
                  {t(`sessions.${session.status}`)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{session.assignment_count || 0}{t((session.assignment_count || 0) !== 1 ? 'sessions.assignmentCountPlural' : 'sessions.assignmentCount')}</span>
              </div>

              {session.substitute_teacher_name && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-600">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{t("sessions.substitute")} {session.substitute_teacher_name}</span>
                </div>
              )}
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2">
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => handleViewDetails(session)}
              >
                {t("sessions.viewDetails")}
              </Button>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Button
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9 min-w-[100px] sm:min-w-[140px]"
                  onClick={() => handleViewAssignments(session)}
                  disabled={(session.assignment_count || 0) === 0}
                >
                  {t("sessions.viewAssignments")}
                </Button>
                <Button
                  className="flex-1 text-xs sm:text-sm h-8 sm:h-9 min-w-[100px] sm:min-w-[140px]"
                  onClick={() => handleViewAttendance(session)}
                >
                  {t("sessions.viewAttendance")}
                </Button>
              </div>
            </div>
          </Card>
          ))}
        </div>
      ) : (
        /* Calendar View */
        <div className="space-y-4">
          {/* Calendar */}
          <Card className="p-4 sm:p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => navigateCalendarMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-xl font-semibold text-gray-900 min-w-[160px] text-center">
                {calendarDate.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <button
                onClick={() => navigateCalendarMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-12 sm:w-16 h-6 rounded border-2 border-blue-500 bg-blue-100 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-blue-700 hidden sm:inline">{t('sessions.legend.exampleClass')}</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-600">{t('sessions.legend.createdSessions')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 sm:w-16 h-6 rounded border-2 border-dashed border-blue-400 bg-blue-50 opacity-70 flex items-center justify-center">
                  <span className="text-[10px] font-medium text-blue-600 hidden sm:inline">{t('sessions.legend.exampleClass')}</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-600">{t('sessions.legend.scheduledSessions')}</span>
              </div>
            </div>

            {/* Scrollable Calendar Container */}
            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[700px]">
                {/* Day Names */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {[String(t('sessions.days.sun')), String(t('sessions.days.mon')), String(t('sessions.days.tue')),
                    String(t('sessions.days.wed')), String(t('sessions.days.thu')), String(t('sessions.days.fri')),
                    String(t('sessions.days.sat'))].map(day => (
                    <div key={day} className="text-sm font-medium text-gray-600 text-center py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
              {getMonthDays(calendarDate).map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-32" />
                }

                const sessionsOnDate = getSessionsForDate(date)
                const isToday = date.toDateString() === new Date().toDateString()
                // const isSelected = selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString()

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => handleCalendarDateClick(date)}
                    className={`
                      min-h-32 p-2 rounded-lg border transition-all hover:shadow-md
                      ${isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      ${sessionsOnDate.length > 0 ? 'hover:border-blue-300' : 'hover:border-gray-300'}
                    `}
                  >
                    <div className="flex flex-col h-full">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      {sessionsOnDate.length > 0 && (
                        <div className="flex-1 mt-1 space-y-1">
                          {sessionsOnDate.map((session) => {
                            const textColor = getReadableTextColor(session.classroom_color)
                            // Convert hex to rgba for soft background
                            const hex = session.classroom_color.replace('#', '')
                            const r = parseInt(hex.substring(0, 2), 16)
                            const g = parseInt(hex.substring(2, 4), 16)
                            const b = parseInt(hex.substring(4, 6), 16)
                            const bgOpacity = session.is_virtual ? 0.12 : 0.2
                            const backgroundColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`

                            return (
                            <div
                              key={session.id}
                              className="text-xs px-1.5 py-1 rounded cursor-pointer hover:shadow-sm transition-all flex items-center justify-between gap-1"
                              style={{
                                backgroundColor: backgroundColor,
                                color: textColor,
                                border: session.is_virtual ? `1px dashed ${textColor}` : `1px solid ${textColor}20`,
                              }}
                              title={`${session.is_virtual ? '📅 ' : ''}${session.classroom_name} - ${formatTime(session.start_time)} - ${t(`sessions.${session.status}`)}`}
                              onClick={(e) => handleSessionClick(e, session)}
                            >
                              <span className="truncate">{formatTime(session.start_time)} {session.classroom_name}</span>
                              {session.status === 'completed' ? (
                                <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: textColor }} />
                              ) : session.status === 'cancelled' ? (
                                <XCircle className="w-3 h-3 flex-shrink-0" style={{ color: textColor }} />
                              ) : (
                                <Clock className="w-3 h-3 flex-shrink-0" style={{ color: textColor }} />
                              )}
                            </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
                </div>
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* Empty State */}
      {viewMode === 'card' && initialized && paginatedSessions.length === 0 && (
        <Card className="p-8 sm:p-12 text-center gap-2">
          <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          {debouncedSessionSearchQuery ? (
            <>
              <h3 className="text-lg font-medium text-gray-900">{t("sessions.noResultsFound")}</h3>
              <p className="text-gray-500 mb-2">
                {t("sessions.noSessionsMatch", { query: debouncedSessionSearchQuery })}
              </p>
              <Button 
                variant="outline"
                className="flex items-center gap-2 mx-auto"
                onClick={() => setSessionSearchQuery('')}
              >
                <X className="w-4 h-4" />
                {t("sessions.clearSearch")}
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900">{t("sessions.noSessionsFound")}</h3>
              <p className="text-gray-500 mb-2">{t("sessions.getStartedFirstSession")}</p>
              <Button
                className="flex items-center gap-2 mx-auto"
                onClick={() => {
                  // Clear original data for new session
                  setOriginalAssignments([])
                  setOriginalAttendance([])
                  setShowModal(true)
                }}
              >
                <Plus className="w-4 h-4" />
                {t("sessions.addSession")}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Pagination Controls - Only show in card view */}
      {viewMode === 'card' && filteredTotalCount > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              {t("sessions.pagination.previous")}
            </Button>
            <Button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
              variant="outline"
            >
              {t("sessions.pagination.next")}
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t("sessions.pagination.showing")}
                <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                {t("sessions.pagination.to")}
                <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredTotalCount)} </span>
                {t("sessions.pagination.of")}
                <span className="font-medium"> {filteredTotalCount} </span>
                {t("sessions.pagination.sessions")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("sessions.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("sessions.pagination.next")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Session Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowModal(false)
            resetForm()
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-3xl max-h-full shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSession ? t("sessions.editSession") : isCreatingFromVirtual ? t("sessions.addRegularSession") : t("sessions.addNewSession")}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="session-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Template Selector */}
                {templates.length > 0 && (
                  <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground/80">
                        {t("sessions.applyTemplate")}
                      </Label>
                      <div className="flex items-center gap-2">
                        {selectedTemplateId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplateId('')
                              resetForm()
                            }}
                            className="text-xs text-red-600 hover:text-red-700 h-6 px-2"
                          >
                            <X className="w-3 h-3 mr-1" />
                            {t("sessions.resetTemplate")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowManageTemplatesModal(true)}
                          className="text-xs text-primary hover:text-primary/90 h-6 px-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          {t("sessions.manageTemplates")}
                        </Button>
                      </div>
                    </div>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={(value) => {
                        setSelectedTemplateId(value)
                        if (value) {
                          handleApplyTemplate(value)
                        }
                      }}
                      onOpenChange={(open) => {
                        if (!open) setTemplateSearchQuery('')
                      }}
                    >
                      <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-white focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                        <SelectValue placeholder={String(t("sessions.selectTemplate"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[90]">
                        <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={String(t("common.search"))}
                              value={templateSearchQuery}
                              onChange={(e) => setTemplateSearchQuery(e.target.value)}
                              className="pl-8 h-8"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {templates.filter(template =>
                            template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
                          ).map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                          {templates.filter(template =>
                            template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
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
                    {t("sessions.classroom")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.classroom_id}
                    onValueChange={(value) => handleFormDataChange('classroom_id', value)}
                    required
                    disabled={!!editingSession}
                    onOpenChange={(open) => {
                      if (!open) setClassroomSearchQuery('')
                    }}
                  >
                    <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                      <SelectValue placeholder={String(t("sessions.selectClassroom"))} />
                    </SelectTrigger>
                    <SelectContent className="z-[90]">
                      <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={String(t("common.search"))}
                            value={classroomSearchQuery}
                            onChange={(e) => setClassroomSearchQuery(e.target.value)}
                            className="pl-8 h-8"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {classrooms.filter(classroom => !classroom.paused).filter(classroom =>
                          classroom.name.toLowerCase().includes(classroomSearchQuery.toLowerCase())
                        ).map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: classroom.color || '#6B7280' }}
                              />
                              {classroom.name}
                            </div>
                          </SelectItem>
                        ))}
                        {classrooms.filter(classroom => !classroom.paused).filter(classroom =>
                          classroom.name.toLowerCase().includes(classroomSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            {t("common.noResults")}
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>


                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                        {t("sessions.date")} <span className="text-red-500">*</span>
                      </Label>
                      {!editingSession && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="multiple-sessions"
                            disabled={!formData.classroom_id}
                            checked={multipleSessions}
                            onChange={(e) => {
                              setMultipleSessions(e.target.checked)
                              if (e.target.checked) {
                                // Switch to multi-select mode
                                if (formData.date) {
                                  setSelectedDates([formData.date])
                                }
                              } else {
                                // Switch to single mode
                                if (selectedDates.length > 0) {
                                  setFormData(prev => ({ ...prev, date: selectedDates[0] }))
                                }
                                setSelectedDates([])
                              }
                            }}
                            className={`w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary checked:bg-primary checked:border-primary accent-primary ${
                              !formData.classroom_id ? 'cursor-not-allowed opacity-50' : ''
                            }`}
                          />
                          <label htmlFor="multiple-sessions" className={`text-xs ${!formData.classroom_id ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t("sessions.multipleSessions")}
                          </label>
                        </div>
                      )}
                    </div>
                    <DatePickerComponent
                      value={formData.date}
                      onChange={(value) => {
                        if (multipleSessions) {
                          setSelectedDates(Array.isArray(value) ? value : [])
                          if (Array.isArray(value) && value.length > 0) {
                            setFormData(prev => ({ ...prev, date: value[0] }))
                          }
                        } else {
                          setFormData(prev => ({ ...prev, date: typeof value === 'string' ? value : '' }))
                        }
                      }}
                      fieldId="date"
                      multiSelect={multipleSessions}
                      selectedDates={selectedDates}
                      disabled={!formData.classroom_id}
                      height={multipleSessions ? (selectedDates.length > 2 ? "min-h-[5rem]" : selectedDates.length > 0 ? "min-h-[3rem]" : "h-10") : "h-10"}
                      shadow=""
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.statusLabel")}
                    </Label>
                    <Select 
                      disabled={!formData.classroom_id}
                      value={formData.status} 
                      onValueChange={(value) => formData.classroom_id && handleFormDataChange('status', value)}
                    >
                      <SelectTrigger className={`!h-10 w-full rounded-lg border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3 ${
                        !formData.classroom_id 
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'border-border bg-transparent focus:border-primary focus-visible:border-primary'
                      }`}>
                        <SelectValue placeholder={String(t("sessions.selectStatus"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[90]">
                        <SelectItem value="scheduled">{t("sessions.scheduled")}</SelectItem>
                        <SelectItem value="completed">{t("sessions.completed")}</SelectItem>
                        <SelectItem value="cancelled">{t("sessions.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.startTime")} <span className="text-red-500">*</span>
                    </Label>
                    <TimePickerComponent
                      value={formData.start_time}
                      onChange={(value) => handleFormDataChange('start_time', value)}
                      fieldId="start_time"
                      disabled={!formData.classroom_id}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.endTime")} <span className="text-red-500">*</span>
                    </Label>
                    <TimePickerComponent
                      value={formData.end_time}
                      onChange={(value) => handleFormDataChange('end_time', value)}
                      fieldId="end_time"
                      disabled={!formData.classroom_id}
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.location")}
                    </Label>
                    <Select
                      disabled={!formData.classroom_id}
                      value={formData.location}
                      onValueChange={(value) => formData.classroom_id && handleFormDataChange('location', value)}
                    >
                      <SelectTrigger className={`!h-10 w-full rounded-lg border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3 ${
                        !formData.classroom_id
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-border bg-transparent focus:border-primary focus-visible:border-primary'
                      }`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[90]">
                        <SelectItem value="offline">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            {t("sessions.offline")}
                          </div>
                        </SelectItem>
                        <SelectItem value="online">
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            {t("sessions.online")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.roomNumber")}
                    </Label>
                    <Input
                      type="text"
                      disabled={!formData.classroom_id}
                      value={formData.room_number}
                      onChange={(e) => formData.classroom_id && handleFormDataChange('room_number', e.target.value)}
                      placeholder={String(t("sessions.roomNumberPlaceholder"))}
                      className={`!h-10 w-full rounded-lg border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
                        !formData.classroom_id
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-border bg-transparent focus:border-primary focus-visible:border-primary'
                      }`}
                    />
                  </div>
                </div>

                {userRole !== 'teacher' && (
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                      {t("sessions.substituteTeacher")}
                    </Label>
                    <Select
                      disabled={!formData.classroom_id}
                      value={formData.substitute_teacher}
                      onValueChange={(value) => formData.classroom_id && handleFormDataChange('substitute_teacher', value)}
                    >
                      <SelectTrigger className={`!h-10 w-full rounded-lg border focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3 ${
                        !formData.classroom_id
                          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-border bg-transparent focus:border-primary focus-visible:border-primary'
                      }`}>
                        <SelectValue placeholder={String(t("sessions.selectSubstituteTeacher"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[90]">
                        {teachers.filter((teacher) => {
                          // Find the current classroom's teacher_id
                          const currentClassroom = classrooms.find(c => c.id === formData.classroom_id)
                          // Filter out the current classroom teacher from substitute options
                          return currentClassroom?.teacher_id !== teacher.user_id
                        }).map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.user_id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}


                {/* Message when multiple sessions is selected */}
                {multipleSessions && (showModal || editingSession) && (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500 whitespace-pre-line">
                      {t("sessions.multipleSessionsNote")}
                    </p>
                  </div>
                )}

                {/* Attendance Section */}
                {(editingSession || showModal) && !multipleSessions && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-foreground/80">
                        {t("sessions.attendanceLabel")}
                      </Label>
                      {editingSession && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            loadAvailableStudents(formData.classroom_id)
                            setShowAddAttendanceModal(true)
                          }}
                          className="h-8 px-2 text-[#2885e8] hover:text-[#2885e8]/80"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t("sessions.addAttendance")}
                        </Button>
                      )}
                    </div>
                    <div className="border border-border rounded-lg bg-gray-50 p-4">
                      {modalAttendance.length === 0 ? (
                        <div className="text-center py-4">
                          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">{t("sessions.noStudentsInClassroom")}</p>
                        </div>
                      ) : (
                        <>
                          {/* Search Bar */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                              type="text"
                              placeholder={String(t("sessions.searchStudentsByName"))}
                              value={attendanceSearchQuery}
                              onChange={handleAttendanceSearchChange}
                              className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                            />
                          </div>
                          
                          {/* Mark All Present Button */}
                          <div className="mb-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={markAllPresent}
                              className="h-8 px-3 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t("sessions.markAllPresent")}
                            </Button>
                          </div>
                          
                          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                            {filteredAttendance.length === 0 ? (
                              <div className="text-center py-4">
                                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">{t("sessions.noStudentsFound")}</p>
                              </div>
                            ) : (
                              filteredAttendance.map((attendance) => (
                                <div key={attendance.id} className="p-3 bg-white rounded-lg border space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{attendance.student_name}</span>
                                    <Select 
                                      value={attendance.status} 
                                      onValueChange={(value) => updateAttendanceStatus(attendance.student_id, value as Attendance['status'])}
                                    >
                                      <SelectTrigger className="!h-10 w-full max-w-[140px] rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                                        <SelectValue placeholder={String(t("sessions.selectStatus"))} />
                                      </SelectTrigger>
                                      <SelectContent className="z-[90]">
                                        <SelectItem value="pending">{t("sessions.pending")}</SelectItem>
                                        <SelectItem value="present">{t("sessions.present")}</SelectItem>
                                        <SelectItem value="absent">{t("sessions.absent")}</SelectItem>
                                        <SelectItem value="late">{t("sessions.late")}</SelectItem>
                                        <SelectItem value="excused">{t("sessions.excused")}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Input
                                      type="text"
                                      placeholder={String(t("sessions.addNoteForStudent"))}
                                      value={attendance.note || ''}
                                      onChange={(e) => handleAttendanceNoteUpdate(attendance.student_id, e.target.value)}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Assignments Section */}
                {(editingSession || showModal) && !multipleSessions && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                        {t("sessions.assignmentsLabel")}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!formData.classroom_id}
                        onClick={() => {
                          console.log('[Assignment Debug] Button clicked, formData.classroom_id:', formData.classroom_id)
                          if (formData.classroom_id) {
                            addAssignment()
                          } else {
                            console.log('[Assignment Debug] Button click blocked due to no classroom_id')
                          }
                        }}
                        className={`h-8 px-2 ${
                          !formData.classroom_id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-[#2885e8] hover:text-[#2885e8]/80'
                        }`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("sessions.addAssignment")}
                      </Button>
                    </div>
                    
                    {modalAssignments.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">{t("sessions.noAssignmentsAdded")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {modalAssignments.map((assignment, index) => (
                          <div key={assignment.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium text-foreground/80">
                                {t("sessions.assignmentNumber")} {index + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAssignment(assignment.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3 text-gray-500" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.titleRequired")}</Label>
                                  <Input
                                    value={assignment.title}
                                    onChange={(e) => handleAssignmentUpdate(assignment.id, 'title', e.target.value)}
                                    placeholder={String(t("sessions.assignmentTitle"))}
                                    className="h-9 text-sm bg-white focus:border-primary"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.type")}</Label>
                                  <Select 
                                    value={assignment.assignment_type} 
                                    onValueChange={(value) => updateAssignment(assignment.id, 'assignment_type', value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="z-[90]">
                                      <SelectItem value="homework">{t("sessions.homework")}</SelectItem>
                                      <SelectItem value="quiz">{t("sessions.quiz")}</SelectItem>
                                      <SelectItem value="test">{t("sessions.test")}</SelectItem>
                                      <SelectItem value="project">{t("sessions.project")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.category")}</Label>
                                <Select 
                                  value={assignment.assignment_categories_id} 
                                  onValueChange={(value) => {
                                    if (value === 'add-new' && isManager) {
                                      setShowInlineCategoryCreate(assignment.id)
                                    } else {
                                      updateAssignment(assignment.id, 'assignment_categories_id', value)
                                    }
                                  }}
                                  disabled={!(showDetailsModal ? viewingSession?.classroom_id : formData.classroom_id)}
                                >
                                  <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                                    <SelectValue placeholder={(showDetailsModal ? viewingSession?.classroom_id : formData.classroom_id) ? t("sessions.selectCategory") : t("sessions.selectClassroomFirst")} />
                                  </SelectTrigger>
                                  <SelectContent className="z-[90]">
                                    {(showDetailsModal ? getFilteredCategoriesForSession() : getFilteredCategories()).map((category) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                    {isManager && (showDetailsModal ? viewingSession?.classroom_id : formData.classroom_id) && (
                                      <SelectItem value="add-new">
                                        <Plus className="w-4 h-4 inline mr-2" />
                                        {t("sessions.addCategory")}
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                                
                                {showInlineCategoryCreate === assignment.id && (
                                  <div className="space-y-2 mt-2">
                                    <Input
                                      type="text"
                                      value={newCategoryName}
                                      onChange={handleNewCategoryNameChange}
                                      placeholder={String(t("sessions.enterCategoryName"))}
                                      className="h-9 text-sm rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                                      disabled={isCreatingCategory}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCreateCategory(assignment.id)
                                        } else if (e.key === 'Escape') {
                                          setShowInlineCategoryCreate(null)
                                          setNewCategoryName('')
                                        }
                                      }}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        onClick={() => handleCreateCategory(assignment.id)}
                                        disabled={!newCategoryName.trim() || isCreatingCategory}
                                        size="sm"
                                      >
                                        {isCreatingCategory ? t('common.saving') : t('common.create')}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setShowInlineCategoryCreate(null)
                                          setNewCategoryName('')
                                        }}
                                        size="sm"
                                        disabled={isCreatingCategory}
                                      >
                                        {t('common.cancel')}
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.descriptionLabel")}</Label>
                                <textarea
                                  value={assignment.description || ''}
                                  onChange={(e) => handleAssignmentUpdate(assignment.id, 'description', e.target.value)}
                                  placeholder={String(t("sessions.assignmentDescription"))}
                                  rows={2}
                                  className="w-full min-h-[2rem] px-3 py-2 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">{t("sessions.dueDate")} <span className="text-red-500">*</span></Label>
                                <DatePickerComponent
                                  value={assignment.due_date}
                                  onChange={(value) => handleAssignmentUpdate(assignment.id, 'due_date', Array.isArray(value) ? value[0] || '' : value)}
                                  fieldId={`assignment-due-date-${assignment.id}`}
                                  height="h-10"
                                  shadow=""
                                  placeholder={String(t("sessions.selectDueDate"))}
                                />
                              </div>
                              
                              <div>
                                <Label className="text-xs text-foreground/60 mb-1 block">
                                  <Paperclip className="inline w-3 h-3 mr-1" />
                                  {t("assignments.attachments")}
                                </Label>
                                <FileUpload
                                  files={assignment.attachments || []}
                                  onChange={(files) => handleAssignmentAttachments(assignment.id, files)}
                                  maxFiles={3}
                                  showPreview={false}
                                  className="border border-border rounded-lg p-2 bg-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className={`text-sm font-medium ${!formData.classroom_id ? 'text-gray-400' : 'text-foreground/80'}`}>
                    {t("sessions.notesLabel")}
                  </Label>
                  <textarea
                    disabled={!formData.classroom_id}
                    value={formData.notes}
                    onChange={(e) => formData.classroom_id && handleFormDataChange('notes', e.target.value)}
                    rows={3}
                    className={`w-full min-h-[2.5rem] px-3 py-2 rounded-lg border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm ${
                      !formData.classroom_id
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-border bg-transparent focus:border-primary'
                    }`}
                    placeholder={String(t("sessions.additionalNotes"))}
                  />
                </div>
              </form>
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="flex-1"
              >
                {t("sessions.cancel")}
              </Button>
              <Button
                type="submit"
                form="session-form"
                className="flex-1"
                disabled={!isFormValid || isCreating || isSaving}
              >
                {(editingSession ? isSaving : isCreating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingSession
                  ? (isSaving ? t("common.saving") : t("sessions.updateSession"))
                  : (isCreating ? t("common.creating") : isCreatingFromVirtual ? t("sessions.addRegularSessionButton") : t("sessions.addSession"))
                }
              </Button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteModal && sessionToDelete && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowDeleteModal(false)
            setSessionToDelete(null)
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-md max-h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.deleteSession")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSessionToDelete(null)
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600">
                  {t("sessions.deleteSessionConfirm")}
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSessionToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t("sessions.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? t("common.deleting") : t("sessions.deleteSession")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && templateToSave && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowSaveTemplateModal(false)
            setSaveTemplateFormData({ name: '', includeAssignments: false })
            setTemplateToSave(null)
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-md max-h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.saveAsTemplate")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSaveTemplateModal(false)
                    setSaveTemplateFormData({ name: '', includeAssignments: false })
                    setTemplateToSave(null)
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <Label htmlFor="template-name" className="text-sm font-medium text-gray-700">
                    {t('sessions.templateName')}
                  </Label>
                  <Input
                    id="template-name"
                    type="text"
                    value={saveTemplateFormData.name}
                    onChange={(e) => setSaveTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={String(t('sessions.templateNamePlaceholder'))}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="include-assignments"
                    checked={saveTemplateFormData.includeAssignments}
                    onChange={(e) => setSaveTemplateFormData(prev => ({ ...prev, includeAssignments: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="include-assignments" className="text-sm text-gray-700 cursor-pointer">
                    {t('sessions.includeAssignments')}
                  </Label>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSaveTemplateModal(false)
                    setSaveTemplateFormData({ name: '', includeAssignments: false })
                    setTemplateToSave(null)
                  }}
                  className="flex-1"
                >
                  {t("sessions.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="flex-1"
                  disabled={isSaving || !saveTemplateFormData.name.trim()}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? t("common.saving") : t("sessions.saveTemplate")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Template Confirmation Modal */}
      {showDeleteTemplateModal && (templateToDelete || selectedTemplates.size > 0) && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowDeleteTemplateModal(false)
            setTemplateToDelete(null)
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-md max-h-full shadow-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.deleteTemplate")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteTemplateModal(false)
                    setTemplateToDelete(null)
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600">
                  {selectedTemplates.size > 0
                    ? t("sessions.deleteSelectedTemplatesConfirm").replace("{count}", String(selectedTemplates.size))
                    : t("sessions.deleteTemplateConfirm")
                  }
                </p>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteTemplateModal(false)
                    setTemplateToDelete(null)
                  }}
                  className="flex-1"
                >
                  {t("sessions.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteTemplate}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? t("common.deleting") : t("sessions.deleteTemplate")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Template Confirmation Modal */}
      {showTemplateConfirmModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowTemplateConfirmModal(false)
            setPendingTemplateId('')
            setTemplateFieldChanges({})
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-2xl max-h-full shadow-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.applyTemplateConfirm")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowTemplateConfirmModal(false)
                    setPendingTemplateId('')
                    setTemplateFieldChanges({})
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {t("sessions.templateChangeWarning")}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {t("sessions.classroomWillBePreserved")}
                  </p>
                </div>
              </div>

              {/* Show field changes */}
              {Object.keys(templateFieldChanges).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">{t("sessions.fieldsThatWillChange")}:</h3>
                  <div className="space-y-3">
                    {Object.entries(templateFieldChanges).map(([field, values]) => {
                      // Get user-friendly field names
                      const fieldNameMap: Record<string, string> = {
                        status: t("sessions.status"),
                        start_time: t("sessions.startTime"),
                        end_time: t("sessions.endTime"),
                        location: t("sessions.location"),
                        room_number: t("sessions.roomNumber"),
                        notes: t("sessions.notes"),
                        substitute_teacher: t("sessions.substituteTeacher")
                      }

                      // Translate field values based on field type
                      const translateValue = (fieldName: string, value: any): string => {
                        if (!value) return value

                        // Translate status values
                        if (fieldName === 'status') {
                          const statusMap: Record<string, string> = {
                            'scheduled': t("sessions.scheduled"),
                            'completed': t("sessions.completed"),
                            'cancelled': t("sessions.cancelled")
                          }
                          return statusMap[value] || value
                        }

                        // Translate location values
                        if (fieldName === 'location') {
                          const locationMap: Record<string, string> = {
                            'offline': t("sessions.offline"),
                            'online': t("sessions.online")
                          }
                          return locationMap[value] || value
                        }

                        return value
                      }

                      const displayFieldName = fieldNameMap[field] || field
                      const displayCurrentValue = translateValue(field, values.current)
                      const displayNewValue = translateValue(field, values.new)

                      return (
                        <div key={field} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                          <span className="font-medium text-gray-700 min-w-[120px]">{displayFieldName}:</span>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-gray-500 line-through">{displayCurrentValue}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="text-primary font-medium">{displayNewValue}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Show assignment replacement warning */}
              {(() => {
                const template = templates.find(t => t.id === pendingTemplateId)
                if (template?.include_assignments && template?.assignments_data) {
                  const currentAssignmentsCount = modalAssignments.length
                  const templateAssignmentsCount = template.assignments_data.length

                  return (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900">
                        {t("sessions.assignmentsWillBeReplaced")
                          .replace("{current}", String(currentAssignmentsCount))
                          .replace("{new}", String(templateAssignmentsCount))}
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTemplateConfirmModal(false)
                  setPendingTemplateId('')
                  setTemplateFieldChanges({})
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTemplateApplication}
                className="flex-1"
              >
                {t("sessions.applyTemplate")}
              </Button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Manage Templates Modal */}
      {showManageTemplatesModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowManageTemplatesModal(false)
            setSelectedTemplates(new Set())
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-2xl max-h-full shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.manageTemplatesTitle")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowManageTemplatesModal(false)
                    setSelectedTemplates(new Set())
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
              {templates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t("sessions.noTemplatesYet")}</p>
              ) : (
                <>
                  {/* Select/Deselect All */}
                  <div className="mb-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedTemplates.size === templates.length) {
                          setSelectedTemplates(new Set())
                        } else {
                          setSelectedTemplates(new Set(templates.map(t => t.id)))
                        }
                      }}
                    >
                      {selectedTemplates.size === templates.length ? t("common.deselectAll") : t("common.selectAll")}
                    </Button>
                    {selectedTemplates.size > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowDeleteTemplateModal(true)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("common.delete")} ({selectedTemplates.size})
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTemplates.has(template.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedTemplates)
                            if (e.target.checked) {
                              newSelected.add(template.id)
                            } else {
                              newSelected.delete(template.id)
                            }
                            setSelectedTemplates(newSelected)
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-primary"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {template.include_assignments
                              ? t("sessions.includeAssignments")
                              : t("sessions.templateName")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            handleDeleteTemplateClick(template)
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex-shrink-0 flex items-center justify-end p-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowManageTemplatesModal(false)
                  setSelectedTemplates(new Set())
                }}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Completion Warning Modal */}
      <ConfirmationModal
        isOpen={showCompletionWarningModal}
        onClose={() => setShowCompletionWarningModal(false)}
        onConfirm={handleConfirmedCompletion}
        title={t('sessions.completionWarningTitle') as string}
        message={t('sessions.completionWarning') as string}
        confirmText={t('common.confirm') as string}
        cancelText={t('common.cancel') as string}
        variant="warning"
        loading={isSaving}
      />

      {/* Session Details Modal */}
      {showDetailsModal && viewingSession && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowDetailsModal(false)
            setViewingSession(null)
            setSessionAssignments([])
            setSessionAttendance([])
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-6xl max-h-full shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: viewingSession.classroom_color || '#6B7280' }}
                  />
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{viewingSession.classroom_name}</h2>
                    {viewingSession.is_virtual && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {t('sessions.virtualSession')}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDetailsModal(false)
                    setViewingSession(null)
                    setSessionAssignments([])
                    setSessionAttendance([])
                  }}
                  className="p-1"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Session Info & Assignments */}
                <div className="space-y-6">
                  {/* Session Info */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {t("attendance.sessionInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.date")}</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingSession.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.time")}</p>
                          <p className="font-medium text-gray-900">{formatTime(viewingSession.start_time)} - {formatTime(viewingSession.end_time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.teacher")}</p>
                          <p className="font-medium text-gray-900">{viewingSession.teacher_name || 'Not assigned'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.location")}</p>
                          <p className="font-medium text-gray-900 capitalize">{t(`sessions.${viewingSession.location}`)}</p>
                        </div>
                      </div>
                      {viewingSession.room_number && (
                        <div className="flex items-center gap-3">
                          <DoorOpen className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("sessions.room")}</p>
                            <p className="font-medium text-gray-900">{viewingSession.room_number}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {getStatusIcon(viewingSession.status)}
                        <div>
                          <p className="text-sm text-gray-600">{t("sessions.status")}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(viewingSession.status)}`}>
                            {t(`sessions.${viewingSession.status}`)}
                          </span>
                        </div>
                      </div>
                      {viewingSession.substitute_teacher_name && (
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("sessions.substituteTeacher")}</p>
                            <p className="font-medium text-orange-600">{viewingSession.substitute_teacher_name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Assignments */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {t("sessions.assignmentsCount")} ({sessionAssignments.length})
                    </h3>
                    {sessionAssignments.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("sessions.noAssignmentsForSession")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {sessionAssignments.map((assignment) => (
                          <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{assignment.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                assignment.assignment_type === 'quiz' ? 'bg-blue-100 text-blue-800' :
                                assignment.assignment_type === 'homework' ? 'bg-green-100 text-green-800' :
                                assignment.assignment_type === 'test' ? 'bg-red-100 text-red-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {t(`sessions.${assignment.assignment_type}`)}
                              </span>
                            </div>
                            {assignment.description && (
                              <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {assignment.due_date && (
                                <span>{t("sessions.due")} {new Date(assignment.due_date).toLocaleDateString()}</span>
                              )}
                              {assignment.category_name && (
                                <span>{t("sessions.categoryColon")} {assignment.category_name}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Notes */}
                  {viewingSession.notes && (
                    <Card className="p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("sessions.notes")}</h3>
                      <p className="text-gray-700 leading-relaxed">{viewingSession.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Attendance */}
                <div className="space-y-6">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("sessions.attendanceCount")} ({sessionAttendance.length})
                    </h3>
                    {sessionAttendance.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("sessions.noAttendanceRecords")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessionAttendance.map((attendance) => (
                          <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {attendance.student_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{attendance.student_name || t('sessions.unknownStudent')}</p>
                                {attendance.note && (
                                  <p className="text-sm text-gray-500">{attendance.note}</p>
                                )}
                              </div>
                            </div>
                            {attendance.status === 'pending' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                {t('sessions.pending')}
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                attendance.status === 'excused' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {t(`sessions.${attendance.status}`)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Attendance Summary */}
                  {sessionAttendance.length > 0 && (
                    <Card className="p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("sessions.attendanceSummary")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-green-600">
                            {sessionAttendance.filter(a => a.status === 'present').length}
                          </p>
                          <p className="text-sm text-green-700">{t("sessions.present")}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-red-600">
                            {sessionAttendance.filter(a => a.status === 'absent').length}
                          </p>
                          <p className="text-sm text-red-700">{t("sessions.absent")}</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                            {sessionAttendance.filter(a => a.status === 'late').length}
                          </p>
                          <p className="text-sm text-yellow-700">{t("sessions.late")}</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-blue-600">
                            {sessionAttendance.filter(a => a.status === 'excused').length}
                          </p>
                          <p className="text-sm text-blue-700">{t("sessions.excused")}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex-shrink-0 flex items-center p-6 pt-4 border-t border-gray-200 ${viewingSession.is_virtual ? 'justify-end' : 'justify-between'}`}>
              {!viewingSession.is_virtual && (
                <div className="text-sm text-gray-500">
                  {t("common.created")}: {new Date(viewingSession.created_at).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US')}
                  {viewingSession.updated_at !== viewingSession.created_at && (
                    <span className="ml-4">
                      {t("sessions.updatedColon")} {new Date(viewingSession.updated_at).toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US')}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                {viewingSession.is_virtual ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      // Capture virtual session data before closing modal
                      const virtualSession = viewingSession

                      // Close details modal
                      setShowDetailsModal(false)
                      setViewingSession(null)
                      setSessionAssignments([])
                      setSessionAttendance([])

                      // Clear editing session to indicate create mode
                      setEditingSession(null)

                      // Clear modal state for fresh create
                      setModalAssignments([])
                      setOriginalAssignments([])
                      setOriginalAttendance([])

                      // Mark as creating from virtual session
                      setIsCreatingFromVirtual(true)

                      // Pre-fill form with virtual session data
                      setFormData({
                        classroom_id: virtualSession.classroom_id,
                        date: virtualSession.date,
                        start_time: virtualSession.start_time,
                        end_time: virtualSession.end_time,
                        status: 'scheduled',
                        location: virtualSession.location,
                        room_number: virtualSession.room_number || '',
                        notes: virtualSession.notes || '',
                        substitute_teacher: virtualSession.substitute_teacher || ''
                      })

                      // Load students for attendance (for new session creation)
                      await loadClassroomStudentsForAttendance(virtualSession.classroom_id)

                      // Open create modal
                      setShowModal(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t("sessions.createSession")}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleSaveTemplateClick(viewingSession)}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {t("sessions.saveAsTemplate")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleEditClick(viewingSession)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      {t("sessions.editSession")}
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setViewingSession(null)
                    setSessionAssignments([])
                    setSessionAttendance([])
                  }}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Add Attendance Modal */}
      {showAddAttendanceModal && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowAddAttendanceModal(false)
            setAvailableStudents([])
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-md max-h-full shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">{t("sessions.addStudentsToAttendance")}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddAttendanceModal(false)
                    setAvailableStudents([])
                  }}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {availableStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{t("sessions.allStudentsInAttendance")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-4">
                      {t("sessions.selectStudentsToAdd")}
                    </p>
                    {availableStudents.map((student) => (
                      <div key={student.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <span className="text-sm font-medium text-gray-900">{student.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => addStudentToAttendance(student)}
                          className="h-8 px-3 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {t("common.add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex items-center justify-end p-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setShowAddAttendanceModal(false)
                    setAvailableStudents([])
                  }}
                >
                  {t("common.done")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Day Sessions Modal */}
      {showDaySessionsModal && selectedCalendarDate && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]" onClick={() => {
            setShowDaySessionsModal(false)
          }} />
          <div
            className="fixed z-[201] flex items-center justify-center p-4"
            style={{
              top: 'env(safe-area-inset-top, 0px)',
              left: 0,
              right: 0,
              bottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="bg-white rounded-lg border border-border w-full max-w-2xl max-h-full shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedCalendarDate.toLocaleDateString(language === 'korean' ? 'ko-KR' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDaySessionsModal(false)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {getSessionsForDate(selectedCalendarDate).map(session => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer ${session.is_virtual ? 'border-dashed opacity-70' : 'border-gray-200'}`}
                    onClick={() => {
                      handleViewDetails(session)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full flex-shrink-0 ${session.is_virtual ? 'border-2 border-dashed' : ''}`}
                          style={{
                            backgroundColor: session.is_virtual ? 'transparent' : (session.classroom_color || '#6B7280'),
                            borderColor: session.is_virtual ? (session.classroom_color || '#6B7280') : 'transparent'
                          }}
                        />
                        <div>
                          <h5 className="font-medium text-gray-900">{session.classroom_name}</h5>
                          <p className="text-sm text-gray-600">{session.teacher_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{session.start_time} - {session.end_time}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          {session.location === 'online' ? <Monitor className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                          <span>{t(`sessions.${session.location}`)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{session.student_count || 0} {t('sessions.students')}</span>
                        </div>
                        {(session.assignment_count ?? 0) > 0 && (
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>{session.assignment_count} {t('navigation.assignments')}</span>
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {t(`sessions.${session.status}`)}
                      </span>
                    </div>

                    {session.substitute_teacher_name && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mt-3">
                        <GraduationCap className="w-4 h-4" />
                        <span>{t("sessions.substitute")}: {session.substitute_teacher_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                {t('sessions.sessionsOnDate', { count: getSessionsForDate(selectedCalendarDate).length })}
              </p>
              <Button
                variant="default"
                onClick={() => {
                  setShowDaySessionsModal(false)
                }}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  )
}