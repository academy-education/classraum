import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// Types for the store
interface User {
  userId: string
  userName: string
  academyId: string
  role: string
}

interface UpcomingSession {
  id: string
  className: string
  classroomColor: string
  time: string
  date: string
  teacherName: string
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string
  status: 'pending' | 'completed' | 'overdue'
  classroom_name: string
  teacher_name: string
  assignment_type: 'Homework' | 'Quiz' | 'Project' | 'Test'
  teacher_initials: string
  points?: number
  comment_count?: number
  classroom_color: string
}

interface Grade {
  id: string
  assignment_title: string
  assignment_type?: string
  subject: string
  grade: string | number
  max_points: number
  graded_date: string
  teacher_name: string
  classroom_name: string
  classroom_id?: string
  status: string
  due_date: string
  submitted_date?: string
  comment_count: number
  teacher_comment?: string
  classroom_color?: string
}

interface DashboardData {
  todaysClassCount: number
  pendingAssignmentsCount: number
  upcomingSessions: UpcomingSession[]
  lastUpdated: number
}

interface MobileStore {
  // User state
  user: User | null
  setUser: (user: User | null) => void

  // Dashboard data with caching
  dashboardData: DashboardData | null
  setDashboardData: (data: DashboardData) => void
  isDashboardLoading: boolean
  setDashboardLoading: (loading: boolean) => void

  // Assignments with caching
  assignments: Assignment[]
  setAssignments: (assignments: Assignment[]) => void
  assignmentsLastUpdated: number
  isAssignmentsLoading: boolean
  setAssignmentsLoading: (loading: boolean) => void

  // Grades with caching
  grades: Grade[]
  setGrades: (grades: Grade[]) => void
  gradesLastUpdated: number
  isGradesLoading: boolean
  setGradesLoading: (loading: boolean) => void

  // Schedule cache (Map can't be persisted, so we use object)
  scheduleCache: Record<string, Array<{
    id: string
    date: string
    start_time: string
    end_time: string
    classroom: {
      id: string
      name: string
      color?: string
      teacher_id: string
    }
    location?: string
    day_of_week: string
    status: string
    duration_hours?: number
    duration_minutes?: number
    teacher_name?: string
  }>>
  setScheduleCache: (cache: Record<string, Array<{
    id: string
    date: string
    start_time: string
    end_time: string
    classroom: {
      id: string
      name: string
      color?: string
      teacher_id: string
    }
    location?: string
    day_of_week: string
    status: string
    duration_hours?: number
    duration_minutes?: number
    teacher_name?: string
  }>>) => void
  monthlySessionDates: string[]
  setMonthlySessionDates: (dates: string[]) => void

  // Teacher names cache
  teacherNamesCache: Record<string, string>
  setTeacherNamesCache: (cache: Record<string, string>) => void

  // Helper methods
  isDashboardStale: () => boolean
  areAssignmentsStale: () => boolean
  areGradesStale: () => boolean
  clearAllCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useMobileStore = create<MobileStore>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      setUser: (user) => set({ user }),

      // Dashboard data
      dashboardData: null,
      setDashboardData: (data) => set({ 
        dashboardData: { ...data, lastUpdated: Date.now() },
        isDashboardLoading: false 
      }),
      isDashboardLoading: false,
      setDashboardLoading: (loading) => set({ isDashboardLoading: loading }),

      // Assignments
      assignments: [],
      setAssignments: (assignments) => set({ 
        assignments, 
        assignmentsLastUpdated: Date.now(),
        isAssignmentsLoading: false 
      }),
      assignmentsLastUpdated: 0,
      isAssignmentsLoading: false,
      setAssignmentsLoading: (loading) => set({ isAssignmentsLoading: loading }),

      // Grades
      grades: [],
      setGrades: (grades) => set({ 
        grades, 
        gradesLastUpdated: Date.now(),
        isGradesLoading: false 
      }),
      gradesLastUpdated: 0,
      isGradesLoading: false,
      setGradesLoading: (loading) => set({ isGradesLoading: loading }),

      // Schedule cache
      scheduleCache: {},
      setScheduleCache: (cache) => set({ scheduleCache: cache }),
      monthlySessionDates: [],
      setMonthlySessionDates: (dates) => set({ monthlySessionDates: dates }),

      // Teacher cache
      teacherNamesCache: {},
      setTeacherNamesCache: (cache) => set({ teacherNamesCache: { ...get().teacherNamesCache, ...cache } }),

      // Helper methods
      isDashboardStale: () => {
        const { dashboardData } = get()
        if (!dashboardData) return true
        return Date.now() - dashboardData.lastUpdated > CACHE_DURATION
      },

      areAssignmentsStale: () => {
        const { assignmentsLastUpdated } = get()
        return Date.now() - assignmentsLastUpdated > CACHE_DURATION
      },

      areGradesStale: () => {
        const { gradesLastUpdated } = get()
        return Date.now() - gradesLastUpdated > CACHE_DURATION
      },

      clearAllCache: () => set({
        dashboardData: null,
        assignments: [],
        grades: [],
        scheduleCache: {},
        monthlySessionDates: [],
        teacherNamesCache: {},
        assignmentsLastUpdated: 0,
        gradesLastUpdated: 0
      })
    }),
    {
      name: 'mobile-app-storage',
      // Only persist non-loading states and cache data
      partialize: (state) => ({
        user: state.user,
        dashboardData: state.dashboardData,
        assignments: state.assignments,
        assignmentsLastUpdated: state.assignmentsLastUpdated,
        grades: state.grades,
        gradesLastUpdated: state.gradesLastUpdated,
        scheduleCache: state.scheduleCache,
        monthlySessionDates: state.monthlySessionDates,
        teacherNamesCache: state.teacherNamesCache
      })
    }
  )
)

// Selector hooks for better performance with proper memoization
export const useDashboardData = () => useMobileStore(
  useShallow(state => ({
    data: state.dashboardData,
    isLoading: state.isDashboardLoading,
    isStale: state.isDashboardStale(),
    setData: state.setDashboardData,
    setLoading: state.setDashboardLoading
  }))
)

export const useAssignments = () => useMobileStore(
  useShallow(state => ({
    assignments: state.assignments,
    isLoading: state.isAssignmentsLoading,
    isStale: state.areAssignmentsStale(),
    setAssignments: state.setAssignments,
    setLoading: state.setAssignmentsLoading
  }))
)

export const useGrades = () => useMobileStore(
  useShallow(state => ({
    grades: state.grades,
    isLoading: state.isGradesLoading,
    isStale: state.areGradesStale(),
    setGrades: state.setGrades,
    setLoading: state.setGradesLoading
  }))
)

export const useTeacherCache = () => useMobileStore(
  useShallow(state => ({
    cache: state.teacherNamesCache,
    setCache: state.setTeacherNamesCache
  }))
)