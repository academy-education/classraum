import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Classroom, Schedule, Student } from './useClassroomData'

export interface ClassroomFormData {
  name: string
  grade: string
  subject: string
  teacher_id: string
  teacher_name: string
  color: string
  notes: string
}

export function useClassroomActions() {
  
  const createClassroom = useCallback(async (
    academyId: string,
    formData: ClassroomFormData,
    schedules: Schedule[],
    selectedStudents: string[]
  ) => {
    try {
      // Step 1: Create the classroom in the database
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name: formData.name,
          grade: formData.grade,
          subject: formData.subject,
          teacher_id: formData.teacher_id,
          color: formData.color,
          notes: formData.notes,
          academy_id: academyId
        })
        .select()
        .single()

      if (classroomError) throw classroomError

      const newClassroomId = classroomData.id

      // Step 2: Insert schedules if any
      if (schedules.length > 0) {
        const schedulesToInsert = schedules.map(schedule => ({
          classroom_id: newClassroomId,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))

        const { error: scheduleError } = await supabase
          .from('classroom_schedules')
          .insert(schedulesToInsert)

        if (scheduleError) {
          console.error('Error inserting schedules:', scheduleError)
          // Don't throw here, classroom creation was successful
        }
      }

      // Step 3: Enroll selected students
      if (selectedStudents.length > 0) {
        const enrollmentsToInsert = selectedStudents.map(studentId => ({
          classroom_id: newClassroomId,
          student_id: studentId
        }))

        const { error: enrollmentError } = await supabase
          .from('classroom_students')
          .insert(enrollmentsToInsert)

        if (enrollmentError) {
          console.error('Error enrolling students:', enrollmentError)
          // Don't throw here, classroom creation was successful
        }
      }

      return { success: true, data: classroomData }
    } catch (error) {
      console.error('Error creating classroom:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const updateClassroom = useCallback(async (
    classroom: Classroom,
    formData: ClassroomFormData,
    schedules: Schedule[],
    selectedStudents: string[]
  ) => {
    try {
      // Step 1: Update the classroom
      const { error: classroomError } = await supabase
        .from('classrooms')
        .update({
          name: formData.name,
          grade: formData.grade,
          subject: formData.subject,
          teacher_id: formData.teacher_id,
          color: formData.color,
          notes: formData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', classroom.id)

      if (classroomError) throw classroomError

      // Step 2: Update schedules - delete existing and insert new ones
      await supabase
        .from('classroom_schedules')
        .delete()
        .eq('classroom_id', classroom.id)

      if (schedules.length > 0) {
        const schedulesToInsert = schedules.map(schedule => ({
          classroom_id: classroom.id,
          day: schedule.day,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        }))

        const { error: scheduleError } = await supabase
          .from('classroom_schedules')
          .insert(schedulesToInsert)

        if (scheduleError) {
          console.error('Error updating schedules:', scheduleError)
        }
      }

      // Step 3: Update student enrollments - delete existing and insert new ones
      await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroom.id)

      if (selectedStudents.length > 0) {
        const enrollmentsToInsert = selectedStudents.map(studentId => ({
          classroom_id: classroom.id,
          student_id: studentId
        }))

        const { error: enrollmentError } = await supabase
          .from('classroom_students')
          .insert(enrollmentsToInsert)

        if (enrollmentError) {
          console.error('Error updating student enrollments:', enrollmentError)
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating classroom:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const deleteClassroom = useCallback(async (classroomId: string) => {
    try {
      // First, delete related data
      await Promise.all([
        supabase.from('classroom_schedules').delete().eq('classroom_id', classroomId),
        supabase.from('classroom_students').delete().eq('classroom_id', classroomId),
        supabase.from('sessions').delete().eq('classroom_id', classroomId)
      ])

      // Then delete the classroom
      const { error } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting classroom:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  return {
    createClassroom,
    updateClassroom,
    deleteClassroom
  }
}