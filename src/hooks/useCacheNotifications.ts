import { useEffect, useCallback, useState } from 'react'
import { subscribeToCacheUpdates } from '@/utils/mobileCache'

/**
 * Hook to subscribe to cache update notifications
 * Automatically triggers UI updates when cached data is refreshed in the background
 */
export const useCacheNotifications = <T>(
  cacheKey: string,
  onUpdate?: (key: string, newData: T) => void
) => {
  const [lastUpdate, setLastUpdate] = useState<number>(0)
  const [latestData, setLatestData] = useState<T | null>(null)

  const handleCacheUpdate = useCallback((key: string, newData: T) => {
    console.log(`[useCacheNotifications] Cache updated for ${key}`)
    setLastUpdate(Date.now())
    setLatestData(newData)
    onUpdate?.(key, newData)
  }, [onUpdate])

  useEffect(() => {
    const unsubscribe = subscribeToCacheUpdates(cacheKey, handleCacheUpdate)

    return () => {
      unsubscribe()
    }
  }, [cacheKey, handleCacheUpdate])

  return {
    lastUpdate,
    latestData,
    hasUpdates: lastUpdate > 0
  }
}

/**
 * Hook for multiple cache keys
 */
export const useMultipleCacheNotifications = (
  cacheKeys: string[],
  onUpdate?: (key: string, newData: any) => void
) => {
  const [updates, setUpdates] = useState<Record<string, number>>({})

  const handleCacheUpdate = useCallback((key: string, newData: any) => {
    console.log(`[useMultipleCacheNotifications] Cache updated for ${key}`)
    setUpdates(prev => ({
      ...prev,
      [key]: Date.now()
    }))
    onUpdate?.(key, newData)
  }, [onUpdate])

  useEffect(() => {
    const unsubscribers = cacheKeys.map(key =>
      subscribeToCacheUpdates(key, handleCacheUpdate)
    )

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [cacheKeys, handleCacheUpdate])

  return {
    updates,
    hasAnyUpdates: Object.keys(updates).length > 0,
    getLastUpdate: (key: string) => updates[key] || 0
  }
}