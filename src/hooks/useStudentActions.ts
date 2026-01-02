import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { triggerWelcomeNotifications, triggerUserDeactivatedNotifications } from '@/lib/notification-triggers'

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

      // Send welcome notification to new student
      try {
        await triggerWelcomeNotifications(userData.id)
      } catch (notificationError) {
        console.error('Error sending welcome notification:', notificationError)
        // Don't fail the student creation if notification fails
      }

      return { success: true, data: { user: userData, student: studentData } }
    } catch (error) {
      console.error('Error creating student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const updateStudent = useCallback(async (
    studentId: string,
    academyId: string,
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

      // Update the student record (use both user_id and academy_id for multi-academy support)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .update({
          phone: formData.phone,
          school_name: formData.school_name,
          family_id: formData.family_id || null,
          active: formData.active
        })
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .select()
        .single()

      if (studentError) throw studentError

      return { success: true, data: studentData }
    } catch (error) {
      console.error('Error updating student:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const deleteStudent = useCallback(async (studentId: string, academyId: string) => {
    try {
      // Get the student record id for this academy
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .single()

      if (studentRecord) {
        // Remove from classrooms using student_record_id
        await supabase
          .from('classroom_students')
          .delete()
          .eq('student_record_id', studentRecord.id)

        // Remove assignment submissions
        await supabase
          .from('assignment_submissions')
          .delete()
          .eq('student_id', studentId)

        // Remove attendance records using student_record_id
        await supabase
          .from('attendance')
          .delete()
          .eq('student_record_id', studentRecord.id)
      }

      // Delete the student record for this academy
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('user_id', studentId)
        .eq('academy_id', academyId)

      if (studentError) throw studentError

      // Check if user has any other student records in other academies
      const { data: otherStudentRecords } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', studentId)
        .limit(1)

      // Only delete the user account if no other student records exist
      if (!otherStudentRecords || otherStudentRecords.length === 0) {
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', studentId)

        if (userError) throw userError
      }

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
      // Get the classroom's academy_id to look up student_record_id
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('academy_id')
        .eq('id', classroomId)
        .single()

      let studentRecordId: string | undefined
      if (classroom?.academy_id) {
        const { data: studentRecord } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', studentId)
          .eq('academy_id', classroom.academy_id)
          .single()
        studentRecordId = studentRecord?.id
      }

      const { data, error } = await supabase
        .from('classroom_students')
        .insert({
          student_id: studentId,
          classroom_id: classroomId,
          student_record_id: studentRecordId
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
    academyId: string,
    active: boolean
  ) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .update({ active })
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .select()
        .single()

      if (error) throw error

      // Send deactivation notification if user was deactivated
      if (!active) {
        try {
          await triggerUserDeactivatedNotifications(studentId)
        } catch (notificationError) {
          console.error('Error sending deactivation notification:', notificationError)
          // Don't fail the status change if notification fails
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error toggling student status:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const bulkUpdateStudents = useCallback(async (
    academyId: string,
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
          .eq('academy_id', academyId)
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