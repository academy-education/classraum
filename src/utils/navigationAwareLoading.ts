"use client"

/**
 * Simple, reliable navigation-aware loading system
 * Prevents skeleton loading when returning to tabs after initial app initialization
 */

const NAVIGATION_STATE_KEY = 'navigation-initialized'
const SESSION_TIMEOUT = 20 * 60 * 1000 // 20 minutes

interface NavigationState {
  initialized: boolean
  timestamp: number
}

export const navigationAwareLoading = {
  // Check if we should suppress loading (user has been here before recently)
  shouldSuppressLoading(): boolean {
    // Always allow loading during SSR
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const saved = sessionStorage.getItem(NAVIGATION_STATE_KEY)
      if (!saved) {
        return false
      }

      const state: NavigationState = JSON.parse(saved)
      const now = Date.now()
      const age = now - state.timestamp

      // If session is still valid and was initialized
      const isValid = age < SESSION_TIMEOUT && state.initialized

      if (isValid) {
        console.log('🚫 [NavigationAware] Suppressing loading - user was here recently')
        return true
      } else {
        console.log('✅ [NavigationAware] Allowing loading - first visit or session expired')
        return false
      }
    } catch (e) {
      console.warn('[NavigationAware] Error checking state:', e)
      return false
    }
  },

  // Mark that the app has been initialized (call this once app is loaded)
  markInitialized(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const state: NavigationState = {
        initialized: true,
        timestamp: Date.now()
      }
      sessionStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state))
      console.log('✅ [NavigationAware] App marked as initialized')
    } catch (e) {
      console.warn('[NavigationAware] Error saving state:', e)
    }
  },

  // Reset the state (for logout)
  reset(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      sessionStorage.removeItem(NAVIGATION_STATE_KEY)
      console.log('🔄 [NavigationAware] State reset')
    } catch (e) {
      console.warn('[NavigationAware] Error resetting state:', e)
    }
  }
}