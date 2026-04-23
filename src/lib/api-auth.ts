import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase-admin'

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
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return null
  }
  return user
}
