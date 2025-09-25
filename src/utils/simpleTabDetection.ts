"use client"

/**
 * Enhanced tab-switch detection to prevent skeleton loading
 * Uses visibility API with timing-based detection to catch tab returns
 */

const APP_LOADED_KEY = 'classraum-app-loaded'

let hasBeenVisible = false
let wasRecentlyHidden = false
let recentVisibilityTimer: NodeJS.Timeout | null = null

export const simpleTabDetection = {
  // Check if this looks like a tab return (not initial app load)
  isReturningToTab(): boolean {
    // Always allow loading during SSR
    if (typeof window === 'undefined') {
      return false
    }

    // Check if app has been used before in this session
    const hasUsedApp = sessionStorage.getItem(APP_LOADED_KEY) === 'true'

    // If app hasn't been used before, definitely not a tab return
    if (!hasUsedApp) {
      console.log('✅ [SimpleTabDetection] First app usage - allowing skeleton loading')
      return false
    }

    // NEW: Check if we recently returned from being hidden (timing-based detection)
    if (wasRecentlyHidden && !document.hidden) {
      console.log('🔄 [SimpleTabDetection] Recent tab return detected - suppressing loading')
      return true
    }

    // Fallback: Check if document was hidden when we loaded (legacy detection)
    const wasDocumentHidden = document.hidden

    // If document is visible and app was used before, this is likely regular navigation within app
    if (!wasDocumentHidden) {
      console.log('✅ [SimpleTabDetection] Document visible + app used before - regular navigation, allowing loading')
      return false
    }

    // Document was hidden and app was used before - likely tab return
    console.log('🔄 [SimpleTabDetection] Document hidden + app used before - tab return detected, suppressing loading')
    return true
  },

  // Enhanced detection for true tab returns (not page navigation)
  // This is now an alias to isReturningToTab() for consistency
  isTrueTabReturn(): boolean {
    return this.isReturningToTab()
  },

  // Mark that the app has loaded successfully
  markAppLoaded(): void {
    if (typeof window === 'undefined') {
      return
    }

    sessionStorage.setItem(APP_LOADED_KEY, 'true')
    console.log('✅ [SimpleTabDetection] App marked as loaded')
  },

  // Initialize visibility tracking with enhanced tab return detection
  initializeVisibilityTracking(): void {
    if (typeof window === 'undefined') {
      return
    }

    // Enhanced visibility change handler with timing-based tab return detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - mark that we were recently hidden
        wasRecentlyHidden = true
        if (recentVisibilityTimer) {
          clearTimeout(recentVisibilityTimer)
          recentVisibilityTimer = null
        }
        console.log('👁️ [SimpleTabDetection] Tab became hidden - marking as recently hidden')
      } else {
        // Tab became visible - set timer to clear the "recently returned" flag
        hasBeenVisible = true
        console.log('👁️ [SimpleTabDetection] Tab became visible - setting return detection timer')

        // Clear any existing timer
        if (recentVisibilityTimer) {
          clearTimeout(recentVisibilityTimer)
        }

        // Set timer to clear the "recently returned from hidden" flag after a brief window
        recentVisibilityTimer = setTimeout(() => {
          wasRecentlyHidden = false
          console.log('⏰ [SimpleTabDetection] Tab return detection window expired')
        }, 300) // 300ms window to detect tab returns
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
    wasRecentlyHidden = false

    // Clear any pending timer
    if (recentVisibilityTimer) {
      clearTimeout(recentVisibilityTimer)
      recentVisibilityTimer = null
    }

    console.log('🔄 [SimpleTabDetection] Reset for logout')
  }
}

// Initialize visibility tracking immediately if in browser
if (typeof window !== 'undefined') {
  simpleTabDetection.initializeVisibilityTracking()
}