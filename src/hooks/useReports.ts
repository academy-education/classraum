import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { queryCache, CACHE_TTL } from '@/lib/queryCache'

export interface ReportData {
  id: string
  student_id: string
  student_name: string
  student_email: string
  student_school?: string
  report_name?: string
  start_date?: string
  end_date?: string
  selected_classrooms?: string[]
  selected_assignment_categories?: string[]
  ai_feedback_enabled?: boolean
  status?: 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'
  created_at: string
  updated_at: string
}

export interface Student {
  user_id: string
  name: string
  email: string
  school_name?: string
}

export interface Classroom {
  id: string
  name: string
  subject: string
  grade: string
}

export interface AssignmentCategory {
  id: string
  name: string
}

export function useReports(academyId: string) {
  const [reports, setReports] = useState<ReportData[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignmentCategories, setAssignmentCategories] = useState<AssignmentCategory[]>([])
  const [studentClassrooms, setStudentClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  // Fetch students with caching
  const fetchStudents = useCallback(async () => {
    if (!academyId) return
    
    setStudentsLoading(true)
    try {
      const cacheKey = `students_${academyId}`
      let cachedStudents = queryCache.get<Student[]>(cacheKey)

      if (!cachedStudents) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            user_id,
            school_name,
            active,
            users!inner(
              id,
              name,
              email
            )
          `)
          .eq('academy_id', academyId)
          .eq('active', true)
        
        if (error) throw error
        
        const studentsData = data?.map((student: any) => ({
          user_id: student.user_id,
          name: student.users.name,
          email: student.users.email,
          school_name: student.school_name
        })) || []
        
        cachedStudents = studentsData
        queryCache.set(cacheKey, cachedStudents, CACHE_TTL.MEDIUM) // 5 minutes
      }
      
      setStudents(cachedStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [academyId])

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!academyId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_reports')
        .select(`
          id,
          student_id,
          report_name,
          start_date,
          end_date,
          selected_classrooms,
          selected_assignment_categories,
          ai_feedback_enabled,
          status,
          created_at,
          updated_at,
          students!inner(
            academy_id,
            school_name,
            users!inner(
              name,
              email
            )
          )
        `)
        .eq('students.academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const reportsData = data?.map((report: any) => ({
        id: report.id,
        student_id: report.student_id,
        student_name: report.students?.users?.name || '',
        student_email: report.students?.users?.email || '',
        student_school: report.students?.school_name || '',
        report_name: report.report_name,
        start_date: report.start_date,
        end_date: report.end_date,
        selected_classrooms: report.selected_classrooms || [],
        selected_assignment_categories: report.selected_assignment_categories || [],
        ai_feedback_enabled: report.ai_feedback_enabled ?? true,
        status: report.status || 'Draft',
        created_at: report.created_at,
        updated_at: report.updated_at
      })) || []

      setReports(reportsData)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [academyId])

  // Fetch assignment categories with caching
  const fetchAssignmentCategories = useCallback(async () => {
    if (!academyId) return
    
    setCategoriesLoading(true)
    try {
      const cacheKey = `assignment_categories_${academyId}`
      let cachedCategories = queryCache.get<AssignmentCategory[]>(cacheKey)

      if (!cachedCategories) {
        const { data, error } = await supabase
          .from('assignment_categories')
          .select('id, name')
          .eq('academy_id', academyId)
          .order('name')
        
        if (error) throw error
        
        cachedCategories = data || []
        queryCache.set(cacheKey, cachedCategories, CACHE_TTL.LONG) // 15 minutes
      }
      
      setAssignmentCategories(cachedCategories)
    } catch (error) {
      console.error('Error fetching assignment categories:', error)
      setAssignmentCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }, [academyId])

  // Fetch student classrooms
  const fetchStudentClassrooms = useCallback(async (studentId: string) => {
    if (!studentId) {
      setStudentClassrooms([])
      return
    }
    
    try {
      const cacheKey = `student_classrooms_${studentId}`
      let cachedClassrooms = queryCache.get<Classroom[]>(cacheKey)

      if (!cachedClassrooms) {
        const { data, error } = await supabase
          .from('classroom_students')
          .select(`
            classrooms!inner(
              id,
              name,
              subject,
              grade
            )
          `)
          .eq('student_id', studentId)
        
        if (error) throw error
        
        cachedClassrooms = data?.map((item: any) => item.classrooms) || []
        queryCache.set(cacheKey, cachedClassrooms, CACHE_TTL.SHORT) // 1 minute
      }
      
      setStudentClassrooms(cachedClassrooms)
    } catch (error) {
      console.error('Error fetching student classrooms:', error)
      setStudentClassrooms([])
    }
  }, [])

  // Create report
  const createReport = useCallback(async (reportData: Partial<ReportData>) => {
    try {
      const { error } = await supabase
        .from('student_reports')
        .insert({
          student_id: reportData.student_id,
          report_name: reportData.report_name,
          start_date: reportData.start_date,
          end_date: reportData.end_date,
          selected_classrooms: reportData.selected_classrooms,
          selected_assignment_categories: reportData.selected_assignment_categories,
          ai_feedback_enabled: reportData.ai_feedback_enabled,
          status: reportData.status
        })
      
      if (error) throw error
      
      // Refresh reports after creation
      await fetchReports()
      
      return { success: true }
    } catch (error) {
      console.error('Error creating report:', error)
      return { success: false, error }
    }
  }, [fetchReports])

  // Update report
  const updateReport = useCallback(async (reportId: string, updates: Partial<ReportData>) => {
    try {
      const { error } = await supabase
        .from('student_reports')
        .update(updates)
        .eq('id', reportId)
      
      if (error) throw error
      
      // Refresh reports after update
      await fetchReports()
      
      return { success: true }
    } catch (error) {
      console.error('Error updating report:', error)
      return { success: false, error }
    }
  }, [fetchReports])

  // Delete report
  const deleteReport = useCallback(async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('student_reports')
        .delete()
        .eq('id', reportId)
      
      if (error) throw error
      
      // Refresh reports after deletion
      await fetchReports()
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting report:', error)
      return { success: false, error }
    }
  }, [fetchReports])

  // Bulk delete reports
  const bulkDeleteReports = useCallback(async (reportIds: string[]) => {
    try {
      const { error } = await supabase
        .from('student_reports')
        .delete()
        .in('id', reportIds)
      
      if (error) throw error
      
      // Refresh reports after bulk deletion
      await fetchReports()
      
      return { success: true }
    } catch (error) {
      console.error('Error bulk deleting reports:', error)
      return { success: false, error }
    }
  }, [fetchReports])

  // Initial data fetch
  useEffect(() => {
    if (academyId) {
      Promise.all([
        fetchReports(),
        fetchStudents(),
        fetchAssignmentCategories()
      ])
    }
  }, [academyId, fetchReports, fetchStudents, fetchAssignmentCategories])

  return {
    // Data
    reports,
    students,
    assignmentCategories,
    studentClassrooms,
    
    // Loading states
    loading,
    studentsLoading,
    categoriesLoading,
    
    // Actions
    fetchReports,
    fetchStudents,
    fetchAssignmentCategories,
    fetchStudentClassrooms,
    createReport,
    updateReport,
    deleteReport,
    bulkDeleteReports
  }
}