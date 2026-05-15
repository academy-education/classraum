"use client"

/**
 * App Initialization Tracker
 *
 * Manages session-based tracking of app initialization to prevent
 * loading screens during navigation after the first successful load.
 *
 * Logging policy: warn/error always, info-level only in development.
 */

const APP_INIT_KEY = 'app-initialization-state'
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const IS_DEV = process.env.NODE_ENV === 'development'

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

const debugLog = (...args: unknown[]): void => {
  if (IS_DEV) console.log(...args)
}

class AppInitializationTracker {
  private state: AppInitState | null = null
  private sessionId: string

  constructor() {
    this.sessionId = Math.random().toString(36).substr(2, 9)
    this.loadState()
    if (!this.state) {
      console.warn('[AppInitTracker] State null after loadState, forcing initialization')
      this.forceInitializeState()
    }
  }

  private loadState(): void {
    if (typeof window === 'undefined') {
      // SSR: minimal placeholder state.
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

    try {
      const saved = sessionStorage.getItem(APP_INIT_KEY)
      if (saved) {
        const parsed: AppInitState = JSON.parse(saved)
        const age = Date.now() - parsed.timestamp
        if (age < SESSION_TIMEOUT) {
          this.state = parsed
          debugLog('[AppInitTracker] Restored state', { ageMinutes: Math.round(age / 60000) })
          return
        }
      }
    } catch (e) {
      console.warn('[AppInitTracker] Could not restore state:', e)
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

  // ===== Status checks =====
  public isAppInitialized(): boolean { return this.state?.isInitialized || false }
  public isAuthInitialized(): boolean { return this.state?.authInitialized || false }
  public isUserDataInitialized(): boolean { return this.state?.userDataInitialized || false }
  public isAcademyDataInitialized(): boolean { return this.state?.academyDataInitialized || false }
  public isRoleValidated(): boolean { return this.state?.roleValidated || false }
  public isParentDataInitialized(): boolean { return this.state?.parentDataInitialized || false }

  // ===== Mark initialization steps =====
  public markAuthInitialized(): void {
    if (!this.state) return
    this.state.authInitialized = true
    this.checkFullInitialization()
    this.saveState()
  }

  public markUserDataInitialized(): void {
    if (!this.state) return
    this.state.userDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
  }

  public markAcademyDataInitialized(): void {
    if (!this.state) return
    this.state.academyDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
  }

  public markRoleValidated(): void {
    if (!this.state) return
    this.state.roleValidated = true
    this.checkFullInitialization()
    this.saveState()
  }

  public markParentDataInitialized(): void {
    if (!this.state) return
    this.state.parentDataInitialized = true
    this.checkFullInitialization()
    this.saveState()
  }

  private checkFullInitialization(): void {
    if (!this.state) return
    const wasInitialized = this.state.isInitialized
    // Fully initialized = auth + user data both ready (covers all roles).
    this.state.isInitialized = this.state.authInitialized && this.state.userDataInitialized
    if (this.state.isInitialized && !wasInitialized) {
      debugLog('[AppInitTracker] App fully initialized — navigation loading screens will be suppressed.')
    }
  }

  // Force reset (logout)
  public reset(): void {
    if (typeof window !== 'undefined') {
      try { sessionStorage.removeItem(APP_INIT_KEY) } catch { /* ignore */ }
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

  /**
   * Suppress the navigation loading screen only when the app is FULLY
   * initialized (auth + user data both ready). The previous implementation
   * suppressed when just `authInitialized` was true, which caused empty-data
   * flickers on pages whose first render depends on user data — they'd
   * render briefly with no loading state AND no data.
   */
  public shouldSuppressLoadingForNavigation(): boolean {
    return this.isAppInitialized()
  }

  public getDebugInfo(): unknown {
    return {
      ...this.state,
      sessionValid: this.state ? Date.now() - this.state.timestamp < SESSION_TIMEOUT : false
    }
  }
}

// Singleton
export const appInitTracker = new AppInitializationTracker()
