/**
 * Server-side Supabase client
 *
 * This client uses the service role key and should only be used in server-side contexts
 * (API routes, server components, etc.) where RLS policies need to be bypassed.
 *
 * WARNING: Never expose this client to the browser/client-side!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase server environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
}

/**
 * Server-side Supabase client with service role key
 * Bypasses RLS policies - use with caution!
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'classraum-server',
    },
  },
});
