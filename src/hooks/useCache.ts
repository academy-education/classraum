import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheConfig {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of cached items
  staleWhileRevalidate?: boolean // Return stale data while fetching fresh data
}

interface CacheItem<T> {
  data: T
  timestamp: number
  isStale: boolean
}

class Cache<T> {
  private cache = new Map<string, CacheItem<T>>()
  private config: Required<CacheConfig>

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 100,
      staleWhileRevalidate: config.staleWhileRevalidate ?? true
    }
  }

  set(key: string, data: T): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      isStale: false
    })
  }

  get(key: string): CacheItem<T> | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    const isExpired = now - item.timestamp > this.config.ttl

    if (isExpired) {
      if (this.config.staleWhileRevalidate) {
        return { ...item, isStale: true }
      } else {
        this.cache.delete(key)
        return null
      }
    }

    return item
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }
}

// Global cache instances
const dataCache = new Cache<any>({ ttl: 5 * 60 * 1000 }) // 5 minutes
const queryCache = new Cache<any>({ ttl: 2 * 60 * 1000 }) // 2 minutes

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)
  
  const cache = useRef(new Cache<T>(config))
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    const cacheKey = `${key}-${JSON.stringify(config)}`
    
    // Check cache first
    if (!forceRefresh) {
      const cachedItem = cache.current.get(cacheKey)
      if (cachedItem) {
        setData(cachedItem.data)
        setIsStale(cachedItem.isStale)
        
        // If data is stale but we have it, return it and fetch fresh data in background
        if (cachedItem.isStale && config.staleWhileRevalidate) {
          // Continue to fetch fresh data below
        } else {
          setIsLoading(false)
          setError(null)
          return cachedItem.data
        }
      }
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return
      }

      cache.current.set(cacheKey, result)
      setData(result)
      setIsStale(false)
      setError(null)
      
      return result
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      
      // If we have stale data, keep showing it despite the error
      const cachedItem = cache.current.get(cacheKey)
      if (!cachedItem) {
        setData(null)
      }
      
      throw error
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [key, fetcher, config])

  const invalidate = useCallback(() => {
    const cacheKey = `${key}-${JSON.stringify(config)}`
    cache.current.invalidate(cacheKey)
    setData(null)
    setIsStale(false)
  }, [key, config])

  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Initial fetch
  useEffect(() => {
    fetchData()
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    isStale,
    refresh,
    invalidate
  }
}

export function useCacheInvalidation() {
  const invalidatePattern = useCallback((pattern: string) => {
    // This would need to be implemented based on your cache key patterns
    dataCache.clear() // For now, clear all
    queryCache.clear()
  }, [])

  const invalidateKey = useCallback((key: string) => {
    dataCache.invalidate(key)
    queryCache.invalidate(key)
  }, [])

  return {
    invalidatePattern,
    invalidateKey,
    clearAll: () => {
      dataCache.clear()
      queryCache.clear()
    }
  }
}