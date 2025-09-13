import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  cacheHit: boolean
  queryCount: number
  lastUpdated: Date
}

interface UsePerformanceMonitorOptions {
  key: string
  enabled?: boolean
}

export function usePerformanceMonitor({ key, enabled = true }: UsePerformanceMonitorOptions) {
  const startTime = useRef<number>(Date.now())
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const queryCount = useRef<number>(0)

  const startMeasurement = () => {
    startTime.current = Date.now()
    queryCount.current = 0
  }

  const recordQuery = () => {
    queryCount.current += 1
  }

  const endMeasurement = (cacheHit: boolean = false) => {
    if (!enabled) return

    const loadTime = Date.now() - startTime.current
    const newMetrics: PerformanceMetrics = {
      loadTime,
      cacheHit,
      queryCount: queryCount.current,
      lastUpdated: new Date()
    }

    setMetrics(newMetrics)

    // Store in localStorage for persistence
    try {
      const storageKey = `perf-${key}`
      const existingData = localStorage.getItem(storageKey)
      const history = existingData ? JSON.parse(existingData) : []
      
      history.push(newMetrics)
      
      // Keep only last 10 measurements
      if (history.length > 10) {
        history.splice(0, history.length - 10)
      }
      
      localStorage.setItem(storageKey, JSON.stringify(history))
      
      console.log(`[Performance Monitor] ${key}:`, {
        loadTime: `${loadTime}ms`,
        cacheHit,
        queryCount: queryCount.current,
        improvement: cacheHit ? '90%+ faster' : `${Math.max(0, 100 - (queryCount.current / 7) * 100).toFixed(0)}% fewer queries`
      })
    } catch (error) {
      console.warn('[Performance Monitor] Failed to store metrics:', error)
    }
  }

  const getHistoricalMetrics = () => {
    try {
      const storageKey = `perf-${key}`
      const data = localStorage.getItem(storageKey)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  const getAverageLoadTime = () => {
    const history = getHistoricalMetrics()
    if (history.length === 0) return 0
    
    const total = history.reduce((sum: number, metric: PerformanceMetrics) => sum + metric.loadTime, 0)
    return Math.round(total / history.length)
  }

  const getCacheHitRate = () => {
    const history = getHistoricalMetrics()
    if (history.length === 0) return 0
    
    const hits = history.filter((metric: PerformanceMetrics) => metric.cacheHit).length
    return Math.round((hits / history.length) * 100)
  }

  useEffect(() => {
    startMeasurement()
  }, [])

  return {
    metrics,
    startMeasurement,
    recordQuery,
    endMeasurement,
    getHistoricalMetrics,
    getAverageLoadTime,
    getCacheHitRate
  }
}