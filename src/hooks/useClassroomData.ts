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
        .select('*')
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

      // Get additional data for each classroom
      const classroomsWithDetails = await Promise.all(
        data.map(async (classroom) => {
          try {
            // Get teacher name
            const { data: teacher } = await supabase
              .from('teachers')
              .select('users(name)')
              .eq('id', classroom.teacher_id)
              .single()

            // Get enrolled students
            const { data: enrolledStudents } = await supabase
              .from('classroom_students')
              .select(`
                students!inner(
                  users!inner(name),
                  school_name
                )
              `)
              .eq('classroom_id', classroom.id)

            // Get schedules
            const { data: schedules } = await supabase
              .from('classroom_schedules')
              .select('*')
              .eq('classroom_id', classroom.id)

            return {
              ...classroom,
              teacher_name: (teacher?.users as { name?: string })?.name || 'Unknown Teacher',
              enrolled_students: enrolledStudents?.map((es: Record<string, unknown>) => ({
                name: (((es.students as Record<string, unknown>)?.users as Record<string, unknown>)?.name as string) || 'Unknown Student',
                school_name: ((es.students as Record<string, unknown>)?.school_name as string) || undefined
              })) || [],
              student_count: enrolledStudents?.length || 0,
              schedules: schedules || [],
              paused: classroom.paused || false
            }
          } catch (error) {
            console.error('Error fetching details for classroom:', classroom.id, error)
            return {
              ...classroom,
              teacher_name: 'Unknown Teacher',
              enrolled_students: [],
              student_count: 0,
              schedules: []
            }
          }
        })
      )

      setClassrooms(classroomsWithDetails)
      queryCache.set(cacheKey, classroomsWithDetails, CACHE_TTL.MEDIUM)
    } catch (error) {
      console.error('Error in fetchClassrooms:', error)
      setClassrooms([])
    }
  })

  const fetchTeachers = useStableCallback(async () => {
    const fallbackTeachers: Teacher[] = [
      { id: '1', name: 'Joy Kim', user_id: '1d9aef65-4989-4f26-be5a-6e021fabb9f2' },
      { id: '2', name: 'Sarah Johnson', user_id: '2e8bf76c-5a90-4f37-bf6b-7f132gccb0f3' },
      { id: '3', name: 'Michael Chen', user_id: '3f9cg87d-6b01-5g48-cg7c-8g243hddca4' }
    ]
    
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

      setTeachers(formattedTeachers.length > 0 ? formattedTeachers : fallbackTeachers)
    } catch (error) {
      console.error('Error fetching teachers:', error)
      setTeachers(fallbackTeachers)
    }
  })

  const fetchStudents = useStableCallback(async () => {
    const fallbackStudents: Student[] = [
      { id: '1', name: 'Emma Johnson', user_id: '1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p', school_name: 'Lincoln Elementary' },
      { id: '2', name: 'Liam Williams', user_id: '2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q', school_name: 'Lincoln Elementary' },
      { id: '3', name: 'Olivia Brown', user_id: '3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r', school_name: 'Washington Elementary' },
      { id: '4', name: 'Noah Davis', user_id: '4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s', school_name: 'Lincoln Elementary' },
      { id: '5', name: 'Ava Miller', user_id: '5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t', school_name: 'Washington Elementary' },
      { id: '6', name: 'Ethan Wilson', user_id: '6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u', school_name: 'Lincoln Elementary' }
    ]
    
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

      setStudents(formattedStudents.length > 0 ? formattedStudents : fallbackStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents(fallbackStudents)
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