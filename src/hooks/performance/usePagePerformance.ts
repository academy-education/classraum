import { useState, useCallback, useRef, useEffect } from 'react'
import { usePerformanceMonitor } from './usePerformanceMonitor'

interface UsePagePerformanceOptions<T> {
  queryFn: () => Promise<T>
  cacheKey: string
  dependencies?: any[]
  cacheTTL?: number
  enabled?: boolean
}

interface CachedData<T> {
  data: T
  timestamp: number
}

export function usePagePerformance<T>({
  queryFn,
  cacheKey,
  dependencies = [],
  cacheTTL = 2 * 60 * 1000, // 2 minutes default
  enabled = true
}: UsePagePerformanceOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<Error | null>(null)
  
  const performance = usePerformanceMonitor({ 
    key: cacheKey,
    enabled: true 
  })

  const getCachedData = useCallback((): CachedData<T> | null => {
    try {
      const cached = sessionStorage.getItem(cacheKey)
      const timestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)
      
      if (cached && timestamp) {
        const timeDiff = Date.now() - parseInt(timestamp)
        if (timeDiff < cacheTTL) {
          return {
            data: JSON.parse(cached),
            timestamp: parseInt(timestamp)
          }
        }
      }
      return null
    } catch {
      return null
    }
  }, [cacheKey, cacheTTL])

  const setCachedData = useCallback((data: T) => {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(data))
      sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
    } catch (error) {
      console.warn('[Performance] Failed to cache data:', error)
    }
  }, [cacheKey])

  const invalidateCache = useCallback(() => {
    try {
      sessionStorage.removeItem(cacheKey)
      sessionStorage.removeItem(`${cacheKey}-timestamp`)
      console.log(`[Performance] Cache invalidated for ${cacheKey}`)
    } catch (error) {
      console.warn('[Performance] Failed to invalidate cache:', error)
    }
  }, [cacheKey])

  const fetchData = useCallback(async (skipCache: boolean = false) => {
    if (!enabled) return

    try {
      setError(null)
      performance.startMeasurement()
      
      // Check cache first unless explicitly skipping
      if (!skipCache) {
        const cached = getCachedData()
        if (cached) {
          console.log(`[Performance] Loading ${cacheKey} from cache`)
          setData(cached.data)
          setLoading(false)
          performance.endMeasurement(true) // Mark as cache hit
          return cached.data
        }
      }

      // Fetch fresh data
      setLoading(true)
      const result = await queryFn()
      
      setData(result)
      setCachedData(result)
      performance.endMeasurement(false) // Not a cache hit
      
      console.log(`[Performance] Fresh data loaded and cached for ${cacheKey}`)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error(`[Performance] Error fetching ${cacheKey}:`, error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [enabled, queryFn, cacheKey, getCachedData, setCachedData, performance])

  const refetch = useCallback(() => {
    return fetchData(true) // Skip cache on manual refetch
  }, [fetchData])

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    fetchData()
  }, [enabled, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch,
    invalidateCache,
    performanceMetrics: performance.metrics,
    averageLoadTime: performance.getAverageLoadTime(),
    cacheHitRate: performance.getCacheHitRate(),
    // Utility functions
    isCached: useCallback(() => getCachedData() !== null, [getCachedData]),
    getCacheAge: useCallback(() => {
      const cached = getCachedData()
      return cached ? Date.now() - cached.timestamp : null
    }, [getCachedData])
  }
}