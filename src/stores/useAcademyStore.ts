import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface Academy {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  created_at: string
}

interface AcademyStats {
  totalStudents: number
  totalTeachers: number
  totalClassrooms: number
  totalRevenue: number
  activeStudents: number
  activeTeachers: number
  upcomingSessions: number
  pendingPayments: number
  lastUpdated: string
}

interface AcademyState {
  // Academy data
  academy: Academy | null
  academyStats: AcademyStats | null
  
  // Loading states
  loading: boolean
  statsLoading: boolean
  error: string | null
  
  // Actions
  setAcademy: (academy: Academy | null) => void
  setAcademyStats: (stats: AcademyStats) => void
  fetchAcademy: (academyId: string) => Promise<void>
  fetchAcademyStats: (academyId: string) => Promise<void>
  refreshStats: () => Promise<void>
  clearAcademy: () => void
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      // Initial state
      academy: null,
      academyStats: null,
      loading: false,
      statsLoading: false,
      error: null,

      // Actions
      setAcademy: (academy) => set({ academy, error: null }),
      
      setAcademyStats: (stats) => set({ 
        academyStats: {
          ...stats,
          lastUpdated: new Date().toISOString()
        } 
      }),

      fetchAcademy: async (academyId) => {
        set({ loading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('academies')
            .select('*')
            .eq('id', academyId)
            .single()

          if (error) throw error
          
          set({ academy: data, loading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch academy',
            loading: false 
          })
        }
      },

      fetchAcademyStats: async (academyId) => {
        set({ statsLoading: true, error: null })
        
        try {
          // Fetch all stats in parallel
          const [
            studentsResult,
            teachersResult,
            classroomsResult,
            paymentsResult,
            sessionsResult
          ] = await Promise.all([
            // Student counts
            supabase
              .from('students')
              .select('id, active', { count: 'exact' })
              .eq('academy_id', academyId),
            
            // Teacher counts
            supabase
              .from('teachers')
              .select('id, active', { count: 'exact' })
              .eq('academy_id', academyId),
            
            // Classroom count
            supabase
              .from('classrooms')
              .select('id', { count: 'exact' })
              .eq('academy_id', academyId)
              .is('deleted_at', null),
            
            // Revenue and pending payments
            supabase
              .from('student_payments')
              .select('amount, status')
              .eq('academy_id', academyId),
            
            // Upcoming sessions
            supabase
              .from('classroom_sessions')
              .select('id', { count: 'exact' })
              .eq('academy_id', academyId)
              .gte('date', new Date().toISOString().split('T')[0])
              .eq('status', 'scheduled')
          ])

          // Process results
          const totalStudents = studentsResult.count || 0
          const activeStudents = studentsResult.data?.filter(s => s.active).length || 0
          
          const totalTeachers = teachersResult.count || 0
          const activeTeachers = teachersResult.data?.filter(t => t.active).length || 0
          
          const totalClassrooms = classroomsResult.count || 0
          const upcomingSessions = sessionsResult.count || 0
          
          const payments = paymentsResult.data || []
          const totalRevenue = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0)
          const pendingPayments = payments
            .filter(p => p.status === 'pending').length

          set({
            academyStats: {
              totalStudents,
              totalTeachers,
              totalClassrooms,
              totalRevenue,
              activeStudents,
              activeTeachers,
              upcomingSessions,
              pendingPayments,
              lastUpdated: new Date().toISOString()
            },
            statsLoading: false
          })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
            statsLoading: false 
          })
        }
      },

      refreshStats: async () => {
        const { academy } = get()
        if (academy) {
          await get().fetchAcademyStats(academy.id)
        }
      },

      clearAcademy: () => set({
        academy: null,
        academyStats: null,
        loading: false,
        statsLoading: false,
        error: null
      })
    }),
    {
      name: 'academy-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        academy: state.academy,
        academyStats: state.academyStats 
      }),
    }
  )
)