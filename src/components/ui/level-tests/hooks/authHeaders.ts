import { db } from '@/lib/supabase'

export async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await db.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}
