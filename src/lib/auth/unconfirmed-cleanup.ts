/**
 * Which never-confirmed accounts may be deleted. Pure, so it is tested.
 *
 * Once email confirmation is on, every abandoned signup leaves an auth row
 * plus the public.users row the handle_new_user trigger created (and its
 * cascade: preferences, a free subscription). They would also hold the
 * email hostage — a later real signup with that address is told "already
 * registered". So a password account that never confirmed and never signed
 * in is removed after GRACE_DAYS. Social accounts are never touched (the
 * provider vouched for the address) and neither is anything that has ever
 * signed in.
 */
export const GRACE_DAYS = 7

export interface AuthUserLike {
  id: string
  email?: string | null
  created_at: string
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
  app_metadata?: { provider?: string; providers?: string[] } | null
}

export function isDeletableUnconfirmed(u: AuthUserLike, now: Date = new Date()): boolean {
  if (u.email_confirmed_at) return false
  if (u.last_sign_in_at) return false
  const providers = u.app_metadata?.providers ?? (u.app_metadata?.provider ? [u.app_metadata.provider] : [])
  if (providers.some(p => p !== 'email')) return false
  const ageMs = now.getTime() - new Date(u.created_at).getTime()
  return ageMs >= GRACE_DAYS * 24 * 60 * 60 * 1000
}
