"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useListPageShortcuts } from '@/hooks/useListPageShortcuts'
import { SearchKbdHint } from '@/components/ui/search-kbd-hint'
import { AttendanceStatusPills, statusFromShortcut } from '@/components/ui/attendance/AttendanceStatusPills'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardCard, DataTable, type DataTableColumn, type DataTableSortState } from '@/components/ui/dashboard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Calendar,
  Edit,
  Clock,
  Users,
  GraduationCap,
  Building,
  X,
  Search,
  UserCheck,
  Monitor,
  Loader2,
  Filter,
  CheckCircle,
  Grid3X3,
  Rows3
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { showSuccessToast, showErrorToast } from '@/stores'
import { triggerAttendanceChangedNotifications } from '@/lib/notification-triggers'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
// 446-line modal, conditionally rendered — defer the bundle until use.
import dynamic from 'next/dynamic'
const SelfCheckInModal = dynamic(
  () => import('@/components/ui/attendance/SelfCheckInModal').then(m => m.SelfCheckInModal),
  { ssr: false }
)
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Skeleton } from '@/components/ui/skeleton'

import { invalidateAttendanceCache } from '@/lib/cache'
export { invalidateAttendanceCache }

interface AttendanceRecord {
  id: string
  session_id: string
  classroom_id?: string
  classroom_name?: string
  classroom_color?: string
  teacher_name?: string
  session_date?: string
  session_time?: string
  location: 'offline' | 'online'
  created_at: string
  updated_at: string
  student_count?: number
  present_count?: number
  absent_count?: number
  late_count?: number
  excused_count?: number
}

interface AttendancePageProps {
  academyId: string
  filterSessionId?: string
}

interface StudentAttendance {
  id: string
  classroom_session_id: string
  student_id: string
  student_name: string
  status: 'pending' | 'present' | 'absent' | 'late' | 'excused'
  created_at: string
  updated_at: string
  note?: string
}

