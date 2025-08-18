import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

export interface Assignment {
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
  created_at: string
  updated_at: string
  student_count?: number
  submitted_count?: number
}

export interface AssignmentCategory {
  id: string
  name: string
  academy_id: string
}

export interface Session {
  id: string
  classroom_id: string
  classroom_name: string
  classroom_color?: string
  teacher_name?: string
  date: string
  start_time: string
  end_time: string
  status: string
}

export interface SubmissionGrade {
  id: string
  assignment_id: string
  student_id: string
  student_name: string
  student_email: string
  submitted_at?: string
  grade?: number
  feedback?: string
  status: 'not_submitted' | 'submitted' | 'graded'
  submission_content?: string
}

export function useAssignmentData(academyId: string, filterSessionId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [categories, setCategories] = useState<AssignmentCategory[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('assignments')
        .select(`
          *,
          classroom_sessions!inner(
            id,
            date,
            start_time,
            end_time,
            status,
            classrooms!inner(
              id,
              name,
              color,
              academy_id,
              teachers!inner(
                users!inner(name)
              )
            )
          ),
          assignment_categories(
            id,
            name
          )
        `)
        .eq('classroom_sessions.classrooms.academy_id', academyId)
        .order('created_at', { ascending: false })

      if (filterSessionId) {
        query = query.eq('classroom_session_id', filterSessionId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching assignments:', error)
        throw error
      }

      const formattedAssignments: Assignment[] = (data || []).map((item: any) => ({
        id: item.id,
        classroom_session_id: item.classroom_session_id,
        classroom_name: item.classroom_sessions?.classrooms?.name,
        classroom_color: item.classroom_sessions?.classrooms?.color,
        teacher_name: item.classroom_sessions?.classrooms?.teachers?.users?.name,
        session_date: item.classroom_sessions?.date,
        session_time: `${item.classroom_sessions?.start_time} - ${item.classroom_sessions?.end_time}`,
        title: item.title,
        description: item.description,
        assignment_type: item.assignment_type,
        due_date: item.due_date,
        assignment_categories_id: item.assignment_categories_id,
        category_name: item.assignment_categories?.name,
        created_at: item.created_at,
        updated_at: item.updated_at,
        student_count: 0, // This would need additional query
        submitted_count: 0 // This would need additional query
      }))

      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('Error in fetchAssignments:', error)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [academyId, filterSessionId])

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .select('*')
        .eq('academy_id', academyId)
        .order('name', { ascending: true })

      if (error) throw error

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
    }
  }, [academyId])

  const fetchSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          status,
          classrooms!inner(
            id,
            name,
            color,
            academy_id,
            teachers!inner(
              users!inner(name)
            )
          )
        `)
        .eq('classrooms.academy_id', academyId)
        .eq('status', 'scheduled')
        .order('date', { ascending: false })

      if (error) throw error

      const formattedSessions: Session[] = (data || []).map((item: any) => ({
        id: item.id,
        classroom_id: item.classrooms.id,
        classroom_name: item.classrooms.name,
        classroom_color: item.classrooms.color,
        teacher_name: item.classrooms.teachers?.users?.name,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        status: item.status
      }))

      setSessions(formattedSessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setSessions([])
    }
  }, [academyId])

  const fetchSubmissionGrades = useCallback(async (assignmentId: string): Promise<SubmissionGrade[]> => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          assignment_id,
          student_id,
          submitted_at,
          grade,
          feedback,
          status,
          submission_content,
          students!inner(
            users!inner(
              name,
              email
            )
          )
        `)
        .eq('assignment_id', assignmentId)

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        assignment_id: item.assignment_id,
        student_id: item.student_id,
        student_name: item.students?.users?.name || 'Unknown Student',
        student_email: item.students?.users?.email || '',
        submitted_at: item.submitted_at,
        grade: item.grade,
        feedback: item.feedback,
        status: item.status || 'not_submitted',
        submission_content: item.submission_content
      }))
    } catch (error) {
      console.error('Error fetching submission grades:', error)
      return []
    }
  }, [])

  const refreshData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchAssignments(),
      fetchCategories(),
      fetchSessions()
    ])
    setLoading(false)
  }, [fetchAssignments, fetchCategories, fetchSessions])

  const memoizedData = useMemo(() => ({
    assignments,
    categories,
    sessions,
    loading,
    refreshData,
    fetchAssignments,
    fetchSubmissionGrades
  }), [assignments, categories, sessions, loading, refreshData, fetchAssignments, fetchSubmissionGrades])

  useEffect(() => {
    if (academyId) {
      refreshData()
    }
  }, [academyId, refreshData])

  return memoizedData
}