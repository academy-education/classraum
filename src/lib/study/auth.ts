import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { User } from '@supabase/supabase-js'

/**
 * Resolve the authenticated study user from the Bearer token.
 * Returns { user } on success or { response } (a ready 401) on failure,
 * so routes can early-return without repeating the boilerplate.
 */
export async function requireStudyUser(
  req: NextRequest,
): Promise<{ user: User; response?: never } | { user?: never; response: NextResponse }> {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  return { user }
}
