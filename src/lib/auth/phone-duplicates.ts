import { dbAdmin } from '@/lib/supabase-admin'
import { phoneKey } from '@/lib/auth/phone'
import { maskEmail } from '@/lib/auth/mask-email'

/**
 * Other accounts that already carry the same phone number.
 *
 * WHY: the four-account student of 2026-09-26 — Apple, then Google, then a
 * mistyped password account, then another — all shared one phone number,
 * and nothing ever said "you already have an account". The number is the
 * one identity we hold across sign-in methods, so it is the duplicate key.
 *
 * `users.phone` is stored as typed (see lib/auth/phone.ts), so matching is
 * done on `phoneKey` in JS after a cheap suffix pre-filter in SQL.
 */
export interface DuplicateAccount {
  id: string
  provider: 'email' | 'google' | 'apple' | 'kakao' | string
  since: string          // YYYY-MM-DD
  emailHint: string      // k***@gmail.com — never the address
}

export async function findAccountsByPhone(rawPhone: string, excludeUserId?: string): Promise<DuplicateAccount[]> {
  const key = phoneKey(rawPhone)
  if (!key) return []
  const suffix = key.slice(-4)
  const { data, error } = await dbAdmin
    .from('users')
    .select('id, email, phone, created_at')
    .ilike('phone', `%${suffix}%`)
    .order('created_at', { ascending: true })   // name the OLDEST account — the one to go back to
    .limit(50)
  if (error || !data) return []
  const matches = data.filter(u => u.id !== excludeUserId && phoneKey(u.phone) === key)
  const out: DuplicateAccount[] = []
  for (const u of matches.slice(0, 3)) {
    let provider = 'email'
    try {
      const { data: au } = await dbAdmin.auth.admin.getUserById(u.id)
      provider = (au?.user?.app_metadata?.provider as string | undefined) ?? 'email'
    } catch { /* provider stays 'email' */ }
    out.push({ id: u.id, provider, since: String(u.created_at).slice(0, 10), emailHint: maskEmail(u.email) })
  }
  return out
}
