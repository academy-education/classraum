import { useState, useCallback, useEffect, useRef } from 'react'
import { DataFreshnessDebugger } from '@/utils/debugDataFreshness'

// Enhanced tab switch detection system
if (typeof window !== 'undefined') {
  // Track visibility changes with more context
  (window as any).tabSwitchTracker = {
    lastVisibilityChange: 0,
    isReturningFromTab: false,
    gracePeriodMs: 3000, // 3 second grace period

    checkIfReturningFromTab: () => {
      const now = Date.now()
      const timeSinceVisibilityChange = now - (window as any).tabSwitchTracker.lastVisibilityChange
      return document.visibilityState === 'visible' && timeSinceVisibilityChange < (window as any).tabSwitchTracker.gracePeriodMs
    }
  }

  document.addEventListener('visibilitychange', () => {
    const tracker = (window as any).tabSwitchTracker
    tracker.lastVisibilityChange = Date.now()

    if (document.visibilityState === 'visible') {
      tracker.isReturningFromTab = true
      // Clear flag after grace period
      setTimeout(() => {
        tracker.isReturningFromTab = false
      }, tracker.gracePeriodMs)
    }
  })
}

// Custom hook for tracking component mount status
function useIsMounted() {
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return useCallback(() => isMountedRef.current, [])
}

interface ProgressiveLoadingOptions {
  immediate?: boolean
  staleTime?: number
  errorRetryCount?: number
  timeout?: number
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
const DEFAULT_TIMEOUT = 30000 // 30 seconds

export function useProgressiveLoading<T>(
  fetchFn: () => Promise<T>,
  options: ProgressiveLoadingOptions = {}
): ProgressiveLoadingState<T> & ProgressiveLoadingActions<T> {
  const {
    immediate = false,
    staleTime = DEFAULT_STALE_TIME,
    errorRetryCount = 3,
    timeout = DEFAULT_TIMEOUT
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
  const isMounted = useIsMounted()
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function to cancel ongoing requests
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

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
    // Clean up previous request
    cleanup()

    if (!isMounted()) {
      return
    }

    setState(prev => {
      // Check staleness inline to avoid dependency issues
      const currentIsStale = !prev.lastFetched || Date.now() - prev.lastFetched > staleTime

      // If we have data and it's not stale, return early for better UX
      if (prev.data && !currentIsStale && !prev.isError) {
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
      // Create new AbortController for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        abortController.abort()
        if (isMounted()) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isError: true,
            error: new Error('Request timeout')
          }))
        }
      }, timeout)

      // Execute fetch with timeout and abort support
      const data = await Promise.race([
        fetchFn(),
        new Promise<never>((_, reject) => {
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Request aborted'))
          })
        })
      ])

      // Clear timeout on successful completion
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (isMounted()) {
        setData(data)
      }
    } catch (error) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Don't handle aborted requests as errors
      if (error instanceof Error && error.message === 'Request aborted') {
        return
      }

      if (!isMounted()) {
        return
      }

      console.error('Progressive loading error:', error)

      // Implement retry logic
      if (retryCount < errorRetryCount) {
        setRetryCount(prev => prev + 1)
        timeoutRef.current = setTimeout(() => {
          if (isMounted()) {
            refetch()
          }
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
  }, [fetchFn, staleTime, retryCount, errorRetryCount, setData, cleanup, isMounted, timeout])

  const reset = useCallback(() => {
    cleanup()
    setState({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isStale: false,
      lastFetched: null
    })
    setRetryCount(0)
  }, [cleanup])

  const invalidate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStale: true,
      lastFetched: 0
    }))
  }, [])

  // Trigger initial fetch if immediate is true
  useEffect(() => {
    if (immediate) {
      // Call refetch directly after a small delay
      const timeoutId = setTimeout(async () => {
        if (!isMounted()) {
          return
        }

        // Inline the fetch logic instead of calling refetch
        setState(prev => ({
          ...prev,
          isLoading: true,
          isError: false,
          error: null
        }))

        try {
          const data = await fetchFn()

          if (isMounted()) {
            setState({
              data,
              isLoading: false,
              isError: false,
              error: null,
              isStale: false,
              lastFetched: Date.now()
            })
          }
        } catch (error) {
          if (isMounted()) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              isError: true,
              error: error as Error
            }))
          }
        }
      }, 10)
      return () => clearTimeout(timeoutId)
    }
    // Only run once on mount when immediate is true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    ...state,
    isStale: isStale(),
    refetch,
    setData,
    reset,
    invalidate
  }
}

