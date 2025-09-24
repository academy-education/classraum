"use client"

/**
 * App Initialization Tracker
 *
 * Manages session-based tracking of app initialization to prevent
 * loading screens during navigation after the first successful load.
 */

const APP_INIT_KEY = 'app-initialization-state'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

interface AppInitState {
  isInitialized: boolean
  authInitialized: boolean
  userDataInitialized: boolean
  academyDataInitialized: boolean
  roleValidated: boolean
  parentDataInitialized: boolean
  timestamp: number
  sessionId: string
}

class AppInitializationTracker {
  private state: AppInitState | null = null
  private sessionId: string

  constructor() {
    this.sessionId = Math.random().toString(36).substr(2, 9)
    console.log(`🚀 [AppInitTracker] Constructor called, sessionId: ${this.sessionId}`)
    // Force synchronous state initialization
    this.loadState()
    // Ensure we have a valid state after loading
    if (!this.state) {
      console.warn('🚨 [AppInitTracker] State still null after loadState, forcing initialization')
      this.forceInitializeState()
    }
    console.log('🏗️ [AppInitTracker] Constructor complete, final state:', this.state)
  }

  private loadState(): void {
    if (typeof window === 'undefined') {
      // Initialize minimal state for SSR
      console.log('🌍 [AppInitTracker] Running in SSR environment, creating SSR state')
      this.state = {
        isInitialized: false,
        authInitialized: false,
        userDataInitialized: false,
        academyDataInitialized: false,
        roleValidated: false,
        parentDataInitialized: false,
        timestamp: Date.now(),
        sessionId: 'ssr'
      }
      return
    }

    console.log('🖥️ [AppInitTracker] Running in browser environment, attempting to load state')

    try {
      const saved = sessionStorage.getItem(APP_INIT_KEY)
      if (saved) {
        const parsed: AppInitState = JSON.parse(saved)

        // Check if session is still valid (within timeout)
        const now = Date.now()
        const age = now - parsed.timestamp

        if (age < SESSION_TIMEOUT) {
          this.state = parsed
          console.log('🔄 [AppInitTracker] Restored initialization state:', {
            isInitialized: this.state.isInitialized,
            authInitialized: this.state.authInitialized,
            userDataInitialized: this.state.userDataInitialized,
            academyDataInitialized: this.state.academyDataInitialized,
            roleValidated: this.state.roleValidated,
            parentDataInitialized: this.state.parentDataInitialized,
            ageMinutes: Math.round(age / 60000)
          })
          return
        } else {
          console.log('📅 [AppInitTracker] Session expired, resetting state')
        }
      } else {
        console.log('🆕 [AppInitTracker] No existing session found, creating new state')
      }
    } catch (e) {
      console.warn('[AppInitTracker] Could not restore state:', e)
    }

    // Initialize new state
    this.state = {
      isInitialized: false,
      authInitialized: false,
      userDataInitialized: false,
      academyDataInitialized: false,
      roleValidated: false,
      parentDataInitialized: false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    }
    console.log('🆕 [AppInitTracker] Created new initialization state:', this.state)
    this.saveState()
  }

  private saveState(): void {
    if (typeof window === 'undefined' || !this.state) return

    try {
      this.state.timestamp = Date.now()
      sessionStorage.setItem(APP_INIT_KEY, JSON.stringify(this.state))
    } catch (e) {
      console.warn('[AppInitTracker] Could not save state:', e)
    }
  }

  private forceInitializeState(): void {
    console.log('🔧 [AppInitTracker] Force initializing state')
    this.state = {
      isInitialized: false,
      authInitialized: false,
      userDataInitialized: false,
      academyDataInitialized: false,
      roleValidated: false,
      parentDataInitialized: false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    }
    this.saveState()
  }

  // Check if app has been fully initialized in this session
  public isAppInitialized(): boolean {
    return this.state?.isInitialized || false
  }

  // Check if specific initialization steps are complete
  public isAuthInitialized(): boolean {
    return this.state?.authInitialized || false
  }

  public isUserDataInitialized(): boolean {
    return this.state?.userDataInitialized || false
  }

