// Utility to detect browser refresh and clear caches
// This allows users to force-fetch fresh data by refreshing the page

const REFRESH_KEY = 'page-refresh-timestamp'
const REFRESH_WINDOW = 2000 // 2 seconds window to detect refresh

/**
 * Detects if the page was refreshed (not a normal navigation)
 * Uses performance.navigation API with sessionStorage fallback
 */
export const isPageRefresh = (): boolean => {
  if (typeof window === 'undefined') return false

  // Method 1: Use performance.navigation (most reliable)
  if (window.performance && window.performance.navigation) {
    // TYPE_RELOAD = 1
    if (window.performance.navigation.type === 1) {
      return true
    }
  }

  // Method 2: Use Navigation Timing API (newer browsers)
  if (window.performance && window.performance.getEntriesByType) {
    const navEntries = window.performance.getEntriesByType('navigation')
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming
      if (navEntry.type === 'reload') {
        return true
      }
    }
  }

  // Method 3: Fallback - check timestamp in sessionStorage
  const lastTimestamp = sessionStorage.getItem(REFRESH_KEY)
  const currentTime = Date.now()

  // Update timestamp
  sessionStorage.setItem(REFRESH_KEY, currentTime.toString())

  if (lastTimestamp) {
    const timeSinceLastLoad = currentTime - parseInt(lastTimestamp)
    // If page was loaded very recently (within 2 seconds), likely a refresh
    return timeSinceLastLoad < REFRESH_WINDOW
  }

  return false
}

/**
 * Clears all caches for an academy when page is refreshed
 * This ensures users get fresh data on manual refresh
 */
export const clearCachesOnRefresh = (academyId: string): boolean => {
  if (!isPageRefresh()) {
    console.log('[CacheRefresh] Normal navigation, keeping cache')
    return false
  }

  console.log('[CacheRefresh] Page refresh detected, clearing caches for academy:', academyId)

  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    // Clear all data caches for this academy
    if (key.includes(`-${academyId}`) && !key.includes('timestamp')) {
      sessionStorage.removeItem(key)
      sessionStorage.removeItem(`${key}-timestamp`)
      clearedCount++
    }
    // Also clear timestamp keys directly
    if (key.includes(`-${academyId}-timestamp`)) {
      sessionStorage.removeItem(key)
    }
  })

  console.log(`[CacheRefresh] Cleared ${clearedCount} cache entries on refresh`)
  return true
}

/**
 * Mark that a page refresh has been handled
 * Call this after clearing caches to prevent multiple clears
 */
export const markRefreshHandled = (): void => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(REFRESH_KEY, (Date.now() - REFRESH_WINDOW - 1000).toString())
}