// Enhanced mobile data fetching with better error handling and auth guards
export function useMobileData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: ProgressiveLoadingOptions & {
    backgroundRefresh?: boolean
    refreshInterval?: number
    maxRetries?: number
    authRequired?: boolean
  } = {}
): ProgressiveLoadingState<T> & ProgressiveLoadingActions<T> & {
  isBackgroundRefreshing: boolean
  retryCount: number
  lastError: Error | null
} {
  const {
    backgroundRefresh = true,
    refreshInterval = 30000, // 30 seconds
    maxRetries = 3,
    authRequired = true,
    ...loadingOptions
  } = options

  const progressive = useProgressiveLoading(fetchFn, {
    ...loadingOptions,
    errorRetryCount: maxRetries
  })

  // Track background refresh state to avoid conflicts with user-triggered refreshes
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)

  // Background refresh logic with proper cleanup
  useEffect(() => {
    if (!backgroundRefresh || !progressive.data || progressive.isLoading || isBackgroundRefreshing) return

    let intervalActive = true
    let currentAbortController: AbortController | null = null

    const interval = setInterval(async () => {
      if (!intervalActive) return
      if (document.hidden) return // Don't refresh when tab is not active
      if (progressive.isLoading || isBackgroundRefreshing) return // Avoid concurrent refreshes

      // Enhanced tab switch protection
      const tracker = (window as any).tabSwitchTracker
      if (tracker && tracker.checkIfReturningFromTab()) {
        console.log(`[useMobileData:${key}] Skipping background refresh: returning from tab switch`)
        return
      }

      // Check if data is still fresh according to stale time
      const now = Date.now()
      const dataAge = progressive.lastFetched ? now - progressive.lastFetched : Infinity
      const staleTimeMs = loadingOptions.staleTime || 5 * 60 * 1000 // Default 5 minutes

      if (dataAge < staleTimeMs) {
        console.log(`[useMobileData:${key}] Background refresh skipped: data is still fresh (${Math.round(dataAge / 1000)}s old)`)
        return
      }

      try {
        if (!intervalActive) return // Check again before starting request

        setIsBackgroundRefreshing(true)

        // Create abort controller for this background request
        currentAbortController = new AbortController()
        const timeoutId = setTimeout(() => {
          if (currentAbortController) {
            currentAbortController.abort()
          }
        }, loadingOptions.timeout || 30000) // 30 second timeout

        console.log(`[useMobileData:${key}] Background refresh triggered (data is ${Math.round(dataAge / 1000)}s old)`)

        const data = await Promise.race([
          fetchFn(),
          new Promise<never>((_, reject) => {
            if (currentAbortController) {
              currentAbortController.signal.addEventListener('abort', () => {
                reject(new Error('Background refresh aborted'))
              })
            }
          })
        ])

        clearTimeout(timeoutId)

        if (!intervalActive) return // Check if still active after async operation

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
        // Don't log aborted requests as errors
        if (error instanceof Error && error.message.includes('aborted')) {
          return
        }
        console.warn(`[useMobileData:${key}] Background refresh failed:`, error)
        if (intervalActive) {
          setLastError(error as Error)
          setRetryCount(prev => prev + 1)
        }
        // Don't update data on error - keep existing data
      } finally {
        if (intervalActive) {
          setIsBackgroundRefreshing(false)
        }
        currentAbortController = null
      }
    }, refreshInterval)

    return () => {
      intervalActive = false
      if (currentAbortController) {
        currentAbortController.abort()
      }
      clearInterval(interval)
    }
  }, [backgroundRefresh, refreshInterval, progressive.data, progressive.isLoading, progressive.lastFetched, fetchFn, progressive.setData, loadingOptions.staleTime, loadingOptions.timeout, isBackgroundRefreshing, key, progressive])

  // Track staleness for debugging
  useEffect(() => {
    if (progressive.data && progressive.isStale) {
      DataFreshnessDebugger.trackStaleness(`mobile-${key}`)
    }
  }, [progressive.isStale, progressive.data, key])

  // Enhanced refetch with retry logic
  const enhancedRefetch = useCallback(async () => {
    try {
      setLastError(null)
      setRetryCount(0)
      await progressive.refetch()
    } catch (error) {
      setLastError(error as Error)
      throw error
    }
  }, [progressive.refetch])

  return {
    ...progressive,
    isBackgroundRefreshing,
    retryCount,
    lastError,
    refetch: enhancedRefetch
  }
}