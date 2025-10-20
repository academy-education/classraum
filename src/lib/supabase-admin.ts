import { createClient } from '@supabase/supabase-js'

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
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
