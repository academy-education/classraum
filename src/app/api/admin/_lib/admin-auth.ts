import { NextRequest } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'

/**
 * Shared admin-route helpers.
 *
 * NOTE: this file lives under `src/app/api/admin/` but is NOT a route — the
 * App Router only treats `route.ts` / `page.tsx` as routable, and the `_lib`
 * prefix makes the intent explicit.
 */

/**
 * requireAdmin — confirms the bearer token belongs to an admin/super_admin.
 * Returns the caller's user id + role, or null when the check fails.
 *
 * Identical semantics to the guard in /api/admin/academies/route.ts; extracted
 * so new admin routes cannot accidentally ship a weaker check.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await dbAdmin.auth.getUser(token)
  if (authError || !user) return null

  const { data: userInfo } = await dbAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userInfo || !['admin', 'super_admin'].includes(userInfo.role)) return null
  return { userId: user.id, role: userInfo.role }
}

/**
 * listAllAuthUsers — paginated `auth.admin.listUsers()`.
 *
 * `listUsers()` with no arguments returns only the FIRST PAGE (perPage
 * defaults to 50). Every call site that built a Map from the result and then
 * treated "absent from the map" as a fact about the user was silently wrong
 * for everyone past user #50 — they rendered as "pending / never logged in".
 *
 * This walks pages until one comes back short (or empty), which is the same
 * pattern scripts/seed-demo.ts uses. `maxPages` is a hard stop so a server
 * that keeps returning full pages can never spin forever.
 *
 * Throws on a page error rather than returning a partial list — a partial
 * list is exactly the failure mode this function exists to prevent.
 */
export type AdminAuthUser = {
  id: string
  email?: string
  last_sign_in_at?: string | null
  email_confirmed_at?: string | null
  created_at?: string
  /**
   * The supabase-js `User` type omits admin-only fields like `banned_until`
   * even though the admin REST endpoint returns them.
   */
  banned_until?: string | null
}

export async function listAllAuthUsers(
  { perPage = 1000, maxPages = 100 }: { perPage?: number; maxPages?: number } = {}
): Promise<AdminAuthUser[]> {
  const all: AdminAuthUser[] = []

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await dbAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`listUsers page ${page} failed: ${error.message}`)
    }
    const batch = (data?.users || []) as unknown as AdminAuthUser[]
    all.push(...batch)
    // A short page means we've reached the end.
    if (batch.length < perPage) return all
  }

  console.warn(
    `[admin] listAllAuthUsers hit maxPages=${maxPages} (perPage=${perPage}); result may be truncated`
  )
  return all
}

/**
 * countRows — exact row count that FAILS LOUDLY.
 *
 * PostgREST returns `{ count: null, error: null }` when a count is denied or
 * unavailable. The old `count || 0` idiom laundered that into a believable
 * zero (this is how "academies: 0" reached the dashboard while the table held
 * 10 rows). Anything other than a real number throws.
 */
export async function countRows(
  build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  label: string
): Promise<number> {
  const { count, error } = await build()
  if (error) throw new Error(`count(${label}) failed: ${error.message}`)
  if (typeof count !== 'number') throw new Error(`count(${label}) returned no count`)
  return count
}
