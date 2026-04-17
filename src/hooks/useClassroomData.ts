import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL, CACHE_KEYS } from '@/lib/queryCache'
import { useStableCallback } from './useStableCallback'

export interface Classroom {
  id: string
  name: string
  grade?: string
  subject?: string
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
  paused?: boolean
}

export interface Teacher {
  id: string
  name: string
  user_id: string
}

export interface Student {
  id: string
  name: string
  user_id: string
  school_name?: string
}

export interface Schedule {
  id: string
  day: string
  start_time: string
  end_time: string
}

export function useClassroomData(academyId: string) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const fetchClassrooms = useStableCallback(async () => {
    try {
      // Check cache first
      const cacheKey = CACHE_KEYS.CLASSROOMS(academyId)
      const cachedData = queryCache.get(cacheKey)
      if (cachedData) {
        setClassrooms(cachedData as Classroom[])
        return
      }

      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          *,
          teachers!classrooms_teacher_id_fkey(
            users!inner(name)
          ),
          classroom_students(
            students!inner(
              users!inner(name),
              school_name
            )
          ),
          classroom_schedules(
            id, day, start_time, end_time
          )
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching classrooms:', error)
        throw error
      }

      if (!data) {
        setClassrooms([])
        return
      }

      const classroomsWithDetails = data.map((classroom: Record<string, unknown>) => {
        const teacher = classroom.teachers as Record<string, unknown> | null
        const enrolledStudents = (classroom.classroom_students as Record<string, unknown>[]) || []
        const schedules = (classroom.classroom_schedules as Record<string, unknown>[]) || []

        return {
          ...classroom,
          teachers: undefined,
          classroom_students: undefined,
          classroom_schedules: undefined,
          teacher_name: (teacher?.users as { name?: string })?.name || 'Unknown Teacher',
          enrolled_students: enrolledStudents.map((es) => ({
            name: ((es.students as Record<string, unknown>)?.users as { name?: string })?.name || 'Unknown Student',
            school_name: ((es.students as Record<string, unknown>)?.school_name as string) || undefined
          })),
          student_count: enrolledStudents.length,
          schedules: schedules,
          paused: (classroom.paused as boolean) || false
        }
      })

      setClassrooms(classroomsWithDetails as Classroom[])
      queryCache.set(cacheKey, classroomsWithDetails, CACHE_TTL.MEDIUM)
    } catch (error) {
      console.error('Error in fetchClassrooms:', error)
      setClassrooms([])
    }
  })

  const fetchTeachers = useStableCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          users!inner(
            id,
            name
          )
        `)
        .eq('academy_id', academyId)

      if (error) throw error

      const formattedTeachers = data?.map(teacher => ({
        id: teacher.id,
        name: (teacher.users as { name?: string; id?: string })?.name || 'Unknown Teacher',
        user_id: (teacher.users as { name?: string; id?: string })?.id || ''
      })) || []

      setTeachers(formattedTeachers)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setTeachers([])
    }
  })

  const fetchStudents = useStableCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          user_id,
          school_name,
          users!inner(
            id,
            name
          )
        `)
        .eq('academy_id', academyId)
        .eq('active', true)

      if (error) throw error

      const formattedStudents = data?.map(student => ({
        id: student.user_id,
        name: (student.users as { name?: string })?.name || 'Unknown Student',
        user_id: student.user_id,
        school_name: student.school_name
      })) || []

      setStudents(formattedStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    }
  })

  const invalidateCache = useStableCallback(() => {
    if (academyId) {
      queryCache.invalidate(CACHE_KEYS.CLASSROOMS(academyId))
    }
  })

  const refreshData = useStableCallback(async () => {
    setLoading(true)
    invalidateCache()
    await Promise.all([
      fetchClassrooms(),
      fetchTeachers(),
      fetchStudents()
    ])
    setLoading(false)
  })

  useEffect(() => {
    if (academyId) {
      refreshData()
    } else {
      setLoading(false)
    }
  }, [academyId])

  return {
    classrooms,
    teachers,
    students,
    loading,
    refreshData,
    fetchClassrooms,
    invalidateCache
  }
}