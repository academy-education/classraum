import { useCallback } from 'react'
import { db } from '@/lib/supabase'
import { triggerWelcomeNotifications, triggerUserDeactivatedNotifications } from '@/lib/notification-triggers'
import { reportClientError } from '@/lib/report-client-error'

export interface StudentFormData {
  name: string
  email: string
  phone?: string
  school_name?: string
  family_id?: string
  active: boolean
}

/**
 * Point a student at a family, or detach them.
 *
 * `students` has NO family_id column and never has -- membership lives in
 * `family_members` (user_id, family_id, role), which is what
 * useStudentData reads back to render the Family column. Both createStudent
 * and updateStudent used to put `family_id` in the students payload, so
 * PostgREST answered every call with
 *
 *     Could not find the 'family_id' column of 'students' in the schema cache
 *
 * and the whole save threw. The old generated types let it through; the
 * typed client rejects it, which is how it was found.
 *
 * One family per student here, matching the picker, which is single-select.
 */
async function setStudentFamily(userId: string, familyId: string | null) {
  const { error: clearError } = await db
    .from('family_members')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'student')
  if (clearError) throw clearError

  if (!familyId) return

  const { error: linkError } = await db
    .from('family_members')
    .insert({ user_id: userId, family_id: familyId, role: 'student' })
  if (linkError) throw linkError
}

export function useStudentActions() {
  
  const createStudent = useCallback(async (
    academyId: string,
    formData: StudentFormData
  ) => {
    try {
      // Check subscription user limit before creating
      try {
        const limitCheckResponse = await fetch('/api/subscription/check-limits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkType: 'student_add' })
        })

        const limitCheck = await limitCheckResponse.json()

        if (limitCheck.success && !limitCheck.allowed) {
          throw new Error(limitCheck.message || 'User limit reached. Please upgrade your subscription to add more users.')
        }
      } catch (limitError) {
        if (limitError instanceof Error && (limitError.message.includes('limit') || limitError.message.includes('한도'))) {
          throw limitError
        }
        console.warn('User limit check failed, continuing with creation:', limitError)
      }

      // First create the user account
      const { data: userData, error: userError } = await db
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
      const { data: studentData, error: studentError } = await db
        .from('students')
        .insert({
          user_id: userData.id,
          phone: formData.phone,
          school_name: formData.school_name,
          academy_id: academyId,
          active: formData.active
        })
        .select()
        .single()

      if (studentError) throw studentError

      await setStudentFamily(userData.id, formData.family_id || null)

      // Send welcome notification to new student
      try {
        await triggerWelcomeNotifications(userData.id)
      } catch (notificationError) {
        console.error('Error sending welcome notification:', notificationError)
        // Don't fail the student creation if notification fails
      }

      return { success: true, data: { user: userData, student: studentData } }
    } catch (error) {
      reportClientError('useStudentActions.createStudent', error, { academyId })
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
      const { error: userError } = await db
        .from('users')
        .update({
          name: formData.name,
          email: formData.email
        })
        .eq('id', studentId)

      if (userError) throw userError

      // Update the student record (use both user_id and academy_id for multi-academy support)
      const { data: studentData, error: studentError } = await db
        .from('students')
        .update({
          phone: formData.phone,
          school_name: formData.school_name,
          active: formData.active
        })
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .select()
        .single()

      if (studentError) throw studentError

      await setStudentFamily(studentId, formData.family_id || null)

      return { success: true, data: studentData }
    } catch (error) {
      reportClientError('useStudentActions.updateStudent', error, { academyId, studentId })
      return { success: false, error: error as Error }
    }
  }, [])

  const deleteStudent = useCallback(async (studentId: string, academyId: string) => {
    try {
      // Get the student record id for this academy
      const { data: studentRecord } = await db
        .from('students')
        .select('id')
        .eq('user_id', studentId)
        .eq('academy_id', academyId)
        .single()

      if (studentRecord) {
        // Cascading deletes — must check each one. If any fails, abort with a
        // clear error rather than silently orphaning the dependent rows.
        const { error: csError } = await db
          .from('classroom_students')
          .delete()
          .eq('student_record_id', studentRecord.id)
        if (csError) throw csError

        // Grades live in assignment_grades (there is no assignment_submissions
        // table). Scope by student_record_id like the sibling deletes above and
        // below, so we only remove this academy's rows.
        const { error: asError } = await db
          .from('assignment_grades')
          .delete()
          .eq('student_record_id', studentRecord.id)
        if (asError) throw asError

        const { error: attError } = await db
          .from('attendance')
          .delete()
          .eq('student_record_id', studentRecord.id)
        if (attError) throw attError
      }

      // Delete the student record for this academy
      const { error: studentError } = await db
        .from('students')
        .delete()
        .eq('user_id', studentId)
        .eq('academy_id', academyId)

      if (studentError) throw studentError

      // Check if user has any other student records in other academies
      const { data: otherStudentRecords } = await db
        .from('students')
        .select('id')
        .eq('user_id', studentId)
        .limit(1)

      // Only delete the user account if no other student records exist
      if (!otherStudentRecords || otherStudentRecords.length === 0) {
        const { error: userError } = await db
          .from('users')
          .delete()
          .eq('id', studentId)

        if (userError) throw userError
      }

      return { success: true }
    } catch (error) {
      reportClientError('useStudentActions.deleteStudent', error, { academyId, studentId })
      return { success: false, error: error as Error }
    }
  }, [])

  const enrollStudentInClassroom = useCallback(async (
    studentId: string,
    classroomId: string
  ) => {
    try {
      // Get the classroom's academy_id to look up student_record_id
      const { data: classroom } = await db
        .from('classrooms')
        .select('academy_id')
        .eq('id', classroomId)
        .single()

      let studentRecordId: string | undefined
      if (classroom?.academy_id) {
        const { data: studentRecord } = await db
          .from('students')
          .select('id')
          .eq('user_id', studentId)
          .eq('academy_id', classroom.academy_id)
          .single()
        studentRecordId = studentRecord?.id
      }

      const { data, error } = await db
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
      reportClientError('useStudentActions.enrollStudent', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const unenrollStudentFromClassroom = useCallback(async (
    studentId: string,
    classroomId: string
  ) => {
    try {
      const { error } = await db
        .from('classroom_students')
        .delete()
        .eq('student_id', studentId)
        .eq('classroom_id', classroomId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      reportClientError('useStudentActions.unenrollStudent', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const toggleStudentStatus = useCallback(async (
    studentId: string,
    academyId: string,
    active: boolean
  ) => {
    try {
      const { data, error } = await db
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
      reportClientError('useStudentActions.toggleStudentStatus', error, { academyId, studentId })
      return { success: false, error: error as Error }
    }
  }, [])

  const bulkUpdateStudents = useCallback(async (
    academyId: string,
    updates: Array<{ studentId: string; active?: boolean; family_id?: string }>
  ) => {
    try {
      // `active` is the only students column here. family_id is NOT one --
      // see setStudentFamily above -- so it is reconciled against
      // family_members instead of being smuggled into this payload, which is
      // what made every bulk update carrying a family fail outright.
      const promises = updates.map(async ({ studentId, active, family_id }) => {
        if (family_id !== undefined) {
          await setStudentFamily(studentId, family_id || null)
        }
        if (active === undefined) return { error: null }

        return db
          .from('students')
          .update({ active })
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
      reportClientError('useStudentActions.bulkUpdateStudents', error, { academyId, count: updates.length })
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