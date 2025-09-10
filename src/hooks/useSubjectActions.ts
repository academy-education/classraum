import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Subject } from './useSubjectData'

export interface CreateSubjectData {
  name: string
  academy_id: string
}

export interface CreateAssignmentCategoryData {
  name: string
  academy_id: string
  subject_id: string
}

export interface UpdateSubjectData {
  name: string
}

export interface SubjectActionResult {
  success: boolean
  data?: Subject
  error?: Error
}

export function useSubjectActions() {
  const createSubject = useCallback(async (
    subjectData: CreateSubjectData
  ): Promise<SubjectActionResult> => {
    try {
      // Check for duplicate subject names in the same academy
      const { data: existingSubject, error: checkError } = await supabase
        .from('subjects')
        .select('id')
        .eq('academy_id', subjectData.academy_id)
        .eq('name', subjectData.name.trim())
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is what we want
        throw checkError
      }

      if (existingSubject) {
        throw new Error('A subject with this name already exists')
      }

      // Create the subject
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: subjectData.name.trim(),
          academy_id: subjectData.academy_id
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data as Subject
      }
    } catch (error) {
      console.error('Error creating subject:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create subject')
      }
    }
  }, [])

  const updateSubject = useCallback(async (
    subjectId: string,
    updateData: UpdateSubjectData
  ): Promise<SubjectActionResult> => {
    try {
      // Get the academy_id of the subject being updated
      const { data: currentSubject, error: fetchError } = await supabase
        .from('subjects')
        .select('academy_id')
        .eq('id', subjectId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Check for duplicate subject names in the same academy (excluding current subject)
      const { data: existingSubject, error: checkError } = await supabase
        .from('subjects')
        .select('id')
        .eq('academy_id', currentSubject.academy_id)
        .eq('name', updateData.name.trim())
        .neq('id', subjectId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingSubject) {
        throw new Error('A subject with this name already exists')
      }

      // Update the subject
      const { data, error } = await supabase
        .from('subjects')
        .update({
          name: updateData.name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subjectId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data as Subject
      }
    } catch (error) {
      console.error('Error updating subject:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update subject')
      }
    }
  }, [])

  const deleteSubject = useCallback(async (subjectId: string): Promise<SubjectActionResult> => {
    try {
      // Check if subject is being used by classrooms
      const { data: classroomsUsing, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('subject_id', subjectId)
        .limit(1)

      if (classroomError) {
        throw classroomError
      }

      if (classroomsUsing && classroomsUsing.length > 0) {
        throw new Error('Cannot delete subject: it is being used by classrooms. Please reassign classrooms to a different subject first.')
      }

      // Check if subject is being used by assignment categories
      const { data: categoriesUsing, error: categoryError } = await supabase
        .from('assignment_categories')
        .select('id, name')
        .eq('subject_id', subjectId)
        .limit(1)

      if (categoryError) {
        throw categoryError
      }

      if (categoriesUsing && categoriesUsing.length > 0) {
        throw new Error('Cannot delete subject: it has assignment categories linked to it. Please reassign or delete the categories first.')
      }

      // Delete the subject
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)

      if (error) {
        throw error
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error deleting subject:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete subject')
      }
    }
  }, [])

  const linkCategoryToSubject = useCallback(async (
    categoryId: string,
    subjectId: string
  ): Promise<SubjectActionResult> => {
    try {
      const { error } = await supabase
        .from('assignment_categories')
        .update({
          subject_id: subjectId,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)

      if (error) {
        throw error
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error linking category to subject:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to link category to subject')
      }
    }
  }, [])

  const unlinkCategoryFromSubject = useCallback(async (
    categoryId: string
  ): Promise<SubjectActionResult> => {
    try {
      const { error } = await supabase
        .from('assignment_categories')
        .update({
          subject_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)

      if (error) {
        throw error
      }

      return {
        success: true
      }
    } catch (error) {
      console.error('Error unlinking category from subject:', error)
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to unlink category from subject')
      }
    }
  }, [])

  const createAssignmentCategory = useCallback(async (
    categoryData: CreateAssignmentCategoryData
  ): Promise<SubjectActionResult> => {
    try {
      const { data, error } = await supabase
        .from('assignment_categories')
        .insert({
          name: categoryData.name.trim(),
          academy_id: categoryData.academy_id,
          subject_id: categoryData.subject_id
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('Error creating assignment category:', error)
      
      let errorMessage = 'Failed to create assignment category'
      
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as any
        if (supabaseError.code === '23505') {
          errorMessage = 'A category with this name already exists for this subject'
        } else if (supabaseError.message) {
          errorMessage = supabaseError.message
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage)
      }
    }
  }, [])

  return {
    createSubject,
    updateSubject,
    deleteSubject,
    linkCategoryToSubject,
    unlinkCategoryFromSubject,
    createAssignmentCategory
  }
}