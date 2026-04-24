import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStableCallback } from './useStableCallback'

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
  /** User-controlled sort order (migration 017). NULL falls back to created_at. */
  display_order?: number | null
  created_at: string | null
  updated_at: string | null
}

export function useSubjectData(academyId: string) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [categories, setCategories] = useState<AssignmentCategoryWithSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubjects = useStableCallback(async () => {
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
  })

  const fetchAssignmentCategories = useStableCallback(async () => {
    if (!academyId) {
      return
    }

    try {
      // Active categories only — deleted_at IS NULL filters out soft-deleted
      // rows from the hub and dropdowns. Historical assignments still display
      // the category name because they join the row directly by FK (which is
      // unaffected by the filter here).
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('assignment_categories')
        .select(`
          *,
          subjects (
            name
          )
        `)
        .eq('academy_id', academyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

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
  })

  const refreshData = useStableCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchSubjects(),
      fetchAssignmentCategories()
    ])
    setLoading(false)
  })

  // Initial data fetch - refetch when academyId changes
  useEffect(() => {
    if (academyId) {
      refreshData()
    }
  }, [academyId, refreshData])

  const getSubjectById = useCallback((subjectId: string): Subject | undefined => {
    return subjects.find(subject => subject.id === subjectId)
  }, [subjects])

  const getCategoriesBySubjectId = useCallback((subjectId: string): AssignmentCategoryWithSubject[] => {
    // Apply client-side display_order sort so missing (pre-migration) column
    // or NULL values don't break ordering. Tiebreaker: created_at.
    return categories
      .filter(category => category.subject_id === subjectId)
      .sort((a, b) => {
        const aOrdered = a.display_order != null
        const bOrdered = b.display_order != null
        if (aOrdered && bOrdered) return (a.display_order as number) - (b.display_order as number)
        if (aOrdered) return -1
        if (bOrdered) return 1
        // Both unordered — fall back to created_at
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
      })
  }, [categories])

  const getUnlinkedCategories = useCallback((): AssignmentCategoryWithSubject[] => {
    return categories.filter(category => !category.subject_id)
  }, [categories])

  const refreshCategories = useStableCallback(async () => {
    await fetchAssignmentCategories()
  })

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