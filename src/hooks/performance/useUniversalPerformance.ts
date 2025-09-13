/**
 * Universal Performance Hook
 * 
 * Provides standardized performance monitoring and caching for any page or component.
 * Combines smart caching, performance monitoring, and universal cache management.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSmartCache } from './useSmartCache'
import { usePerformanceMonitor } from './usePerformanceMonitor'
import { CacheCategory, CacheUtils, universalCache } from '@/lib/universal-cache'

interface UseUniversalPerformanceOptions<T> {
  /** Cache category for organized management */
  category: CacheCategory
  /** Academy ID for cache isolation */
  academyId: string
  /** Unique identifier for this specific data (optional) */
  identifier?: string
  /** Function to fetch fresh data */
  fetchFn: () => Promise<T>
  /** Cache TTL in milliseconds (default: 2 minutes) */
  ttl?: number
  /** Enable performance monitoring (default: true) */
  enableMonitoring?: boolean
  /** Enable smart caching (default: true) */
  enableCaching?: boolean
  /** Dependencies that trigger refetch when changed */
  dependencies?: any[]
  /** Callback when cache hit occurs */
  onCacheHit?: (data: T) => void
  /** Callback when cache miss occurs */
  onCacheMiss?: () => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

export function useUniversalPerformance<T>({
  category,
  academyId,
  identifier,
  fetchFn,
  ttl = 2 * 60 * 1000, // 2 minutes default
  enableMonitoring = true,
  enableCaching = true,
  dependencies = [],
  onCacheHit,
  onCacheMiss,
  onError
}: UseUniversalPerformanceOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Generate standardized cache key
  const cacheKey = CacheUtils.key(category, academyId, identifier)

  // Initialize performance monitoring
  const performance = usePerformanceMonitor({
    key: cacheKey,
    enabled: enableMonitoring
  })

  // Instrumented fetch function with performance tracking
  const instrumentedFetchFn = useCallback(async (): Promise<T> => {
    if (!enableMonitoring) {
      return await fetchFn()
    }

    performance.startMeasurement()
    
    try {
      // For complex data fetching, we need to track queries within the fetchFn
      const result = await fetchFn()
      performance.endMeasurement(false)
      return result
    } catch (error) {
      performance.endMeasurement(false)
      throw error
    }
  }, [fetchFn, performance, enableMonitoring])

  // Initialize smart cache
  const cache = useSmartCache({
    key: cacheKey,
    fetchFn: instrumentedFetchFn,
    ttl,
    enabled: enableCaching && !!academyId,
    onCacheHit: (data) => {
      console.log(`[UniversalPerformance] Cache hit: ${category}`)
      setData(data)
      setLoading(false)
      onCacheHit?.(data)
    },
    onCacheMiss: () => {
      console.log(`[UniversalPerformance] Cache miss: ${category}`)
      setLoading(true)
      onCacheMiss?.()
    },
    onError: (error) => {
      console.error(`[UniversalPerformance] Cache error for ${category}:`, error)
      setData(null)
      setError(error)
      setLoading(false)
      onError?.(error)
    }
  })

  // Fetch function that works with or without caching
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null)
      
      if (enableCaching) {
        const result = await cache.fetchData(forceRefresh)
        setData(result)
        return result
      } else {
        setLoading(true)
        const result = await instrumentedFetchFn()
        setData(result)
        setLoading(false)
        return result
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed')
      setError(error)
      setData(null)
      setLoading(false)
      onError?.(error)
      throw error
    }
  }, [cache, instrumentedFetchFn, enableCaching, onError])

  // Refresh function that bypasses cache
  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Invalidate cache for this specific data
  const invalidateCache = useCallback(() => {
    if (enableCaching) {
      cache.invalidateCache()
    }
    CacheUtils.onDataModified(category, academyId)
    console.log(`[UniversalPerformance] Cache invalidated: ${category}`)
  }, [cache, category, academyId, enableCaching])

  // Invalidate all related cache entries
  const invalidateRelatedCaches = useCallback(() => {
    universalCache.invalidateCategory(category, academyId)
  }, [category, academyId])

  // Sync loading state with cache when caching is enabled
  useEffect(() => {
    if (enableCaching) {
      setLoading(cache.loading)
    }
  }, [cache.loading, enableCaching])

  // Sync data with cache when caching is enabled
  useEffect(() => {
    if (enableCaching && cache.data) {
      setData(cache.data)
    }
  }, [cache.data, enableCaching])

  // Auto-fetch on dependency changes
  useEffect(() => {
    if (academyId) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId, ...dependencies])

  // Memoized return object with all utilities
  const result = useMemo(() => ({
    // Core data
    data,
    loading,
    error,
    
    // Actions
    fetchData,
    refresh,
    invalidateCache,
    invalidateRelatedCaches,
    
    // Performance metrics (only available when monitoring is enabled)
    performanceMetrics: enableMonitoring ? performance.metrics : null,
    averageLoadTime: enableMonitoring ? performance.getAverageLoadTime() : null,
    cacheHitRate: enableMonitoring ? performance.getCacheHitRate() : null,
    
    // Cache utilities (only available when caching is enabled)
    cacheInfo: enableCaching ? cache.getCacheInfo() : null,
    isCached: enableCaching ? cache.isCached() : null,
    cacheAge: enableCaching ? cache.cacheAge() : null,
    
    // System info
    cacheKey,
    category,
    
    // Global cache utilities
    warmCache: () => universalCache.warmCache(academyId, [category]),
    getCacheMetrics: () => universalCache.getMetrics(),
    invalidateAcademy: () => universalCache.invalidateAcademy(academyId)
  }), [
    data,
    loading,
    error,
    fetchData,
    refresh,
    invalidateCache,
    invalidateRelatedCaches,
    performance,
    cache,
    enableMonitoring,
    enableCaching,
    cacheKey,
    category,
    academyId
  ])

  return result
}

/**
 * Simplified hook for common use cases
 */
export function usePagePerformanceSimple<T>(
  category: CacheCategory,
  academyId: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  return useUniversalPerformance({
    category,
    academyId,
    fetchFn,
    dependencies,
    enableMonitoring: true,
    enableCaching: true
  })
}