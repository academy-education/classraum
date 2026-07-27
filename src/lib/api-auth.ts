import { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dbAdmin } from './supabase-admin'
import type { Database } from './database.types'

/**
 * Validate the Authorization header from a frontend request.
 * Pattern used across this app: client sends `Authorization: Bearer {access_token}`
 * (obtained from `supabase.auth.getSession()`), and the API route validates
 * the token via the service-role client.
 *
 * Returns the authenticated user, or null if the token is missing/invalid.
 */
export async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  const token = authHeader.substring(7)
  const { data: { user }, error } = await dbAdmin.auth.getUser(token)
  if (error || !user) {
    return null
  }
  return user
}

/**
 * Authenticate a route that is called from the browser, returning both the
 * user and a Supabase client scoped to them.
 *
 * WHY THIS EXISTS: the browser client is configured with
 * `storage: window.localStorage` (see lib/supabase.ts), so signing in sets
 * NO auth cookie — verified live on 2026-07-27: document.cookie held only
 * `classraum_language`, while the session sat in
 * `sb-<ref>-auth-token` in localStorage.
 *
 * A route that authenticates purely through the cookie-based SSR client
 * therefore sees "Auth session missing!" for EVERY signed-in user, forever.
 * That silently disabled /api/subscription/downgrade and
 * /api/subscription/cancel — a manager could not schedule a downgrade or
 * cancel their plan at all. /api/subscription/subscribe worked only because
 * it hand-rolled the Bearer branch; this is that branch, shared.
 *
 * Order matters: try the Authorization header first (how this app's client
 * actually calls its API), then fall back to cookies so genuine
 * server-side/SSR callers keep working.
 */
export async function getAuthedClient(request: NextRequest): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof dbAdmin.auth.getUser>>['data']['user']>; supabase: SupabaseClient<Database>; error: null }
  | { user: null; supabase: null; error: string }
> {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { user: null, supabase: null, error: error?.message ?? 'Invalid token' }
    return { user, supabase, error: null }
  }

  const { createClient: createServerSupabase } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, supabase: null, error: error?.message ?? 'Auth session missing' }
  return { user, supabase, error: null }
}
