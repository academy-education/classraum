"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { triggerAssignmentGradedNotifications } from '@/lib/notification-triggers'
import { useAssignmentsData } from '@/components/ui/assignments/hooks/useAssignmentsData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardCard, DataTable, BulkActionBar, type DataTableColumn, type DataTableSortState } from '@/components/ui/dashboard'
import { StatusPill } from '@/components/ui/status-pill'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar,
  Plus,
  Download,
  Copy,
  FileDown,
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
  Grid3X3,
  List,
  Rows3,
  Eye,
  ClipboardList,
  CalendarDays,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Filter
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { useToast } from '@/hooks/use-toast'
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { showSuccessToast, showSuccessToastWithAction, showErrorToast } from '@/stores'
// Sibling-page caches via the shared module — keeps sessions/archive
// bundles out of this chunk. See src/lib/cache.ts.
import { invalidateSessionsCache, invalidateArchiveCache } from '@/lib/cache'
// Modals are conditionally rendered — defer their bundles (~900 lines
// combined plus the AssignmentsDatePicker and shared modal/select deps)
// until the user actually opens one.
import dynamic from 'next/dynamic'
const AssignmentCreateEditModal = dynamic(() => import('@/components/ui/assignments/modals/AssignmentCreateEditModal').then(m => m.AssignmentCreateEditModal), { ssr: false })
const AssignmentDeleteModal = dynamic(() => import('@/components/ui/assignments/modals/AssignmentDeleteModal').then(m => m.AssignmentDeleteModal), { ssr: false })
const AssignmentDetailsModal = dynamic(() => import('@/components/ui/assignments/modals/AssignmentDetailsModal').then(m => m.AssignmentDetailsModal), { ssr: false })
const SubmissionsGradeModal = dynamic(() => import('@/components/ui/assignments/modals/SubmissionsGradeModal').then(m => m.SubmissionsGradeModal), { ssr: false })
import { useAssignmentsExport } from '@/components/ui/assignments/hooks/useAssignmentsExport'
import { useListPageShortcuts } from '@/hooks/useListPageShortcuts'
import { SearchKbdHint } from '@/components/ui/search-kbd-hint'

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
  attendance_status?: 'present' | 'late' | 'absent' | 'pending' | 'excused'
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

// Re-exported from the shared cache module. See src/lib/cache.ts. Import
// + export keeps the helper bound locally for in-file consumers.
import { invalidateAssignmentsCache } from '@/lib/cache'
export { invalidateAssignmentsCache }

