"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Search,
  MoreHorizontal,
  X,
  Users,
  School,
  Eye,
  CheckCircle,
  XCircle,
  UserX,
  UserCheck,
  BookOpen,
  Book,
  GraduationCap,
  Clock,
  UserPlus
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'

// Cache invalidation function for teachers
export const invalidateTeachersCache = (academyId: string) => {
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`teachers-${academyId}-page`) ||
        key.includes(`teachers-${academyId}-page`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} teachers cache entries`)
}

interface Teacher {
  user_id: string
  name: string
  email: string
  phone?: string
  academy_id: string
  active: boolean
  created_at: string
  classroom_count?: number
  classrooms?: string[]
}

interface Classroom {
  id: string
  name: string
  grade?: string
  subject?: string
  teacher_id?: string
  teacher_name?: string
  color?: string
  notes?: string
  academy_id?: string
  created_at?: string
  updated_at?: string
  enrolled_students?: { name: string; school_name?: string }[]
  student_count?: number
}

interface TeachersPageProps {
  academyId: string
}

export function TeachersPage({ academyId }: TeachersPageProps) {
  // State management
  const { t } = useTranslation()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)
  const itemsPerPage = 10

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main .overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showViewClassroomsModal, setShowViewClassroomsModal] = useState(false)
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null)
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null)
  const [teacherClassrooms, setTeacherClassrooms] = useState<Classroom[]>([])
  const [showClassroomDetailsModal, setShowClassroomDetailsModal] = useState(false)
  const [selectedClassroomForDetails, setSelectedClassroomForDetails] = useState<Classroom | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    selectedClassrooms: [] as string[]
  })
  const [, setFormErrors] = useState<{ [key: string]: string }>({})
  const [, ] = useState(false)

  // Available classrooms for assignment
  const [, setClassrooms] = useState<Classroom[]>([])

  // Refs
  const statusFilterRef = useRef<HTMLDivElement>(null)

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    if (!academyId) return

    // PERFORMANCE: Check cache first (2-minute TTL for teachers)
    const cacheKey = `teachers-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes TTL
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Cache hit:', {
          teachers: parsed.teachers?.length || 0,
          totalCount: parsed.totalCount || 0,
          page: currentPage
        })
        setTeachers(parsed.teachers)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setLoading(false)
        return parsed.teachers
      } else {
        console.log('⏰ Cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Cache miss, fetching from database')
    }

    try {
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Build the base query with status filter
      let teachersQuery = supabase
        .from('teachers')
        .select('user_id, phone, academy_id, active, created_at', { count: 'exact' })
        .eq('academy_id', academyId)

      // Apply status filter at database level
      if (statusFilter === 'active') {
        teachersQuery = teachersQuery.eq('active', true)
      } else if (statusFilter === 'inactive') {
        teachersQuery = teachersQuery.eq('active', false)
      }

      teachersQuery = teachersQuery
        .order('created_at', { ascending: false })
        .range(from, to)

      // Fetch counts in parallel with main query
      const [teachersResult, activeCountResult, inactiveCountResult] = await Promise.all([
        teachersQuery,
        // Count active teachers
        supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', true),
        // Count inactive teachers
        supabase
          .from('teachers')
          .select('*', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', false)
      ])

      const { data: teachersData, error: teachersError, count } = teachersResult

      // Update counts
      setTotalCount(count || 0)
      setActiveCount(activeCountResult.count || 0)
      setInactiveCount(inactiveCountResult.count || 0)

      if (teachersError) throw teachersError
      
      if (!teachersData || teachersData.length === 0) {
        setTeachers([])
        setLoading(false)
        return
      }

      // Get user details
      const teacherIds = teachersData.map(t => t.user_id)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', teacherIds)
      
      if (usersError) throw usersError

      // Get classroom counts using database aggregation for optimal performance
      const classroomCounts: { [key: string]: number } = {}
      
      if (teacherIds.length > 0) {
        // Use database aggregation to count classrooms per teacher
        const { data: classroomCountData, error: classroomError } = await supabase
          .rpc('count_classrooms_by_teacher', {
            teacher_ids: teacherIds,
            academy_id_param: academyId
          })

        if (classroomError) {
          // Fallback to the previous method if RPC fails
          console.warn('RPC failed, using fallback method:', classroomError)
          const { data: classroomData, error: fallbackError } = await supabase
            .from('classrooms')
            .select('teacher_id')
            .in('teacher_id', teacherIds)
            .eq('academy_id', academyId)
            .is('deleted_at', null)

          if (!fallbackError && classroomData) {
            classroomData.forEach(classroom => {
              classroomCounts[classroom.teacher_id] = (classroomCounts[classroom.teacher_id] || 0) + 1
            })
          }
        } else if (classroomCountData) {
          // Use the aggregated counts from the RPC
          classroomCountData.forEach((row: { teacher_id: string; classroom_count: number }) => {
            classroomCounts[row.teacher_id] = row.classroom_count
          })
        }
      }

      // Map teachers with user data
      const mappedTeachers = teachersData.map(teacher => {
        const user = usersData?.find(u => u.id === teacher.user_id)
        return {
          user_id: teacher.user_id,
          name: user?.name || '',
          email: user?.email || '',
          phone: teacher.phone,
          academy_id: teacher.academy_id,
          active: teacher.active,
          created_at: teacher.created_at,
          classroom_count: classroomCounts[teacher.user_id] || 0
        }
      })

      setTeachers(mappedTeachers)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          teachers: mappedTeachers,
          totalCount: count || 0,
          activeCount: activeCountResult.count || 0,
          inactiveCount: inactiveCountResult.count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Teachers cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache teachers:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching teachers:', error)
      alert(String(t('alerts.errorLoading', { resource: String(t('teachers.teachers')), error: (error as Error).message })))
    } finally {
      setLoading(false)
    }
  }, [academyId, t, currentPage, itemsPerPage, statusFilter])

  // Fetch classrooms for assignment
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) return
    
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade, subject')
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }, [academyId])

  useEffect(() => {
    if (!academyId) return

    // Check if page was refreshed - clear caches to get fresh data
    const wasRefreshed = clearCachesOnRefresh(academyId)
    if (wasRefreshed) {
      markRefreshHandled()
      console.log('🔄 [Teachers] Page refresh detected - fetching fresh data')
    }

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `teachers-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [Teachers useEffect] Using cached data - NO skeleton')
        setTeachers(parsed.teachers)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setLoading(false)
        setInitialized(true)
        fetchClassrooms() // Still load classrooms in background
        return // Skip fetchTeachers - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    console.log('❌ [Teachers useEffect] Cache miss - showing skeleton')
    setInitialized(true)
    if (!simpleTabDetection.isTrueTabReturn()) {
      setLoading(true)
    }
    fetchTeachers()
    fetchClassrooms()
  }, [academyId, currentPage, statusFilter, fetchTeachers, fetchClassrooms])

  // Filter and sort teachers (status is already filtered at database level)
  const filteredTeachers = teachers.filter(teacher => {
    // Only apply search filter client-side (status already filtered by database)
    if (!searchQuery) return true

    const matchesSearch = teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (teacher.phone && teacher.phone.includes(searchQuery))

    return matchesSearch
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let aVal: string | number, bVal: string | number
    switch (sortField) {
      case 'name':
        aVal = a.name
        bVal = b.name
        break
      case 'email':
        aVal = a.email
        bVal = b.email
        break
      case 'phone':
        aVal = a.phone || ''
        bVal = b.phone || ''
        break
      case 'classrooms':
        aVal = a.classroom_count || 0
        bVal = b.classroom_count || 0
        break
      case 'status':
        aVal = a.active ? 'active' : 'inactive'
        bVal = b.active ? 'active' : 'inactive'
        break
      case 'created_at':
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Calculate effective count for pagination
  const effectiveTotalCount = searchQuery
    ? filteredTeachers.length // Client-side filtered count when searching
    : statusFilter === 'active'
      ? activeCount
      : statusFilter === 'inactive'
        ? inactiveCount
        : totalCount // Use database counts when only status filter is active

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sort icon
  const renderSortIcon = (field: string) => {
    const isActiveField = sortField === field
    const isAscending = isActiveField && sortDirection === 'asc'
    const isDescending = isActiveField && sortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(new Set(filteredTeachers.map(t => t.user_id)))
    } else {
      setSelectedTeachers(new Set())
    }
  }

  const handleSelectTeacher = (teacherId: string, checked: boolean) => {
    const newSelected = new Set(selectedTeachers)
    if (checked) {
      newSelected.add(teacherId)
    } else {
      newSelected.delete(teacherId)
    }
    setSelectedTeachers(newSelected)
  }

  // CRUD Operations
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      selectedClassrooms: []
    })
    setFormErrors({})
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }




  const handleDeleteClick = (teacher: Teacher) => {
    setTeacherToDelete(teacher)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleActivateClick = (teacher: Teacher) => {
    setTeacherToDelete(teacher)
    setShowDeleteModal(true)
    setDropdownOpen(null)
  }

  const handleViewClassroomsClick = async (teacher: Teacher) => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade, subject, color, notes, created_at, updated_at')
        .eq('teacher_id', teacher.user_id)
        .eq('academy_id', academyId)
        .is('deleted_at', null)

      if (error) throw error

      if (!data || data.length === 0) {
        setTeacherClassrooms([])
        setViewingTeacher(teacher)
        setShowViewClassroomsModal(true)
        setDropdownOpen(null)
        return
      }

      // Get all classroom IDs for batch query
      const classroomIds = data.map(c => c.id)
      
      // Get all enrolled students for all classrooms in one query
      const { data: classroomStudentsData, error: studentsError } = await supabase
        .from('classroom_students')
        .select('classroom_id, student_id')
        .in('classroom_id', classroomIds)
      
      if (studentsError) throw studentsError
      
      if (!classroomStudentsData || classroomStudentsData.length === 0) {
        setTeacherClassrooms(data)
        return
      }
      
      // Get student details
      const studentIds = [...new Set(classroomStudentsData.map(cs => cs.student_id))]
      
      const { data: studentsData, error: studentDataError } = await supabase
        .from('students')
        .select('user_id, school_name')
        .in('user_id', studentIds)
      
      if (studentDataError) throw studentDataError
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', studentIds)
      
      if (usersError) throw usersError

      // Create mappings
      const studentMap = Object.fromEntries((studentsData || []).map(s => [s.user_id, s]))
      const userMap = Object.fromEntries((usersData || []).map(u => [u.id, u]))

      // Group students by classroom_id
      const studentsByClassroom: { [key: string]: Array<{ name: string; school_name?: string }> } = {}
      classroomStudentsData.forEach(enrollment => {
        const classroomId = enrollment.classroom_id
        const studentId = enrollment.student_id
        const student = studentMap[studentId]
        const user = userMap[studentId]
        
        if (!studentsByClassroom[classroomId]) {
          studentsByClassroom[classroomId] = []
        }
        studentsByClassroom[classroomId].push({
          name: user?.name || 'Unknown Student',
          school_name: student?.school_name
        })
      })

      // Build classrooms with student data
      const classroomsWithDetails = data.map(classroom => ({
        ...classroom,
        teacher_id: teacher.user_id,
        teacher_name: teacher.name,
        academy_id: academyId,
        enrolled_students: studentsByClassroom[classroom.id] || [],
        student_count: (studentsByClassroom[classroom.id] || []).length
      }))

      setTeacherClassrooms(classroomsWithDetails)
      setViewingTeacher(teacher)
      setShowViewClassroomsModal(true)
      setDropdownOpen(null)
    } catch (error: unknown) {
      alert('Error loading classrooms: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return
    
    const newStatus = !teacherToDelete.active
    
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ active: newStatus })
        .eq('user_id', teacherToDelete.user_id)
        .select()

      if (error) throw error

      setShowDeleteModal(false)
      setTeacherToDelete(null)
      fetchTeachers()
      showSuccessToast(t(newStatus ? 'success.activated' : 'success.deactivated', {
        item: `${teacherToDelete.name} (${t('common.teacher')})`
      }) as string)
    } catch (error: unknown) {
      showErrorToast(t(newStatus ? 'alerts.errorActivating' : 'alerts.errorDeactivating', {
        resource: `${teacherToDelete.name} (${t('common.teacher')})`,
        error: (error instanceof Error ? error.message : 'Unknown error')
      }) as string)
    }
  }

  const handleBulkStatusUpdate = async (active: boolean) => {
    if (selectedTeachers.size === 0) return
    
    try {
      const { error } = await supabase
        .from('teachers')
        .update({ active })
        .in('user_id', Array.from(selectedTeachers))

      if (error) throw error

      setSelectedTeachers(new Set())
      fetchTeachers()
      showSuccessToast(t(active ? 'success.multipleActivated' : 'success.multipleDeactivated', { items: t('teachers.teachers') as string }) as string)
    } catch (error: unknown) {
      console.error('Error updating teachers:', error)
      showErrorToast('Error updating teachers: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false)
      }
      
      // Close dropdown when clicking outside
      if (dropdownOpen) {
        const target = event.target as Node
        // Don't close if clicking inside a dropdown
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        
        // Don't close if clicking on the dropdown button itself
        const clickedButton = Object.values(dropdownButtonRefs.current).some(
          ref => ref && ref.contains(target)
        )
        if (clickedButton) {
          return
        }
        
        setDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Loading skeleton
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="overflow-x-auto min-h-[640px] flex flex-col">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[...Array(6)].map((_, i) => (
                <th key={i} className="text-left p-4">
                  <div className="h-4 bg-gray-300 rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
                <td className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="p-4">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-4"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("teachers.title")}</h1>
            <p className="text-gray-500">{t("teachers.description")}</p>
          </div>
        </div>
        
        <div className="relative mb-4 max-w-md animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
        
        <Card className="overflow-hidden">
          <TableSkeleton />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("teachers.title")}</h1>
          <p className="text-gray-500">{t("teachers.description")}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://classraum.com'}/auth?role=teacher&academy_id=${academyId}`
              navigator.clipboard.writeText(inviteUrl)
              showSuccessToast(t('teachers.inviteLinkCopied') as string)
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4"
          >
            <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('teachers.inviteTeacher')}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={String(t("teachers.searchPlaceholder"))}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Bulk Actions Menu */}
      {selectedTeachers.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {t("teachers.selectedTeachers", { count: selectedTeachers.size })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTeachers(new Set())}
              >
                {t("teachers.clearSelection")}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleBulkStatusUpdate(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                {t("teachers.makeActive")}
              </Button>
              <Button onClick={() => handleBulkStatusUpdate(false)} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                {t("teachers.makeInactive")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Status Filter Tabs */}
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
        <button
          onClick={() => {
            setStatusFilter('all')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.all")} ({totalCount})
        </button>
        <button
          onClick={() => {
            setStatusFilter('active')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'active'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.active")} ({activeCount})
        </button>
        <button
          onClick={() => {
            setStatusFilter('inactive')
            setCurrentPage(1)
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ml-1 ${
            statusFilter === 'inactive'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.inactive")} ({inactiveCount})
        </button>
      </div>

      {/* Teachers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto min-h-[640px] flex flex-col">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left p-3 sm:p-4 font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary"
                      checked={filteredTeachers.length > 0 && selectedTeachers.size === filteredTeachers.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                      {t("common.teacher")}
                      {renderSortIcon('name')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('phone')} className="flex items-center gap-1">
                      {t("common.phone")}
                      {renderSortIcon('phone')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSort('classrooms')} className="flex items-center gap-1">
                      {t("teachers.classrooms")}
                      {renderSortIcon('classrooms')}
                    </button>
                  </div>
                </th>
                <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[100px]">
                  <div className="flex items-center gap-2 relative">
                    {t("common.status")}
                    <div className="relative z-20" ref={statusFilterRef}>
                      <button
                        onClick={() => setShowStatusFilter(!showStatusFilter)}
                        className={`flex items-center ${
                          statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 hover:text-primary'
                        }`}
                      >
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                      </button>
                      
                      {showStatusFilter && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                          <button
                            onClick={() => {
                              setStatusFilter('all')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("common.all")}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('active')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("common.active")}
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter('inactive')
                              setShowStatusFilter(false)
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'inactive' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                          >
                            {t("common.inactive")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-gray-900 whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {!initialized ? (
                <tr><td colSpan={5}></td></tr>
              ) : filteredTeachers.length > 0 ? filteredTeachers.map((teacher) => (
                <tr key={teacher.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 sm:p-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 accent-primary"
                      checked={selectedTeachers.has(teacher.user_id)}
                      onChange={(e) => handleSelectTeacher(teacher.user_id, e.target.checked)}
                    />
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div>
                        <div className="text-sm sm:text-base font-medium text-gray-900">{teacher.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                          {teacher.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    {teacher.phone ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                        {teacher.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs sm:text-sm">—</span>
                    )}
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 text-xs sm:text-sm">
                      <span className="font-medium">{teacher.classroom_count || 0}</span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      {teacher.active ? (
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                      )}
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                        teacher.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {teacher.active ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 sm:p-4">
                    <div className="relative">
                      <Button
                        ref={(el) => { dropdownButtonRefs.current[teacher.user_id] = el }}
                        variant="ghost"
                        size="sm"
                        onClick={() => setDropdownOpen(dropdownOpen === teacher.user_id ? null : teacher.user_id)}
                        className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                      >
                        <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      </Button>
                      
                      {dropdownOpen === teacher.user_id && (
                        <div 
                          className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                          style={{ zIndex: 9999 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleViewClassroomsClick(teacher)
                            }}
                          >
                            <BookOpen className="w-4 h-4" />
                            {t("teachers.viewClassrooms")}
                          </button>
                          {teacher.active ? (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteClick(teacher)
                              }}
                            >
                              <UserX className="w-4 h-4" />
                              {t("teachers.makeInactive")}
                            </button>
                          ) : (
                            <button
                              className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-green-600"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleActivateClick(teacher)
                              }}
                            >
                              <UserCheck className="w-4 h-4" />
                              {t("teachers.makeActive")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center">
                      <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{t("teachers.noTeachersFound")}</h3>
                      <p className="text-gray-600">
                        {searchQuery ? t('common.tryAdjustingSearch') : t('teachers.getStartedFirstTeacher')}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {effectiveTotalCount > 0 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                variant="outline"
              >
                {t("teachers.pagination.previous")}
              </Button>
              <Button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                variant="outline"
              >
                {t("teachers.pagination.next")}
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("teachers.pagination.showing")}
                  <span className="font-medium"> {((currentPage - 1) * itemsPerPage) + 1} </span>
                  {t("teachers.pagination.to")}
                  <span className="font-medium"> {Math.min(currentPage * itemsPerPage, effectiveTotalCount)} </span>
                  {t("teachers.pagination.of")}
                  <span className="font-medium"> {effectiveTotalCount} </span>
                  {t("teachers.pagination.teachers")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("teachers.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(effectiveTotalCount / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(effectiveTotalCount / itemsPerPage)}
                  variant="outline"
                >
                  {t("teachers.pagination.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>



      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setTeacherToDelete(null)
          }}
          size="md"
        >
          <div className="flex flex-col">
            <div className="flex-shrink-0 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{teacherToDelete.active ? t('teachers.makeTeacherInactive') : t('teachers.makeTeacherActive')}</h2>
              <p className="text-gray-600 mb-6">
                {teacherToDelete.active
                  ? `${t('teachers.makeInactiveConfirm', { name: teacherToDelete.name })} ${t('teachers.dataPreserved')}`
                  : `${t('teachers.makeActiveConfirm', { name: teacherToDelete.name })} ${t('teachers.regainAccess')}`}
              </p>
            </div>
            <div className="flex-shrink-0 p-6 border-t border-gray-200 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setTeacherToDelete(null)
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className={`flex-1 text-white ${teacherToDelete.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {teacherToDelete.active ? t('teachers.makeInactive') : t('teachers.makeActive')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Classrooms Modal */}
      {viewingTeacher && (
        <Modal
          isOpen={showViewClassroomsModal}
          onClose={() => {
            setShowViewClassroomsModal(false)
            setViewingTeacher(null)
            setTeacherClassrooms([])
          }}
          size="3xl"
        >
          <div className="flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {t("teachers.classrooms")} - {viewingTeacher.name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewClassroomsModal(false)
                  setViewingTeacher(null)
                  setTeacherClassrooms([])
                }}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              {teacherClassrooms.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {t('teachers.classroomsAssigned', { count: teacherClassrooms.length })}
                  </p>
                  <div className="grid gap-4">
                    {teacherClassrooms.map((classroom) => (
                      <div key={classroom.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg mb-2">{classroom.name}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{t("classrooms.grade")}:</span>
                                    <span>{classroom.grade}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{t("classrooms.subject")}:</span>
                                    <span>{classroom.subject}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedClassroomForDetails(classroom)
                                  setShowClassroomDetailsModal(true)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                {t("common.view")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t("teachers.noClassroomsAssigned")}</h3>
                    <p className="text-gray-600">
                      {t("teachers.teacherNoClassrooms")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Classroom Details Modal */}
      {selectedClassroomForDetails && (
        <Modal
          isOpen={showClassroomDetailsModal}
          onClose={() => {
            setShowClassroomDetailsModal(false)
            setSelectedClassroomForDetails(null)
          }}
          size="6xl"
        >
          <div className="flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: selectedClassroomForDetails.color || '#6B7280' }}
                />
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedClassroomForDetails.name}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowClassroomDetailsModal(false)
                  setSelectedClassroomForDetails(null)
                }}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Classroom Info & Enrollment */}
                <div className="space-y-6">
                  {/* Classroom Information Card */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <School className="w-5 h-5" />
                      {t("teachers.classroomInformation")}
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.grade")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.grade || t('classrooms.notSpecified')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Book className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("classrooms.subject")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.subject || t('classrooms.notSpecified')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">{t("common.teacher")}</p>
                          <p className="font-medium text-gray-900">{selectedClassroomForDetails.teacher_name || t('classrooms.notAssigned')}</p>
                        </div>
                      </div>

                      {selectedClassroomForDetails.created_at && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="text-sm text-gray-600">{t("common.created")}</p>
                            <p className="font-medium text-gray-900">
                              {new Date(selectedClassroomForDetails.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Notes Card */}
                  {selectedClassroomForDetails.notes && (
                    <Card className="p-4 sm:p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("classrooms.notes")}</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedClassroomForDetails.notes}</p>
                    </Card>
                  )}
                </div>

                {/* Right Column - Student Enrollment */}
                <div className="space-y-6">
                  {/* Student Enrollment Card */}
                  <Card className="p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {t("teachers.studentEnrollment")} ({selectedClassroomForDetails.student_count || 0})
                    </h3>
                    {!selectedClassroomForDetails.enrolled_students || selectedClassroomForDetails.enrolled_students.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{t("teachers.noStudentsEnrolled")}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedClassroomForDetails.enrolled_students.map((student, index) => (
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

            <div className="flex-shrink-0 flex items-center justify-between p-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {selectedClassroomForDetails.created_at && (
                  <>
                    {t("common.created")}: {new Date(selectedClassroomForDetails.created_at).toLocaleDateString()}
                    {selectedClassroomForDetails.updated_at !== selectedClassroomForDetails.created_at && selectedClassroomForDetails.updated_at && (
                      <span className="ml-4">
                        {t("common.updated")}: {new Date(selectedClassroomForDetails.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClassroomDetailsModal(false)
                    setSelectedClassroomForDetails(null)
                  }}
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}