import { supabase } from '@/lib/supabase'
import { useMobileStore } from '@/stores/mobileStore'

// UI update notification system
type CacheUpdateListener = (key: string, newData: any) => void
const cacheUpdateListeners = new Map<string, Set<CacheUpdateListener>>()

export const subscribeToCacheUpdates = (key: string, listener: CacheUpdateListener) => {
  if (!cacheUpdateListeners.has(key)) {
    cacheUpdateListeners.set(key, new Set())
  }
  cacheUpdateListeners.get(key)!.add(listener)

  // Return unsubscribe function
  return () => {
    const listeners = cacheUpdateListeners.get(key)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        cacheUpdateListeners.delete(key)
      }
    }
  }
}

const notifyCacheUpdate = (key: string, newData: any) => {
  const listeners = cacheUpdateListeners.get(key)
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(key, newData)
      } catch (error) {
        console.warn('Error in cache update listener:', error)
      }
    })
  }
}

// Teacher names caching utility
export const getTeacherNamesWithCache = async (teacherIds: string[]): Promise<Map<string, string>> => {
  const store = useMobileStore.getState()
  const cache = store.teacherNamesCache
  
  // Filter out already cached teacher IDs
  const uncachedIds = teacherIds.filter(id => !cache[id])
  
  const result = new Map<string, string>()
  
  // Add cached names to result
  teacherIds.forEach(id => {
    if (cache[id]) {
      result.set(id, cache[id])
    }
  })
  
  // Fetch uncached names
  if (uncachedIds.length > 0) {
    try {
      const { data: teacherData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', uncachedIds)
      
      if (teacherData) {
        const newCache: Record<string, string> = {}
        teacherData.forEach((teacher: {
          id: string
          name?: string
        }) => {
          const name = teacher.name || 'Unknown Teacher'
          result.set(teacher.id, name)
          newCache[teacher.id] = name
        })
        
        // Update cache
        store.setTeacherNamesCache(newCache)
      }
    } catch (error) {
      console.warn('Error fetching teacher names:', error)
    }
  }
  
  return result
}

// Stale-while-revalidate pattern for data fetching
export const staleWhileRevalidate = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    staleTime?: number
    cacheTime?: number
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
  } = {}
): Promise<T> => {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 60 * 60 * 1000, // 1 hour
    onSuccess,
    onError
  } = options

  // Check if we have cached data in sessionStorage (standardized)
  const cacheKey = `mobile-cache-${key}`
  const cachedItem = sessionStorage.getItem(cacheKey)
  
  let cachedData: { data: T; timestamp: number } | null = null
  
  if (cachedItem) {
    try {
      cachedData = JSON.parse(cachedItem)
    } catch (error) {
      console.warn('Failed to parse cached data for', key, error)
      sessionStorage.removeItem(cacheKey)
    }
  }
  
  const now = Date.now()
  
  // If we have fresh cached data, return it
  if (cachedData && (now - cachedData.timestamp) < staleTime) {
    console.log(`Using fresh cached data for ${key}`)
    return cachedData.data
  }
  
  // If we have stale cached data, return it but revalidate in background
  if (cachedData && (now - cachedData.timestamp) < cacheTime) {
    console.log(`Using stale cached data for ${key}, revalidating...`)
    
    // Background revalidation
    fetchFn()
      .then(newData => {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: newData,
          timestamp: Date.now()
        }))
        // Notify UI components of cache update
        notifyCacheUpdate(key, newData)
        onSuccess?.(newData)
      })
      .catch(error => {
        console.warn(`Background revalidation failed for ${key}:`, error)
        onError?.(error)
      })
    
    return cachedData.data
  }
  
  // No cache or cache expired, fetch fresh data
  console.log(`Fetching fresh data for ${key}`)
  try {
    const freshData = await fetchFn()
    
    // Cache the fresh data
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: Date.now()
    }))
    
    onSuccess?.(freshData)
    return freshData
  } catch (error) {
    console.error(`Failed to fetch fresh data for ${key}:`, error)
    
    // If we have any cached data (even expired), return it as fallback
    if (cachedData) {
      console.log(`Returning expired cache as fallback for ${key}`)
      return cachedData.data
    }
    
    onError?.(error as Error)
    throw error
  }
}

// Prefetch data for better UX
export const prefetchMobileData = async (user: { userId: string; academyId: string }) => {
  const prefetchTasks = [
    // Prefetch dashboard data
    async () => {
      console.log('Prefetching dashboard data...')
      return await fetchDashboardDataOptimized(user)
    }
  ]
  
  // Run prefetch tasks in parallel with error handling
  const results = await Promise.allSettled(
    prefetchTasks.map(task => 
      staleWhileRevalidate(
        `prefetch-${task.name}`,
        task,
        { staleTime: 2 * 60 * 1000 } // 2 minutes for prefetch
      )
    )
  )
  
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Prefetch task ${index} failed:`, result.reason)
    }
  })
}

// Optimized fetch functions that can be reused
export const fetchDashboardDataOptimized = async (user: { userId: string; academyId: string }) => {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  const [todaySessionsResult, , ] = await Promise.all([
    supabase
      .from('classroom_sessions')
      .select(`
        id,
        classrooms!inner(
          id,
          academy_id,
          classroom_students!inner(student_id)
        )
      `)
      .eq('date', today)
      .eq('status', 'scheduled')
      .eq('classrooms.academy_id', user.academyId)
      .eq('classrooms.classroom_students.student_id', user.userId),

    supabase
      .from('classroom_sessions')
      .select(`
        id,
        date,
        start_time,
        end_time,
        classrooms!inner(
          id,
          name,
          color,
          academy_id,
          teacher_id,
          classroom_students!inner(student_id)
        )
      `)
      .gte('date', today)
      .lte('date', nextWeek)
      .eq('status', 'scheduled')
      .eq('classrooms.academy_id', user.academyId)
      .eq('classrooms.classroom_students.student_id', user.userId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(5),

    supabase
      .from('classroom_students')
      .select(`
        classroom_id,
        classrooms!inner(
          id,
          academy_id,
          classroom_sessions!inner(
            id,
            assignments!inner(
              id,
              due_date,
              assignment_grades(
                student_id,
                status
              )
            )
          )
        )
      `)
      .eq('student_id', user.userId)
      .eq('classrooms.academy_id', user.academyId)
  ])

  // Process and return dashboard data...
  return {
    todaysClassCount: (todaySessionsResult.data || []).length,
    upcomingSessions: [], // Process upcoming sessions here
    pendingAssignmentsCount: 0, // Process assignments here
    invoices: [], // Add invoices field
    lastUpdated: Date.now(),
    cacheVersion: 0 // Will be updated by the store
  }
}

export const fetchAssignmentsOptimized = async (__user: { userId: string; academyId: string }) => { /* eslint-disable-line @typescript-eslint/no-unused-vars */
  // Implementation similar to the assignments page optimization
  return []
}

export const fetchGradesOptimized = async (__user: { userId: string; academyId: string }) => { /* eslint-disable-line @typescript-eslint/no-unused-vars */
  // Implementation similar to the grades optimization
  return []
}

// Cache invalidation utilities
export const invalidateCache = (patterns: string[]) => {
  const keys = Object.keys(sessionStorage)
  keys.forEach(key => {
    if (patterns.some(pattern => key.includes(pattern))) {
      sessionStorage.removeItem(key)
      console.log(`Invalidated cache for ${key}`)
    }
  })
}

export const clearMobileCache = () => {
  invalidateCache(['mobile-cache-', 'mobile-app-storage'])
  useMobileStore.getState().clearAllCache()
  console.log('All mobile cache cleared')
}