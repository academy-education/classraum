import { supabase } from '@/lib/supabase'

/**
 * Shared logout logic - clears auth, storage, and caches consistently.
 * Call this from any logout handler, then navigate with router.replace('/auth').
 */
export async function performLogout() {
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
