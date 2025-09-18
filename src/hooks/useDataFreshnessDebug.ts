import { useEffect } from 'react'
import { DataFreshnessDebugger } from '@/utils/debugDataFreshness'

/**
 * Hook to enable data freshness debugging for a component
 * Use this in components that use data fetching to track freshness
 */
export function useDataFreshnessDebug(key: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  useEffect(() => {
    if (!enabled) return

    // Track component mount/unmount
    console.log(`[DataFreshness] Component mounted: ${key}`)

    return () => {
      console.log(`[DataFreshness] Component unmounted: ${key}`)
    }
  }, [key, enabled])

  return {
    /**
     * Track a data fetch operation
     */
    trackFetch: (subKey?: string, staleTime?: number) => {
      if (!enabled) return
      const fullKey = subKey ? `${key}-${subKey}` : key
      DataFreshnessDebugger.trackFetch(fullKey, staleTime)
    },

    /**
     * Track data staleness detection
     */
    trackStaleness: (subKey?: string) => {
      if (!enabled) return
      const fullKey = subKey ? `${key}-${subKey}` : key
      DataFreshnessDebugger.trackStaleness(fullKey)
    },

    /**
     * Get freshness info for this component
     */
    getFreshnessInfo: (subKey?: string) => {
      if (!enabled) return null
      const fullKey = subKey ? `${key}-${subKey}` : key
      return DataFreshnessDebugger.getInfo(fullKey)
    },

    /**
     * Print a report for this component's data
     */
    printReport: () => {
      if (!enabled) return
      console.group(`[DataFreshness] Report for ${key}`)
      const info = DataFreshnessDebugger.getInfo(key)
      if (info) {
        console.log(info)
      } else {
        console.log('No data tracked for this component')
      }
      console.groupEnd()
    }
  }
}

export default useDataFreshnessDebug