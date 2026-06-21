import { supabase } from '@/lib/supabase'

/**
 * Bearer-token + JSON headers for fetch() calls from client components
 * to API routes that gate on auth. Used everywhere a route does
 * `supabaseAdmin.auth.getUser(token)` server-side.
 */
export async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}
