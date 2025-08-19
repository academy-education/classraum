import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { showSuccessToast, showErrorToast } from '@/stores'

// Query key factory for academy-related queries
export const academyKeys = {
  all: ['academy'] as const,
  academy: (id: string) => [...academyKeys.all, 'detail', id] as const,
  stats: (id: string) => [...academyKeys.all, 'stats', id] as const,
  users: (id: string) => [...academyKeys.all, 'users', id] as const,
  classrooms: (id: string) => [...academyKeys.all, 'classrooms', id] as const,
}

// Types
interface Academy {
  id: string
  name: string
  description?: string
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  created_at: string
  updated_at: string
}

interface AcademyStats {
  totalStudents: number
  totalTeachers: number
  totalClassrooms: number
  totalRevenue: number
  upcomingSessions: number
  monthlyGrowth: {
    students: number
    revenue: number
    sessions: number
  }
}

interface AcademyUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'teacher' | 'student' | 'parent'
  avatar_url?: string
  created_at: string
}

interface Classroom {
  id: string
  name: string
  description?: string
  capacity: number
  current_enrollment: number
  teacher_id: string
  created_at: string
}

// Fetch academy data
export const useAcademy = (academyId: string) => {
  return useQuery({
    queryKey: academyKeys.academy(academyId),
    queryFn: async (): Promise<Academy> => {
      const { data, error } = await supabase
        .from('academies')
        .select('*')
        .eq('id', academyId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!academyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch academy statistics
export const useAcademyStats = (academyId: string) => {
  return useQuery({
    queryKey: academyKeys.stats(academyId),
    queryFn: async (): Promise<AcademyStats> => {
      // Run multiple queries in parallel
      const [studentsResult, teachersResult, classroomsResult, revenueResult, sessionsResult] = 
        await Promise.all([
          supabase
            .from('profiles')
            .select('id')
            .eq('academy_id', academyId)
            .eq('role', 'student'),
          
          supabase
            .from('profiles')
            .select('id')
            .eq('academy_id', academyId)
            .eq('role', 'teacher'),
          
          supabase
            .from('classrooms')
            .select('id')
            .eq('academy_id', academyId),
          
          supabase
            .from('payments')
            .select('amount')
            .eq('academy_id', academyId)
            .eq('status', 'completed'),
          
          supabase
            .from('sessions')
            .select('id')
            .eq('academy_id', academyId)
            .gte('start_time', new Date().toISOString())
        ])

      // Calculate monthly growth (simplified - would need actual date filtering)
      const totalRevenue = revenueResult.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0

      return {
        totalStudents: studentsResult.data?.length || 0,
        totalTeachers: teachersResult.data?.length || 0,
        totalClassrooms: classroomsResult.data?.length || 0,
        totalRevenue,
        upcomingSessions: sessionsResult.data?.length || 0,
        monthlyGrowth: {
          students: 5.2, // Mock data - would calculate from actual data
          revenue: 12.8,
          sessions: 8.1,
        },
      }
    },
    enabled: !!academyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch academy users
export const useAcademyUsers = (academyId: string, role?: string) => {
  return useQuery({
    queryKey: [...academyKeys.users(academyId), role],
    queryFn: async (): Promise<AcademyUser[]> => {
      let query = supabase
        .from('profiles')
        .select('id, email, name, role, avatar_url, created_at')
        .eq('academy_id', academyId)

      if (role) {
        query = query.eq('role', role)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!academyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Fetch academy classrooms
export const useAcademyClassrooms = (academyId: string) => {
  return useQuery({
    queryKey: academyKeys.classrooms(academyId),
    queryFn: async (): Promise<Classroom[]> => {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          description,
          capacity,
          teacher_id,
          created_at,
          students:classroom_students(count)
        `)
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      return data?.map(classroom => ({
        ...classroom,
        current_enrollment: classroom.students?.[0]?.count || 0,
        students: undefined, // Remove the count helper
      })) || []
    },
    enabled: !!academyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Update academy mutation
export const useUpdateAcademy = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ academyId, updates }: { academyId: string; updates: Partial<Academy> }) => {
      const { data, error } = await supabase
        .from('academies')
        .update(updates)
        .eq('id', academyId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Update the academy cache
      queryClient.setQueryData(academyKeys.academy(data.id), data)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: academyKeys.all })
      
      showSuccessToast('Academy updated', 'Academy information has been updated successfully.')
    },
    onError: (error: Error) => {
      showErrorToast('Update failed', error.message || 'Failed to update academy information.')
    },
  })
}

// Refresh academy data utility
export const useRefreshAcademyData = (academyId: string) => {
  const queryClient = useQueryClient()

  return {
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.all })
    },
    refreshAcademy: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.academy(academyId) })
    },
    refreshStats: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.stats(academyId) })
    },
    refreshUsers: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.users(academyId) })
    },
    refreshClassrooms: () => {
      queryClient.invalidateQueries({ queryKey: academyKeys.classrooms(academyId) })
    },
  }
}