// Re-export so the extracted modals can keep importing from this module
// (their existing import path) without reaching into the assignments folder.
export { AssignmentsDatePicker } from '@/components/ui/assignments/AssignmentsDatePicker'

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
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [viewModalLoading, setViewModalLoading] = useState(false)
  const [submissionsModalLoading, setSubmissionsModalLoading] = useState(false)
  const [editModalLoading, setEditModalLoading] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [submissionsAssignment, setSubmissionsAssignment] = useState<Assignment | null>(null)
  const [submissionGrades, setSubmissionGrades] = useState<SubmissionGrade[]>([])
  // Snapshot of grade scores at modal open time. After saveSubmissionGrades,
  // we compare against this to fire triggerAssignmentGradedNotifications
  // only for grades that genuinely transitioned from unscored to scored —
  // re-saving an already-graded row shouldn't push parents again.
  const [originalGradeScores, setOriginalGradeScores] = useState<Map<string, number | null>>(new Map())
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('list')
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set())
  const [tableSort, setTableSort] = useState<DataTableSortState | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [sortBy, setSortBy] = useState<{field: 'session' | 'due', direction: 'asc' | 'desc'} | null>(null)
  // `?pending=true` lands the user with the pending-only filter active.
  // Used by the dashboard "X awaiting grades" chip → click → here.
  const pendingFromUrl = searchParams.get('pending') === 'true'
  const [showPendingOnly, setShowPendingOnly] = useState(pendingFromUrl)

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

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

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
      showErrorToast(t('assignments.titleRequired') as string, t('assignments.errors.titleRequiredDesc') as string)
      return
    }

    if (!formData.due_date.trim()) {
      showErrorToast(t('assignments.selectDueDate') as string, t('assignments.errors.selectDueDateDesc') as string)
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
            showErrorToast(t('assignments.errorUpdating') as string, t('assignments.errors.attachmentsSaveError') as string)
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
            showErrorToast(t('assignments.errorCreating') as string, t('assignments.errors.attachmentsSaveError') as string)
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

      const deletedAssignment = assignmentToDelete
      setAssignments(prev => prev.filter(a => a.id !== deletedAssignment.id))
      setShowDeleteModal(false)
      setAssignmentToDelete(null)

      // Invalidate cache so deleted assignment doesn't reappear and appears in archive
      invalidateAssignmentsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateArchiveCache(academyId)

      // Soft-delete is reversible — give managers a window to take it back.
      // The Undo restores `deleted_at = null` and refetches.
      showSuccessToastWithAction(
        t('assignments.deletedSuccessfully') as string,
        t('common.undo') as string,
        async () => {
          const { error: restoreError } = await supabase
            .from('assignments')
            .update({ deleted_at: null })
            .eq('id', deletedAssignment.id)
          if (restoreError) {
            showErrorToast(t('assignments.unexpectedError') as string, restoreError.message)
            return
          }
          invalidateAssignmentsCache(academyId)
          invalidateSessionsCache(academyId)
          invalidateArchiveCache(academyId)
          await fetchAssignments()
          showSuccessToast(t('common.restored') as string)
        }
      )

    } catch (error: unknown) {
      showErrorToast(t('assignments.unexpectedError') as string, ((error as Error).message))
    } finally {
      setIsSaving(false)
    }
  }

  // ===== Bulk actions (table view selection) =====
  const handleBulkDelete = async () => {
    if (selectedAssignmentIds.size === 0) return
    setBulkUpdating(true)
    try {
      const ids = Array.from(selectedAssignmentIds)
      const { error } = await supabase
        .from('assignments')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
      setAssignments(prev => prev.filter(a => !selectedAssignmentIds.has(a.id)))
      setSelectedAssignmentIds(new Set())
      setShowBulkDeleteConfirm(false)
      invalidateAssignmentsCache(academyId)
      invalidateSessionsCache(academyId)
      invalidateArchiveCache(academyId)

      // Bulk delete is the highest-impact destructive action — Undo here is
      // the difference between "annoying" and "catastrophic" misclick.
      showSuccessToastWithAction(
        t('assignments.bulkDeleteSuccess', { count: ids.length }) as string,
        t('common.undo') as string,
        async () => {
          const { error: restoreError } = await supabase
            .from('assignments')
            .update({ deleted_at: null })
            .in('id', ids)
          if (restoreError) {
            showErrorToast(t('assignments.unexpectedError') as string, restoreError.message)
            return
          }
          invalidateAssignmentsCache(academyId)
          invalidateSessionsCache(academyId)
          invalidateArchiveCache(academyId)
          await fetchAssignments()
          showSuccessToast(t('common.restored') as string)
        }
      )
    } catch (err) {
      console.error('[Assignments] Bulk delete failed:', err)
      showErrorToast(t('assignments.bulkDeleteError') as string)
    } finally {
      setBulkUpdating(false)
    }
  }

  // Manager keyboard shortcuts: `/` → search, `n` → create, `Esc` → clear selection.
  // Hook also bridges the `app:create-new` event from the command palette.
  useListPageShortcuts({
    searchInputRef,
    onCreate: () => setShowModal(true),
    isCreateBlocked: showModal || showDeleteModal || showViewModal || showSubmissionsModal,
    onEscape: selectedAssignmentIds.size > 0
      ? () => setSelectedAssignmentIds(new Set())
      : undefined,
  })

  const handleBulkTypeUpdate = async (newType: Assignment['assignment_type']) => {
    if (selectedAssignmentIds.size === 0) return
    setBulkUpdating(true)
    try {
      const ids = Array.from(selectedAssignmentIds)
      const { error } = await supabase
        .from('assignments')
        .update({ assignment_type: newType, updated_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
      setAssignments(prev => prev.map(a => selectedAssignmentIds.has(a.id) ? { ...a, assignment_type: newType } : a))
      showSuccessToast(t('assignments.bulkTypeSuccess', { count: ids.length }) as string)
      invalidateAssignmentsCache(academyId)
    } catch (err) {
      console.error('[Assignments] Bulk type update failed:', err)
      showErrorToast(t('assignments.bulkTypeError') as string)
    } finally {
      setBulkUpdating(false)
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
          student_name: (grade.users as { name?: string })?.name || String(t('common.fallbacks.unknownStudent')),
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

      type AttendanceStatus = 'present' | 'late' | 'absent' | 'pending' | 'excused'
      const attendanceMap = new Map<string, AttendanceStatus>()
      if (attendanceResult.data) {
        attendanceResult.data.forEach((record: { student_id: string, status: AttendanceStatus }) => {
          attendanceMap.set(record.student_id, record.status)
        })
      }

      const formattedGrades = gradesResult.data?.map((grade: Record<string, unknown>) => {
        const studentId = grade.student_id as string
        const attendance = attendanceMap.get(studentId)
        let status = grade.status as 'pending' | 'submitted' | 'not submitted' | 'excused' | 'overdue'

        // Cross-flow pre-fill: if the manager already marked this student
        // absent (or excused-absence) for the session, default the still-
        // untouched grade to a matching submission state. Avoids the
        // recurring chore of re-telling the system something it already
        // knows. Only fires when the grade is `pending` — never overrides
        // an explicit choice. Manager can flip the pill on save.
        if ((!status || status === 'pending') && attendance) {
          if (attendance === 'absent') status = 'not submitted'
          else if (attendance === 'excused') status = 'excused'
        }

        return {
          id: grade.id as string,
          assignment_id: grade.assignment_id as string,
          student_id: studentId,
          student_name: (grade.users as { name?: string })?.name || String(t('common.fallbacks.unknownStudent')),
          status,
          score: grade.score as number | undefined,
          feedback: grade.feedback as string | undefined,
          submitted_date: grade.submitted_date as string | undefined,
          created_at: grade.created_at as string | undefined,
          updated_at: grade.updated_at as string | undefined,
          attendance_status: attendance,
        }
      }) || []

      // Sort rows by "how much attention does this need from me right now?"
      // Top: rows that still want a score or status decision.
      // Bottom: rows that are already settled (graded / excused / explicitly
      // not submitted / overdue). Within each tier, alphabetical by student
      // name so the order is predictable across modal opens. Sorting only
      // happens once at load time — we don't re-sort as the manager edits,
      // because that would shuffle rows out from under their cursor.
      const actionPriority = (g: typeof formattedGrades[number]): number => {
        const status = (g.status || '').toLowerCase()
        const hasScore = g.score !== null && g.score !== undefined
        // 0 = needs the most attention; higher = less.
        if (status === 'pending') return 0
        if (status === 'submitted' && !hasScore) return 1
        if (status === 'submitted' && hasScore) return 2
        if (status === 'overdue') return 3
        if (status === 'not submitted') return 4
        if (status === 'excused') return 5
        return 6
      }
      const sortedGrades = [...formattedGrades].sort((a, b) => {
        const pa = actionPriority(a)
        const pb = actionPriority(b)
        if (pa !== pb) return pa - pb
        return (a.student_name || '').localeCompare(b.student_name || '')
      })

      setSubmissionGrades(sortedGrades)
      // Capture per-grade pre-edit score so we can detect "newly scored"
      // grades on save and fire the notification trigger only for those.
      setOriginalGradeScores(new Map(sortedGrades.map(g => [g.id, g.score ?? null])))
    } catch (error: unknown) {
      console.error('Unexpected error:', error)
      showErrorToast(t('assignments.errors.errorLoadingGrades') as string, t('assignments.errors.tryAgain') as string)
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
        showErrorToast(t('assignments.errorUpdatingSubmissions') as string, t('assignments.errors.mustBeLoggedIn') as string)
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
            
            // Translate common Postgrest permission errors into a friendly key.
            // The PERMISSION_DENIED sentinel is used by the catch block below to
            // pick the right translated toast.
            const isPermissionError =
              error.code === 'PGRST116' ||
              error.code === 'PGRST301' ||
              (!error.message && Object.keys(error).length === 0)
            throw new Error(
              isPermissionError
                ? 'PERMISSION_DENIED'
                : (error.message || String(t('common.fallbacks.unknownErrorOccurred')))
            )
          }
          
          successCount++
          
          } catch (gradeError: unknown) {
            console.error(`Failed to update grade ${grade.id}:`, gradeError)
            const msg = (gradeError as Error)?.message
            const description = msg === 'PERMISSION_DENIED'
              ? (t('assignments.errors.permissionDenied') as string)
              : (t('assignments.errors.gradeUpdateFailed', { student: grade.student_name }) as string)
            showErrorToast(t('assignments.errorUpdatingSubmissions') as string, description)
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

      // Fire per-student "assignment graded" pushes for grades that
      // genuinely transitioned from unscored → scored. Re-saving a row
      // that was already graded doesn't re-notify the parent. Each call
      // swallows its own errors; never blocks the save flow.
      const newlyGraded = submissionGrades.filter(g => {
        const original = originalGradeScores.get(g.id) ?? null
        const nowHasScore = g.score !== null && g.score !== undefined
        const hadScore = original !== null && original !== undefined
        return nowHasScore && !hadScore
      })
      await Promise.all(newlyGraded.map(g => triggerAssignmentGradedNotifications(g.id)))

    } catch (error: unknown) {
      console.error('Error updating submission grades:', error)
      showErrorToast(t('assignments.errorUpdatingSubmissions') as string, t('assignments.errors.tryAgain') as string)
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
        return <Building className={`${sizeClass} text-emerald-500`} />
      default:
        return <BookOpen className={`${sizeClass} text-amber-500`} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz':
        return 'bg-sky-50 text-sky-700'
      case 'test':
        return 'bg-purple-100 text-purple-800'
      case 'project':
        return 'bg-emerald-50 text-emerald-700'
      default:
        return 'bg-amber-50 text-amber-700'
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

  // Markdown-export actions live in a small hook so the orchestrator stays
  // focused on data + composition. The hook closes the export menu on
  // success/failure via the onComplete callback.
  const { handleCopyMarkdown, handleDownloadMarkdown } = useAssignmentsExport({
    filteredAssignments,
    t,
    showSuccessToast,
    showErrorToast,
    onComplete: () => setShowExportMenu(false),
  })

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.assignments")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("assignments.title")}</h1>
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
            <div className="h-9 w-9 bg-gray-200 rounded"></div>
          </div>
        </div>
        
        {/* Search Bar and Filters Skeleton */}
        <div className="flex flex-wrap gap-4 mb-4 animate-pulse">
          <div className="flex-1 min-w-[180px] sm:min-w-[250px] sm:max-w-md">
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.assignments")}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("assignments.title")}</h1>
          <p className="text-gray-500">{t("assignments.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(v => !v)}
              disabled={filteredAssignments.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              {t("assignments.export.button")}
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-300 rounded-lg shadow-xl z-20 py-1">
                <button
                  onClick={handleCopyMarkdown}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                  {t("assignments.export.copyAsMarkdown")}
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <FileDown className="w-4 h-4 text-gray-400" />
                  {t("assignments.export.downloadMarkdown")}
                </button>
                <div className="px-3 py-1.5 text-xs text-gray-400 border-t border-gray-100 mt-1">
                  {t("assignments.export.exportingCount", { count: filteredAssignments.length })}
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t("assignments.addAssignment")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <Card className="w-full p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {assignmentSearchQuery ? t("assignments.filteredResults") : t("assignments.title")}
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {filteredTotalCount}
            </p>
            <p className="text-sm text-gray-400">
              {filteredTotalCount === 1
                ? t("assignments.assignment")
                : t("assignments.assignmentsPlural")
              }
            </p>
          </div>
          {(assignmentSearchQuery || classroomFilter !== 'all' || showPendingOnly || sortBy) && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              {language === 'korean' ? `전체 ${totalCount}개 중` : `of ${totalCount} total`}
            </div>
          )}
          {assignmentSearchQuery && (
            <div className="text-xs text-primary mt-2">
              {t("assignments.searchQuery", { query: assignmentSearchQuery })}
            </div>
          )}
        </Card>

        <Card
          className={`w-full p-5 cursor-pointer transition-all ${
            showPendingOnly ? 'ring-2 ring-amber-300' : 'hover:-translate-y-0.5'
          }`}
          onClick={() => setShowPendingOnly(!showPendingOnly)}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Filter className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {t("assignments.pendingGrades")}
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {assignmentsWithPendingCount}
            </p>
            <p className="text-sm text-gray-400">
              {assignmentsWithPendingCount === 1
                ? t("assignments.assignment")
                : t("assignments.assignmentsPlural")}
            </p>
          </div>
          {filteredPendingGradesCount > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium ring-1 ring-amber-100">
              {language === 'korean'
                ? `${filteredPendingGradesCount}개 제출물 대기`
                : `${filteredPendingGradesCount} pending`}
            </div>
          )}
          {showPendingOnly && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium ring-1 ring-amber-100 ml-2">
              ✓ {t("assignments.filterActive")}
            </div>
          )}
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setViewMode('list'); setSelectedAssignmentIds(new Set()) }}
            className={`h-9 px-3 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("assignments.listView"))}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setViewMode('card'); setSelectedAssignmentIds(new Set()) }}
            className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("assignments.cardView"))}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className={`h-9 px-3 ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("common.tableView"))}
          >
            <Rows3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar and Sort Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[180px] sm:min-w-[250px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={String(t("assignments.searchPlaceholder"))}
            value={assignmentSearchQuery}
            onChange={(e) => setAssignmentSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        <SearchKbdHint />
        </div>

        {/* Classroom Filter */}
        <Select
          value={classroomFilter}
          onValueChange={updateClassroomFilter}
        >
          <SelectTrigger className="[&[data-size=default]]:h-12 h-12 min-h-[3rem] w-full sm:w-60 rounded-lg border border-border bg-white focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm">
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

      {/* Bulk Action Bar — only renders in table view when rows are selected */}
      {viewMode === 'table' && selectedAssignmentIds.size > 0 && (
        <div className="mb-4">
          <BulkActionBar
            selectedCount={selectedAssignmentIds.size}
            onClear={() => setSelectedAssignmentIds(new Set())}
          >
            <Select
              value=""
              onValueChange={(value) => handleBulkTypeUpdate(value as Assignment['assignment_type'])}
              disabled={bulkUpdating}
            >
              <SelectTrigger className="h-8 w-auto min-w-[140px] rounded-md border border-border bg-white text-sm shadow-sm focus:border-primary focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                <SelectValue placeholder={String(t('assignments.bulkSetType'))} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quiz">{t('assignments.quiz')}</SelectItem>
                <SelectItem value="homework">{t('assignments.homework')}</SelectItem>
                <SelectItem value="test">{t('assignments.test')}</SelectItem>
                <SelectItem value="project">{t('assignments.project')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkUpdating}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
            >
              {t('common.delete')}
            </Button>
          </BulkActionBar>
        </div>
      )}

      {/* Assignments Content */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedAssignments.map((assignment) => (
          <DashboardCard
            key={assignment.id}
            accentColor={assignment.classroom_color || '#6B7280'}
            statusLabel={t(`assignments.${assignment.assignment_type}`)}
            statusToneClass="text-violet-600"
            title={assignment.title}
            subtitle={
              <>
                <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{assignment.classroom_name}</span>
              </>
            }
            actions={
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700" onClick={() => handleEditClick(assignment)} aria-label={String(t('common.edit'))}>
                  <Edit className="w-4 h-4" strokeWidth={1.75} />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteClick(assignment)} aria-label={String(t('common.delete'))}>
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </Button>
              </>
            }
            metrics={[
              {
                label: t('assignments.due') as string,
                value: assignment.due_date ? formatDate(assignment.due_date) : '—'
              },
              {
                label: t('common.type') as string,
                value: t(`assignments.${assignment.assignment_type}`)
              },
              {
                label: t('assignments.submitted') as string,
                value: `${assignment.submitted_count || 0}/${assignment.student_count || 0}`
              }
            ]}
            meta={
              <>
                <div className="flex items-start gap-1.5">
                  <Users className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span>{assignment.teacher_name}</span>
                </div>
                {assignment.category_name && (
                  <div className="flex items-start gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span>{assignment.category_name}</span>
                  </div>
                )}
                {assignment.session_date && (
                  <div className="flex items-start gap-1.5">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span>{formatDate(assignment.session_date)}</span>
                  </div>
                )}
              </>
            }
            notes={assignment.description}
            footerActions={
              <>
                <Button variant="outline" className="w-full text-xs sm:text-sm h-9" onClick={() => handleViewDetails(assignment)}>
                  {t("assignments.viewDetails")}
                </Button>
                <Button className="w-full text-xs sm:text-sm h-9" onClick={() => handleUpdateSubmissions(assignment)}>
                  {t("assignments.updateSubmissions")}
                </Button>
              </>
            }
          />
        ))}
        </div>
      ) : viewMode === 'table' ? (
        /* Table View — sortable, selectable, mobile falls back to cards */
        (() => {
          const typeTone = (type: Assignment['assignment_type']) =>
            type === 'quiz' ? 'sky' :
            type === 'test' ? 'rose' :
            type === 'project' ? 'violet' :
            'amber'

          const columns: DataTableColumn<Assignment>[] = [
            {
              id: 'classroom',
              header: t('navigation.classrooms'),
              sortable: true,
              sortFn: (a, b) => (a.classroom_name || '').localeCompare(b.classroom_name || ''),
              cell: (a) => (
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: a.classroom_color || '#6B7280' }}
                  />
                  <span className="font-medium text-gray-900 truncate">{a.classroom_name}</span>
                </div>
              ),
            },
            {
              id: 'title',
              header: t('assignments.title'),
              sortable: true,
              sortFn: (a, b) => a.title.localeCompare(b.title),
              cell: (a) => <span className="text-sm font-medium text-gray-900 truncate">{a.title}</span>,
            },
            {
              id: 'due',
              header: t('assignments.due'),
              sortable: true,
              sortFn: (a, b) => (a.due_date || '').localeCompare(b.due_date || ''),
              cell: (a) => (
                <span className="text-sm text-gray-700 tabular-nums">
                  {a.due_date ? formatDate(a.due_date) : '—'}
                </span>
              ),
            },
            {
              id: 'type',
              header: t('common.type'),
              sortable: true,
              sortFn: (a, b) => a.assignment_type.localeCompare(b.assignment_type),
              cell: (a) => (
                <StatusPill tone={typeTone(a.assignment_type)}>
                  {t(`assignments.${a.assignment_type}`)}
                </StatusPill>
              ),
            },
            {
              id: 'teacher',
              header: t('navigation.teachers'),
              cell: (a) => <span className="text-sm text-gray-700">{a.teacher_name}</span>,
              hideOnMobile: true,
            },
            {
              id: 'submissions',
              header: t('assignments.submitted'),
              align: 'right',
              cell: (a) => (
                <span className="text-sm text-gray-700 tabular-nums">
                  {a.submitted_count || 0}/{a.student_count || 0}
                </span>
              ),
              hideOnMobile: true,
            },
          ]

          return (
            <DataTable<Assignment>
              data={filteredAssignments}
              columns={columns}
              getRowId={(a) => a.id}
              selection={{
                selected: selectedAssignmentIds,
                onChange: setSelectedAssignmentIds,
              }}
              sort={{
                state: tableSort,
                onChange: setTableSort,
              }}
              onRowClick={(a) => handleViewDetails(a)}
              emptyState={{
                icon: ClipboardList,
                title: String(t('assignments.noAssignmentsFound')),
                description: String(t('sessions.tryDifferentSearch')),
              }}
              mobileRender={(a) => (
                <DashboardCard
                  accentColor={a.classroom_color || '#6B7280'}
                  statusLabel={t(`assignments.${a.assignment_type}`)}
                  statusToneClass="text-violet-600"
                  title={a.title}
                  subtitle={
                    <>
                      <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span>{a.classroom_name}</span>
                    </>
                  }
                  metrics={[
                    { label: t('assignments.due') as string, value: a.due_date ? formatDate(a.due_date) : '—' },
                    { label: t('common.type') as string, value: t(`assignments.${a.assignment_type}`) },
                    { label: t('assignments.submitted') as string, value: `${a.submitted_count || 0}/${a.student_count || 0}` }
                  ]}
                  onClick={() => handleViewDetails(a)}
                />
              )}
            />
          )
        })()
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
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500" />
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
        <Card>
          <EmptyState
            icon={BookOpen}
            title={showPendingOnly
              ? (language === 'korean' ? '대기 중인 과제가 없습니다' : 'No pending assignments')
              : String(t("assignments.noAssignmentsFound"))}
            description={showPendingOnly
              ? (language === 'korean' ? '모든 과제의 채점이 완료되었습니다' : 'All assignments have been graded')
              : assignmentSearchQuery
                ? String(t("assignments.tryAdjustingSearch"))
                : classroomFilter !== 'all'
                  ? (language === 'korean' ? '선택한 클래스에 과제가 없습니다' : 'No assignments in the selected classroom')
                  : String(t("assignments.getStartedFirstAssignment"))}
            {...(showPendingOnly
              ? { actionLabel: language === 'korean' ? '필터 해제' : 'Clear filter', onAction: () => setShowPendingOnly(false), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
              : assignmentSearchQuery
                ? { actionLabel: String(t("assignments.clearSearch")), onAction: () => setAssignmentSearchQuery(''), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
                : classroomFilter !== 'all'
                  ? { actionLabel: language === 'korean' ? '필터 해제' : 'Clear filter', onAction: () => updateClassroomFilter('all'), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
                  : { actionLabel: String(t("assignments.addAssignment")), onAction: () => setShowModal(true), actionIcon: <Plus className="w-4 h-4" /> })}
            {...((!showPendingOnly && !assignmentSearchQuery && classroomFilter === 'all')
              ? { helpSlug: 'assignments', helpLabel: String(t("common.learnMore")) }
              : {})}
          />
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

      <ModalShell.Confirm
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={String(t("assignments.bulkDeleteTitle"))}
        message={String(t("assignments.bulkDeleteConfirm", { count: selectedAssignmentIds.size }))}
        variant="danger"
        confirmLabel={bulkUpdating ? String(t("common.deleting")) : String(t("common.delete"))}
        cancelLabel={String(t("common.cancel"))}
        loading={bulkUpdating}
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
