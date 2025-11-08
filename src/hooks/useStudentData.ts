import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useStableCallback } from './useStableCallback'

// Cache invalidation function for students
export const invalidateStudentsCache = (academyId: string) => {
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`students-${academyId}-page`) ||
        key.includes(`students-${academyId}-page`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} students cache entries`)
}

export interface Student {
  user_id: string
  name: string
  email: string
  phone?: string
  school_name?: string
  academy_id: string
  active: boolean
  created_at: string
  family_id?: string
  family_name?: string
  classroom_count?: number
}

export interface Family {
  id: string
  name: string
  academy_id: string
}

export interface Classroom {
  id: string
  name: string
  color?: string
  teacher_name?: string
}

export function useStudentData(academyId: string, currentPage: number = 1, itemsPerPage: number = 10, statusFilter: 'all' | 'active' | 'inactive' = 'all') {
  const [students, setStudents] = useState<Student[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)
  const [initialized, setInitialized] = useState(false)

  const fetchStudents = useStableCallback(async () => {
    if (!academyId) {
      console.warn('fetchStudents: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return
    }

    // PERFORMANCE: Check cache first (2-minute TTL for students)
    const cacheKey = `students-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes TTL
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Cache hit:', {
          students: parsed.students?.length || 0,
          totalCount: parsed.totalCount || 0,
          page: currentPage
        })
        setStudents(parsed.students)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setInitialized(true)
        setLoading(false)
        return parsed.students
      } else {
        console.log('⏰ Cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Cache miss, fetching from database')
    }

    setInitialized(true)
    setLoading(true)
    try {
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Build the base query with status filter
      let studentsQuery = supabase
        .from('students')
        .select(`
          user_id,
          phone,
          school_name,
          academy_id,
          active,
          created_at,
          users!inner(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .eq('academy_id', academyId)

      // Apply status filter at database level
      if (statusFilter === 'active') {
        studentsQuery = studentsQuery.eq('active', true)
      } else if (statusFilter === 'inactive') {
        studentsQuery = studentsQuery.eq('active', false)
      }

      studentsQuery = studentsQuery
        .order('created_at', { ascending: false })
        .range(from, to)

      // Fetch counts in parallel with main query
      const [studentsResult, activeCountResult, inactiveCountResult] = await Promise.all([
        studentsQuery,

        // Get active students count
        supabase
          .from('students')
          .select('user_id', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', true),

        // Get inactive students count
        supabase
          .from('students')
          .select('user_id', { count: 'exact', head: true })
          .eq('academy_id', academyId)
          .eq('active', false)
      ])

      const { data, error, count } = studentsResult

      if (error) throw error

      // Update counts
      setTotalCount(count || 0)
      setActiveCount(activeCountResult.count || 0)
      setInactiveCount(inactiveCountResult.count || 0)

      if (!data || data.length === 0) {
        setStudents([])
        setLoading(false)
        return
      }

      // Get family information and classroom counts for each student
      const studentIds = data?.map(s => s.user_id) || []
      const familyData: { [key: string]: { family_id: string; family_name: string } } = {}
      const classroomCounts: { [key: string]: number } = {}
      
      if (studentIds.length > 0) {
        // Get family memberships
        const { data: familyMembers, error: familyError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            families!inner(
              id,
              name
            )
          `)
          .in('user_id', studentIds)

        if (!familyError) {
          familyMembers?.forEach((member: Record<string, unknown>) => {
            familyData[member.user_id as string] = {
              family_id: (member.families as Record<string, unknown>).id as string,
              family_name: ((member.families as Record<string, unknown>).name as string) || `Family ${((member.families as Record<string, unknown>).id as string).slice(0, 8)}`
            }
          })
        }

        // Get classroom counts using database aggregation
        const { data: classroomCountData, error: classroomError } = await supabase
          .rpc('count_classrooms_by_student', {
            student_ids: studentIds
          })

        if (classroomError) {
          // Fallback to the previous method if RPC fails
          console.warn('RPC failed, using fallback method:', classroomError)
          const { data: classroomData, error: fallbackError } = await supabase
            .from('classroom_students')
            .select('student_id')
            .in('student_id', studentIds)

          if (!fallbackError && classroomData) {
            classroomData.forEach(enrollment => {
              classroomCounts[enrollment.student_id] = (classroomCounts[enrollment.student_id] || 0) + 1
            })
          }
        } else if (classroomCountData) {
          // Use the aggregated counts from the RPC
          classroomCountData.forEach((row: { student_id: string; classroom_count: number }) => {
            classroomCounts[row.student_id] = row.classroom_count
          })
        }
      }

      const mappedStudents = data?.map((student: Record<string, unknown>) => ({
        user_id: student.user_id as string,
        name: ((student.users as Record<string, unknown>)?.name as string) || 'Unknown',
        email: ((student.users as Record<string, unknown>)?.email as string) || '',
        phone: student.phone as string,
        school_name: student.school_name as string,
        academy_id: student.academy_id as string,
        active: student.active as boolean,
        created_at: student.created_at as string,
        family_id: familyData[student.user_id as string]?.family_id,
        family_name: familyData[student.user_id as string]?.family_name,
        classroom_count: classroomCounts[student.user_id as string] || 0
      })) || []

      setStudents(mappedStudents)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          students: mappedStudents,
          totalCount: count || 0,
          activeCount: activeCountResult.count || 0,
          inactiveCount: inactiveCountResult.count || 0
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Students cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache students:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setLoading(false)
    }
  })

  const fetchFamilies = useStableCallback(async () => {
    if (!academyId) {
      console.warn('fetchFamilies: No academyId available yet')
      // Keep loading state - skeleton will continue to show
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('families')
        .select('id, academy_id, created_at')
        .eq('academy_id', academyId)
        .order('created_at')

      if (error) throw error
      
      const familiesData = data?.map(family => ({
        id: family.id,
        name: `Family ${family.id.slice(0, 8)}`,
        academy_id: family.academy_id
      })) || []
      
      setFamilies(familiesData)
    } catch (error) {
      console.error('Error fetching families:', error)
      setFamilies([])
    }
  })

  const fetchClassrooms = useStableCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          teacher_id,
          users!classrooms_teacher_id_fkey(name)
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error

      const formattedClassrooms: Classroom[] = (data || []).map((classroom: Record<string, unknown>) => ({
        id: classroom.id as string,
        name: classroom.name as string,
        color: classroom.color as string,
        teacher_name: (classroom.users as Record<string, unknown>)?.name as string
      }))

      setClassrooms(formattedClassrooms)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      setClassrooms([])
    }
  })

  const getStudentClassrooms = useCallback(async (studentId: string): Promise<Classroom[]> => {
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .select(`
          classrooms!inner(
            id,
            name,
            color,
            teacher_id,
            users!classrooms_teacher_id_fkey(name)
          )
        `)
        .eq('student_id', studentId)

      if (error) throw error

      return (data || []).map((item: Record<string, unknown>) => ({
        id: (item.classrooms as Record<string, unknown>).id as string,
        name: (item.classrooms as Record<string, unknown>).name as string,
        color: (item.classrooms as Record<string, unknown>).color as string,
        teacher_name: ((item.classrooms as Record<string, unknown>).users as Record<string, unknown>)?.name as string
      }))
    } catch (error) {
      console.error('Error fetching student classrooms:', error)
      return []
    }
  }, [])

  const refreshData = useStableCallback(async () => {
    if (!academyId) return

    setLoading(true)
    await Promise.all([
      fetchStudents(),
      fetchFamilies(),
      fetchClassrooms()
    ])
    setLoading(false)
  })

  const fetchFamilyDetails = useCallback(async (familyId: string) => {
    try {
      // Get family details and members
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single()

      if (familyError) throw familyError

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          users!inner(
            name,
            email,
            role
          )
        `)
        .eq('family_id', familyId)

      if (membersError) throw membersError

      // Get phone numbers for family members from their respective role tables
      const memberIds = membersData?.map((member: Record<string, unknown>) => member.user_id as string) || []
      const phoneMap: { [key: string]: string | null } = {}

      if (memberIds.length > 0) {
        // Fetch from parents table
        const { data: parentPhones } = await supabase
          .from('parents')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        parentPhones?.forEach((p: { user_id: string; phone: string }) => {
          phoneMap[p.user_id] = p.phone
        })

        // Fetch from students table  
        const { data: studentPhones } = await supabase
          .from('students')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        studentPhones?.forEach((s: { user_id: string; phone: string }) => {
          phoneMap[s.user_id] = s.phone
        })

        // Fetch from teachers table
        const { data: teacherPhones } = await supabase
          .from('teachers')
          .select('user_id, phone')
          .in('user_id', memberIds)
        
        teacherPhones?.forEach((t: { user_id: string; phone: string }) => {
          phoneMap[t.user_id] = t.phone
        })
      }

      // Add phone data to members
      const enrichedMembers = membersData?.map((member: Record<string, unknown>) => ({
        ...member,
        phone: phoneMap[member.user_id as string] || null
      })) || []

      return {
        ...familyData,
        members: enrichedMembers
      }
    } catch (error) {
      console.error('Error fetching family details:', error)
      return null
    }
  }, [])

  const fetchStudentClassrooms = useCallback(async (studentId: string): Promise<Array<{
    id: string
    name: string
    grade?: string
    subject?: string
    color?: string
    notes?: string
    teacher_id?: string
    teacher_name?: string | null
    created_at?: string
    updated_at?: string
    student_count: number
    enrolled_students: Array<{
      name: string
      school_name?: string
    }>
  }>> => {
    try {
      // Get classrooms where this student is enrolled
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms!inner(
            id,
            name,
            grade,
            subject,
            color,
            notes,
            teacher_id,
            created_at,
            updated_at
          )
        `)
        .eq('student_id', studentId)

      if (enrollmentError) throw enrollmentError

      if (!enrollmentData || enrollmentData.length === 0) {
        return []
      }

      const classrooms = enrollmentData.map((e: Record<string, unknown>) => e.classrooms as Record<string, unknown>)
      const classroomIds = classrooms.map(c => c.id as string)
      const teacherIds = classrooms.map(c => c.teacher_id as string).filter(Boolean)

      // Batch query for all enrolled students across all classrooms
      const { data: allEnrolledStudents, error: studentsError } = await supabase
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
        .in('classroom_id', classroomIds)

      if (studentsError) throw studentsError

      // Batch query for all teacher names
      const teacherNames: { [key: string]: string } = {}
      if (teacherIds.length > 0) {
        const { data: teachersData, error: teachersError } = await supabase
          .from('users')
          .select('id, name')
          .in('id', teacherIds)

        if (!teachersError && teachersData) {
          teachersData.forEach(teacher => {
            teacherNames[teacher.id] = teacher.name
          })
        }
      }

      // Group students by classroom
      const studentsByClassroom: { [key: string]: { name: string; school_name?: string }[] } = {}
      allEnrolledStudents?.forEach((enrollment: Record<string, unknown>) => {
        const classroomId = enrollment.classroom_id as string
        if (!studentsByClassroom[classroomId]) {
          studentsByClassroom[classroomId] = []
        }
        studentsByClassroom[classroomId].push({
          name: (((enrollment.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string) || 'Unknown Student',
          school_name: (enrollment.students as Record<string, unknown>)?.school_name as string
        })
      })

      // Build classrooms with student data
      const classroomsWithDetails = classrooms.map(classroom => ({
        ...classroom,
        teacher_name: teacherNames[classroom.teacher_id as string] || null,
        enrolled_students: studentsByClassroom[classroom.id as string] || [],
        student_count: (studentsByClassroom[classroom.id as string] || []).length
      }))

      return classroomsWithDetails as Array<{
        id: string
        name: string
        grade?: string
        subject?: string
        color?: string
        notes?: string
        teacher_id?: string
        teacher_name?: string | null
        created_at?: string
        updated_at?: string
        student_count: number
        enrolled_students: Array<{
          name: string
          school_name?: string
        }>
      }>
    } catch (error) {
      console.error('Error fetching student classrooms:', error)
      return []
    }
  }, [])

  const memoizedData = useMemo(() => ({
    students,
    families,
    classrooms,
    loading,
    totalCount,
    activeCount,
    inactiveCount,
    initialized,
    refreshData,
    fetchStudents,
    getStudentClassrooms,
    fetchFamilyDetails,
    fetchStudentClassrooms
  }), [students, families, classrooms, loading, totalCount, activeCount, inactiveCount, initialized])

  useEffect(() => {
    if (!academyId) return

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `students-${academyId}-page${currentPage}-${statusFilter}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 2 * 60 * 1000 // 2 minutes
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [useStudentData useEffect] Using cached data - NO skeleton')
        setStudents(parsed.students)
        setTotalCount(parsed.totalCount || 0)
        setActiveCount(parsed.activeCount || 0)
        setInactiveCount(parsed.inactiveCount || 0)
        setInitialized(true)
        setLoading(false)
        // Still load secondary data in background
        fetchFamilies()
        fetchClassrooms()
        return // Skip fetchStudents - we have cached data
      }
    }

    // Cache miss - fetch all data
    console.log('❌ [useStudentData useEffect] Cache miss - loading data')
    setInitialized(true)
    fetchStudents()
    fetchFamilies()
    fetchClassrooms()
  }, [academyId, currentPage, statusFilter, fetchStudents, fetchFamilies, fetchClassrooms])

  return memoizedData
}