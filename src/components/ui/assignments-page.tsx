"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAssignmentsData } from '@/components/ui/assignments/hooks/useAssignmentsData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Building,
  X,
  Search,
  CheckCircle,
  FileText,
  Paperclip,
  Grid3X3,
  List,
  Eye,
  ClipboardList,
  Loader2,
  CalendarDays,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Filter
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { FileUpload } from '@/components/ui/file-upload'
import { AttachmentList } from '@/components/ui/attachment-list'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { showSuccessToast, showErrorToast } from '@/stores'
import { invalidateSessionsCache } from '@/components/ui/sessions-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'
import { AssignmentCreateEditModal } from '@/components/ui/assignments/modals/AssignmentCreateEditModal'
import { AssignmentDeleteModal } from '@/components/ui/assignments/modals/AssignmentDeleteModal'
import { AssignmentDetailsModal } from '@/components/ui/assignments/modals/AssignmentDetailsModal'
import { SubmissionsGradeModal } from '@/components/ui/assignments/modals/SubmissionsGradeModal'

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
  classroom_session_id: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  title: string
  description?: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date?: string
  assignment_categories_id?: string
  category_name?: string
  attachments?: AttachmentFile[]
  created_at: string
  updated_at: string
  student_count?: number
  submitted_count?: number
  pending_count?: number
}

interface AssignmentsPageProps {
  academyId: string
  filterSessionId?: string
}

interface StudentCountRecord {
  classroom_id: string
}

interface SubmissionCountRecord {
  assignment_id: string
  status?: string
}


interface Session {
  id: string
  classroom_name: string
  classroom_id: string
  subject_id?: string
  date: string
  start_time: string
  end_time: string
}

interface SubmissionGrade {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  status: 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue'
  score?: number
  feedback?: string
  submitted_date?: string
  created_at?: string
  updated_at?: string
  attendance_status?: 'present' | 'late' | 'absent' | 'pending'
}

// interface RawSubmissionGrade {
//   id: string
//   assignment_id: string
//   student_id: string
//   status: 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue'
//   score?: number
//   feedback?: string
//   submitted_date?: string
//   created_at?: string
//   updated_at?: string
//   students?: {
//     users?: {
//       name: string
//     }
//   }
// }

// PERFORMANCE: Helper function to invalidate cache
export const invalidateAssignmentsCache = (academyId: string) => {
  // Clear all assignment caches for this academy
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`assignments-`) && key.includes(academyId)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

}

