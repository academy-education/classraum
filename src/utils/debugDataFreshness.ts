/**
 * Debug utilities for data freshness tracking
 * These tools help identify data refresh issues during development
 */

interface DataFreshnessInfo {
  key: string
  lastFetched: number | null
  age: number
  isStale: boolean
  staleTime: number
  lastUpdate: string
}

// Enable debug mode via localStorage or environment variable
const isDebugMode = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('debug-data-freshness') === 'true' ||
         process.env.NODE_ENV === 'development'
}

// Track data freshness across the app
const dataFreshnessTracker = new Map<string, DataFreshnessInfo>()

export const DataFreshnessDebugger = {
  /**
   * Track data fetching for debugging
   */
  trackFetch: (key: string, staleTime: number = 5 * 60 * 1000) => {
    if (!isDebugMode()) return

    const now = Date.now()
    const info: DataFreshnessInfo = {
      key,
      lastFetched: now,
      age: 0,
      isStale: false,
      staleTime,
      lastUpdate: new Date(now).toISOString()
    }

    dataFreshnessTracker.set(key, info)
    console.log(`[DataFreshness] Tracked fetch for ${key}:`, info)
  },

  /**
   * Track data staleness
   */
  trackStaleness: (key: string) => {
    if (!isDebugMode()) return

    const info = dataFreshnessTracker.get(key)
    if (!info) return

    const now = Date.now()
    const age = info.lastFetched ? now - info.lastFetched : Infinity
    const isStale = age > info.staleTime

    const updatedInfo = {
      ...info,
      age,
      isStale,
      lastUpdate: new Date().toISOString()
    }

    dataFreshnessTracker.set(key, updatedInfo)

    if (isStale) {
      console.warn(`[DataFreshness] Data is stale for ${key}:`, {
        age: Math.round(age / 1000),
        staleTime: Math.round(info.staleTime / 1000),
        staleSinceSeconds: Math.round((age - info.staleTime) / 1000)
      })
    }
  },

  /**
   * Get all tracked data freshness info
   */
  getAllInfo: (): Record<string, DataFreshnessInfo> => {
    if (!isDebugMode()) return {}

    const result: Record<string, DataFreshnessInfo> = {}
    dataFreshnessTracker.forEach((info, key) => {
      const now = Date.now()
      const age = info.lastFetched ? now - info.lastFetched : Infinity

      result[key] = {
        ...info,
        age,
        isStale: age > info.staleTime
      }
    })

    return result
  },

  /**
   * Get freshness info for a specific key
   */
  getInfo: (key: string): DataFreshnessInfo | null => {
    if (!isDebugMode()) return null

    const info = dataFreshnessTracker.get(key)
    if (!info) return null

    const now = Date.now()
    const age = info.lastFetched ? now - info.lastFetched : Infinity

    return {
      ...info,
      age,
      isStale: age > info.staleTime
    }
  },

  /**
   * Clear all tracking data
   */
  clear: () => {
    dataFreshnessTracker.clear()
  },

  /**
   * Print freshness report to console
   */
  printReport: () => {
    if (!isDebugMode()) return

    const allInfo = DataFreshnessDebugger.getAllInfo()
    const entries = Object.entries(allInfo)

    if (entries.length === 0) {
      console.log('[DataFreshness] No data being tracked')
      return
    }

    console.group('[DataFreshness] Freshness Report')

    entries.forEach(([key, info]) => {
      const style = info.isStale ? 'color: #ff6b6b; font-weight: bold' : 'color: #51cf66'
      console.log(
        `%c${key}: ${info.isStale ? 'STALE' : 'FRESH'} (${Math.round(info.age / 1000)}s old)`,
        style,
        {
          lastFetched: new Date(info.lastFetched || 0).toISOString(),
          ageSeconds: Math.round(info.age / 1000),
          staleTimeSeconds: Math.round(info.staleTime / 1000)
        }
      )
    })

    console.groupEnd()
  },

  /**
   * Enable debug mode
   */
  enable: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-data-freshness', 'true')
      console.log('[DataFreshness] Debug mode enabled')
    }
  },

  /**
   * Disable debug mode
   */
  disable: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debug-data-freshness')
      console.log('[DataFreshness] Debug mode disabled')
    }
  }
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).DataFreshnessDebugger = DataFreshnessDebugger
}

export default DataFreshnessDebugger