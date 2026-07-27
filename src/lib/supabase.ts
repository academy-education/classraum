import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Determine if we're in production
// const isProduction = process.env.NODE_ENV === 'production' ||
//   (typeof window !== 'undefined' && window.location.hostname.includes('classraum.com'))

const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Add storage configuration for better session handling
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Use default storage key to prevent conflicts
    // storageKey removed to use Supabase defaults
    // Add flow type for better auth handling
    flowType: 'pkce',
    // Disable debug mode to reduce console noise
    debug: false
  },
  global: {
    headers: {
      'x-client-info': 'classraum-web'
    }
  },
  // Add retry configuration
  db: {
    schema: 'public'
  },
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
})

/**
 * TYPED browser client — the only browser client. See supabase-admin.ts
 * for why (every schema bug on 2026-07-27 was invisible without it).
 * The untyped `supabase` alias was deleted once all call sites moved.
 */
export const db = client
