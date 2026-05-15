import { supabase } from '@/lib/supabase'
import { cleanupWebPush } from '@/lib/webPushNotifications'
import { appInitTracker } from '@/utils/appInitializationTracker'
import { simpleTabDetection } from '@/utils/simpleTabDetection'

/** Race a promise against a timeout — used to protect logout from any hangs. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | undefined> {
  return Promise.race([
    p,
    new Promise<undefined>((resolve) =>
      setTimeout(() => {
        console.warn(`[logout] Timed out after ${ms}ms: ${label}`)
        resolve(undefined)
      }, ms)
    )
  ])
}

/**
 * Shared logout logic - clears auth, storage, and caches consistently.
 * Call this from any logout handler, then navigate with router.replace('/auth').
 *
 * Every external await is wrapped in a timeout so a hung network request,
 * unresponsive service worker, or stuck Supabase call can never trap the
 * user on the logout flow. We always reach the localStorage cleanup at the
 * bottom of this function.
 */
export async function performLogout() {
  // Deactivate web push token before signing out (needs auth context).
  // Generous timeout because the auth check + cleanup involves the
  // service worker + a Supabase write.
  try {
    const userResult = await withTimeout(supabase.auth.getUser(), 3000, 'auth.getUser')
    const user = userResult?.data?.user
    if (user) {
      await withTimeout(cleanupWebPush(user.id), 2000, 'cleanupWebPush')
    }
  } catch (error) {
    console.error('Error deactivating web push on logout:', error)
  }

  // Sign out — also timed out so a hung network request can't block forever.
  try {
    const result = await withTimeout(supabase.auth.signOut(), 3000, 'auth.signOut')
    if (result?.error) {
      console.error('Logout error:', result.error)
    }
  } catch (error) {
    console.error('Logout signOut threw:', error)
  }

  if (typeof window !== 'undefined') {
    // Clear all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
        localStorage.removeItem(key)
      }
    })

    // Clear Zustand stores from localStorage
    localStorage.removeItem('mobile-app-storage')
    localStorage.removeItem('selected-student-storage')

    // Clear all session/cache data
    sessionStorage.clear()
  }

  // Reset loading-state trackers so the next login starts with a clean
  // skeleton flow (without these, a re-logged-in user could navigate to a
  // page that thinks the app is "already initialized" and skip the loading
  // screen even though their data hasn't loaded yet).
  appInitTracker.reset()
  simpleTabDetection.reset()
}
