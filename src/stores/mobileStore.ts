import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// Cache version for atomic operations and race condition prevention
let cacheVersion = Date.now()
const getCacheVersion = () => cacheVersion
const invalidateCache = () => { cacheVersion = Date.now() }

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
  assignment_description?: string
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

interface Notification {
  id: string
  title: string
  message: string
  type: 'assignment' | 'grade' | 'alert' | 'session'
  read: boolean
  created_at: string
  db_id?: string
}

interface DashboardData {
  todaysClassCount: number
  pendingAssignmentsCount: number
  upcomingSessions: UpcomingSession[]
  lastUpdated: number
  cacheVersion: number
}

interface CachedData {
  lastUpdated: number
  cacheVersion: number
}

interface MobileStore {
  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void

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
  assignmentsCache: CachedData
  isAssignmentsLoading: boolean
  setAssignmentsLoading: (loading: boolean) => void

  // Grades with caching
  grades: Grade[]
  setGrades: (grades: Grade[]) => void
  gradesCache: CachedData
  isGradesLoading: boolean
  setGradesLoading: (loading: boolean) => void

  // Notifications with caching
  notifications: Notification[]
  setNotifications: (notifications: Notification[]) => void
  notificationsCache: CachedData
  isNotificationsLoading: boolean
  setNotificationsLoading: (loading: boolean) => void

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
  areNotificationsStale: () => boolean
  clearAllCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useMobileStore = create<MobileStore>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // User state
      user: null,
      setUser: (user) => set({ user }),

      // Dashboard data
      dashboardData: null,
      setDashboardData: (data) => {
        const currentVersion = getCacheVersion()
        set({
          dashboardData: { ...data, lastUpdated: Date.now(), cacheVersion: currentVersion },
          isDashboardLoading: false
        })
      },
      isDashboardLoading: false,
      setDashboardLoading: (loading) => set({ isDashboardLoading: loading }),

      // Assignments
      assignments: [],
      setAssignments: (assignments) => {
        const currentVersion = getCacheVersion()
        set({
          assignments,
          assignmentsCache: { lastUpdated: Date.now(), cacheVersion: currentVersion },
          isAssignmentsLoading: false
        })
      },
      assignmentsCache: { lastUpdated: 0, cacheVersion: 0 },
      isAssignmentsLoading: false,
      setAssignmentsLoading: (loading) => set({ isAssignmentsLoading: loading }),

      // Grades
      grades: [],
      setGrades: (grades) => {
        const currentVersion = getCacheVersion()
        set({
          grades,
          gradesCache: { lastUpdated: Date.now(), cacheVersion: currentVersion },
          isGradesLoading: false
        })
      },
      gradesCache: { lastUpdated: 0, cacheVersion: 0 },
      isGradesLoading: false,
      setGradesLoading: (loading) => set({ isGradesLoading: loading }),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => {
        const currentVersion = getCacheVersion()
        set({
          notifications,
          notificationsCache: { lastUpdated: Date.now(), cacheVersion: currentVersion },
          isNotificationsLoading: false
        })
      },
      notificationsCache: { lastUpdated: 0, cacheVersion: 0 },
      isNotificationsLoading: false,
      setNotificationsLoading: (loading) => set({ isNotificationsLoading: loading }),

      // Schedule cache
      scheduleCache: {},
      setScheduleCache: (cache) => set({ scheduleCache: cache }),
      monthlySessionDates: [],
      setMonthlySessionDates: (dates) => set({ monthlySessionDates: dates }),

      // Teacher cache
      teacherNamesCache: {},
      setTeacherNamesCache: (cache) => set({ teacherNamesCache: { ...get().teacherNamesCache, ...cache } }),

      // Helper methods with atomic cache validation
      isDashboardStale: () => {
        const { dashboardData } = get()
        if (!dashboardData) return true

        const currentVersion = getCacheVersion()
        const isVersionStale = dashboardData.cacheVersion !== currentVersion
        const isTimeStale = Date.now() - dashboardData.lastUpdated > CACHE_DURATION

        return isVersionStale || isTimeStale
      },

      areAssignmentsStale: () => {
        const { assignmentsCache } = get()
        if (!assignmentsCache || assignmentsCache.lastUpdated === 0) return true

        const currentVersion = getCacheVersion()
        const isVersionStale = assignmentsCache.cacheVersion !== currentVersion
        const isTimeStale = Date.now() - assignmentsCache.lastUpdated > CACHE_DURATION

        return isVersionStale || isTimeStale
      },

      areGradesStale: () => {
        const { gradesCache } = get()
        if (!gradesCache || gradesCache.lastUpdated === 0) return true

        const currentVersion = getCacheVersion()
        const isVersionStale = gradesCache.cacheVersion !== currentVersion
        const isTimeStale = Date.now() - gradesCache.lastUpdated > CACHE_DURATION

        return isVersionStale || isTimeStale
      },

      areNotificationsStale: () => {
        const { notificationsCache } = get()
        if (!notificationsCache || notificationsCache.lastUpdated === 0) return true

        const currentVersion = getCacheVersion()
        const isVersionStale = notificationsCache.cacheVersion !== currentVersion
        const isTimeStale = Date.now() - notificationsCache.lastUpdated > CACHE_DURATION

        return isVersionStale || isTimeStale
      },

      clearAllCache: () => {
        invalidateCache() // Increment global cache version
        set({
          dashboardData: null,
          assignments: [],
          grades: [],
          notifications: [],
          scheduleCache: {},
          monthlySessionDates: [],
          teacherNamesCache: {},
          assignmentsCache: { lastUpdated: 0, cacheVersion: 0 },
          gradesCache: { lastUpdated: 0, cacheVersion: 0 },
          notificationsCache: { lastUpdated: 0, cacheVersion: 0 }
        })
      }
    }),
    {
      name: 'mobile-app-storage',
      // Only persist non-loading states and cache data
      partialize: (state) => ({
        user: state.user,
        dashboardData: state.dashboardData,
        assignments: state.assignments,
        assignmentsCache: state.assignmentsCache,
        grades: state.grades,
        gradesCache: state.gradesCache,
        notifications: state.notifications,
        notificationsCache: state.notificationsCache,
        scheduleCache: state.scheduleCache,
        monthlySessionDates: state.monthlySessionDates,
        teacherNamesCache: state.teacherNamesCache
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      }
    }
  )
)

// Selector hooks for better performance with proper memoization
export const useDashboardData = () => useMobileStore(
  useShallow(state => ({
    data: state.dashboardData,
    isLoading: state.isDashboardLoading,
    isStale: state.isDashboardStale,
    setData: state.setDashboardData,
    setLoading: state.setDashboardLoading
  }))
)

export const useAssignments = () => useMobileStore(
  useShallow(state => ({
    assignments: state.assignments,
    isLoading: state.isAssignmentsLoading,
    isStale: state.areAssignmentsStale,
    setAssignments: state.setAssignments,
    setLoading: state.setAssignmentsLoading
  }))
)

export const useGrades = () => useMobileStore(
  useShallow(state => ({
    grades: state.grades,
    isLoading: state.isGradesLoading,
    isStale: state.areGradesStale,
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

export const useNotifications = () => useMobileStore(
  useShallow(state => ({
    notifications: state.notifications,
    isLoading: state.isNotificationsLoading,
    isStale: state.areNotificationsStale,
    setNotifications: state.setNotifications,
    setLoading: state.setNotificationsLoading
  }))
)