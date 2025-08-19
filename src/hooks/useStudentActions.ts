import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface StudentFormData {
  name: string
  email: string
  phone?: string
  school_name?: string
  family_id?: string
  active: boolean
}

export function useStudentActions() {
  
  const createStudent = useCallback(async (
    academyId: string,
    formData: StudentFormData
  ) => {
    try {
      // First create the user account
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: formData.name,
          email: formData.email,
          role: 'student'
        })
        .select()
        .single()

      if (userError) throw userError

      // Then create the student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: userData.id,
          phone: formData.phone,
          school_name: formData.school_name,
          academy_id: academyId,
          family_id: formData.family_id || null,
          active: formData.active
        })
        .select()
        .single()

      if (studentError) throw studentError

      return { success: true, data: { user: userData, student: studentData } }
    } catch (error) {
      console.error('Error creating student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const updateStudent = useCallback(async (
    studentId: string,
    formData: StudentFormData
  ) => {
    try {
      // Update the user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          email: formData.email
        })
        .eq('id', studentId)

      if (userError) throw userError

      // Update the student record
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .update({
          phone: formData.phone,
          school_name: formData.school_name,
          family_id: formData.family_id || null,
          active: formData.active
        })
        .eq('user_id', studentId)
        .select()
        .single()

      if (studentError) throw studentError

      return { success: true, data: studentData }
    } catch (error) {
      console.error('Error updating student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const deleteStudent = useCallback(async (studentId: string) => {
    try {
      // First remove from classrooms
      await supabase
        .from('classroom_students')
        .delete()
        .eq('student_id', studentId)

      // Remove assignment submissions
      await supabase
        .from('assignment_submissions')
        .delete()
        .eq('student_id', studentId)

      // Remove attendance records
      await supabase
        .from('attendance')
        .delete()
        .eq('student_id', studentId)

      // Delete the student record
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('user_id', studentId)

      if (studentError) throw studentError

      // Finally delete the user account
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId)

      if (userError) throw userError

      return { success: true }
    } catch (error) {
      console.error('Error deleting student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const enrollStudentInClassroom = useCallback(async (
    studentId: string,
    classroomId: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .insert({
          student_id: studentId,
          classroom_id: classroomId
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error enrolling student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const unenrollStudentFromClassroom = useCallback(async (
    studentId: string,
    classroomId: string
  ) => {
    try {
      const { error } = await supabase
        .from('classroom_students')
        .delete()
        .eq('student_id', studentId)
        .eq('classroom_id', classroomId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error unenrolling student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const toggleStudentStatus = useCallback(async (
    studentId: string,
    active: boolean
  ) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ active })
        .eq('user_id', studentId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error toggling student status:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const bulkUpdateStudents = useCallback(async (
    updates: Array<{ studentId: string; active?: boolean; family_id?: string }>
  ) => {
    try {
      const promises = updates.map(({ studentId, active, family_id }) => {
        const updateData: Record<string, boolean | string | null> = {}
        if (active !== undefined) updateData.active = active
        if (family_id !== undefined) updateData.family_id = family_id

        return supabase
          .from('students')
          .update(updateData)
          .eq('user_id', studentId)
      })

      const results = await Promise.all(promises)
      
      // Check if any updates failed
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} students`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error bulk updating students:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  return {
    createStudent,
    updateStudent,
    deleteStudent,
    enrollStudentInClassroom,
    unenrollStudentFromClassroom,
    toggleStudentStatus,
    bulkUpdateStudents
  }
}