  public isAcademyDataInitialized(): boolean {
    return this.state?.academyDataInitialized || false
  }

  public isRoleValidated(): boolean {
    return this.state?.roleValidated || false
  }

  public isParentDataInitialized(): boolean {
    return this.state?.parentDataInitialized || false
  }

  // Mark initialization steps as complete
  public markAuthInitialized(): void {
    console.log(`🔧 [AppInitTracker] markAuthInitialized called, sessionId: ${this.sessionId}, state exists: ${!!this.state}`)
    if (!this.state) {
      console.warn('🚨 [AppInitTracker] Cannot mark auth initialized - state is null!')
      return
    }
    this.state.authInitialized = true
    this.checkFullInitialization()
    this.saveState()
    console.log('✅ [AppInitTracker] Auth initialization marked complete')
  }

  public markUserDataInitialized(): void {
    if (!this.state) return
    this.state.userDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
    console.log('✅ [AppInitTracker] User data initialization marked complete')
  }

  public markAcademyDataInitialized(): void {
    if (!this.state) return
    this.state.academyDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
    console.log('✅ [AppInitTracker] Academy data initialization marked complete')
  }

  public markRoleValidated(): void {
    if (!this.state) return
    this.state.roleValidated = true
    this.checkFullInitialization()
    this.saveState()
    console.log('✅ [AppInitTracker] Role validation marked complete')
  }

  public markParentDataInitialized(): void {
    if (!this.state) return
    this.state.parentDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
    console.log('✅ [AppInitTracker] Parent data initialization marked complete')
  }

  private checkFullInitialization(): void {
    if (!this.state) return

    // App is fully initialized when auth and user data are ready
    // (other components are optional depending on user role)
    const wasInitialized = this.state.isInitialized
    this.state.isInitialized = this.state.authInitialized && this.state.userDataInitialized

    if (this.state.isInitialized && !wasInitialized) {
      console.log('🎉 [AppInitTracker] App fully initialized! Navigation loading screens will be suppressed.')
    }
  }

  // Force reset (for logout scenarios)
  public reset(): void {
    console.log('🔄 [AppInitTracker] Resetting initialization state')
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(APP_INIT_KEY)
      } catch (e) {
        console.warn('[AppInitTracker] Could not clear sessionStorage:', e)
      }
    }

    this.state = {
      isInitialized: false,
      authInitialized: false,
      userDataInitialized: false,
      academyDataInitialized: false,
      roleValidated: false,
      parentDataInitialized: false,
      timestamp: Date.now(),
      sessionId: this.sessionId
    }
    this.saveState()
  }

  // Check if we should suppress loading states for navigation
  public shouldSuppressLoadingForNavigation(): boolean {
    const initialized = this.isAppInitialized()
    const authReady = this.isAuthInitialized()
    const userDataReady = this.isUserDataInitialized()

    // Suppress loading if we have basic auth + user data, even if other components aren't ready
    const shouldSuppress = initialized || authReady

    console.log('🔍 [AppInitTracker] Loading suppression check:', {
      initialized,
      authReady,
      userDataReady,
      shouldSuppress,
      currentState: this.state ? {
        isInitialized: this.state.isInitialized,
        authInitialized: this.state.authInitialized,
        userDataInitialized: this.state.userDataInitialized,
        roleValidated: this.state.roleValidated,
        parentDataInitialized: this.state.parentDataInitialized,
        sessionAge: Math.round((Date.now() - this.state.timestamp) / 1000) + 's'
      } : null
    })

    if (shouldSuppress) {
      console.log('🚫 [AppInitTracker] Suppressing loading for navigation (app previously initialized)')
    } else {
      console.log('✅ [AppInitTracker] Allowing loading screen (first visit or session expired)')
    }

    return shouldSuppress
  }

  // Get current state for debugging
  public getDebugInfo(): any {
    return {
      ...this.state,
      sessionValid: this.state ? Date.now() - this.state.timestamp < SESSION_TIMEOUT : false
    }
  }
}

// Export singleton instance
export const appInitTracker = new AppInitializationTracker()