import { useState, useCallback, useEffect, useRef } from 'react'
import { DataFreshnessDebugger } from '@/utils/debugDataFreshness'

interface ProgressiveLoadingOptions {
  immediate?: boolean
  staleTime?: number
  errorRetryCount?: number
}

interface ProgressiveLoadingState<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  isStale: boolean
  lastFetched: number | null
}

interface ProgressiveLoadingActions<T> {
  refetch: () => Promise<void>
  setData: (data: T) => void
  reset: () => void
  invalidate: () => void
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function useProgressiveLoading<T>(
  fetchFn: () => Promise<T>,
  options: ProgressiveLoadingOptions = {}
): ProgressiveLoadingState<T> & ProgressiveLoadingActions<T> {
  const {
    immediate = false,
    staleTime = DEFAULT_STALE_TIME,
    errorRetryCount = 3
  } = options

  const [state, setState] = useState<ProgressiveLoadingState<T>>({
    data: null,
    isLoading: immediate,
    isError: false,
    error: null,
    isStale: false,
    lastFetched: null
  })

  const [retryCount, setRetryCount] = useState(0)
  const mountTimeRef = useRef(Date.now())

  const isStale = useCallback(() => {
    if (!state.lastFetched) return true
    return Date.now() - state.lastFetched > staleTime
  }, [state.lastFetched, staleTime])

  const setData = useCallback((data: T) => {
    const now = Date.now()
    setState(prev => ({
      ...prev,
      data,
      isLoading: false,
      isError: false,
      error: null,
      lastFetched: now,
      isStale: false
    }))
    setRetryCount(0)

    // Debug tracking
    DataFreshnessDebugger.trackFetch(`progressive-${mountTimeRef.current}`, staleTime)
  }, [staleTime])

  const refetch = useCallback(async () => {
    setState(prev => {
      // Check staleness inline to avoid dependency issues
      const currentIsStale = !prev.lastFetched || Date.now() - prev.lastFetched > staleTime

      // If we have data and it's not stale, return early for better UX
      if (prev.data && !currentIsStale && !prev.isError) {
        console.log('Data is fresh, skipping refetch')
        return prev // No state change
      }

      return {
        ...prev,
        isLoading: true,
        isError: false,
        error: null
      }
    })

    try {
      const data = await fetchFn()
      setData(data)
    } catch (error) {
      console.error('Progressive loading error:', error)

      // Implement retry logic
      if (retryCount < errorRetryCount) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          refetch()
        }, Math.pow(2, retryCount) * 1000) // Exponential backoff
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: error as Error
        }))
      }
    }
  }, [fetchFn, staleTime, retryCount, errorRetryCount, setData])

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isStale: false,
      lastFetched: null
    })
    setRetryCount(0)
  }, [])

  const invalidate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStale: true,
      lastFetched: 0
    }))
  }, [])

  // Trigger initial fetch if immediate is true
  useEffect(() => {
    if (immediate && !state.data) {
      console.log('Triggering initial fetch for mount time:', mountTimeRef.current)
      // Use setTimeout to avoid setState during render
      const timeoutId = setTimeout(() => {
        refetch()
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [immediate, state.data, refetch])

  return {
    ...state,
    isStale: isStale(),
    refetch,
    setData,
    reset,
    invalidate
  }
}

// Specialized hook for mobile data fetching with background refresh
export function useMobileData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: ProgressiveLoadingOptions & {
    backgroundRefresh?: boolean
    refreshInterval?: number
  } = {}
): ProgressiveLoadingState<T> & ProgressiveLoadingActions<T> & { isBackgroundRefreshing: boolean } {
  const {
    backgroundRefresh = true,
    refreshInterval = 30000, // 30 seconds
    ...loadingOptions
  } = options

  const progressive = useProgressiveLoading(fetchFn, loadingOptions)

  // Track background refresh state to avoid conflicts with user-triggered refreshes
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)

  // Background refresh logic
  useEffect(() => {
    if (!backgroundRefresh || !progressive.data || progressive.isLoading || isBackgroundRefreshing) return

    const interval = setInterval(async () => {
      if (document.hidden) return // Don't refresh when tab is not active
      if (progressive.isLoading || isBackgroundRefreshing) return // Avoid concurrent refreshes

      // Check if data is still fresh according to stale time
      const now = Date.now()
      const dataAge = progressive.lastFetched ? now - progressive.lastFetched : Infinity
      const staleTimeMs = loadingOptions.staleTime || 5 * 60 * 1000 // Default 5 minutes

      if (dataAge < staleTimeMs) {
        console.log(`[useMobileData:${key}] Background refresh skipped: data is still fresh (${Math.round(dataAge / 1000)}s old)`)
        return
      }

      try {
        setIsBackgroundRefreshing(true)
        // Silent background refresh - don't show loading state
        console.log(`[useMobileData:${key}] Background refresh triggered (data is ${Math.round(dataAge / 1000)}s old)`)
        const data = await fetchFn()

        // Only update if data has actually changed to prevent unnecessary re-renders
        if (JSON.stringify(data) !== JSON.stringify(progressive.data)) {
          console.log(`[useMobileData:${key}] Background refresh: data changed, updating`)
          progressive.setData(data)
          DataFreshnessDebugger.trackFetch(`mobile-${key}`, staleTimeMs)
        } else {
          console.log(`[useMobileData:${key}] Background refresh: no data changes`)
          // Still update lastFetched to reset staleness timer
          if (progressive.data) {
            progressive.setData(progressive.data)
          }
          DataFreshnessDebugger.trackFetch(`mobile-${key}`, staleTimeMs)
        }
      } catch (error) {
        console.warn(`[useMobileData:${key}] Background refresh failed:`, error)
        // Don't update data on error - keep existing data
      } finally {
        setIsBackgroundRefreshing(false)
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [backgroundRefresh, refreshInterval, progressive.data, progressive.isLoading, progressive.lastFetched, fetchFn, progressive.setData, loadingOptions.staleTime, isBackgroundRefreshing, key])

  // Track staleness for debugging
  useEffect(() => {
    if (progressive.data && progressive.isStale) {
      DataFreshnessDebugger.trackStaleness(`mobile-${key}`)
    }
  }, [progressive.isStale, progressive.data, key])

  return {
    ...progressive,
    isBackgroundRefreshing
  }
}