export function AttendancePage({ academyId, filterSessionId }: AttendancePageProps) {
  const { t, language } = useTranslation()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showUpdateAttendanceModal, setShowUpdateAttendanceModal] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null)
  const [updateAttendanceRecord, setUpdateAttendanceRecord] = useState<AttendanceRecord | null>(null)
  const [attendanceToUpdate, setAttendanceToUpdate] = useState<StudentAttendance[]>([])
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('')
  const [sessionAttendance, setSessionAttendance] = useState<StudentAttendance[]>([])
  const [viewModalLoading, setViewModalLoading] = useState(false)
  const [missingStudents, setMissingStudents] = useState<{id: string; name: string}[]>([])
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; color?: string }[]>([])
  const [showCheckInModal, setShowCheckInModal] = useState(false)

  // Initialize classroom filter from URL parameter
  const classroomFromUrl = searchParams.get('classroom')
  const [classroomFilter, setClassroomFilter] = useState<string>(classroomFromUrl || 'all')
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [tableSort, setTableSort] = useState<DataTableSortState | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
  const [initialized, setInitialized] = useState(false)

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  // Reset to page 1 when client-side filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [attendanceSearchQuery, classroomFilter, showPendingOnly])

  // Attendance has no create flow — only `/` for search.
  useListPageShortcuts({ searchInputRef })

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
          const classroomsList = parsed.classrooms || parsed
          const activeClassrooms = classroomsList.filter((c: any) => !c.paused)
          setClassrooms(activeClassrooms)
          return
        }
      }

      // Cache miss - fetch from database
      const { data: classroomsList, error: classroomsError } = await supabase
        .from('classrooms')
        .select('id, name, color, paused')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (classroomsError) {
        console.error('Error fetching classrooms:', classroomsError)
        setClassrooms([])
      } else if (classroomsList && classroomsList.length > 0) {
        // Store only active (non-paused) classrooms for the dropdown
        const activeClassrooms = classroomsList.filter(c => !c.paused)
        setClassrooms(activeClassrooms)

        // Cache the results for other pages to use
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(classroomsList))
          sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
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

  const fetchAttendanceRecords = useCallback(async (skipLoading = false) => {
    if (!academyId) {
      console.warn('fetchAttendanceRecords: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return []
    }

    try {

      // PERFORMANCE: Check cache first (valid for 2 minutes)
      // Cache key includes version to force refresh after code changes
      const CACHE_VERSION = 'v3' // Increment when changing data fetch logic
      const cacheKey = `attendance-${CACHE_VERSION}-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
      const cachedData = sessionStorage.getItem(cacheKey)
      const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

      if (cachedData && cacheTimestamp) {
        const timeDiff = Date.now() - parseInt(cacheTimestamp)
        const cacheValidFor = 2 * 60 * 1000 // 2 minutes

        if (timeDiff < cacheValidFor) {
          const parsed = JSON.parse(cachedData)
          setAttendanceRecords(parsed.records)
          setTotalCount(parsed.totalCount || 0)
          setInitialized(true)
          setLoading(false)

          return parsed.records
        }
      }

      setInitialized(true)

      // OPTIMIZED: Single query with joins to get sessions with classroom and teacher info
      // Classroom filter will be applied client-side
      let sessionsQuery = supabase
        .from('classroom_sessions')
        .select(`
          *,
          classrooms!inner(
            id,
            name,
            color,
            academy_id,
            teacher_id
          )
        `, { count: 'exact' })
        .eq('classrooms.academy_id', academyId)
        .is('deleted_at', null)

      // Apply session filter if provided (server-side scoping)
      if (filterSessionId) {
        sessionsQuery = sessionsQuery.eq('id', filterSessionId)
      }

      // Fetch all sessions (pagination will be applied client-side)
      const { data: sessions, error: sessionsError, count } = await sessionsQuery
        .order('date', { ascending: false })

      setTotalCount(count || 0)

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setAttendanceRecords([])
        setLoading(false)
        return []
      }

      // OPTIMIZED: Extract IDs for parallel queries
      const sessionIds = sessions.map(s => s.id)
      const teacherIds = [...new Set(sessions.map(s => s.classrooms?.teacher_id).filter(Boolean))]

      // OPTIMIZED: Execute teacher names and attendance data queries in parallel
      // NOTE: Attendance uses RPC function to avoid RLS timeout issues
      const [teachersResult, attendanceResult] = await Promise.all([
        // Teacher names
        teacherIds.length > 0
          ? supabase
              .from('users')
              .select('id, name')
              .in('id', teacherIds)
          : Promise.resolve({ data: [] }),

        // Attendance data - use aggregated RPC function with batched fetching
        (async () => {
          try {
            const countsMap = new Map<string, { total: number; present: number; absent: number; late: number; excused: number }>()
            const BATCH_SIZE = 1000
            let offset = 0
            let hasMore = true

            while (hasMore) {
              const { data, error } = await supabase
                .rpc('get_attendance_counts_for_academy', { p_academy_id: academyId })
                .range(offset, offset + BATCH_SIZE - 1)

              if (error) {
                console.error('❌ [Attendance] Error fetching via RPC:', error)
                break
              }


              // Build map from results
              data?.forEach((row: { classroom_session_id: string; total_count: number; present_count: number; absent_count: number; late_count: number; excused_count: number }) => {
                countsMap.set(String(row.classroom_session_id), {
                  total: Number(row.total_count) || 0,
                  present: Number(row.present_count) || 0,
                  absent: Number(row.absent_count) || 0,
                  late: Number(row.late_count) || 0,
                  excused: Number(row.excused_count) || 0
                })
              })

              if (!data || data.length < BATCH_SIZE) {
                hasMore = false
              } else {
                offset += BATCH_SIZE
              }
            }

            return { data: countsMap, error: null }
          } catch (err) {
            console.error('❌ [Attendance] Exception fetching attendance:', err)
            return { data: new Map(), error: err }
          }
        })()
      ])

      // OPTIMIZED: Create lookup maps
      const teacherMap = new Map<string, string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teachersResult.data?.forEach((teacher: any) => {
        teacherMap.set(teacher.id, teacher.name)
      })

      // The attendanceResult.data is now a Map from the aggregated RPC
      const attendanceCountsMap = attendanceResult.data as Map<string, { total: number; present: number; absent: number; late: number; excused: number }>

      // Debug: Log attendance query results

      // Debug: Check if first session exists in map
      if (sessions.length > 0 && attendanceCountsMap?.size > 0) {
        const firstSession = sessions[0]
        const firstId = String(firstSession.id)
        const countsForFirst = attendanceCountsMap.get(firstId)
      }

      // OPTIMIZED: Process sessions with all data available
      const attendanceRecordsWithDetails = sessions.map(session => {
        const classroom = session.classrooms
        const teacherName = classroom?.teacher_id ? teacherMap.get(classroom.teacher_id) : null
        const sessionId = String(session.id)
        const attendanceCounts = attendanceCountsMap?.get(sessionId) || { total: 0, present: 0, absent: 0, late: 0, excused: 0 }

        return {
          id: session.id,
          session_id: session.id,
          classroom_id: classroom?.id,
          classroom_name: classroom?.name || String(t('common.unknownClassroom')),
          classroom_color: classroom?.color,
          teacher_name: teacherName || String(t('common.unknownTeacher')),
          session_date: session.date,
          session_time: `${session.start_time} - ${session.end_time}`,
          location: session.location as 'offline' | 'online',
          created_at: session.created_at,
          updated_at: session.updated_at,
          student_count: attendanceCounts.total,
          present_count: attendanceCounts.present,
          absent_count: attendanceCounts.absent,
          late_count: attendanceCounts.late,
          excused_count: attendanceCounts.excused
        }
      })

      setAttendanceRecords(attendanceRecordsWithDetails)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          records: attendanceRecordsWithDetails,
          totalCount: count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache attendance:', cacheError)
      }

      return attendanceRecordsWithDetails
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      setAttendanceRecords([])
      return []
    } finally {
      setLoading(false)
    }
  }, [academyId, t, filterSessionId])

  // Fetch attendance records when component mounts or academyId changes
  useEffect(() => {
    if (!academyId) return

    // Check if page was refreshed - if so, clear caches to force fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      // Explicitly invalidate attendance cache
      invalidateAttendanceCache(academyId)
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    // Cache key must match fetchAttendanceRecords cache key (including version)
    const CACHE_VERSION = 'v3'
    const cacheKey = `attendance-${CACHE_VERSION}-${academyId}${filterSessionId ? `-session${filterSessionId}` : ''}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        setAttendanceRecords(parsed.records)
        setTotalCount(parsed.totalCount || 0)
        setLoading(false)
        // Still fetch classrooms for the filter dropdown
        fetchClassrooms()
        return // Skip fetchAttendanceRecords - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }
    fetchAttendanceRecords()
    fetchClassrooms()
  }, [academyId, filterSessionId, fetchAttendanceRecords, fetchClassrooms])

  // Auto-open the attendance modal when the page is entered with a
  // `?filterSessionId=...` query (typically from the dashboard's "X need
  // attendance" pill or the Today's Sessions card click). Saves the
  // manager an extra click to open the only row that's actually visible.
  // Tracked via ref so closing the modal doesn't re-open it on the next
  // render — once per arrival.
  const autoOpenedFilterSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!filterSessionId) return
    if (autoOpenedFilterSessionRef.current === filterSessionId) return
    if (!attendanceRecords.length) return  // Wait for fetch
    const target = attendanceRecords.find(r => r.session_id === filterSessionId)
    if (!target) return
    autoOpenedFilterSessionRef.current = filterSessionId
    handleUpdateAttendance(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSessionId, attendanceRecords])

  const loadSessionAttendance = async (sessionId: string) => {
    try {
      // Get attendance records
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('id, classroom_session_id, student_id, status, created_at, updated_at')
        .eq('classroom_session_id', sessionId)

      if (error) throw error

      if (!attendanceData || attendanceData.length === 0) {
        setSessionAttendance([])
        return
      }

      // Get student IDs and their user details
      const studentIds = attendanceData.map(att => att.student_id)

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('user_id')
        .in('user_id', studentIds)

      if (studentsError) throw studentsError

      const userIds = studentsData?.map(s => s.user_id) || []

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds)

      if (usersError) throw usersError

      // Map attendance with user names
      const attendanceWithNames = attendanceData.map(att => {
        const user = usersData?.find(u => u.id === att.student_id)
        return {
          id: att.id,
          classroom_session_id: att.classroom_session_id,
          student_id: att.student_id,
          student_name: user?.name || t('common.unknownStudent'),
          status: att.status as 'pending' | 'present' | 'absent' | 'late' | 'excused',
          created_at: att.created_at,
          updated_at: att.updated_at
        }
      })

      setSessionAttendance(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching session attendance:', error)
      setSessionAttendance([])
    }
  }

  const handleViewDetails = async (record: AttendanceRecord) => {
    setViewingRecord(record)
    // Open modal immediately + clear stale data so the skeleton shows (matches AssignmentDetailsModal pattern)
    setSessionAttendance([])
    setShowViewModal(true)
    setViewModalLoading(true)
    try {
      await loadSessionAttendance(record.session_id)
    } finally {
      setViewModalLoading(false)
    }
  }

  const handleUpdateAttendance = async (record: AttendanceRecord) => {
    setUpdateAttendanceRecord(record)
    
    // Fetch attendance data for this session
    try {
      // Get attendance records
      const { data: attendanceData, error } = await supabase
        .from('attendance')
        .select('id, classroom_session_id, student_id, status, note, created_at, updated_at')
        .eq('classroom_session_id', record.session_id)
      
      if (error) throw error

      // Get classroom info to find classroom_id
      const { data: sessionData } = await supabase
        .from('classroom_sessions')
        .select('classroom_id')
        .eq('id', record.session_id)
        .single()

      if (!sessionData) throw new Error('Session not found')

      // Get all students in the classroom
      const { data: classroomStudents } = await supabase
        .from('classroom_students')
        .select('student_id')
        .eq('classroom_id', sessionData.classroom_id)

      const allStudentIds = classroomStudents?.map(cs => cs.student_id) || []
      
      // Get user details for all students in classroom
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allStudentIds)

      if (allUsersError) throw allUsersError

      // Find students with existing attendance
      const studentsWithAttendance = attendanceData?.map(att => att.student_id) || []
      
      // Find missing students (in classroom but not in attendance)
      const missingStudentIds = allStudentIds.filter(id => !studentsWithAttendance.includes(id))
      const missingStudentsList = missingStudentIds.map(id => {
        const user = allUsersData?.find(u => u.id === id)
        return {
          id,
          name: user?.name || t('common.unknownStudent')
        }
      })
      
      setMissingStudents(missingStudentsList)

      // Map existing attendance with user names
      const attendanceWithNames = (attendanceData || []).map(att => {
        const user = allUsersData?.find(u => u.id === att.student_id)
        return {
          id: att.id,
          classroom_session_id: att.classroom_session_id,
          student_id: att.student_id,
          student_name: user?.name || t('common.unknownStudent'),
          status: att.status as 'pending' | 'present' | 'absent' | 'late' | 'excused',
          note: att.note || '',
          created_at: att.created_at,
          updated_at: att.updated_at
        }
      })

      setAttendanceToUpdate(attendanceWithNames)
    } catch (error) {
      console.error('Error fetching attendance for update:', error)
      setAttendanceToUpdate([])
    }
    
    setShowUpdateAttendanceModal(true)
  }

  const addMissingStudent = (student: {id: string; name: string}) => {
    if (!updateAttendanceRecord) return

    // Default newly-added students to "present" — that's the most common
    // case (they showed up). Manager flips only the absentees.
    const tempAttendanceRecord: StudentAttendance = {
      id: `temp_${student.id}_${Date.now()}`, // Temporary ID
      classroom_session_id: updateAttendanceRecord.session_id,
      student_id: student.id,
      student_name: student.name,
      status: 'present',
      note: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add to current attendanceToUpdate list
    setAttendanceToUpdate(prev => [...prev, tempAttendanceRecord])
    
    // Remove from missing students list
    setMissingStudents(prev => prev.filter(s => s.id !== student.id))
  }

  const updateAttendanceStatus = (attendanceId: string, field: string, value: string) => {
    setAttendanceToUpdate(prev =>
      prev.map(att =>
        att.id === attendanceId
          ? { ...att, [field]: value }
          : att
      )
    )
  }

  const markAllPresent = () => {
    setAttendanceToUpdate(prev => prev.map(attendance => ({
      ...attendance,
      status: 'present' as const
    })))
  }

  // Save current modal state, then optionally hand off straight to another
  // pending session — drives the "Save and next" button below. When
  // `thenOpen` is omitted, the modal closes as before.
  const saveAttendanceChanges = async (options: { thenOpen?: AttendanceRecord } = {}) => {
    if (!updateAttendanceRecord) return

    try {
      setIsSaving(true)
      // Separate existing records from new ones
      const existingRecords = attendanceToUpdate.filter(att => !att.id.startsWith('temp_'))
      const newRecords = attendanceToUpdate.filter(att => att.id.startsWith('temp_'))

      // Update existing attendance records
      for (const attendance of existingRecords) {
        // Get the old status before updating
        const { data: oldRecord } = await supabase
          .from('attendance')
          .select('status')
          .eq('id', attendance.id)
          .single()

        const { error } = await supabase
          .from('attendance')
          .update({
            status: attendance.status,
            note: attendance.note,
            updated_at: new Date().toISOString()
          })
          .eq('id', attendance.id)

        if (error) {
          console.error('Error updating attendance:', error)
          showErrorToast(t('attendance.errorUpdating') as string, error.message)
          return
        }

        // Send notification if status changed from pending to something else
        if (oldRecord?.status === 'pending' && attendance.status !== 'pending') {
          try {
            await triggerAttendanceChangedNotifications(
              attendance.id,
              oldRecord.status,
              attendance.status
            )
          } catch (notificationError) {
            console.error('Error sending attendance change notification:', notificationError)
            // Don't fail the attendance update if notification fails
          }
        }
      }

      // Insert new attendance records for newly added students
      if (newRecords.length > 0) {
        const insertData = newRecords.map(attendance => ({
          classroom_session_id: updateAttendanceRecord.session_id,
          student_id: attendance.student_id,
          status: attendance.status,
          note: attendance.note || null
        }))

        const { error: insertError } = await supabase
          .from('attendance')
          .insert(insertData)

        if (insertError) {
          console.error('Error inserting new attendance records:', insertError)
          showErrorToast(t('attendance.errorUpdating') as string, insertError.message)
          return
        }
      }

      showSuccessToast(t('attendance.updatedSuccessfully') as string)

      // Save-and-next path: refresh records (so the just-saved row reflects
      // updated counts), clear the per-row state, but DON'T close the modal —
      // immediately re-populate it with the next pending session.
      if (options.thenOpen) {
        setAttendanceToUpdate([])
        setMissingStudents([])
        invalidateAttendanceCache(academyId)
        await fetchAttendanceRecords(true)
        handleUpdateAttendance(options.thenOpen)
        return
      }

      setShowUpdateAttendanceModal(false)
      setUpdateAttendanceRecord(null)
      setAttendanceToUpdate([])
      setMissingStudents([])

      // Refresh the attendance records and get updated data
      invalidateAttendanceCache(academyId)
      const updatedRecords = await fetchAttendanceRecords(true) // Skip loading to prevent skeleton

      // Update viewingRecord with fresh data if view details modal is open
      if (showViewModal && viewingRecord && updateAttendanceRecord) {
        // Find the updated record in the refreshed records array
        const updatedRecord = updatedRecords?.find((r: AttendanceRecord) => r.session_id === updateAttendanceRecord.session_id)
        if (updatedRecord) {
          setViewingRecord(updatedRecord)
          // Refresh session attendance details as well
          await loadSessionAttendance(updatedRecord.session_id)
        }
      }
    } catch (error) {
      console.error('Error saving attendance changes:', error)
      showErrorToast(t('attendance.unexpectedError') as string, (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
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
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    }
  }

  const formatTime = (time: string) => {
    if (!time) return `12:00 ${t('attendance.am')}`
    const [hours, minutes] = time.split(':')
    const hour12 = parseInt(hours) === 0 ? 12 : parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
    const ampm = parseInt(hours) >= 12 ? t('attendance.pm') : t('attendance.am')
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatSessionTime = (sessionTime: string) => {
    if (!sessionTime ) return sessionTime
    
    // Split the time range (e.g., "09:00 - 10:00")
    const parts = sessionTime.split(' - ')
    if (parts.length === 2) {
      const startTime = formatTime(parts[0])
      const endTime = formatTime(parts[1])
      return `${startTime} - ${endTime}`
    }
    
    return sessionTime
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700'
      case 'absent':
        return 'bg-rose-50 text-rose-700'
      case 'late':
        return 'bg-amber-50 text-amber-700'
      case 'excused':
        return 'bg-sky-50 text-sky-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }


  // Client-side filtering (classroom, search, pending)
  // Server-side filter (filterSessionId) is already applied
  const filteredAttendanceRecords = attendanceRecords.filter(record => {
    // Apply classroom filter
    if (classroomFilter !== 'all' && record.classroom_id !== classroomFilter) {
      return false
    }

    // Apply pending filter if enabled
    if (showPendingOnly) {
      const recordedCount = (record.present_count || 0) + (record.absent_count || 0) +
                           (record.late_count || 0) + (record.excused_count || 0)
      const totalCount = record.student_count || 0
      const hasPending = totalCount > recordedCount
      if (!hasPending) return false
    }

    // Apply search filter
    if (!attendanceSearchQuery) return true

    return (
      record.classroom_name?.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
      record.teacher_name?.toLowerCase().includes(attendanceSearchQuery.toLowerCase()) ||
      record.session_date?.toLowerCase().includes(attendanceSearchQuery.toLowerCase())
    )
  })

  // Always use filtered length as total count (hybrid approach)
  const filteredTotalCount = filteredAttendanceRecords.length

  // Count of sessions with pending attendance (respects classroom filter)
  const sessionsWithPendingCount = useMemo(() => {
    let filtered = attendanceRecords
    // Apply classroom filter
    if (classroomFilter !== 'all') {
      filtered = attendanceRecords.filter(r => r.classroom_id === classroomFilter)
    }
    return filtered.filter(record => {
      const recordedCount = (record.present_count || 0) + (record.absent_count || 0) +
                           (record.late_count || 0) + (record.excused_count || 0)
      const totalCount = record.student_count || 0
      return totalCount > recordedCount
    }).length
  }, [attendanceRecords, classroomFilter])

  // Total pending attendance count (respects classroom filter)
  const filteredPendingCount = useMemo(() => {
    let filtered = attendanceRecords
    // Apply classroom filter
    if (classroomFilter !== 'all') {
      filtered = attendanceRecords.filter(r => r.classroom_id === classroomFilter)
    }
    return filtered.reduce((acc, record) => {
      const recordedCount = (record.present_count || 0) + (record.absent_count || 0) +
                           (record.late_count || 0) + (record.excused_count || 0)
      const totalCount = record.student_count || 0
      return acc + Math.max(0, totalCount - recordedCount)
    }, 0)
  }, [attendanceRecords, classroomFilter])

  // Always apply client-side pagination to filtered results
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = filteredAttendanceRecords.slice(startIndex, endIndex)

  // Skeleton mirrors the new DashboardCard structure: top accent bar +
  // title + subtitle + 3-column metric strip + meta + footer.
  const AttendanceSkeleton = () => (
    <Card className="!gap-0 !py-0 overflow-hidden animate-pulse">
      <div className="h-1 w-full bg-gray-200" />
      <div className="p-4 sm:p-5">
        {/* Header: title + subtitle, edit icon */}
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-7 h-7 bg-gray-200 rounded flex-shrink-0" />
        </div>

        {/* 3-column metric strip */}
        <div className="grid grid-cols-3 gap-2 my-3 py-3 border-y border-gray-100">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-1">
              <div className="h-2 bg-gray-200 rounded w-12" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>

        {/* Meta rows */}
        <div className="space-y-1.5 mb-3">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Footer action */}
        <div className="pt-3">
          <div className="h-9 bg-gray-200 rounded w-full" />
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.attendance")}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("attendance.title")}</h1>
            <p className="text-gray-500">{t("attendance.description")}</p>
          </div>
        </div>

        {/* Self Check-In Button */}
        <Button
          variant="outline"
          className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 mb-6"
        >
          <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
          {t('attendance.selfCheckIn.button')}
        </Button>

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
          <div className="flex-1 min-w-[180px] sm:min-w-[250px] sm:max-w-md">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="w-full sm:w-60">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Attendance Grid Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <AttendanceSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t("eyebrows.attendance")}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t("attendance.title")}</h1>
          <p className="text-gray-500">{t("attendance.description")}</p>
        </div>
      </div>

      {/* Self Check-In Button */}
      <Button
        onClick={() => setShowCheckInModal(true)}
        variant="outline"
        className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4 mb-6"
      >
        <UserCheck className="w-3 h-3 sm:w-4 sm:h-4" />
        {t('attendance.selfCheckIn.button')}
      </Button>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <Card className="w-full p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
              {attendanceSearchQuery ? t("attendance.filteredResults") : t("attendance.title")}
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {filteredTotalCount}
            </p>
            <p className="text-sm text-gray-400">
              {t("attendance.records")}
            </p>
          </div>
          {(attendanceSearchQuery || classroomFilter !== 'all' || showPendingOnly) && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              {language === 'korean' ? `전체 ${totalCount}개 중` : `of ${totalCount} total`}
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
              {t("attendance.pendingAttendance")}
            </p>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 tabular-nums">
              {sessionsWithPendingCount}
            </p>
            <p className="text-sm text-gray-400">
              {sessionsWithPendingCount === 1
                ? (language === 'korean' ? '세션' : 'session')
                : (language === 'korean' ? '세션' : 'sessions')}
            </p>
          </div>
          {filteredPendingCount > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium ring-1 ring-amber-100">
              {language === 'korean'
                ? `${filteredPendingCount}명 대기`
                : `${filteredPendingCount} pending`}
            </div>
          )}
          {showPendingOnly && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium ring-1 ring-amber-100 ml-2">
              ✓ {t("attendance.filterActive")}
            </div>
          )}
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-white">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className={`h-9 px-3 ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("common.tableView"))}
          >
            <Rows3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className={`h-9 px-3 ${viewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:text-gray-900'}`}
            title={String(t("common.cardView"))}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[180px] sm:min-w-[250px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={String(t("attendance.searchPlaceholder"))}
            value={attendanceSearchQuery}
            onChange={(e) => setAttendanceSearchQuery(e.target.value)}
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
      </div>

      {/* Attendance Records — card or table view */}
      {viewMode === 'table' ? (
        (() => {
          const columns: DataTableColumn<AttendanceRecord>[] = [
            {
              id: 'classroom',
              header: t('navigation.classrooms'),
              sortable: true,
              sortFn: (a, b) => (a.classroom_name || '').localeCompare(b.classroom_name || ''),
              cell: (r) => (
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.classroom_color || '#6B7280' }}
                  />
                  <span className="font-medium text-gray-900 truncate">{r.classroom_name}</span>
                </div>
              ),
            },
            {
              id: 'date',
              header: t('attendance.date'),
              sortable: true,
              sortFn: (a, b) => (a.session_date || '').localeCompare(b.session_date || ''),
              cell: (r) => <span className="text-sm text-gray-700 tabular-nums">{formatDate(r.session_date || '')}</span>,
            },
            {
              id: 'time',
              header: t('sessions.time'),
              cell: (r) => <span className="text-sm text-gray-700 tabular-nums">{formatSessionTime(r.session_time || '')}</span>,
              hideOnMobile: true,
            },
            {
              id: 'teacher',
              header: t('navigation.teachers'),
              sortable: true,
              sortFn: (a, b) => (a.teacher_name || '').localeCompare(b.teacher_name || ''),
              cell: (r) => <span className="text-sm text-gray-700">{r.teacher_name}</span>,
              hideOnMobile: true,
            },
            {
              id: 'present',
              header: t('attendance.present'),
              align: 'right',
              cell: (r) => {
                const totalPresent = (r.present_count || 0) + (r.late_count || 0) + (r.excused_count || 0)
                return (
                  <span className="text-sm text-gray-700 tabular-nums">
                    {totalPresent}/{r.student_count || 0}
                  </span>
                )
              },
            },
            {
              id: 'rate',
              header: t('attendance.attendanceRate'),
              align: 'right',
              sortable: true,
              sortFn: (a, b) => {
                const ar = (a.student_count || 0) > 0 ? ((a.present_count || 0) + (a.late_count || 0) + (a.excused_count || 0)) / (a.student_count || 1) : 0
                const br = (b.student_count || 0) > 0 ? ((b.present_count || 0) + (b.late_count || 0) + (b.excused_count || 0)) / (b.student_count || 1) : 0
                return ar - br
              },
              cell: (r) => {
                const totalPresent = (r.present_count || 0) + (r.late_count || 0) + (r.excused_count || 0)
                const total = r.student_count || 0
                const rate = total > 0 ? Math.round((totalPresent / total) * 100) : 0
                return <span className="text-sm font-medium text-gray-900 tabular-nums">{rate}%</span>
              },
            },
          ]

          return (
            <DataTable<AttendanceRecord>
              data={paginatedRecords}
              columns={columns}
              getRowId={(r) => r.id}
              sort={{ state: tableSort, onChange: setTableSort }}
              onRowClick={(r) => handleViewDetails(r)}
              emptyState={{
                icon: UserCheck,
                title: String(t('attendance.noAttendanceData')),
                description: String(t('common.tryAdjustingSearch')),
              }}
              mobileRender={(r) => {
                const totalPresent = (r.present_count || 0) + (r.late_count || 0) + (r.excused_count || 0)
                const total = r.student_count || 0
                const rate = total > 0 ? Math.round((totalPresent / total) * 100) : 0
                return (
                  <DashboardCard
                    accentColor={r.classroom_color || '#6B7280'}
                    title={r.classroom_name}
                    subtitle={
                      <>
                        <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                        <span>{r.teacher_name}</span>
                      </>
                    }
                    metrics={[
                      { label: t('attendance.date') as string, value: formatDate(r.session_date || '') },
                      { label: t('attendance.present') as string, value: `${totalPresent}/${total}` },
                      { label: t('attendance.attendanceRate') as string, value: `${rate}%` }
                    ]}
                    onClick={() => handleViewDetails(r)}
                  />
                )
              }}
            />
          )
        })()
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedRecords.map((record) => {
          const totalPresent = (record.present_count || 0) + (record.late_count || 0) + (record.excused_count || 0)
            const totalStudents = record.student_count || 0
            const attendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0
            return (
              <DashboardCard
                key={record.id}
                accentColor={record.classroom_color || '#6B7280'}
                title={record.classroom_name}
                subtitle={
                  <>
                    <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span>{record.teacher_name}</span>
                  </>
                }
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                    onClick={() => handleUpdateAttendance(record)}
                  >
                    <Edit className="w-4 h-4" strokeWidth={1.75} />
                  </Button>
                }
                metrics={[
                  { label: t('attendance.date') as string, value: formatDate(record.session_date || '') },
                  { label: t('attendance.present') as string, value: `${totalPresent}/${totalStudents}` },
                  { label: t('attendance.attendanceRate') as string, value: `${attendanceRate}%` }
                ]}
                meta={
                  <>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span>{formatSessionTime(record.session_time || '')}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      {record.location === 'online' ? (
                        <Monitor className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      ) : (
                        <Building className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      )}
                      <span>{t(`attendance.${record.location}`)}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                      <span>
                        {record.present_count || 0} {t('attendance.present')} · {record.absent_count || 0} {t('attendance.absent')} · {record.late_count || 0} {t('attendance.late')} · {record.excused_count || 0} {t('attendance.excused')}
                      </span>
                    </div>
                  </>
                }
                footerActions={
                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm h-9"
                    onClick={() => handleViewDetails(record)}
                  >
                    {t('common.viewDetails')}
                  </Button>
                }
              />
            )
        })}
      </div>
      )}

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              {t("attendance.pagination.previous")}
            </Button>
            <Button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
              variant="outline"
            >
              {t("attendance.pagination.next")}
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {t("attendance.pagination.showing")}
                <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                {t("attendance.pagination.to")}
                <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredTotalCount)} </span>
                {t("attendance.pagination.of")}
                <span className="font-medium"> {filteredTotalCount} </span>
                {t("attendance.pagination.records")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("attendance.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("attendance.pagination.next")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {initialized && paginatedRecords.length === 0 && (
        <Card>
          <EmptyState
            icon={UserCheck}
            title={showPendingOnly
              ? (language === 'korean' ? '대기 중인 출석이 없습니다' : 'No pending attendance')
              : String(t('attendance.noAttendanceData'))}
            description={showPendingOnly
              ? (language === 'korean' ? '모든 출석이 기록되었습니다' : 'All attendance has been recorded')
              : attendanceSearchQuery
                ? String(t('common.tryAdjustingSearch'))
                : classroomFilter !== 'all'
                  ? (language === 'korean' ? '선택한 클래스에 출석 기록이 없습니다' : 'No attendance records in the selected classroom')
                  : String(t('attendance.noAttendanceRecords'))}
            {...(showPendingOnly
              ? { actionLabel: language === 'korean' ? '필터 해제' : 'Clear filter', onAction: () => setShowPendingOnly(false), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
              : attendanceSearchQuery
                ? { actionLabel: String(t('attendance.clearSearch')), onAction: () => setAttendanceSearchQuery(''), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
                : classroomFilter !== 'all'
                  ? { actionLabel: language === 'korean' ? '필터 해제' : 'Clear filter', onAction: () => updateClassroomFilter('all'), actionVariant: 'outline' as const, actionIcon: <X className="w-4 h-4" /> }
                  : {})}
          />
        </Card>
      )}

      {/* View Details Modal */}
      {viewingRecord && (
        <ModalShell
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="6xl"
          headerSlot={
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: viewingRecord.classroom_color || '#6B7280' }}
              />
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate">{viewingRecord.classroom_name} - {t('attendance.title')}</h2>
            </div>
          }
          footer={
            <ModalShell.Footer justify="between">
              <div className="text-sm text-gray-500">
                {t('common.created')}: {new Date(viewingRecord.created_at).toLocaleDateString()}
                {viewingRecord.updated_at !== viewingRecord.created_at && (
                  <span className="ml-4">
                    {t('common.updated')}: {new Date(viewingRecord.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => handleUpdateAttendance(viewingRecord)} className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  {t('attendance.updateAttendance')}
                </Button>
                <Button onClick={() => setShowViewModal(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </ModalShell.Footer>
          }
        >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Session Info */}
                <div className="space-y-6">
                  {/* Session Information Card */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {t('attendance.sessionInformation')}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.date')}</p>
                          <p className="font-medium text-gray-900">{formatDate(viewingRecord.session_date || '')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.time')}</p>
                          <p className="font-medium text-gray-900">{formatSessionTime(viewingRecord.session_time || '')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t('common.teacher')}</p>
                          <p className="font-medium text-gray-900">{viewingRecord.teacher_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {viewingRecord.location === 'online' ? (
                          <Monitor className="w-5 h-5 text-gray-500" />
                        ) : (
                          <Building className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <p className="text-sm text-gray-600">{t('common.location')}</p>
                          <p className="font-medium text-gray-900">{t(`attendance.${viewingRecord.location}`)}</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Attendance Summary Card */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5" />
                      {t('attendance.attendanceSummary')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600">{viewingRecord.present_count || 0}</p>
                        <p className="text-sm text-emerald-700">{t('attendance.present')}</p>
                      </div>
                      <div className="text-center p-3 bg-rose-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-rose-600">{viewingRecord.absent_count || 0}</p>
                        <p className="text-sm text-rose-700">{t('attendance.absent')}</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-amber-600">{viewingRecord.late_count || 0}</p>
                        <p className="text-sm text-amber-700">{t('attendance.late')}</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{viewingRecord.excused_count || 0}</p>
                        <p className="text-sm text-blue-700">{t('attendance.excused')}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Student Attendance */}
                <div className="space-y-6">
                  <Card className="p-4 sm:p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2 flex-shrink-0">
                      <Users className="w-5 h-5" />
                      {t('attendance.studentAttendance')} {!viewModalLoading && `(${sessionAttendance.length})`}
                    </h3>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
                      {viewModalLoading ? (
                        <>
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Skeleton className="w-10 h-10 rounded-full" />
                              <div className="flex-1 space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                              <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                          ))}
                        </>
                      ) : sessionAttendance.map((attendance) => {
                        const studentName = attendance.student_name || 'Unknown Student'
                        const initials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase()

                        return (
                          <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">{studentName}</p>
                                {attendance.created_at && (
                                  <p className="text-xs text-gray-400">{t('attendance.recorded')}: {new Date(attendance.created_at).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(attendance.status)}`}>
                                {(() => {
                                  switch (attendance.status) {
                                    case 'pending': return t('attendance.pending');
                                    case 'present': return t('attendance.present');
                                    case 'absent': return t('attendance.absent');
                                    case 'late': return t('attendance.late');
                                    case 'excused': return t('attendance.excused');
                                    default: return attendance.status;
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {!viewModalLoading && sessionAttendance.length === 0 && (
                        <EmptyState
                          icon={Users}
                          title={String(t('attendance.noAttendanceRecords'))}
                          size="sm"
                          variant="subtle"
                        />
                      )}
                    </div>
                  </Card>
                </div>
              </div>
        </ModalShell>
      )}

      {/* Update Attendance Modal */}
      {updateAttendanceRecord && (
        <ModalShell
          isOpen={showUpdateAttendanceModal}
          onClose={() => {
            setShowUpdateAttendanceModal(false)
            setUpdateAttendanceRecord(null)
            setAttendanceToUpdate([])
            setMissingStudents([])
          }}
          size="6xl"
          headerSlot={
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0"
                style={{ backgroundColor: updateAttendanceRecord.classroom_color || '#6B7280' }}
              />
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 truncate">{t('attendance.updateAttendance')} - {updateAttendanceRecord.classroom_name}</h2>
            </div>
          }
          footer={(() => {
            // Find the next session that still needs attendance, excluding
            // the one we're in. "Pending" = at least one student unmarked.
            // If none, the Save-and-next button is hidden — there's nowhere
            // to hop to.
            const isRecordPending = (r: AttendanceRecord) => {
              const recorded =
                (r.present_count || 0) + (r.absent_count || 0) +
                (r.late_count || 0) + (r.excused_count || 0)
              return (r.student_count || 0) > recorded
            }
            const currentSessionId = updateAttendanceRecord?.session_id
            const nextPending = attendanceRecords.find(
              r => r.session_id !== currentSessionId && isRecordPending(r)
            )
            return (
              <ModalShell.Footer justify="between">
                <div className="text-sm text-gray-500">
                  {language === 'korean'
                    ? `${t('common.students')} ${attendanceToUpdate.length}명`
                    : `${attendanceToUpdate.length} ${t('common.students')}`
                  }
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUpdateAttendanceModal(false)
                      setUpdateAttendanceRecord(null)
                      setAttendanceToUpdate([])
                      setMissingStudents([])
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={() => saveAttendanceChanges()} disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isSaving ? t("common.saving") : t('common.saveChanges')}
                  </Button>
                  {nextPending && (
                    <Button
                      variant="default"
                      onClick={() => saveAttendanceChanges({ thenOpen: nextPending })}
                      disabled={isSaving}
                      title={`${t('attendance.saveAndNext')} → ${nextPending.classroom_name}`}
                    >
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t('attendance.saveAndNext')}
                      <span className="ml-1.5 text-xs opacity-70">→ {nextPending.classroom_name}</span>
                    </Button>
                  )}
                </div>
              </ModalShell.Footer>
            )
          })()}
          bodyPadding={false}
        >
            <div className="p-6">
              {/* Missing Students Section */}
              {missingStudents.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-gray-900">{t('attendance.missingStudents')} ({missingStudents.length})</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {missingStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addMissingStudent(student)}
                          className="text-amber-600 border-orange-300 hover:bg-orange-100"
                        >
                          {t('attendance.addStudent')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Students Message */}
              {attendanceToUpdate.length === 0 && missingStudents.length === 0 && (
                <EmptyState
                  icon={Users}
                  title={String(t('attendance.noStudentsFound'))}
                  description={String(t('attendance.noStudentsMessage'))}
                />
              )}

              {/* Attendance List */}
              {attendanceToUpdate.length > 0 && (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={markAllPresent}
                      className="h-8 px-3 text-xs text-emerald-600 ring-emerald-100 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t("sessions.markAllPresent")}
                    </Button>
                    {/* Subtle keyboard-shortcut hint — visible only on screens
                        wide enough that the inline pills are present. */}
                    <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{t('attendance.keyboardHint')}</span>
                      <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">P</kbd>
                      <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">A</kbd>
                      <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">L</kbd>
                      <kbd className="px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 font-mono">E</kbd>
                    </div>
                  </div>

                  {/* Flat row layout — one row per student. Click a pill or
                      focus the row and press P/A/L/E. Up/Down arrows move
                      between rows. Far denser than the previous Card-per-
                      student grid. */}
                  <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white">
                    {attendanceToUpdate.map((attendance, rowIndex) => (
                      <div
                        key={attendance.id}
                        tabIndex={0}
                        data-attendance-row
                        onKeyDown={(e) => {
                          // Skip when typing in the note input.
                          const target = e.target as HTMLElement
                          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                            // Allow arrow nav from inputs too — most managers
                            // expect Tab to advance fields, but Up/Down to
                            // move rows, even mid-typing.
                            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                              const rows = Array.from(
                                document.querySelectorAll<HTMLElement>('[data-attendance-row]')
                              )
                              const next = rows[rowIndex + (e.key === 'ArrowDown' ? 1 : -1)]
                              if (next) { next.focus(); e.preventDefault() }
                            }
                            return
                          }
                          const status = statusFromShortcut(e.key)
                          if (status) {
                            updateAttendanceStatus(attendance.id, 'status', status)
                            e.preventDefault()
                            return
                          }
                          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                            const rows = Array.from(
                              document.querySelectorAll<HTMLElement>('[data-attendance-row]')
                            )
                            const next = rows[rowIndex + (e.key === 'ArrowDown' ? 1 : -1)]
                            if (next) { next.focus(); e.preventDefault() }
                          }
                        }}
                        className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-4 py-2.5 hover:bg-gray-50 focus:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
                      >
                        <div className="md:w-44 lg:w-56 flex-shrink-0 truncate text-sm font-medium text-gray-900">
                          {attendance.student_name}
                        </div>
                        <AttendanceStatusPills
                          value={attendance.status}
                          onChange={(next) => updateAttendanceStatus(attendance.id, 'status', next)}
                          disabled={isSaving}
                        />
                        <Input
                          value={attendance.note || ''}
                          onChange={(e) => updateAttendanceStatus(attendance.id, 'note', e.target.value)}
                          placeholder={String(t('attendance.teacherNote'))}
                          className="h-8 text-sm flex-1 min-w-0"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
        </ModalShell>
      )}

      {/* Delete Confirmation Modal */}
      {/* This modal was removed as per the edit hint */}

      {/* Self Check-In Modal */}
      <SelfCheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        academyId={academyId}
        onCheckInComplete={() => {
          // Invalidate cache and refresh data
          invalidateAttendanceCache(academyId)
          fetchAttendanceRecords(true)
        }}
      />
    </div>
  )
}