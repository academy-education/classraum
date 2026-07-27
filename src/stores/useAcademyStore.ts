import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

interface Academy {
  id: string
  name: string
  // 'academies' has no email/phone column — these are always undefined from
  // fetchAcademy. Optional so callers cannot treat them as present.
  email?: string
  phone?: string
  address?: string
  created_at: string
}

// A field is `null` when its underlying query failed. Never coerce a failed
// query to 0 — a fabricated zero on a revenue tile reads as real data.
// Consumers must omit the figure when it is null.
interface AcademyStats {
  totalStudents: number | null
  totalTeachers: number | null
  totalClassrooms: number | null
  totalRevenue: number | null
  activeStudents: number | null
  activeTeachers: number | null
  upcomingSessions: number | null
  pendingPayments: number | null
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

// Revenue has to be summed client-side (PostgREST rejects aggregate functions
// on this project) and a single response is capped at 1000 rows, so page
// through the paid invoices — otherwise a busy academy silently under-reports
// its revenue. The pending count needs no rows at all, so it uses a head count.
const INVOICE_PAGE_SIZE = 1000

async function fetchInvoiceTotals(academyId: string): Promise<{
  totalRevenue: number
  pendingPayments: number
  error: { message: string } | null
}> {
  let totalRevenue = 0

  for (let page = 0; ; page++) {
    const from = page * INVOICE_PAGE_SIZE
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, final_amount')
      .eq('academy_id', academyId)
      .eq('status', 'paid')
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .range(from, from + INVOICE_PAGE_SIZE - 1)

    if (error) return { totalRevenue: 0, pendingPayments: 0, error }

    const rows = data ?? []
    totalRevenue += rows.reduce(
      (sum, i) => sum + (i.final_amount ?? i.amount ?? 0),
      0
    )
    if (rows.length < INVOICE_PAGE_SIZE) break
  }

  const { count, error } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('status', 'pending')
    .is('deleted_at', null)

  if (error) return { totalRevenue: 0, pendingPayments: 0, error }

  return { totalRevenue, pendingPayments: count ?? 0, error: null }
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
          console.error(
            `[useAcademyStore] fetchAcademy failed for academy ${academyId}:`,
            error
          )
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
            activeStudentsResult,
            teachersResult,
            activeTeachersResult,
            classroomsResult,
            paymentsResult,
            sessionsResult
          ] = await Promise.all([
            // Student counts. Counted server-side rather than by filtering a
            // fetched page, which the 1000-row response cap would truncate.
            supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('academy_id', academyId),

            supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('academy_id', academyId)
              .eq('active', true),

            // Teacher counts ('teachers' is keyed by user_id and has no 'id' column)
            supabase
              .from('teachers')
              .select('user_id', { count: 'exact', head: true })
              .eq('academy_id', academyId),

            supabase
              .from('teachers')
              .select('user_id', { count: 'exact', head: true })
              .eq('academy_id', academyId)
              .eq('active', true),

            // Classroom count
            supabase
              .from('classrooms')
              .select('id', { count: 'exact', head: true })
              .eq('academy_id', academyId)
              .is('deleted_at', null),

            // Revenue and pending payments. Academy revenue lives in 'invoices'
            // (academy_id + final_amount), which is what the academy bills its
            // students. The 'payments' table is PortOne platform billing (keyed
            // by user_id, no academy_id) — that is the academy paying Classraum,
            // not academy revenue.
            fetchInvoiceTotals(academyId),

            // Upcoming sessions. 'classroom_sessions' has no academy_id; it is
            // scoped through its classroom.
            supabase
              .from('classroom_sessions')
              .select('id, classrooms!inner(academy_id)', { count: 'exact', head: true })
              .eq('classrooms.academy_id', academyId)
              .is('deleted_at', null)
              .gte('date', new Date().toISOString().split('T')[0])
              .eq('status', 'scheduled')
          ])

          // Surface failures instead of letting them read as a real 0.
          const failed = (
            label: string,
            result: { error: { message: string } | null }
          ): boolean => {
            if (result.error) {
              console.error(
                `[useAcademyStore] fetchAcademyStats: ${label} query failed for academy ${academyId}:`,
                result.error.message
              )
              return true
            }
            return false
          }

          // Process results
          const totalStudents = failed('students', studentsResult)
            ? null
            : studentsResult.count ?? 0
          const activeStudents = failed('active students', activeStudentsResult)
            ? null
            : activeStudentsResult.count ?? 0

          const totalTeachers = failed('teachers', teachersResult)
            ? null
            : teachersResult.count ?? 0
          const activeTeachers = failed('active teachers', activeTeachersResult)
            ? null
            : activeTeachersResult.count ?? 0

          const classroomsFailed = failed('classrooms', classroomsResult)
          const invoicesFailed = failed('invoices', paymentsResult)
          const sessionsFailed = failed('classroom_sessions', sessionsResult)

          const totalClassrooms = classroomsFailed ? null : classroomsResult.count ?? 0
          const upcomingSessions = sessionsFailed ? null : sessionsResult.count ?? 0

          const totalRevenue = invoicesFailed ? null : paymentsResult.totalRevenue
          const pendingPayments = invoicesFailed ? null : paymentsResult.pendingPayments

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
          console.error(
            `[useAcademyStore] fetchAcademyStats threw for academy ${academyId}:`,
            error
          )
          set({
            academyStats: null,
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