// Extracted outside AssignmentsPage to avoid hooks-in-nested-component issues
export function AssignmentsDatePicker({
  value,
  onChange,
  fieldId,
  multiSelect = false,
  selectedDates = [],
  disabled = false,
  placeholder,
  height = 'h-12',
  shadow = 'shadow-sm',
  activeDatePicker,
  setActiveDatePicker,
  t,
  language
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
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
  t: (key: string) => string | Record<string, unknown>
  language: string
}) {
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
  }, [isOpen, setActiveDatePicker])
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder || t('assignments.selectDate')
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
    const selectedDateObj = new Date(viewYear, viewMonth, day)
    // Format as YYYY-MM-DD in local timezone instead of UTC
    const year = selectedDateObj.getFullYear()
    const month = String(selectedDateObj.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDateObj.getDate()).padStart(2, '0')
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
    t('assignments.months.january'), t('assignments.months.february'), t('assignments.months.march'),
    t('assignments.months.april'), t('assignments.months.may'), t('assignments.months.june'),
    t('assignments.months.july'), t('assignments.months.august'), t('assignments.months.september'),
    t('assignments.months.october'), t('assignments.months.november'), t('assignments.months.december')
  ]
  const dayNames = [
    t('assignments.days.sun'), t('assignments.days.mon'), t('assignments.days.tue'),
    t('assignments.days.wed'), t('assignments.days.thu'), t('assignments.days.fri'), t('assignments.days.sat')
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
              ? 'bg-white border-blue-500'
              : 'bg-white border-border hover:border-blue-500'
        }`}
      >
        {multiSelect ? (
          selectedDates.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedDates.map((date, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {formatDisplayDate(date)}
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDates = selectedDates.filter(d => d !== date)
                      onChange(newDates)
                    }}
                    className="text-blue-600 hover:text-blue-800 ml-1 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-500">{t("assignments.selectDates")}</span>
          )
        ) : (
          formatDisplayDate(value)
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0" style={{ zIndex: 9999 }}>
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
            {dayNames.map((day) => (
              <div key={String(day)} className="text-xs text-gray-500 text-center py-1 font-medium">
                {String(day)}
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
                  className={`h-8 w-8 text-sm rounded hover:bg-gray-100 flex items-center justify-center ${
                    isSelected
                      ? multiSelect
                        ? 'bg-blue-500 text-white font-medium'
                        : 'bg-blue-50 text-blue-600 font-medium'
                      : isToday
                      ? 'bg-gray-100 font-medium'
                      : ''
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
                  className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium"
                >
                  {t("common.done")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const year = today.getFullYear()
                  const month = String(today.getMonth() + 1).padStart(2, '0')
                  const day = String(today.getDate()).padStart(2, '0')
                  const todayString = `${year}-${month}-${day}`
                  onChange(todayString)
                  setActiveDatePicker(null)
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t("assignments.today")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AssignmentsPage({ academyId, filterSessionId }: AssignmentsPageProps) {
  const { t, language } = useTranslation()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getCategoriesBySubjectId, refreshCategories } = useSubjectData(academyId)
  const { createAssignmentCategory } = useSubjectActions()

  // Data fetching hook - manages assignments, sessions, classrooms, loading, etc.
  const {
    assignments, setAssignments,
    sessions,
    classrooms,
    loading,
    initialized,
    pendingGradesCount,
    totalCount,
    isManager,
    fetchAssignments,
  } = useAssignmentsData(academyId, filterSessionId)

  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [viewModalLoading, setViewModalLoading] = useState(false)
  const [submissionsModalLoading, setSubmissionsModalLoading] = useState(false)
  const [editModalLoading, setEditModalLoading] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [submissionsAssignment, setSubmissionsAssignment] = useState<Assignment | null>(null)
  const [submissionGrades, setSubmissionGrades] = useState<SubmissionGrade[]>([])
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [sortBy, setSortBy] = useState<{field: 'session' | 'due', direction: 'asc' | 'desc'} | null>(null)
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  // Initialize classroom filter from URL parameter
  const classroomFromUrl = searchParams.get('classroom')
  const [classroomFilter, setClassroomFilter] = useState<string>(classroomFromUrl || 'all')

  // Update URL when classroom filter changes
  const updateClassroomFilter = useCallback((value: string) => {
    setClassroomFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('classroom')
    } else {
      params.set('classroom', value)
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [searchParams, router])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12
  const sessionsPerPage = 5 // For list view - show 5 complete sessions per page

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  // Reset to page 1 when client-side filters change or view mode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [assignmentSearchQuery, classroomFilter, showPendingOnly, sortBy, viewMode])

  const [assignmentGrades, setAssignmentGrades] = useState<SubmissionGrade[]>([])
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)

  // Manager role and inline category creation states
  const [showInlineCategoryCreate, setShowInlineCategoryCreate] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const [formData, setFormData] = useState({
    classroom_session_id: '',
    title: '',
    description: '',
    assignment_type: 'homework' as 'quiz' | 'homework' | 'test' | 'project',
    due_date: '',
    assignment_categories_id: ''
  })

  // Check if form is valid (required fields are filled)
  const isFormValid = Boolean(
    formData.title.trim() &&
    formData.classroom_session_id &&
    formData.due_date
  )

  // Debug logging (remove after testing)

  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([])

  // Handle inline category creation
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    const selectedSession = sessions.find(s => s.id === formData.classroom_session_id)
    if (!selectedSession?.subject_id) {
      toast({ title: String(t('categories.selectSubjectFirst')), variant: 'warning' })
      return
    }


    if (!isManager) {
      toast({ title: String(t('categories.managerPermissionRequired')), variant: 'destructive' })
      return
    }

    setIsCreatingCategory(true)
    try {
      // Verify authentication before creating
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: String(t('categories.loginRequired')), variant: 'destructive' })
        return
      }


      const result = await createAssignmentCategory({
        name: newCategoryName.trim(),
        academy_id: academyId,
        subject_id: selectedSession.subject_id
      })


      if (result.success) {
        // Refresh categories to show new category immediately
        await refreshCategories()
        setFormData({ ...formData, assignment_categories_id: result.data?.id || '' })
        setNewCategoryName('')
        setShowInlineCategoryCreate(false)
        
        // Success feedback (could be replaced with toast notification)
      } else {
        const errorMsg = result.error?.message || 'Failed to create category'
        console.error('[Category Debug] Creation failed:', result.error)
        
        // Show user-friendly error message
        if (errorMsg.includes('Permission denied') || errorMsg.includes('Manager access required')) {
          toast({ title: String(t('categories.managerPermissionContact')), variant: 'destructive' })
        } else if (errorMsg.includes('already exists')) {
          toast({ title: String(t('categories.alreadyExists', { name: newCategoryName.trim() })), variant: 'warning' })
        } else {
          toast({ title: String(t('categories.createFailed', { error: errorMsg })), variant: 'destructive' })
        }
      }
    } catch (error) {
      console.error('[Category Debug] Exception during creation:', error)
      toast({ title: String(t('categories.createFailedRetry')), variant: 'destructive' })
    } finally {
      setIsCreatingCategory(false)
    }
  }

  // Get filtered categories based on selected session's subject
  const getFilteredCategories = useCallback(() => {
    const selectedSession = sessions.find(s => s.id === formData.classroom_session_id)
    if (!selectedSession?.subject_id) {
      return []
    }
    return getCategoriesBySubjectId(selectedSession.subject_id)
  }, [sessions, formData.classroom_session_id, getCategoriesBySubjectId])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.title.trim()) {
      showErrorToast(t('assignments.titleRequired') as string, 'Please enter a title for the assignment.')
      return
    }

    if (!formData.due_date.trim()) {
      showErrorToast(t('assignments.selectDueDate') as string, 'Please select a due date for the assignment.')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (editingAssignment) {
        setIsSaving(true)
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update({
            title: formData.title,
            description: formData.description || null,
            assignment_type: formData.assignment_type,
            due_date: formData.due_date || null,
            assignment_categories_id: formData.assignment_categories_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAssignment.id)

        if (error) {
          showErrorToast(t('assignments.errorUpdating') as string, (error as Error).message)
          return
        }

        // Handle attachments for existing assignment update
        if (attachmentFiles.length > 0) {
          // First, delete existing attachments for this assignment
          const { error: deleteError } = await supabase
            .from('assignment_attachments')
            .delete()
            .eq('assignment_id', editingAssignment.id)
            
          if (deleteError) {
            console.error('Error deleting existing attachments:', deleteError)
          }
          
          // Insert new attachments
          const attachmentRecords = attachmentFiles.map(file => ({
            assignment_id: editingAssignment.id,
            file_name: file.name,
            file_url: file.url,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id
          }))
          
          const { error: attachmentError } = await supabase
            .from('assignment_attachments')
            .insert(attachmentRecords)
            
          if (attachmentError) {
            console.error('Error saving attachments:', attachmentError)
            showErrorToast(t('assignments.errorUpdating') as string, 'Some attachments failed to save')
            return
          }
        } else {
          // If no attachments, delete any existing ones
          await supabase
            .from('assignment_attachments')
            .delete()
            .eq('assignment_id', editingAssignment.id)
        }
        
        showSuccessToast(t('assignments.updatedSuccessfully') as string)
      } else {
        setIsCreating(true)
        // Create new assignment
        const { data: assignmentData, error } = await supabase
          .from('assignments')
          .insert({
            classroom_session_id: formData.classroom_session_id,
            title: formData.title,
            description: formData.description || null,
            assignment_type: formData.assignment_type,
            due_date: formData.due_date || null,
            assignment_categories_id: formData.assignment_categories_id || null
          })
          .select()
          .single()

        if (error) {
          showErrorToast(t('assignments.errorCreating') as string, (error as Error).message)
          return
        }

        // Create assignment grades for all students in the classroom
        if (assignmentData) {
          // Get classroom from session
          const { data: sessionData } = await supabase
            .from('classroom_sessions')
            .select('classroom_id')
            .eq('id', formData.classroom_session_id)
            .single()

          if (sessionData) {
            // Get all students in the classroom (with student_record_id for FK)
            const { data: enrollmentData } = await supabase
              .from('classroom_students')
              .select('student_id, student_record_id')
              .eq('classroom_id', sessionData.classroom_id)

            if (enrollmentData && enrollmentData.length > 0) {
              try {
                // Check if grades already exist for this assignment to prevent duplicates
                const { data: existingGrades } = await supabase
                  .from('assignment_grades')
                  .select('student_id')
                  .eq('assignment_id', assignmentData.id)
                
                // Filter out students who already have grades
                const existingStudentIds = new Set(existingGrades?.map(g => g.student_id) || [])
                const filteredEnrollments = enrollmentData.filter(enrollment => 
                  !existingStudentIds.has(enrollment.student_id)
                )
                
                if (filteredEnrollments.length > 0) {
                  const gradeRecords = filteredEnrollments.map(enrollment => ({
                    assignment_id: assignmentData.id,
                    student_id: enrollment.student_id,
                    student_record_id: enrollment.student_record_id,
                    status: 'pending'
                  }))

                  const { error: gradeError } = await supabase
                    .from('assignment_grades')
                    .insert(gradeRecords)

                  if (gradeError) {
                    console.error('Error creating assignment grades:', {
                      error: gradeError,
                      message: (gradeError as Error).message
                    })
                    console.error('Grade records that failed:', gradeRecords)
                  }
                }
              } catch (gradeCreationError: unknown) {
                console.error('Unexpected error during grade creation:', gradeCreationError)
              }
            }
          }
        }
        
        // Save attachments for new assignment
        if (attachmentFiles.length > 0) {
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser()
          
          const attachmentRecords = attachmentFiles.map(file => ({
            assignment_id: assignmentData.id,
            file_name: file.name,
            file_url: file.url,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user?.id
          }))
          
          const { error: attachmentError } = await supabase
            .from('assignment_attachments')
            .insert(attachmentRecords)
            
          if (attachmentError) {
            console.error('Error saving attachments:', attachmentError)
            showErrorToast(t('assignments.errorCreating') as string, 'Some attachments failed to save')
            return
          }
        }

        showSuccessToast(t('assignments.createdSuccessfully') as string)
      }

      // Refresh assignments and reset form and get the updated data
      invalidateAssignmentsCache(academyId)
      invalidateSessionsCache(academyId)
      const updatedAssignments = await fetchAssignments(true) // Skip loading to prevent skeleton

      // Update viewingAssignment with fresh data if view details modal is open
      if (showViewModal && viewingAssignment && editingAssignment) {
        // Find the updated assignment in the refreshed assignments array
        const updatedAssignment = updatedAssignments?.find((a: Assignment) => a.id === editingAssignment.id)
        if (updatedAssignment) {
          setViewingAssignment(updatedAssignment)
        }
      }
      setShowModal(false)
      resetForm()

    } catch (error: unknown) {
      showErrorToast(t('assignments.unexpectedError') as string, ((error as Error).message))
    } finally {
      setIsCreating(false)
      setIsSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      classroom_session_id: '',
      title: '',
      description: '',
      assignment_type: 'homework',
      due_date: '',
      assignment_categories_id: ''
    })
    setAttachmentFiles([])
    setEditingAssignment(null)
  }

  const handleEditClick = async (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setAttachmentFiles(assignment.attachments || [])

    const selectedSession = sessions.find(s => s.id === assignment.classroom_session_id)

    if (!selectedSession) {
      setFormData({
        classroom_session_id: assignment.classroom_session_id,
        title: assignment.title,
        description: assignment.description || '',
        assignment_type: assignment.assignment_type,
        due_date: assignment.due_date || '',
        assignment_categories_id: ''
      })
      setShowModal(true)
      return
    }

    // Open modal immediately with loading state for category
    setFormData({
      classroom_session_id: assignment.classroom_session_id,
      title: assignment.title,
      description: assignment.description || '',
      assignment_type: assignment.assignment_type,
      due_date: assignment.due_date || '',
      assignment_categories_id: assignment.assignment_categories_id || ''
    })
    setEditModalLoading(true)
    setShowModal(true)

    try {
      if (selectedSession?.subject_id) {
        await refreshCategories()
      }
      // Re-set form data after categories are loaded to ensure category dropdown works
      setFormData({
        classroom_session_id: assignment.classroom_session_id,
        title: assignment.title,
        description: assignment.description || '',
        assignment_type: assignment.assignment_type,
        due_date: assignment.due_date || '',
        assignment_categories_id: assignment.assignment_categories_id || ''
      })
    } finally {
      setEditModalLoading(false)
    }
  }

  const handleDeleteClick = (assignment: Assignment) => {
    setAssignmentToDelete(assignment)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assignmentToDelete.id)

      if (error) {
        showErrorToast(t('assignments.errorDeleting') as string, (error as Error).message)
        return
      }

      setAssignments(prev => prev.filter(a => a.id !== assignmentToDelete.id))
      setShowDeleteModal(false)
      setAssignmentToDelete(null)

      // Invalidate cache so deleted assignment doesn't reappear and appears in archive
      invalidateAssignmentsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateArchiveCache(academyId)

      showSuccessToast(t('assignments.deletedSuccessfully') as string)

    } catch (error: unknown) {
      showErrorToast(t('assignments.unexpectedError') as string, ((error as Error).message))
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewDetails = async (assignment: Assignment) => {
    // Open modal immediately with loading skeleton
    setViewingAssignment(assignment)
    setAssignmentGrades([])
    setViewModalLoading(true)
    setShowViewModal(true)

    try {
      const { data: grades, error } = await supabase
        .from('assignment_grades')
        .select(`
          id,
          assignment_id,
          student_id,
          status,
          score,
          feedback,
          submitted_date,
          created_at,
          updated_at,
          users!assignment_grades_student_id_fkey(name)
        `)
        .eq('assignment_id', assignment.id)

      if (error) {
        console.error('Error fetching assignment grades for view:', error)
        setAssignmentGrades([])
      } else {
        const formattedGrades = (grades || []).map((grade: Record<string, unknown>) => ({
          id: grade.id as string,
          assignment_id: grade.assignment_id as string,
          student_id: grade.student_id as string,
          student_name: (grade.users as { name?: string })?.name || 'Unknown Student',
          status: grade.status as 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue',
          score: grade.score as number | undefined,
          feedback: grade.feedback as string | undefined,
          submitted_date: grade.submitted_date as string | undefined,
          created_at: grade.created_at as string | undefined,
          updated_at: grade.updated_at as string | undefined
        }))
        setAssignmentGrades(formattedGrades)
      }
    } finally {
      setViewModalLoading(false)
    }
  }

  const handleUpdateSubmissions = async (assignment: Assignment) => {
    // Open modal immediately with loading skeleton
    setSubmissionsAssignment(assignment)
    setSubmissionGrades([])
    setSubmissionsModalLoading(true)
    setShowSubmissionsModal(true)

    try {
      // Fetch grades and attendance in parallel
      const [gradesResult, attendanceResult] = await Promise.all([
        supabase
          .from('assignment_grades')
          .select(`
            id,
            assignment_id,
            student_id,
            status,
            score,
            feedback,
            submitted_date,
            created_at,
            updated_at,
            users!assignment_grades_student_id_fkey(name)
          `)
          .eq('assignment_id', assignment.id),
        assignment.classroom_session_id
          ? supabase
              .from('attendance')
              .select('student_id, status')
              .eq('classroom_session_id', assignment.classroom_session_id)
          : Promise.resolve({ data: null, error: null })
      ])

      if (gradesResult.error) {
        console.error('Error fetching assignment grades:', gradesResult.error)
        setSubmissionGrades([])
        return
      }

      const attendanceMap = new Map<string, 'present' | 'late' | 'absent' | 'pending'>()
      if (attendanceResult.data) {
        attendanceResult.data.forEach((record: { student_id: string, status: 'present' | 'late' | 'absent' | 'pending' }) => {
          attendanceMap.set(record.student_id, record.status)
        })
      }

      const formattedGrades = gradesResult.data?.map((grade: Record<string, unknown>) => ({
        id: grade.id as string,
        assignment_id: grade.assignment_id as string,
        student_id: grade.student_id as string,
        student_name: (grade.users as { name?: string })?.name || 'Unknown Student',
        status: grade.status as 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue',
        score: grade.score as number | undefined,
        feedback: grade.feedback as string | undefined,
        submitted_date: grade.submitted_date as string | undefined,
        created_at: grade.created_at as string | undefined,
        updated_at: grade.updated_at as string | undefined,
        attendance_status: attendanceMap.get(grade.student_id as string)
      })) || []

      setSubmissionGrades(formattedGrades)
    } catch (error: unknown) {
      console.error('Unexpected error:', error)
      showErrorToast('Error loading grades', (error as Error).message)
    } finally {
      setSubmissionsModalLoading(false)
    }
  }

  const updateSubmissionGrade = (gradeId: string, field: keyof SubmissionGrade, value: string | number | null) => {
    setSubmissionGrades(prev => prev.map(grade => 
      grade.id === gradeId ? { ...grade, [field]: value } : grade
    ))
  }

  const saveSubmissionGrades = async () => {
    try {
      setIsSaving(true)

      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showErrorToast(t('assignments.errorUpdatingSubmissions') as string, 'You must be logged in to save grades')
        return
      }
      
      // Test with a simple update first to avoid timeout issues
      let successCount = 0
      
      // Process grades in smaller batches to avoid timeouts
      const batchSize = 5
      for (let i = 0; i < submissionGrades.length; i += batchSize) {
        const batch = submissionGrades.slice(i, i + batchSize)
        
        for (const grade of batch) {
          try {
            
            // Prepare update data, excluding null values that might cause issues
            const updateData: Partial<SubmissionGrade> = {
              status: grade.status,
              updated_at: new Date().toISOString()
            }
            
            // Only include fields that have values
            if (grade.score !== null && grade.score !== undefined) {
              updateData.score = grade.score
            }
            if (grade.feedback) {
              updateData.feedback = grade.feedback
            }
            if (grade.submitted_date) {
              updateData.submitted_date = grade.submitted_date
            }
            
            
            // Use a simpler update with a timeout wrapper
            const updateWithTimeout = () => {
              return Promise.race([
                supabase
                  .from('assignment_grades')
                  .update(updateData)
                  .eq('id', grade.id),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Update timeout after 10 seconds')), 10000)
                )
              ])
            }
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error, data } = await updateWithTimeout() as any

          if (error) {
            console.error(`Error updating grade ${grade.id}:`, error)
            
            // Provide more specific error messages
            let errorMessage = error.message || 'Unknown error occurred'
            if (error.code === 'PGRST116') {
              errorMessage = 'Permission denied. You may not have access to update this grade.'
            } else if (error.code === 'PGRST301') {
              errorMessage = 'Row Level Security policy violation. Check your permissions.'
            } else if (!error.message && Object.keys(error).length === 0) {
              errorMessage = 'Permission denied due to Row Level Security policies. You may not have teacher or manager access to this assignment.'
            }
            
            throw new Error(errorMessage)
          }
          
          successCount++
          
          } catch (gradeError: unknown) {
            console.error(`Failed to update grade ${grade.id}:`, gradeError)
            showErrorToast(t('assignments.errorUpdatingSubmissions') as string, `Failed to update grade for ${grade.student_name}: ${(gradeError as Error)?.message || 'Unknown error'}`)
            return // Stop on first error
          }
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < submissionGrades.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      showSuccessToast(t('assignments.submissionsUpdatedSuccessfully') as string)
      setShowSubmissionsModal(false)
      invalidateAssignmentsCache(academyId)
      await fetchAssignments() // Refresh to update counts

    } catch (error: unknown) {
      console.error('Error updating submission grades:', error)
      showErrorToast(t('assignments.errorUpdatingSubmissions') as string, ((error as Error)?.message || 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = useMemo(() => {
    return (dateString: string, includeWeekday = true) => {
      // Handle date-only strings (YYYY-MM-DD) or UTC datetime strings
      let date: Date

      if (dateString.includes('T')) {
        // For UTC datetime strings like "2025-09-10T00:00:00.000Z"
        // Extract just the date part to avoid timezone conversion
        const dateOnly = dateString.split('T')[0]
        const [year, month, day] = dateOnly.split('-').map(Number)
        date = new Date(year, month - 1, day) // month is 0-based
      } else {
        // For date-only strings like "2025-09-10"
        const [year, month, day] = dateString.split('-').map(Number)
        date = new Date(year, month - 1, day) // month is 0-based
      }

      // Translations are now always available

      if (language === 'korean') {
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()

        if (includeWeekday) {
          const weekday = date.getDay()
          const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
          return `${year}년 ${month}월 ${day}일 (${weekdayNames[weekday]})`
        } else {
          return `${year}년 ${month}월 ${day}일`
        }
      } else {
        if (includeWeekday) {
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        } else {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
      }
    }
  }, [language, ])

  const getTypeIcon = (type: string, responsive = true) => {
    const sizeClass = responsive ? "w-3 h-3 sm:w-4 sm:h-4" : "w-4 h-4"
    switch (type) {
      case 'quiz':
        return <CheckCircle className={`${sizeClass} text-blue-500`} />
      case 'test':
        return <FileText className={`${sizeClass} text-purple-500`} />
      case 'project':
        return <Building className={`${sizeClass} text-green-500`} />
      default:
        return <BookOpen className={`${sizeClass} text-orange-500`} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-blue-100 text-blue-800'
      case 'test':
        return 'bg-purple-100 text-purple-800'
      case 'project':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-orange-100 text-orange-800'
    }
  }

  // Filter and sort assignments based on search query and client-side filters
  // Note: filterSessionId is already applied server-side, so we don't filter it here
  const filteredAssignments = useMemo(() => {
    let filtered = assignments.filter(assignment => {
      // Apply classroom filter
      if (classroomFilter !== 'all') {
        const sessionClassroomId = assignment.classroom_sessions?.classrooms?.id
        if (sessionClassroomId !== classroomFilter) {
          return false
        }
      }

      // Apply search filter
      if (assignmentSearchQuery) {
        const matches = (
          assignment.title.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
          assignment.classroom_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
          assignment.teacher_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
          assignment.assignment_type.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
          assignment.category_name?.toLowerCase().includes(assignmentSearchQuery.toLowerCase())
        )
        if (!matches) return false
      }

      // Apply pending-only filter
      if (showPendingOnly) {
        if ((assignment.pending_count || 0) === 0) {
          return false
        }
      }

      return true
    })

    // Apply sorting
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | undefined
        let bValue: string | undefined

        if (sortBy.field === 'session') {
          aValue = a.session_date
          bValue = b.session_date
        } else if (sortBy.field === 'due') {
          aValue = a.due_date
          bValue = b.due_date
        }

        // Handle undefined values
        if (!aValue && !bValue) return 0
        if (!aValue) return 1
        if (!bValue) return -1

        const comparison = aValue.localeCompare(bValue)
        return sortBy.direction === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [assignments, assignmentSearchQuery, sortBy, showPendingOnly, classroomFilter])

  // Always use filtered length as total count (hybrid approach)
  const filteredTotalCount = filteredAssignments.length

  // Count of assignments that have pending grades (respects classroom filter)
  const assignmentsWithPendingCount = useMemo(() => {
    let filtered = assignments
    // Apply classroom filter to pending count
    if (classroomFilter !== 'all') {
      filtered = assignments.filter(a => {
        const sessionClassroomId = a.classroom_sessions?.classrooms?.id
        return sessionClassroomId === classroomFilter
      })
    }
    return filtered.filter(a => (a.pending_count || 0) > 0).length
  }, [assignments, classroomFilter])

  // Total pending submissions count (respects classroom filter)
  const filteredPendingGradesCount = useMemo(() => {
    let filtered = assignments
    // Apply classroom filter
    if (classroomFilter !== 'all') {
      filtered = assignments.filter(a => {
        const sessionClassroomId = a.classroom_sessions?.classrooms?.id
        return sessionClassroomId === classroomFilter
      })
    }
    return filtered.reduce((sum, a) => sum + (a.pending_count || 0), 0)
  }, [assignments, classroomFilter])

  // Group assignments by session for list view pagination
  const groupedSessionsData = useMemo(() => {
    const sessionMap = filteredAssignments.reduce((groups, assignment) => {
      const sessionKey = assignment.classroom_session_id
      if (!groups[sessionKey]) {
        groups[sessionKey] = {
          sessionId: assignment.classroom_session_id,
          sessionDate: assignment.session_date,
          sessionTime: assignment.session_time,
          classroomName: assignment.classroom_name,
          classroomColor: assignment.classroom_color,
          teacherName: assignment.teacher_name,
          assignments: []
        }
      }
      groups[sessionKey].assignments.push(assignment)
      return groups
    }, {} as Record<string, {
      sessionId: string,
      sessionDate?: string,
      sessionTime?: string,
      classroomName?: string,
      classroomColor?: string,
      teacherName?: string,
      assignments: typeof filteredAssignments
    }>)

    // Sort sessions by date (most recent first)
    return Object.values(sessionMap).sort((a, b) => {
      if (!a.sessionDate || !b.sessionDate) return 0
      return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    })
  }, [filteredAssignments])

  // Total session count for list view pagination
  const totalSessionCount = groupedSessionsData.length

  // Paginated sessions for list view
  const paginatedSessions = useMemo(() => {
    const startSessionIndex = (currentPage - 1) * sessionsPerPage
    const endSessionIndex = startSessionIndex + sessionsPerPage
    return groupedSessionsData.slice(startSessionIndex, endSessionIndex)
  }, [groupedSessionsData, currentPage, sessionsPerPage])

  // Always apply client-side pagination to filtered results
  const paginatedAssignments = useMemo(() => {
    if (viewMode === 'list') {
      // In list view, paginate by sessions (show complete sessions)
      // Flatten the assignments from paginated sessions
      return paginatedSessions.flatMap(session => session.assignments)
    } else {
      // In card view, paginate by individual assignments
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      return filteredAssignments.slice(startIndex, endIndex)
    }
  }, [filteredAssignments, currentPage, itemsPerPage, viewMode, paginatedSessions])


  if (loading ) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("assignments.title")}</h1>
            <p className="text-gray-500">{t("assignments.description")}</p>
          </div>
          <Button className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("assignments.addAssignment")}
          </Button>
        </div>

        {/* Stats Cards Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
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
        <div className="flex flex-wrap gap-4 mb-4 animate-pulse">
          <div className="flex-1 min-w-[250px] sm:max-w-md">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="w-full sm:w-60">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-12 w-full sm:w-32 bg-gray-200 rounded-lg"></div>
          <div className="h-12 w-full sm:w-32 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Assignments List Skeletons */}
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2 sm:space-y-3 animate-pulse">
              {/* Session Header Skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 flex-1">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="h-5 bg-gray-200 rounded w-32" />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-5 sm:ml-0">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-28" />
                </div>
              </div>
              {/* Assignment Rows Skeleton */}
              {[...Array(2)].map((_, j) => (
                <Card key={j} className="p-3 sm:p-4 ml-4 sm:ml-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="h-4 bg-gray-200 rounded w-24" />
                        <div className="h-4 bg-gray-200 rounded w-32" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 bg-gray-200 rounded-full w-16" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                      <div className="flex gap-1">
                        <div className="w-7 h-7 bg-gray-200 rounded" />
                        <div className="w-7 h-7 bg-gray-200 rounded" />
                        <div className="w-7 h-7 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("assignments.title")}</h1>
          <p className="text-gray-500">{t("assignments.description")}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          {t("assignments.addAssignment")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <Card className="w-full p-4 sm:p-6 hover:shadow-md transition-shadow border-l-4 border-blue-500">
          <div className="space-y-3">
            <p className="text-sm font-medium text-blue-700">
              {assignmentSearchQuery ? t("assignments.filteredResults") : t("assignments.title")}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {filteredTotalCount}
              </p>
              <p className="text-sm text-gray-500">
                {filteredTotalCount === 1
                  ? t("assignments.assignment")
                  : t("assignments.assignmentsPlural")
                }
              </p>
            </div>
            {(assignmentSearchQuery || classroomFilter !== 'all' || showPendingOnly || sortBy) && (
              <p className="text-xs text-gray-500">
                {language === 'korean' ? `전체 ${totalCount}개 중` : `out of ${totalCount} total`}
              </p>
            )}
            {assignmentSearchQuery && (
              <div className="text-xs text-blue-600">
                {t("assignments.searchQuery", { query: assignmentSearchQuery })}
              </div>
            )}
          </div>
        </Card>

        <Card
          className={`w-full p-6 hover:shadow-md transition-all cursor-pointer border-l-4 ${
            showPendingOnly
              ? 'border-orange-600 bg-orange-50 shadow-md'
              : 'border-orange-500'
          }`}
          onClick={() => setShowPendingOnly(!showPendingOnly)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${showPendingOnly ? 'text-orange-800' : 'text-orange-700'}`}>
                {t("assignments.pendingGrades")}
              </p>
              <Filter className={`w-4 h-4 ${showPendingOnly ? 'text-orange-600' : 'text-orange-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-semibold text-gray-900">
                {assignmentsWithPendingCount}
              </p>
              <p className="text-sm text-gray-500">
                {assignmentsWithPendingCount === 1
                  ? t("assignments.assignment")
                  : t("assignments.assignmentsPlural")}
              </p>
            </div>
            {filteredPendingGradesCount > 0 && (
              <p className="text-xs text-gray-500">
                {language === 'korean'
                  ? `${filteredPendingGradesCount}개 제출물 대기 중`
                  : `${filteredPendingGradesCount} submissions pending`}
              </p>
            )}
            {showPendingOnly && (
              <div className="mt-2 text-xs text-orange-600 font-medium">
                ✓ {t("assignments.filterActive")}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className={`h-9 px-3 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("assignments.listView"))}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("assignments.cardView"))}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar and Sort Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[250px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            type="text"
            placeholder={String(t("assignments.searchPlaceholder"))}
            value={assignmentSearchQuery}
            onChange={(e) => setAssignmentSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>

        {/* Classroom Filter */}
        <Select
          value={classroomFilter}
          onValueChange={updateClassroomFilter}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-blue-500 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
            <SelectValue placeholder={String(t("sessions.allClassrooms"))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("sessions.allClassrooms")}</SelectItem>
            {classrooms.map((classroom) => (
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

        {/* Session Date Filter */}
        <button
          onClick={() => {
            if (sortBy?.field === 'session') {
              // Cycle: desc -> asc -> null (disabled)
              if (sortBy.direction === 'desc') {
                setSortBy({field: 'session', direction: 'asc'})
              } else {
                setSortBy(null)
              }
            } else {
              setSortBy({field: 'session', direction: 'desc'})
            }
          }}
          className={`h-12 px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors whitespace-nowrap shadow-sm ${
            sortBy?.field === 'session'
              ? 'bg-white border-primary text-primary'
              : 'bg-white border-border text-gray-700 hover:border-primary'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('mobile.assignments.sort.sessionDate')}</span>
          {sortBy?.field === 'session' ? (
            sortBy.direction === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </button>

        {/* Due Date Filter */}
        <button
          onClick={() => {
            if (sortBy?.field === 'due') {
              // Cycle: desc -> asc -> null (disabled)
              if (sortBy.direction === 'desc') {
                setSortBy({field: 'due', direction: 'asc'})
              } else {
                setSortBy(null)
              }
            } else {
              setSortBy({field: 'due', direction: 'desc'})
            }
          }}
          className={`h-12 px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors whitespace-nowrap shadow-sm ${
            sortBy?.field === 'due'
              ? 'bg-white border-primary text-primary'
              : 'bg-white border-border text-gray-700 hover:border-primary'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{t('mobile.assignments.sort.dueDate')}</span>
          {sortBy?.field === 'due' ? (
            sortBy.direction === 'desc' ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Assignments Content */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedAssignments.map((assignment) => (
          <Card key={assignment.id} className="p-4 sm:p-6 hover:shadow-md transition-shadow flex flex-col h-full">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                  style={{ backgroundColor: assignment.classroom_color || '#6B7280' }}
                />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{assignment.title}</h3>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mt-1">
                    <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{assignment.classroom_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleEditClick(assignment)}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  onClick={() => handleDeleteClick(assignment)}
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 flex-grow">
              {assignment.description && (
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{t("assignments.descriptionLabel")}</p>
                  <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {assignment.description}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{assignment.teacher_name}</span>
              </div>

              {assignment.session_date && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{formatDate(assignment.session_date)}</span>
                </div>
              )}

              {assignment.due_date && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{t("assignments.due")}: {formatDate(assignment.due_date)}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {getTypeIcon(assignment.assignment_type)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(assignment.assignment_type)}`}>
                  {t(`assignments.${assignment.assignment_type}`)}
                </span>
              </div>

              {assignment.category_name && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{assignment.category_name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{assignment.submitted_count || 0}/{assignment.student_count || 0} {t("assignments.submitted")}</span>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 space-y-1.5 sm:space-y-2">
              <Button
                variant="outline"
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => handleViewDetails(assignment)}
              >
                {t("assignments.viewDetails")}
              </Button>
              <Button
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => handleUpdateSubmissions(assignment)}
              >
                {t("assignments.updateSubmissions")}
              </Button>
            </div>
          </Card>
        ))}
        </div>
      ) : (
        /* List View - Grouped by Session */
        <div className="space-y-6">
          {(() => {
            // Use pre-paginated sessions (already grouped and sorted)
            return paginatedSessions.map((sessionGroup) => (
              <div key={sessionGroup.sessionId} className="space-y-2 sm:space-y-3">
                {/* Session Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sessionGroup.classroomColor || '#6B7280' }}
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      {sessionGroup.classroomName}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 ml-5 sm:ml-0">
                    {sessionGroup.sessionDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <span>{formatDate(sessionGroup.sessionDate)}</span>
                      </div>
                    )}
                    {sessionGroup.sessionTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        <span>{sessionGroup.sessionTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      <span>{sessionGroup.teacherName}</span>
                    </div>
                    <span className="text-gray-500">
                      {sessionGroup.assignments.length}{sessionGroup.assignments.length === 1 ? t("sessions.assignmentCount") : t("sessions.assignmentCountPlural")}
                    </span>
                  </div>
                </div>

                {/* Assignments in this session */}
                <div className="space-y-2">
                  {sessionGroup.assignments.map((assignment) => (
                    <Card key={assignment.id} className="p-3 sm:p-4 hover:shadow-md transition-shadow ml-4 sm:ml-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0 mb-2">
                              <div>
                                <h4 className="text-sm sm:text-base font-semibold text-gray-900">{assignment.title}</h4>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                                  {assignment.category_name && (
                                    <div className="flex items-center gap-1">
                                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                      <span>{assignment.category_name}</span>
                                    </div>
                                  )}
                                  {assignment.due_date && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                      <span>{t("assignments.due")}: {formatDate(assignment.due_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs sm:text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(assignment.assignment_type)}`}>
                                  {t(`assignments.${assignment.assignment_type}`)}
                                </span>
                                <span className="text-gray-500">
                                  {assignment.submitted_count || 0}/{assignment.student_count || 0} {t("assignments.submitted")}
                                </span>
                              </div>
                            </div>

                            {assignment.description && (
                              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-1">
                                {assignment.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-0 sm:ml-4 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            onClick={() => handleViewDetails(assignment)}
                            title={String(t("assignments.viewDetails"))}
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            onClick={() => handleUpdateSubmissions(assignment)}
                            title={String(t("assignments.updateGrades"))}
                          >
                            <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            onClick={() => handleEditClick(assignment)}
                            title={String(t("assignments.edit"))}
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            onClick={() => handleDeleteClick(assignment)}
                            title={String(t("assignments.delete"))}
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredTotalCount > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              {t("assignments.pagination.previous")}
            </Button>
            <Button
              onClick={() => setCurrentPage(p => Math.min(
                viewMode === 'list'
                  ? Math.ceil(totalSessionCount / sessionsPerPage)
                  : Math.ceil(filteredTotalCount / itemsPerPage),
                p + 1
              ))}
              disabled={currentPage >= (viewMode === 'list'
                ? Math.ceil(totalSessionCount / sessionsPerPage)
                : Math.ceil(filteredTotalCount / itemsPerPage))}
              variant="outline"
            >
              {t("assignments.pagination.next")}
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              {viewMode === 'list' ? (
                <p className="text-sm text-gray-700">
                  {t("assignments.pagination.showing")}
                  <span className="font-medium"> {totalSessionCount > 0 ? ((currentPage - 1) * sessionsPerPage) + 1 : 0} </span>
                  {t("assignments.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * sessionsPerPage, totalSessionCount)} </span>
                  {t("assignments.pagination.of")}
                  <span className="font-medium"> {totalSessionCount} </span>
                  {t("assignments.sessions") || "sessions"}
                  <span className="text-gray-500 ml-1">
                    ({filteredTotalCount} {t("assignments.pagination.assignments")} {language === 'korean' ? '총' : 'total'})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  {t("assignments.pagination.showing")}
                  <span className="font-medium"> {filteredTotalCount > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} </span>
                  {t("assignments.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredTotalCount)} </span>
                  {t("assignments.pagination.of")}
                  <span className="font-medium"> {filteredTotalCount} </span>
                  {t("assignments.pagination.assignments")}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("assignments.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(
                  viewMode === 'list'
                    ? Math.ceil(totalSessionCount / sessionsPerPage)
                    : Math.ceil(filteredTotalCount / itemsPerPage),
                  p + 1
                ))}
                disabled={currentPage >= (viewMode === 'list'
                  ? Math.ceil(totalSessionCount / sessionsPerPage)
                  : Math.ceil(filteredTotalCount / itemsPerPage))}
                variant="outline"
              >
                {t("assignments.pagination.next")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {initialized && paginatedAssignments.length === 0 && (
        <Card className="p-12 text-center gap-2">
          <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-1" />
          <h3 className="text-lg font-medium text-gray-900">
            {showPendingOnly
              ? (language === 'korean' ? '대기 중인 과제가 없습니다' : 'No pending assignments')
              : t("assignments.noAssignmentsFound")}
          </h3>
          <p className="text-gray-500 mb-2">
            {showPendingOnly
              ? (language === 'korean' ? '모든 과제의 채점이 완료되었습니다' : 'All assignments have been graded')
              : assignmentSearchQuery
                ? t("assignments.tryAdjustingSearch")
                : classroomFilter !== 'all'
                  ? (language === 'korean' ? '선택한 클래스에 과제가 없습니다' : 'No assignments in the selected classroom')
                  : t("assignments.getStartedFirstAssignment")}
          </p>
          {showPendingOnly ? (
            <Button
              variant="outline"
              className="flex items-center gap-2 mx-auto"
              onClick={() => setShowPendingOnly(false)}
            >
              <X className="w-4 h-4" />
              {language === 'korean' ? '필터 해제' : 'Clear filter'}
            </Button>
          ) : assignmentSearchQuery ? (
            <Button
              variant="outline"
              className="flex items-center gap-2 mx-auto"
              onClick={() => setAssignmentSearchQuery('')}
            >
              <X className="w-4 h-4" />
              {t("assignments.clearSearch")}
            </Button>
          ) : classroomFilter !== 'all' ? (
            <Button
              variant="outline"
              className="flex items-center gap-2 mx-auto"
              onClick={() => updateClassroomFilter('all')}
            >
              <X className="w-4 h-4" />
              {language === 'korean' ? '필터 해제' : 'Clear filter'}
            </Button>
          ) : (
            <Button onClick={() => setShowModal(true)} className="flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              {t("assignments.addAssignment")}
            </Button>
          )}
        </Card>
      )}

      {/* Modals */}
      <AssignmentCreateEditModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        editingAssignment={editingAssignment}
        formData={formData}
        setFormData={setFormData}
        attachmentFiles={attachmentFiles}
        setAttachmentFiles={setAttachmentFiles}
        sessions={sessions}
        isManager={isManager}
        isCreating={isCreating}
        isSaving={isSaving}
        editModalLoading={editModalLoading}
        showInlineCategoryCreate={showInlineCategoryCreate}
        setShowInlineCategoryCreate={setShowInlineCategoryCreate}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        isCreatingCategory={isCreatingCategory}
        getFilteredCategories={getFilteredCategories}
        handleCreateCategory={handleCreateCategory}
        handleSubmit={handleSubmit}
        formatDate={formatDate}
        activeDatePicker={activeDatePicker}
        setActiveDatePicker={setActiveDatePicker}
        isFormValid={isFormValid}
      />

      <AssignmentDeleteModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setAssignmentToDelete(null) }}
        assignmentToDelete={assignmentToDelete}
        isSaving={isSaving}
        handleDeleteConfirm={handleDeleteConfirm}
      />

      <AssignmentDetailsModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setViewingAssignment(null); setAssignmentGrades([]) }}
        viewingAssignment={viewingAssignment}
        assignmentGrades={assignmentGrades}
        viewModalLoading={viewModalLoading}
        handleEditClick={handleEditClick}
        formatDate={formatDate}
      />

      <SubmissionsGradeModal
        isOpen={showSubmissionsModal}
        onClose={() => { setShowSubmissionsModal(false); setSubmissionsAssignment(null); setSubmissionGrades([]) }}
        submissionsAssignment={submissionsAssignment}
        submissionGrades={submissionGrades}
        submissionsModalLoading={submissionsModalLoading}
        isSaving={isSaving}
        updateSubmissionGrade={updateSubmissionGrade}
        saveSubmissionGrades={saveSubmissionGrades}
        formatDate={formatDate}
        activeDatePicker={activeDatePicker}
        setActiveDatePicker={setActiveDatePicker}
      />
    </div>
  )
}
