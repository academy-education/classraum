import { supabase } from '@/lib/supabase'
import { cleanupWebPush } from '@/lib/webPushNotifications'

/**
 * Shared logout logic - clears auth, storage, and caches consistently.
 * Call this from any logout handler, then navigate with router.replace('/auth').
 */
export async function performLogout() {
  // Deactivate web push token before signing out (needs auth context)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await cleanupWebPush(user.id)
    }
  } catch (error) {
    console.error('Error deactivating web push on logout:', error)
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Logout error:', error)
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
}
