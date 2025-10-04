import { useState } from 'react'

/**
 * Synchronously read from localStorage during component initialization.
 * This prevents skeleton flashes by providing cached data BEFORE Zustand hydrates.
 *
 * Unlike Zustand's persist middleware which hydrates asynchronously,
 * this hook reads localStorage synchronously in useState initializer,
 * giving us instant access to cached data on first render.
 */
export function useSyncLocalStorage<T = any>(key: string): T | null {
  const [data] = useState(() => {
    // SSR-safe check
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      return parsed as T
    } catch (error) {
      console.warn(`Failed to read ${key} from localStorage:`, error)
      return null
    }
  })

  return data
}

/**
 * Get specific data from the mobile app Zustand store synchronously.
 * Extracts nested data from the persisted state.
 */
export function useSyncMobileStore() {
  const rawData = useSyncLocalStorage<{ state: any }>('mobile-app-storage')

  return {
    dashboardData: rawData?.state?.dashboardData ?? null,
    assignments: rawData?.state?.assignments ?? [],
    grades: rawData?.state?.grades ?? [],
    notifications: rawData?.state?.notifications ?? [],
    hasData: !!rawData?.state
  }
}
