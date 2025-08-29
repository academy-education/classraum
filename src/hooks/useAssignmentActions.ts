import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AssignmentFormData {
  title: string
  description: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project'
  due_date: string
  classroom_session_id: string
  assignment_categories_id: string
}

export function useAssignmentActions() {
  
  const createAssignment = useCallback(async (
    academyId: string,
    formData: AssignmentFormData
  ) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          title: formData.title,
          description: formData.description,
          assignment_type: formData.assignment_type,
          due_date: formData.due_date,
          classroom_session_id: formData.classroom_session_id,
          assignment_categories_id: formData.assignment_categories_id || null,
          academy_id: academyId
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error creating assignment:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const updateAssignment = useCallback(async (
    assignmentId: string,
    formData: AssignmentFormData
  ) => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .update({
          title: formData.title,
          description: formData.description,
          assignment_type: formData.assignment_type,
          due_date: formData.due_date,
          classroom_session_id: formData.classroom_session_id,
          assignment_categories_id: formData.assignment_categories_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error updating assignment:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    try {
      // First delete related submissions
      await supabase
        .from('assignment_submissions')
        .delete()
        .eq('assignment_id', assignmentId)

      // Then delete the assignment
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error deleting assignment:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const updateSubmissionGrade = useCallback(async (
    submissionId: string,
    grade: number,
    feedback?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('assignment_submissions')
        .update({
          grade,
          feedback,
          status: 'graded',
          graded_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error updating submission grade:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const createCategory = useCallback(async (
    academyId: string,
    name: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .insert({
          name: name.trim(),
          academy_id: academyId
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error creating category:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  const bulkUpdateGrades = useCallback(async (
    grades: Array<{ submissionId: string; grade: number; feedback?: string }>
  ) => {
    try {
      const updates = grades.map(({ submissionId, grade, feedback }) =>
        supabase
          .from('assignment_submissions')
          .update({
            grade,
            feedback,
            status: 'graded',
            graded_at: new Date().toISOString()
          })
          .eq('id', submissionId)
      )

      const results = await Promise.all(updates)
      
      // Check if any updates failed
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} grades`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error bulk updating grades:', error)
      return { success: false, error: error as Error }
    }
  }, [])

  return {
    createAssignment,
    updateAssignment,
    deleteAssignment,
    updateSubmissionGrade,
    createCategory,
    bulkUpdateGrades
  }
}