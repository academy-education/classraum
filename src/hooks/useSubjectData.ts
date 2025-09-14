import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Subject {
  id: string
  name: string
  academy_id: string
  created_at: string | null
  updated_at: string | null
}

export interface SubjectWithCategories extends Subject {
  assignment_categories?: AssignmentCategoryWithSubject[]
}

export interface AssignmentCategoryWithSubject {
  id: string
  name: string
  academy_id: string
  subject_id: string | null
  subject_name?: string
  created_at: string | null
  updated_at: string | null
}

export function useSubjectData(academyId: string) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<AssignmentCategoryWithSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = useCallback(async () => {
    if (!academyId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('academy_id', academyId)
        .order('name')

      if (subjectsError) {
        throw subjectsError
      }

      setSubjects(subjectsData || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch subjects')
      setSubjects([])
    }
  }, [academyId])

  const fetchAssignmentCategories = useCallback(async () => {
    if (!academyId) {
      return
    }

    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('assignment_categories')
        .select(`
          *,
          subjects (
            name
          )
        `)
        .eq('academy_id', academyId)
        .order('name')

      if (categoriesError) {
        throw categoriesError
      }

      // Transform the data to include subject_name
      const categoriesWithSubject: AssignmentCategoryWithSubject[] = (categoriesData || []).map(category => ({
        ...category,
        subject_name: category.subjects?.name || undefined
      }))

      setCategories(categoriesWithSubject)
    } catch (err) {
      console.error('Error fetching assignment categories:', err)
      // Don't set error state for categories as it's not critical
    }
  }, [academyId])

  const refreshData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchSubjects(),
      fetchAssignmentCategories()
    ])
    setLoading(false)
  }, [fetchSubjects, fetchAssignmentCategories])

  // Initial data fetch
  useEffect(() => {
    refreshData()
  }, [refreshData])

  const getSubjectById = useCallback((subjectId: string): Subject | undefined => {
    return subjects.find(subject => subject.id === subjectId)
  }, [subjects])

  const getCategoriesBySubjectId = useCallback((subjectId: string): AssignmentCategoryWithSubject[] => {
    return categories.filter(category => category.subject_id === subjectId)
  }, [categories])

  const getUnlinkedCategories = useCallback((): AssignmentCategoryWithSubject[] => {
    return categories.filter(category => !category.subject_id)
  }, [categories])

  const refreshCategories = useCallback(async () => {
    await fetchAssignmentCategories()
  }, [fetchAssignmentCategories])

  return {
    subjects,
    categories,
    loading,
    error,
    refreshData,
    refreshCategories,
    getSubjectById,
    getCategoriesBySubjectId,
    getUnlinkedCategories
  }
}