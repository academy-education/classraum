"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { clearCachesOnRefresh, markRefreshHandled } from '@/utils/cacheRefresh'
import { useTranslation } from '@/hooks/useTranslation'

// ---- Interfaces (re-exported for consumers) ----

export interface Classroom {
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
  paused?: boolean
  enrolled_students?: { user_id?: string; name: string; school_name?: string }[]
  student_count?: number
  schedules?: { id: string; day: string; start_time: string; end_time: string }[]
}

export interface Teacher {
  id: string
  name: string
  user_id: string
}

export interface Schedule {
  id: string
  day: string
  start_time: string
  end_time: string
}

export interface Student {
  id: string
  name: string
  user_id: string
  school_name?: string
  phone?: string
  email?: string
  family_name?: string
  parent_names?: string[]
}

export function useClassroomsData(academyId: string) {
  const { t } = useTranslation()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [isManager, setIsManager] = useState(false)
  const [userRole, setUserRole] = useState<'manager' | 'teacher' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      void managerError

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
      void teacherError

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
        setClassrooms(parsed.classrooms)
        setTotalCount(parsed.totalCount || 0)
        setInitialized(true)
        setLoading(false)
        return parsed.classrooms
      }
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
          user_id: enrollment.student_id as string,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      familyData?.forEach((fm: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Convenience function to refresh all data in parallel
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchClassrooms(),
      fetchTeachers(),
      fetchStudents(),
      checkUserRole().then(setIsManager)
    ])
  }, [fetchClassrooms, fetchTeachers, fetchStudents, checkUserRole])

  useEffect(() => {
    if (academyId) {
      // Check if page was refreshed - if so, clear caches to force fresh data
      const wasRefreshed = clearCachesOnRefresh(academyId)
      if (wasRefreshed) {
        markRefreshHandled()
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

  return {
    classrooms, setClassrooms,
    teachers, setTeachers,
    students, setStudents,
    loading, setLoading,
    initialized, setInitialized,
    userRole,
    currentUserId,
    isManager,
    totalCount, setTotalCount,
    fetchClassrooms,
    fetchTeachers,
    fetchStudents,
    checkUserRole,
    refreshData,
  }
}
