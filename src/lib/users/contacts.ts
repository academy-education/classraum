import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

/**
 * Contact PII (email, phone) of public.users.
 *
 * Since migration 120 the `email` and `phone` columns of public.users are not
 * selectable by `authenticated` at all — `select('*')`, `select('..., email')`
 * and `users(name, email)` embeds from a browser / user-session client fail
 * with "permission denied". Contacts come ONLY from the SECURITY DEFINER
 * function `app_user_contacts(uids)`, which returns rows the caller may see:
 * self, members of an academy where the caller is active staff, members of
 * the caller's family, or anyone for admins / the service role. Ids the caller may not see are simply
 * absent from the map — render them as "no email", never as an error.
 *
 * Rollout: the code ships BEFORE the migration. Until the function exists
 * PostgREST answers PGRST202 ("could not find the function"), and only then
 * do we read the columns directly — which works exactly as before, because
 * the columns are still granted. Any OTHER error is surfaced, not masked.
 */
export type UserContact = { email: string | null; phone: string | null }

type Client = SupabaseClient<Database>

const FUNCTION_MISSING = new Set(['PGRST202', '42883'])

export async function fetchUserContacts(
  client: Client,
  ids: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, UserContact>> {
  const uids = Array.from(new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 0)))
  const out = new Map<string, UserContact>()
  if (uids.length === 0) return out

  const { data, error } = await client.rpc('app_user_contacts', { uids })
  if (!error) {
    for (const row of data ?? []) out.set(row.id, { email: row.email ?? null, phone: row.phone ?? null })
    return out
  }
  if (!FUNCTION_MISSING.has(error.code ?? '')) throw error

  // Pre-migration-120 fallback: the function is not deployed yet, so the
  // columns are still readable under the old policy.
  const { data: rows, error: selErr } = await client
    .from('users')
    .select('id, email, phone')
    .in('id', uids)
  if (selErr) throw selErr
  for (const row of rows ?? []) out.set(row.id, { email: row.email ?? null, phone: row.phone ?? null })
  return out
}

/** The caller's own contact row (self is always visible). */
export async function fetchOwnContact(client: Client, userId: string): Promise<UserContact> {
  const map = await fetchUserContacts(client, [userId])
  return map.get(userId) ?? { email: null, phone: null }
}

/**
 * Merge contacts into rows that carry a user id. Rows whose user is not
 * visible get `email: null, phone: null` (same shape the old select gave for
 * an empty column), so callers keep their existing `?? ''` handling.
 */
export function withContacts<T extends object>(
  rows: T[],
  idOf: (row: T) => string | null | undefined,
  contacts: Map<string, UserContact>,
): Array<T & UserContact> {
  return rows.map(row => {
    const id = idOf(row)
    const c = id ? contacts.get(id) : undefined
    return { ...row, email: c?.email ?? null, phone: c?.phone ?? null }
  })
}

/**
 * Every column of public.users that `authenticated` may select after
 * migration 120 — i.e. all of them except email and phone. Use it where code
 * used to `select('*')`, then merge contacts from fetchUserContacts. Keep in
 * sync with the GRANT in database/migrations/120_users_contact_columns.sql
 * (the contacts test pins the two together).
 */
export const USER_PUBLIC_COLUMNS =
  'id, name, role, created_at, updated_at, deletion_scheduled_at, is_internal, family_name, given_name, name_confirmed_at, name_prompt_snoozed_until, email_verified_at' as const
