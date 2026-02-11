"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
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
import { useSubjectData } from '@/hooks/useSubjectData'
import { useSubjectActions } from '@/hooks/useSubjectActions'
import { FileUpload } from '@/components/ui/file-upload'
import { AttachmentList } from '@/components/ui/attachment-list'
import { Modal } from '@/components/ui/modal'
import { showSuccessToast, showErrorToast } from '@/stores'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { invalidateSessionsCache } from '@/components/ui/sessions-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'

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
    if (key.startsWith(`assignments-${academyId}`) ||
        key.includes(`assignments-${academyId}`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} assignment cache entries`)
}

export function AssignmentsPage({ academyId, filterSessionId }: AssignmentsPageProps) {
  const { t, language } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getCategoriesBySubjectId, refreshCategories } = useSubjectData(academyId)
  const { createAssignmentCategory } = useSubjectActions()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null)
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [submissionsAssignment, setSubmissionsAssignment] = useState<Assignment | null>(null)
  const [submissionGrades, setSubmissionGrades] = useState<SubmissionGrade[]>([])
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('')
  const [sessionSearchQuery, setSessionSearchQuery] = useState('')
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
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 12
  const sessionsPerPage = 5 // For list view - show 5 complete sessions per page
  const [initialized, setInitialized] = useState(false)

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

  const [sessions, setSessions] = useState<Session[]>([])
  const [assignmentGrades, setAssignmentGrades] = useState<SubmissionGrade[]>([])
  const [pendingGradesCount, setPendingGradesCount] = useState<number>(0)
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; subject_id?: string; color?: string; teacher_id?: string }[]>([])

  // PERFORMANCE: Cache classrooms data to avoid duplicate queries
  const classroomsCache = useRef<{ id: string; name: string; subject_id?: string; color?: string; teacher_id?: string }[] | null>(null)

  // Separate function to fetch classrooms for the filter dropdown
  // Uses shared cache from classrooms page for better performance
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) {
      console.warn('fetchClassrooms: No academyId available yet')
      return
    }

    try {
      // Check shared cache from classrooms page first
      const cacheKey = `classrooms-${academyId}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 10 * 60 * 1000 // 10 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          // Handle both object structure { classrooms: [...] } and plain array
          const allClassrooms = parsed.classrooms || parsed
          console.log('✅ Using cached classrooms for dropdown:', allClassrooms.length)
          const activeClassrooms = allClassrooms.filter((c: any) => !c.paused)
          setClassrooms(activeClassrooms)
          // Also cache for fetchSessions
          classroomsCache.current = allClassrooms
          return
        }
      }

      // Cache miss - fetch from database
      console.log('❌ No classroom cache - fetching from database')
      const { data: allClassrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id, name, subject_id, color, teacher_id, paused')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (classroomsError) {
        console.error('Error fetching classrooms:', classroomsError)
        setClassrooms([])
      } else if (allClassrooms && allClassrooms.length > 0) {
        // Store only active (non-paused) classrooms for the dropdown
        const activeClassrooms = allClassrooms.filter(c => !c.paused)
        setClassrooms(activeClassrooms)
        // Also cache for fetchSessions
        classroomsCache.current = allClassrooms

        // Cache the results for other pages to use
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(allClassrooms))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
          console.log('✅ Cached classrooms for future use')
        } catch (cacheError) {
          console.warn('Failed to cache classrooms:', cacheError)
        }
      } else {
        setClassrooms([])
      }
    } catch (error) {
      console.error('Error in fetchClassrooms:', error)
      setClassrooms([])
    }
  }, [academyId])

  // Manager role and inline category creation states
  const [isManager, setIsManager] = useState(false)
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
  console.log('Assignment form validation:', {
    title: formData.title,
    titleTrimmed: formData.title.trim(),
    sessionId: formData.classroom_session_id,
    dueDate: formData.due_date,
    isFormValid
  })

  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([])

  // Check if current user is a manager for this academy
  const checkUserRole = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      console.log('[Auth Debug] Checking user role:', { 
        hasUser: !!user, 
        userId: user?.id, 
        academyId,
        authError
      })
      
      if (authError) {
        console.error('[Auth Debug] Authentication error:', authError)
        return false
      }
      
      if (!user) {
        console.warn('[Auth Debug] No authenticated user found')
        return false
      }

      if (!academyId) {
        console.warn('[Auth Debug] No academyId available yet')
        return false
      }

      const { data, error } = await supabase
        .from('managers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('user_id', user.id)
        .single()

      console.log('[Auth Debug] Manager check result:', { 
        data, 
        error, 
        isManager: !!data,
        errorCode: error?.code
      })

      if (error && error.code !== 'PGRST116') {
        console.error('[Auth Debug] Error checking manager role:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('[Auth Debug] Exception in checkUserRole:', error)
      return false
    }
  }, [academyId])

  // Handle inline category creation
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    const selectedSession = sessions.find(s => s.id === formData.classroom_session_id)
    if (!selectedSession?.subject_id) {
      alert('Please select a session with a subject first')
      return
    }

    console.log('[Category Debug] Creating category:', {
      name: newCategoryName.trim(),
      academyId,
      subjectId: selectedSession.subject_id,
      isManager
    })

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

      console.log('[Category Debug] User authenticated, creating category...')

      const result = await createAssignmentCategory({
        name: newCategoryName.trim(),
        academy_id: academyId,
        subject_id: selectedSession.subject_id
      })

      console.log('[Category Debug] Creation result:', result)

      if (result.success) {
        // Refresh categories to show new category immediately
        await refreshCategories()
        setFormData({ ...formData, assignment_categories_id: result.data?.id || '' })
        setNewCategoryName('')
        setShowInlineCategoryCreate(false)
        
        // Success feedback (could be replaced with toast notification)
        console.log(`✅ Category "${newCategoryName.trim()}" created successfully!`)
      } else {
        const errorMsg = result.error?.message || 'Failed to create category'
        console.error('[Category Debug] Creation failed:', result.error)
        
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
      console.error('[Category Debug] Exception during creation:', error)
      alert('Failed to create category. Please check your permissions and try again.')
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

  const fetchAssignments = useCallback(async (skipLoading = false) => {
    console.log('📊 [FETCH] Starting fetchAssignments - academyId:', academyId)

    if (!academyId) {
      console.warn('fetchAssignments: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return []
    }

    try {
      if (!skipLoading) {
        setLoading(true)
      }

      // PERFORMANCE: Check cache first (valid for 2 minutes)
      // Cache key includes version to force refresh after code changes
      const CACHE_VERSION = 'v6' // Increment when changing data fetch logic
      const cacheKey = `assignments-${CACHE_VERSION}-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          console.log('✅ Cache hit:', {
            assignments: parsed.assignments?.length || 0,
            totalCount: parsed.totalCount || 0,
            pendingGradesCount: parsed.pendingGradesCount || 0
          })
          setAssignments(parsed.assignments)
          setPendingGradesCount(parsed.pendingGradesCount || 0)
          setTotalCount(parsed.totalCount || 0)
          setInitialized(true)
          setLoading(false)

          return parsed.assignments
        }
      }

      setInitialized(true)

      // STEP 1: Get classrooms for this academy (required first to filter other queries)
      const { data: allClassrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id, name, subject_id, color, teacher_id, paused')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (classroomsError || !allClassrooms || allClassrooms.length === 0) {
        setAssignments([])
        setTotalCount(0)
        setLoading(false)
        return []
      }

      // Cache classrooms for fetchSessions to avoid duplicate query
      // Note: setClassrooms is handled by the separate fetchClassrooms function
      classroomsCache.current = allClassrooms

      // STEP 2: Fetch assignments using join-based filtering (avoids URL length limits with many session IDs)
      // This uses inner joins to filter by academy_id instead of passing hundreds of session IDs
      let assignmentsQuery = supabase
        .from('assignments')
        .select(`
          id,
          created_at,
          classroom_session_id,
          assignment_categories_id,
          classroom_sessions!inner(
            id,
            classroom_id,
            classrooms!inner(
              id,
              academy_id
            )
          )
        `)
        .eq('classroom_sessions.classrooms.academy_id', academyId)
        .is('deleted_at', null)

      // Apply session filter if provided
      if (filterSessionId) {
        assignmentsQuery = assignmentsQuery.eq('classroom_session_id', filterSessionId)
      }

      const { data: assignmentsForSorting, error: sortingError } = await assignmentsQuery

      if (sortingError) {
        console.error('Error fetching assignments for sorting:', {
          message: sortingError.message,
          details: sortingError.details,
          hint: sortingError.hint,
          code: sortingError.code
        })
        setAssignments([])
        setLoading(false)
        return []
      }

      if (!assignmentsForSorting || assignmentsForSorting.length === 0) {
        setAssignments([])
        setTotalCount(0)
        setLoading(false)
        return []
      }

      // Total count from the fetched assignments
      const totalCount = assignmentsForSorting.length
      setTotalCount(totalCount)

      // Count unique sessions from assignments
      const uniqueSessionCount = new Set(assignmentsForSorting.map(a => a.classroom_session_id)).size
      console.log('📋 Found', uniqueSessionCount, 'sessions,', totalCount, 'assignments')

      // STEP 4: Sort in memory
      const sorted = assignmentsForSorting.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // STEP 5: Fetch full data for all assignments (pagination will be applied client-side)
      const allAssignmentIds = sorted.map(a => a.id)
      const sessionIdsNeeded = [...new Set(sorted.map(a => a.classroom_session_id))]
      const categoryIdsNeeded = [...new Set(sorted.map(a => a.assignment_categories_id).filter(Boolean))]

      // STEP 6: Fetch full data in parallel (for all assignments)
      // Batch IDs to avoid URL length limits and ensure grade queries stay under row limits
      // 50 assignments × ~12 students = ~600 grades per batch (well under 1000 default limit)
      const BATCH_SIZE = 50

      const batchIds = <T,>(ids: T[]): T[][] => {
        const batches: T[][] = []
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          batches.push(ids.slice(i, i + BATCH_SIZE))
        }
        return batches
      }

      // Batch fetch assignments
      const assignmentBatches = batchIds(allAssignmentIds)
      const assignmentPromises = assignmentBatches.map(batch =>
        supabase
          .from('assignments')
          .select('*')
          .in('id', batch)
          .is('deleted_at', null)
      )

      // Batch fetch sessions
      const sessionBatches = batchIds(sessionIdsNeeded)
      const sessionPromises = sessionBatches.map(batch =>
        supabase
          .from('classroom_sessions')
          .select('id, date, start_time, end_time, classroom_id')
          .in('id', batch)
      )

      // Fetch categories (usually small, no need to batch)
      const categoriesPromise = categoryIdsNeeded.length > 0
        ? supabase
            .from('assignment_categories')
            .select('id, name')
            .in('id', categoryIdsNeeded)
        : Promise.resolve({ data: [] })

      // Execute all batches in parallel
      const [assignmentResults, sessionResults, categoriesDataResult] = await Promise.all([
        Promise.all(assignmentPromises),
        Promise.all(sessionPromises),
        categoriesPromise
      ])

      // Combine batch results
      const fullAssignmentsData = assignmentResults.flatMap(r => r.data || [])
      const fullAssignmentsError = assignmentResults.find(r => r.error)?.error
      const sessionsData = sessionResults.flatMap(r => r.data || [])

      if (fullAssignmentsError) {
        console.error('Error fetching full assignments:', fullAssignmentsError)
        setAssignments([])
        setLoading(false)
        return []
      }

      // STEP 7: Get classrooms for the sessions (use cached data)
      const sessionClassroomIds = [...new Set(sessionsData.map(s => s.classroom_id).filter(Boolean))]
      const classroomsForSessions = allClassrooms.filter(c => sessionClassroomIds.includes(c.id))

      // STEP 8: Join in memory
      const data = fullAssignmentsData.map(assignment => {
        const session = sessionsData.find(s => s.id === assignment.classroom_session_id)
        const category = categoriesDataResult.data?.find(c => c.id === assignment.assignment_categories_id)
        const classroom = session ? classroomsForSessions.find(c => c.id === session.classroom_id) : null

        return {
          ...assignment,
          classroom_sessions: session ? {
            ...session,
            classrooms: classroom
          } : null,
          assignment_categories: category || null
        }
      }) || []

      if (data.length === 0) {
        setAssignments([])
        setLoading(false)
        return []
      }

      // Extract IDs for supplementary queries from all assignments
      const assignmentClassroomIds = [...new Set(data.map(a => a.classroom_sessions?.classrooms?.id).filter(Boolean))]
      const teacherIds = [...new Set(data.map(a => a.classroom_sessions?.classrooms?.teacher_id).filter(Boolean))]
      const assignmentIds = data.map(a => a.id)

      // STEP 9: Execute supplementary queries
      // Use RPC function to fetch aggregated grade counts (avoids row limits)

      // Helper function to fetch grade counts using RPC
      const fetchGradeCounts = async (): Promise<Map<string, { total: number; submitted: number; pending: number }>> => {
        console.log('📊 [Grades] Starting grade count fetch for academy:', academyId)

        const countsMap = new Map<string, { total: number; submitted: number; pending: number }>()

        if (assignmentIds.length === 0) {
          console.log('📊 [Grades] No assignments to fetch grades for')
          return countsMap
        }

        try {
          // Use RPC function that returns aggregated counts per assignment
          // Fetch in batches to overcome Supabase's 1000 row default limit
          const BATCH_SIZE = 1000
          let offset = 0
          let hasMore = true

          while (hasMore) {
            const { data, error } = await supabase
              .rpc('get_assignment_grade_counts_for_academy', { p_academy_id: academyId })
              .range(offset, offset + BATCH_SIZE - 1)

            if (error) {
              console.error('❌ [Grades] Error fetching grade counts via RPC:', error)
              break
            }

            console.log(`📊 [Grades] Batch ${offset / BATCH_SIZE + 1}: fetched ${data?.length || 0} rows`)

            // Build map from results - use String() for consistent key comparison
            data?.forEach((row: { assignment_id: string; total_count: number; submitted_count: number; pending_count: number }) => {
              countsMap.set(String(row.assignment_id), {
                total: Number(row.total_count) || 0,
                submitted: Number(row.submitted_count) || 0,
                pending: Number(row.pending_count) || 0
              })
            })

            // Check if we got less than BATCH_SIZE, meaning no more data
            if (!data || data.length < BATCH_SIZE) {
              hasMore = false
            } else {
              offset += BATCH_SIZE
            }
          }

          console.log(`📊 [Grades] Built counts map for ${countsMap.size} assignments`)

          return countsMap
        } catch (err) {
          console.error('❌ [Grades] Exception fetching grade counts:', err)
          return countsMap
        }
      }

      // Helper function to fetch all attachments - use a single query since attachments are rare
      const fetchAllAttachments = async () => {
        if (assignmentIds.length === 0) {
          return { data: [] }
        }

        try {
          // Try a simple count first to check if there are any attachments
          const { count, error: countError } = await supabase
            .from('assignment_attachments')
            .select('*', { count: 'exact', head: true })

          if (countError || !count || count === 0) {
            console.log('📎 [Attachments] No attachments found or table empty')
            return { data: [] }
          }

          // If there are attachments, fetch them in batches
          const BATCH_SIZE = 50
          const allAttachments: {
            assignment_id: string;
            file_name: string;
            file_url: string;
            file_size: number;
            file_type: string;
          }[] = []

          for (let i = 0; i < assignmentIds.length; i += BATCH_SIZE) {
            const batch = assignmentIds.slice(i, i + BATCH_SIZE)
            const { data, error } = await supabase
              .from('assignment_attachments')
              .select('assignment_id, file_name, file_url, file_size, file_type')
              .in('assignment_id', batch)

            if (error) {
              console.warn('Warning fetching attachments batch:', error.message)
              continue
            }
            if (data) {
              allAttachments.push(...data)
            }
          }

          console.log(`📎 [Attachments] Fetched ${allAttachments.length} attachments`)
          return { data: allAttachments }
        } catch (err) {
          console.warn('📎 [Attachments] Error fetching attachments, skipping:', err)
          return { data: [] }
        }
      }

      const [
        gradeCountsMap,
        attachmentsResult,
        teachersResult
      ] = await Promise.all([
        // Grade counts using aggregated RPC
        fetchGradeCounts(),

        // Attachments using batched fetching
        fetchAllAttachments(),

        // Teacher names
        teacherIds.length > 0
          ? supabase
              .from('users')
              .select('id, name')
              .in('id', teacherIds)
          : Promise.resolve({ data: [] })
      ])

      // Calculate total pending grades for the header card
      let totalPendingGrades = 0
      gradeCountsMap.forEach(counts => {
        totalPendingGrades += counts.pending
      })
      console.log('📊 Grade counts:', {
        assignmentsWithGrades: gradeCountsMap.size,
        totalPendingGrades
      })

      // Create lookup maps
      const attachmentMap = new Map<string, AttachmentFile[]>()
      const teacherMap = new Map<string, string>()

      // Process teacher names
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teachersResult.data?.forEach((teacher: any) => {
        teacherMap.set(teacher.id, teacher.name)
      })

      // Debug: Check if first assignment exists in grade counts map
      if (data.length > 0 && gradeCountsMap.size > 0) {
        const firstAssignment = data[0]
        const firstId = String(firstAssignment.id)
        const mapKeys = Array.from(gradeCountsMap.keys()).slice(0, 3)
        const countsForFirst = gradeCountsMap.get(firstId)
        console.log('📊 ID MATCH DEBUG:', {
          firstAssignmentId: firstId,
          sampleMapKeys: mapKeys,
          doesFirstIdExistInMap: gradeCountsMap.has(firstId),
          countsForFirstId: countsForFirst,
          totalMapEntries: gradeCountsMap.size
        })
      }

      // Process attachments
      attachmentsResult.data?.forEach((attachment: {
        assignment_id: string;
        file_name: string;
        file_url: string;
        file_size: number;
        file_type: string;
      }) => {
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
      
      // OPTIMIZED: Process assignments with all data available
      const assignmentsWithDetails = data.map((assignment) => {
        const session = assignment.classroom_sessions
        const classroom = session?.classrooms
        const teacherName = classroom?.teacher_id ? teacherMap.get(classroom.teacher_id) : null
        
        // Preserve debug logging for Global Warming essay
        if (assignment.title === "Write an Essay about Global Warming" || 
            assignment.description === "Write an Essay about Global Warming" ||
            (assignment.title && assignment.title.includes("Global Warming")) ||
            (assignment.description && assignment.description.includes("Global Warming"))) {
          console.log('[Assignment Debug] Global Warming Essay Found:', {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            assignment_categories_id: assignment.assignment_categories_id,
            category_name: assignment.assignment_categories?.name,
            raw_assignment: assignment
          })
        }
        
        // Use String() to ensure consistent ID comparison with maps
        const assignmentId = String(assignment.id)
        const gradeCounts = gradeCountsMap.get(assignmentId) || { total: 0, submitted: 0, pending: 0 }

        return {
          ...assignment,
          assignment_categories_id: assignment.assignment_categories_id,
          classroom_name: classroom?.name || 'Unknown Classroom',
          classroom_color: classroom?.color || '#6B7280',
          teacher_name: teacherName || 'Unknown Teacher',
          session_date: session?.date,
          session_time: `${session?.start_time} - ${session?.end_time}`,
          category_name: assignment.assignment_categories?.name,
          attachments: attachmentMap.get(assignmentId) || [],
          student_count: gradeCounts.total,
          submitted_count: gradeCounts.submitted,
          pending_count: gradeCounts.pending
        }
      })
      
      setAssignments(assignmentsWithDetails)

      // Set pending grades count from aggregated RPC result
      console.log('📝 Pending grades:', totalPendingGrades)
      setPendingGradesCount(totalPendingGrades)

      // PERFORMANCE: Cache the results BEFORE returning
      try {
        const dataToCache = {
          assignments: assignmentsWithDetails,
          pendingGradesCount: totalPendingGrades,
          totalCount: totalCount
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Assignments cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache assignments:', cacheError)
      }

      setLoading(false)
      return assignmentsWithDetails
    } catch (error: unknown) {
      console.error('Error fetching assignments:', error)
      setAssignments([])
      setLoading(false)
      return []
    }
  }, [academyId, filterSessionId])

  const fetchSessions = useCallback(async () => {
    if (!academyId) return

    try {
      // PERFORMANCE: Use cached classrooms data if available, otherwise query
      let classrooms = classroomsCache.current

      if (!classrooms) {
        const { data } = await supabase
          .from('classrooms')
          .select('id, name, subject_id, color, teacher_id')
          .eq('academy_id', academyId)
          .is('deleted_at', null)

        classrooms = data || []
        classroomsCache.current = classrooms
      }

      if (!classrooms || classrooms.length === 0) {
        setSessions([])
        return
      }

      const classroomIds = classrooms.map(c => c.id)
      const classroomMap = Object.fromEntries(classrooms.map(c => [c.id, c]))

      // Get sessions for these classrooms (including past sessions for editing existing assignments)
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('id, date, start_time, end_time, classroom_id')
        .in('classroom_id', classroomIds)
        .is('deleted_at', null)
        // Removed date filter to include past sessions needed for editing existing assignments
        .order('date', { ascending: false }) // Most recent first
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      const sessionsData = data?.map(session => {
        const classroom = classroomMap[session.classroom_id]
        const classroomName = classroom?.name || 'Unknown Classroom'

        return {
          id: session.id,
          classroom_name: classroomName,
          classroom_id: session.classroom_id,
          subject_id: classroom?.subject_id,
          date: session.date,
          start_time: session.start_time,
          end_time: session.end_time
        };
      }) || []

      setSessions(sessionsData)
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error)
    }
  }, [academyId])

  // OPTIMIZED: Consolidated useEffect - runs all fetches once on mount and when dependencies change
  useEffect(() => {
    if (!academyId) return

    console.log('🔄 useEffect triggered - starting data fetch')

    // Check if page was refreshed - if so, clear caches to force fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      console.log('🔄 [Assignments] Page refresh detected - fetching fresh data')
      // Also explicitly invalidate assignment cache
      invalidateAssignmentsCache(academyId)
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    // Cache key only includes server-side filters (filterSessionId) for better cache hit rate
    const cacheKey = `assignments-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [Assignments useEffect] Using cached data - NO skeleton')
        setAssignments(parsed.assignments)
        setPendingGradesCount(parsed.pendingGradesCount || 0)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        // Still load secondary data in background
        fetchClassrooms()
        fetchSessions()
        checkUserRole().then(setIsManager)
        return // Skip fetchAssignments - we have cached data
      }
    }

    // Cache miss - show loading and fetch all data
    console.log('❌ [Assignments useEffect] Cache miss - showing skeleton')
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }

    // Run all fetches in parallel for better performance
    Promise.all([
      fetchAssignments(),
      fetchClassrooms(),
      fetchSessions(),
      checkUserRole().then(setIsManager)
    ]).then(() => {
      console.log('✅ All data loaded successfully')
    }).catch((error) => {
      console.error('❌ Error loading data:', error)
    })
  }, [academyId, filterSessionId, fetchAssignments, fetchClassrooms, fetchSessions, checkUserRole])

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
                  } else {
                    console.log(`Successfully created ${gradeRecords.length} assignment grade records`)
                  }
                } else {
                  console.log('All assignment grades already exist for this assignment')
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
    
    // Enhanced debugging for the Global Warming essay
    if (assignment.title === "Write an Essay about Global Warming" || assignment.description === "Write an Essay about Global Warming") {
      console.log('[SPECIAL DEBUG] Global Warming Assignment:', {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        assignment_categories_id: assignment.assignment_categories_id,
        category_name: assignment.category_name,
        classroom_session_id: assignment.classroom_session_id,
        full_assignment: assignment
      })
    }
    
    // Find the session to get subject_id for loading categories
    const selectedSession = sessions.find(s => s.id === assignment.classroom_session_id)
    
    if (!selectedSession) {
      console.error('[ERROR] Session not found for assignment:', {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        sessionId: assignment.classroom_session_id,
        availableSessions: sessions.map(s => ({ 
          id: s.id, 
          classroom_id: s.classroom_id,
          subject_id: s.subject_id,
          date: s.date
        })),
        totalSessionsLoaded: sessions.length
      })
      
      // Since we can't find the session, we can't load categories for it
      // Set form data anyway so user can at least see/edit other fields
      setFormData({
        classroom_session_id: assignment.classroom_session_id,
        title: assignment.title,
        description: assignment.description || '',
        assignment_type: assignment.assignment_type,
        due_date: assignment.due_date || '',
        assignment_categories_id: '' // Clear category since we can't verify it
      })
      
      setAttachmentFiles(assignment.attachments || [])
      
      // Still show modal but warn user
      setTimeout(() => {
        setShowModal(true)
        alert('Warning: The session for this assignment could not be found. You may need to select a new session.')
      }, 50)
      
      return // Exit early since we can't proceed with category loading
    }
    
    // Load existing attachments
    if (assignment.attachments && assignment.attachments.length > 0) {
      setAttachmentFiles(assignment.attachments)
    } else {
      setAttachmentFiles([])
    }
    
    // Ensure categories are loaded for this subject BEFORE setting form data
    if (selectedSession?.subject_id) {
      await refreshCategories()
      
      // Debug: Check if the assignment's category is in the filtered categories
      const filteredCategories = getCategoriesBySubjectId(selectedSession.subject_id)
      const assignmentCategoryExists = filteredCategories.find(cat => cat.id === assignment.assignment_categories_id)
      
      console.log('[Category Debug] Edit assignment:', {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        assignmentCategoryId: assignment.assignment_categories_id,
        sessionId: assignment.classroom_session_id,
        subjectId: selectedSession.subject_id,
        filteredCategories: filteredCategories.map(c => ({ id: c.id, name: c.name })),
        filteredCategoriesCount: filteredCategories.length,
        categoryExists: !!assignmentCategoryExists,
        categoryName: assignmentCategoryExists?.name
      })
    } else {
      console.log('[No Session/Subject] Cannot load categories - no subject_id found')
    }
    
    // Set form data AFTER categories are loaded
    setFormData({
      classroom_session_id: assignment.classroom_session_id,
      title: assignment.title,
      description: assignment.description || '',
      assignment_type: assignment.assignment_type,
      due_date: assignment.due_date || '',
      assignment_categories_id: assignment.assignment_categories_id || ''
    })
    
    console.log('[FormData Set AFTER categories loaded]:', {
      assignment_categories_id: assignment.assignment_categories_id || '',
      categoryExists: selectedSession?.subject_id ? 
        !!getCategoriesBySubjectId(selectedSession.subject_id).find(c => c.id === assignment.assignment_categories_id) : 
        false
    })
    
    // Small delay to ensure React state updates properly
    setTimeout(() => {
      setShowModal(true)
    }, 50)
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
    setViewingAssignment(assignment)

    // Fetch assignment grades for this assignment
    // Note: student_id is a user_id, so we join directly to users table
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
      console.log('Fetched grades for view:', grades)
      // Map grades to SubmissionGrade[]
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

    setShowViewModal(true)
  }

  const handleUpdateSubmissions = async (assignment: Assignment) => {
    setSubmissionsAssignment(assignment)

    try {
      console.log('Fetching assignment grades for assignment:', assignment.id)

      // Fetch assignment grades with student names for editing
      // Note: student_id is a user_id, so we join directly to users table
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
        console.error('Error fetching assignment grades:', error)
        alert('Failed to load assignment grades')
        return
      }

      console.log('Fetched grades:', grades)

      // Fetch attendance data for the session
      const attendanceMap = new Map<string, 'present' | 'late' | 'absent' | 'pending'>()

      if (assignment.classroom_session_id) {
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_id, status')
          .eq('classroom_session_id', assignment.classroom_session_id)

        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError)
        } else if (attendanceData) {
          attendanceData.forEach((record: { student_id: string, status: 'present' | 'late' | 'absent' | 'pending' }) => {
            attendanceMap.set(record.student_id, record.status)
          })
        }
      }

      // Format the data for the submissions modal
      const formattedGrades = grades?.map((grade: Record<string, unknown>) => ({
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

      console.log('Formatted grades:', formattedGrades)
      setSubmissionGrades(formattedGrades)
      setShowSubmissionsModal(true)
    } catch (error: unknown) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred while loading assignment grades')
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
      console.log('Saving submission grades:', submissionGrades)

      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showErrorToast(t('assignments.errorUpdatingSubmissions') as string, 'You must be logged in to save grades')
        return
      }
      console.log('User authenticated:', user.id)
      
      // Test with a simple update first to avoid timeout issues
      let successCount = 0
      
      // Process grades in smaller batches to avoid timeouts
      const batchSize = 5
      for (let i = 0; i < submissionGrades.length; i += batchSize) {
        const batch = submissionGrades.slice(i, i + batchSize)
        
        for (const grade of batch) {
          try {
            console.log(`Updating grade ${grade.id}...`)
            
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
            
            console.log(`Update data for ${grade.id}:`, updateData)
            
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
          
          console.log(`Successfully updated grade ${grade.id}:`, data)
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
      
      console.log(`Successfully updated ${successCount} grades`)
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
    return (dateString: string) => {
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

  if (loading ) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("assignments.title")}</h1>
            <p className="text-gray-500">{t("assignments.description")}</p>
          </div>
          <Button className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
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
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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

      {/* Add/Edit Assignment Modal */}
      <Modal isOpen={showModal} onClose={() => {
        setShowModal(false)
        resetForm()
      }} size="md">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">
                {editingAssignment ? t("assignments.editAssignment") : t("assignments.addNewAssignment")}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-4">
              <form id="assignment-form" onSubmit={handleSubmit} className="space-y-5">
                {!editingAssignment && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground/80">
                      {String(t("assignments.sessionRequired")).replace(' *', '')} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.classroom_session_id}
                      onValueChange={(value) => {
                        // Reset assignment category when session changes since categories are filtered by subject
                        setFormData(prev => ({ ...prev, classroom_session_id: value, assignment_categories_id: '' }))
                      }}
                      required
                      onOpenChange={(open) => {
                        if (!open) setSessionSearchQuery('')
                      }}
                    >
                      <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                        <SelectValue placeholder={String(t("assignments.selectSession"))} />
                      </SelectTrigger>
                      <SelectContent className="z-[210]">
                        {sessions.length > 0 ? (
                          <>
                            <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder={String(t("common.search"))}
                                  value={sessionSearchQuery}
                                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                                  className="pl-8 h-8"
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto">
                              {sessions.filter(session => {
                                const searchTerm = sessionSearchQuery.toLowerCase()
                                return (
                                  session.classroom_name.toLowerCase().includes(searchTerm) ||
                                  formatDate(session.date).toLowerCase().includes(searchTerm) ||
                                  session.start_time.toLowerCase().includes(searchTerm)
                                )
                              }).map((session) => (
                                <SelectItem key={session.id} value={session.id}>
                                  {session.classroom_name} - {formatDate(session.date)} ({session.start_time})
                                </SelectItem>
                              ))}
                              {sessions.filter(session => {
                                const searchTerm = sessionSearchQuery.toLowerCase()
                                return (
                                  session.classroom_name.toLowerCase().includes(searchTerm) ||
                                  formatDate(session.date).toLowerCase().includes(searchTerm) ||
                                  session.start_time.toLowerCase().includes(searchTerm)
                                )
                              }).length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  {t("common.noResults")}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <SelectItem value="no-sessions" disabled>{t("assignments.noSessionsAvailable")}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t("assignments.titleRequired")).replace(' *', '')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={String(t("assignments.enterTitle"))}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.descriptionLabel")}
                  </Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                    placeholder={String(t("assignments.enterDescription"))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {String(t("assignments.typeRequired")).replace(' *', '')} <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.assignment_type} 
                    onValueChange={(value: 'quiz' | 'homework' | 'test' | 'project') => 
                      setFormData(prev => ({ ...prev, assignment_type: value }))
                    }
                  >
                    <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={String(t("assignments.selectType"))} />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      <SelectItem value="homework">{t("assignments.homework")}</SelectItem>
                      <SelectItem value="quiz">{t("assignments.quiz")}</SelectItem>
                      <SelectItem value="test">{t("assignments.test")}</SelectItem>
                      <SelectItem value="project">{t("assignments.project")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.category")}
                  </Label>
                  <Select 
                    value={formData.assignment_categories_id} 
                    onValueChange={(value) => {
                      if (value === 'add-new' && isManager) {
                        setShowInlineCategoryCreate(true)
                      } else {
                        setFormData(prev => ({ ...prev, assignment_categories_id: value }))
                      }
                    }}
                    disabled={!formData.classroom_session_id}
                  >
                    <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                      <SelectValue placeholder={formData.classroom_session_id ? t("assignments.selectCategory") : t("sessions.selectSessionFirst")} />
                    </SelectTrigger>
                    <SelectContent className="z-[210]">
                      {formData.classroom_session_id && getFilteredCategories().map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {isManager && formData.classroom_session_id && (
                        <SelectItem value="add-new">
                          <Plus className="w-4 h-4 inline mr-2" />
                          {t("sessions.addCategory")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {showInlineCategoryCreate && (
                    <div className="space-y-2 mt-2">
                      <Input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={String(t("sessions.enterCategoryName"))}
                        className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isCreatingCategory}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateCategory()
                          } else if (e.key === 'Escape') {
                            setShowInlineCategoryCreate(false)
                            setNewCategoryName('')
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName.trim() || isCreatingCategory}
                          size="sm"
                        >
                          {isCreatingCategory ? t('common.saving') : t('common.create')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowInlineCategoryCreate(false)
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

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    {t("assignments.dueDate")} <span className="text-red-500">*</span>
                  </Label>
                  <DatePickerComponent
                    value={formData.due_date}
                    onChange={(value) => setFormData(prev => ({ ...prev, due_date: Array.isArray(value) ? value[0] : value }))}
                    fieldId="due_date"
                    height="h-10"
                    shadow="shadow-sm"
                    placeholder={String(t("assignments.selectDueDate"))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">
                    <Paperclip className="inline w-4 h-4 mr-1" />
                    {t("assignments.attachments")}
                  </Label>
                  <FileUpload
                    files={attachmentFiles}
                    onChange={setAttachmentFiles}
                    maxFiles={5}
                    className="border border-border rounded-lg p-4"
                  />
                </div>

              </form>
            </div>

            <div className="flex gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="flex-1"
              >
                {t("assignments.cancel")}
              </Button>
              <Button
                type="submit"
                form="assignment-form"
                disabled={!isFormValid || isCreating || isSaving}
                className={`flex-1 ${!isFormValid || isCreating || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {(editingAssignment ? isSaving : isCreating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingAssignment
                  ? (isSaving ? t("common.saving") : t("assignments.updateAssignment"))
                  : (isCreating ? t("common.creating") : t("assignments.addAssignment"))
                }
              </Button>
            </div>
          </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <Modal isOpen={showDeleteModal} onClose={() => {
          setShowDeleteModal(false)
          setAssignmentToDelete(null)
        }} size="md">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t("assignments.deleteAssignment")}</h2>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <p className="text-gray-600">
                {t("assignments.deleteConfirmMessage")}
              </p>
            </div>
            <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setAssignmentToDelete(null)
                }}
                className="flex-1"
              >
                {t("assignments.cancel")}
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isSaving ? t("common.deleting") : t("assignments.deleteAssignment")}
              </Button>
            </div>
            </div>
        </Modal>
      )}

      {/* View Assignment Details Modal */}
      {viewingAssignment && (
        <Modal isOpen={showViewModal} onClose={() => {
          setShowViewModal(false)
          setViewingAssignment(null)
          setAssignmentGrades([])
        }} size="6xl">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: viewingAssignment.classroom_color || '#6B7280' }}
                />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{viewingAssignment.title}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => {
                  setShowViewModal(false)
                  setViewingAssignment(null)
                  setAssignmentGrades([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Assignment Info */}
                <div className="space-y-6">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t("assignments.assignmentInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.classroom")}</p>
                          <p className="font-medium text-gray-900">{viewingAssignment.classroom_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.teacher")}</p>
                          <p className="font-medium text-gray-900">{viewingAssignment.teacher_name}</p>
                        </div>
                      </div>
                      {viewingAssignment.session_date && (
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.sessionDate")}</p>
                            <p className="font-medium text-gray-900">{formatDate(viewingAssignment.session_date)}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {getTypeIcon(viewingAssignment.assignment_type)}
                        <div>
                          <p className="text-sm text-gray-600">{t("assignments.type")}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(viewingAssignment.assignment_type)}`}>
                            {t(`assignments.${viewingAssignment.assignment_type}`)}
                          </span>
                        </div>
                      </div>
                      {viewingAssignment.category_name && (
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.category")}</p>
                            <p className="font-medium text-gray-900">{viewingAssignment.category_name}</p>
                          </div>
                        </div>
                      )}
                      {viewingAssignment.due_date && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("assignments.dueDate")}</p>
                            <p className="font-medium text-gray-900">{formatDate(viewingAssignment.due_date)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {viewingAssignment.description && (
                    <Card className="p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.descriptionLabel")}</h3>
                      <p className="text-gray-700 leading-relaxed">{viewingAssignment.description}</p>
                    </Card>
                  )}

                  {viewingAssignment.attachments && viewingAssignment.attachments.length > 0 && (
                    <Card className="p-4 sm:p-6">
                      <AttachmentList 
                        attachments={viewingAssignment.attachments}
                        titleClassName="text-lg font-semibold text-gray-900 mb-4"
                        showDownload={true}
                        showPreview={true}
                      />
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Submissions */}
                <div className="space-y-6">
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("assignments.studentSubmissions")} ({assignmentGrades.length})
                    </h3>
                    {assignmentGrades.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("assignments.noSubmissionsYet")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignmentGrades.map((grade) => {
                          const studentName = grade.student_name || 'Unknown Student';
                          const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          
                          return (
                          <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                {initials}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{studentName}</p>
                                {grade.feedback && (
                                  <p className="text-sm text-gray-500">{grade.feedback}</p>
                                )}
                                {grade.submitted_date && (
                                  <p className="text-xs text-gray-400">{t("assignments.submitted")}: {formatDate(grade.submitted_date)}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                grade.status === 'submitted' ? 'bg-green-100 text-green-800' :
                                grade.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                grade.status === 'not submitted' ? 'bg-orange-100 text-orange-800' :
                                grade.status === 'excused' ? 'bg-purple-100 text-purple-800' :
                                grade.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {t(`assignments.status.${grade.status === 'not submitted' ? 'notSubmitted' : grade.status}`)}
                              </span>
                              {grade.score !== null && (
                                <p className="text-sm font-medium text-gray-900 mt-1">{grade.score}</p>
                              )}
                            </div>
                          </div>
                        )
                        })}
                        
                      </div>
                    )}
                  </Card>

                  {/* Submission Summary */}
                  {assignmentGrades.length > 0 && (
                    <Card className="p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("assignments.submissionSummary")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-green-600">
                            {assignmentGrades.filter(g => g.status === 'submitted').length}
                          </p>
                          <p className="text-sm text-green-700">{t("assignments.status.submitted")}</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-orange-600">
                            {assignmentGrades.filter(g => g.status === 'not submitted').length}
                          </p>
                          <p className="text-sm text-orange-700">{t("assignments.status.notSubmitted")}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xl sm:text-2xl font-bold text-gray-600">
                            {assignmentGrades.filter(g => g.status === 'pending').length}
                          </p>
                          <p className="text-sm text-gray-700">{t("assignments.status.pending")}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("assignments.created")}: {formatDate(viewingAssignment.created_at)}
                {viewingAssignment.updated_at !== viewingAssignment.created_at && (
                  <span className="ml-4">
                    {t("assignments.updated")}: {formatDate(viewingAssignment.updated_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => {
                    handleEditClick(viewingAssignment)
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {t("assignments.editAssignment")}
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingAssignment(null)
                    setAssignmentGrades([])
                  }}
                >
                  {t("assignments.close")}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Submissions Modal */}
      {submissionsAssignment && (
        <Modal isOpen={showSubmissionsModal} onClose={() => {
          setShowSubmissionsModal(false)
          setSubmissionsAssignment(null)
          setSubmissionGrades([])
        }} size="6xl">
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: submissionsAssignment.classroom_color || '#6B7280' }}
                />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t("assignments.updateSubmissions")} - {submissionsAssignment.title}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-1"
                onClick={() => {
                  setShowSubmissionsModal(false)
                  setSubmissionsAssignment(null)
                  setSubmissionGrades([])
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="space-y-4">
                {submissionGrades.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">{t("assignments.noStudentsFound")}</p>
                    <p className="text-gray-600">{t("assignments.noStudentsEnrolledMessage")}</p>
                  </div>
                ) : (
                  submissionGrades.map((grade) => (
                    <Card key={grade.id} className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-start">
                        {/* Student Name */}
                        <div className="lg:col-span-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-gray-700">{grade.student_name}</Label>
                            {grade.attendance_status === 'absent' && (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 pointer-events-none text-xs">
                                {t("attendance.absent")}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("common.status")}</Label>
                          <Select 
                            value={grade.status} 
                            onValueChange={(value) => updateSubmissionGrade(grade.id, 'status', value)}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">{t("assignments.status.pending")}</SelectItem>
                              <SelectItem value="submitted">{t("assignments.status.submitted")}</SelectItem>
                              <SelectItem value="not submitted">{t("assignments.status.notSubmitted")}</SelectItem>
                              <SelectItem value="excused">{t("assignments.status.excused")}</SelectItem>
                              <SelectItem value="overdue">{t("assignments.status.overdue")}</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Submitted Date - Show when status is submitted */}
                          {grade.status === 'submitted' && (
                            <div className="mt-2">
                              <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.submittedDate")}</Label>
                              <DatePickerComponent
                                value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                                onChange={(value) => {
                                  // Store date exactly as selected without timezone conversion
                                  updateSubmissionGrade(grade.id, 'submitted_date', Array.isArray(value) ? value[0] : value || null)
                                }}
                                fieldId={`submitted-date-${grade.id}`}
                                height="h-10"
                                shadow="shadow-sm"
                              />
                            </div>
                          )}

                          {/* Overdue Date - Show when status is overdue */}
                          {grade.status === 'overdue' && (
                            <div className="mt-2">
                              <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.overdueDate")}</Label>
                              <DatePickerComponent
                                value={grade.submitted_date ? grade.submitted_date.split('T')[0] : ''}
                                onChange={(value) => {
                                  // Store date exactly as selected without timezone conversion
                                  updateSubmissionGrade(grade.id, 'submitted_date', Array.isArray(value) ? value[0] : value || null)
                                }}
                                fieldId={`overdue-date-${grade.id}`}
                                height="h-10"
                                shadow="shadow-sm"
                              />
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="lg:col-span-1">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.score")}</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={grade.score || ''}
                            onChange={(e) => updateSubmissionGrade(grade.id, 'score', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="0-100"
                            className="h-9 text-sm"
                          />
                        </div>

                        {/* Feedback */}
                        <div className="lg:col-span-3">
                          <Label className="text-xs text-gray-500 mb-1 block">{t("assignments.feedback")}</Label>
                          <textarea
                            value={grade.feedback || ''}
                            onChange={(e) => updateSubmissionGrade(grade.id, 'feedback', e.target.value)}
                            placeholder={String(t("assignments.teacherFeedback"))}
                            className="flex min-h-[4.5rem] w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                            rows={3}
                          />
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-xs text-gray-500">
                        {grade.created_at && (
                          <span>{t("assignments.created")}: {formatDate(grade.created_at)}</span>
                        )}
                        {grade.updated_at && grade.updated_at !== grade.created_at && (
                          <span>{t("assignments.updated")}: {formatDate(grade.updated_at)}</span>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {t("assignments.students")} {submissionGrades.length}명
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSubmissionsModal(false)
                    setSubmissionsAssignment(null)
                    setSubmissionGrades([])
                  }}
                >
                  {t("assignments.cancel")}
                </Button>
                <Button
                  onClick={saveSubmissionGrades}
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? t("common.saving") : t("assignments.saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}