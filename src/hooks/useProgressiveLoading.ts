import { useState, useCallback, useEffect, useRef } from 'react'

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
    setState(prev => ({
      ...prev,
      data,
      isLoading: false,
      isError: false,
      error: null,
      lastFetched: Date.now(),
      isStale: false
    }))
    setRetryCount(0)
  }, [])

  const refetch = useCallback(async () => {
    // Check staleness inline to avoid dependency issues
    const currentIsStale = !state.lastFetched || Date.now() - state.lastFetched > staleTime
    
    // If we have data and it's not stale, return early for better UX
    if (state.data && !currentIsStale && !state.isError) {
      console.log('Data is fresh, skipping refetch')
      return
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      isError: false, 
      error: null 
    }))

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
  }, [fetchFn, state.data, state.isError, state.lastFetched, staleTime, retryCount, errorRetryCount, setData])

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
): ProgressiveLoadingState<T> & ProgressiveLoadingActions<T> {
  const {
    backgroundRefresh = true,
    refreshInterval = 30000, // 30 seconds
    ...loadingOptions
  } = options

  const progressive = useProgressiveLoading(fetchFn, loadingOptions)

  // Background refresh logic
  useEffect(() => {
    if (!backgroundRefresh || !progressive.data) return

    const interval = setInterval(() => {
      if (document.hidden) return // Don't refresh when tab is not active
      
      // Silent background refresh - don't show loading state
      fetchFn().then(data => {
        progressive.setData(data)
      }).catch(error => {
        console.warn('Background refresh failed:', error)
      })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [backgroundRefresh, refreshInterval, progressive.data, fetchFn, progressive.setData, progressive])

  return progressive
}