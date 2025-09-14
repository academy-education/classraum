import { useState, useCallback, useEffect } from 'react'

interface UseSmartCacheOptions<T> {
  key: string
  fetchFn: () => Promise<T>
  ttl?: number // Time to live in milliseconds
  enabled?: boolean
  onCacheHit?: (data: T) => void
  onCacheMiss?: () => void
  onError?: (error: Error) => void
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
}

// Global cache version for invalidating all caches
let globalCacheVersion = '1.0.0'

export function useSmartCache<T>({
  key,
  fetchFn,
  ttl = 2 * 60 * 1000, // 2 minutes default
  enabled = true,
  onCacheHit,
  onCacheMiss,
  onError
}: UseSmartCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const cacheKey = `smart-cache-${key}`
  const timestampKey = `${cacheKey}-timestamp`
  const versionKey = `${cacheKey}-version`

  const isValidCache = useCallback((entry: CacheEntry<T>): boolean => {
    const now = Date.now()
    const isExpired = (now - entry.timestamp) > ttl
    const isValidVersion = entry.version === globalCacheVersion
    
    return !isExpired && isValidVersion
  }, [ttl])

  const getFromCache = useCallback((): T | null => {
    try {
      const cached = sessionStorage.getItem(cacheKey)
      const timestamp = sessionStorage.getItem(timestampKey)
      const version = sessionStorage.getItem(versionKey)

      if (cached && timestamp && version) {
        const entry: CacheEntry<T> = {
          data: JSON.parse(cached),
          timestamp: parseInt(timestamp),
          version
        }

        if (isValidCache(entry)) {
          return entry.data
        }
      }
      return null
    } catch {
      return null
    }
  }, [cacheKey, timestampKey, versionKey, isValidCache])

  const setToCache = useCallback((data: T) => {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: globalCacheVersion
      }

      sessionStorage.setItem(cacheKey, JSON.stringify(entry.data))
      sessionStorage.setItem(timestampKey, entry.timestamp.toString())
      sessionStorage.setItem(versionKey, entry.version)
    } catch (error) {
      console.warn('[SmartCache] Failed to cache data:', error)
    }
  }, [cacheKey, timestampKey, versionKey])

  const invalidateCache = useCallback(() => {
    try {
      sessionStorage.removeItem(cacheKey)
      sessionStorage.removeItem(timestampKey)
      sessionStorage.removeItem(versionKey)
      console.log(`[SmartCache] Cache invalidated: ${key}`)
    } catch (error) {
      console.warn('[SmartCache] Failed to invalidate cache:', error)
    }
  }, [cacheKey, timestampKey, versionKey, key])

  const fetchData = useCallback(async (forceRefresh = false): Promise<T> => {
    if (!enabled) {
      throw new Error('Cache is disabled')
    }

    setError(null)

    try {
      // Check cache first unless forcing refresh
      if (!forceRefresh) {
        const cached = getFromCache()
        if (cached) {
          console.log(`[SmartCache] Cache hit: ${key}`)
          setData(cached)
          setLoading(false)
          onCacheHit?.(cached)
          return cached
        }
      }

      // Cache miss - fetch fresh data
      console.log(`[SmartCache] Cache miss: ${key}`)
      setLoading(true)
      onCacheMiss?.()

      const result = await fetchFn()
      
      setData(result)
      setToCache(result)
      setLastFetch(new Date())

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed')
      setError(error)
      onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [enabled, getFromCache, fetchFn, setToCache, key, onCacheHit, onCacheMiss, onError])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Fetch on mount and when enabled changes
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Cache utilities
  const getCacheInfo = useCallback(() => {
    try {
      const timestamp = sessionStorage.getItem(timestampKey)
      const version = sessionStorage.getItem(versionKey)
      
      if (timestamp && version) {
        const age = Date.now() - parseInt(timestamp)
        const remaining = Math.max(0, ttl - age)
        
        return {
          age,
          remaining,
          version,
          isValid: remaining > 0 && version === globalCacheVersion,
          expiresAt: new Date(parseInt(timestamp) + ttl)
        }
      }
      return null
    } catch {
      return null
    }
  }, [timestampKey, versionKey, ttl])

  return {
    data,
    loading,
    error,
    lastFetch,
    fetchData,
    refresh,
    invalidateCache,
    getCacheInfo,
    // Utilities
    isCached: useCallback(() => getFromCache() !== null, [getFromCache]),
    cacheAge: useCallback(() => {
      const info = getCacheInfo()
      return info ? info.age : null
    }, [getCacheInfo])
  }
}

// Global cache management
export const SmartCacheManager = {
  invalidateAll: () => {
    globalCacheVersion = Date.now().toString()
    console.log('[SmartCache] Global cache invalidated')
  },
  
  clearAll: () => {
    const keys = Object.keys(sessionStorage)
    keys.forEach(key => {
      if (key.startsWith('smart-cache-')) {
        sessionStorage.removeItem(key)
      }
    })
    console.log('[SmartCache] All caches cleared')
  },
  
  getStats: () => {
    const keys = Object.keys(sessionStorage)
    const cacheKeys = keys.filter(key => key.startsWith('smart-cache-'))
    const totalSize = cacheKeys.reduce((size, key) => {
      try {
        return size + (sessionStorage.getItem(key)?.length || 0)
      } catch {
        return size
      }
    }, 0)
    
    return {
      totalCaches: cacheKeys.length,
      totalSizeKB: Math.round(totalSize / 1024),
      version: globalCacheVersion
    }
  }
}