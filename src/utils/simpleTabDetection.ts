"use client"

/**
 * Simple, reliable tab-switch detection to prevent skeleton loading
 * Uses visibility API and tracks if app has been used before
 */

const APP_LOADED_KEY = 'classraum-app-loaded'

let hasBeenVisible = false
let isInitialLoad = true

export const simpleTabDetection = {
  // Check if this looks like a tab return (not initial app load)
  isReturningToTab(): boolean {
    // Always allow loading during SSR
    if (typeof window === 'undefined') {
      return false
    }

    // Check if app has been used before in this session
    const hasUsedApp = sessionStorage.getItem(APP_LOADED_KEY) === 'true'

    // If document is hidden when we load, and we've used the app before,
    // this is likely a tab return
    // const documentHidden = document.hidden // Currently unused

    const isTabReturn = hasUsedApp && !isInitialLoad

    if (isTabReturn) {
      console.log('🔄 [SimpleTabDetection] Detected tab return - suppressing skeleton loading')
    } else {
      console.log('✅ [SimpleTabDetection] First load or fresh session - allowing skeleton loading')
    }

    return isTabReturn
  },

  // Enhanced detection for true tab returns (not page navigation)
  isTrueTabReturn(): boolean {
    // Always allow loading during SSR
    if (typeof window === 'undefined') {
      return false
    }

    // Check if app has been used before in this session
    const hasUsedApp = sessionStorage.getItem(APP_LOADED_KEY) === 'true'

    // If app hasn't been used before, definitely not a tab return
    if (!hasUsedApp || isInitialLoad) {
      return false
    }

    // Check if document was hidden when we loaded (strong indicator of tab return)
    const wasDocumentHidden = document.hidden

    // If document is not hidden, this is likely regular navigation
    if (!wasDocumentHidden) {
      console.log('✅ [SimpleTabDetection] Document visible - allowing loading for navigation')
      return false
    }

    // Document was hidden and app was used before - likely tab return
    console.log('🔄 [SimpleTabDetection] Document was hidden + app used before - suppressing loading for tab return')
    return true
  },

  // Mark that the app has loaded successfully
  markAppLoaded(): void {
    if (typeof window === 'undefined') {
      return
    }

    isInitialLoad = false
    sessionStorage.setItem(APP_LOADED_KEY, 'true')
    console.log('✅ [SimpleTabDetection] App marked as loaded')
  },

  // Initialize visibility tracking
  initializeVisibilityTracking(): void {
    if (typeof window === 'undefined') {
      return
    }

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        hasBeenVisible = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // If page is visible now, mark it
    if (!document.hidden) {
      hasBeenVisible = true
    }
  },

  // Reset for logout
  reset(): void {
    if (typeof window === 'undefined') {
      return
    }

    sessionStorage.removeItem(APP_LOADED_KEY)
    hasBeenVisible = false
    isInitialLoad = true
    console.log('🔄 [SimpleTabDetection] Reset for logout')
  }
}

// Initialize visibility tracking immediately if in browser
if (typeof window !== 'undefined') {
  simpleTabDetection.initializeVisibilityTracking()
}