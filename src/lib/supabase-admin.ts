import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for admin client')
}

/**
 * Supabase admin client with service role key
 * This client bypasses Row Level Security (RLS) policies
 *
 * ⚠️ SECURITY WARNING:
 * - Only use this client in server-side code (API routes, server components)
 * - Never expose this client to client-side code
 * - The service role key has full access to the database
 */
const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * TYPED admin client — prefer this in new code.
 *
 * Every schema bug found on 2026-07-27 was invisible because the client
 * was untyped: `users.academy_id`, `teachers.id`, `assignments.status`,
 * `academy_subscriptions.plan_name`, and three tables that do not exist.
 * PostgREST answers those with an error and no rows, callers fall back
 * to [] or 0, and the screen shows a plausible zero. Under `dbAdmin`
 * they are compile errors instead.
 */
export const dbAdmin = client

/**
 * UNTYPED alias, for files not yet migrated.
 *
 * Same single client instance — this is a view, not a second
 * connection. Typing all call sites at once produced 1312 errors, so
 * files move over area by area; each migration is one import change
 * plus whatever real bugs the types then expose.
 *
 * Shrinking to zero is the goal. Do not add new uses.
 *
 * ⚠️ SECURITY: server-side only, bypasses RLS (see below).
 */
export const supabaseAdmin = client as unknown as SupabaseClient
