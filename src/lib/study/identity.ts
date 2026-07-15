import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Shared display-identity resolution for study social surfaces (leaderboard,
 * friends). A member's public nickname wins and is shown as-is (they chose a
 * handle to be seen by); anyone without a nickname falls back to their real
 * name, privacy-masked for everyone but the caller.
 */

/** Privacy mask: full name for the caller; first syllable/initial + tail for
 *  everyone else, so a real name never fully leaks to strangers. */
export function maskName(name: string, isMe: boolean): string {
  if (isMe) return name
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed
  const isKorean = /[ㄱ-힝]/.test(trimmed)
  if (isKorean) return `${trimmed[0]}**${trimmed[trimmed.length - 1]}`
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return `${parts[0][0]}***`
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/**
 * Resolve a display name for each id: nickname (unmasked) if set, else the
 * masked real name. Two parallel lookups (users.name + study_user_prefs.
 * nickname). Returns a Map keyed by student id.
 */
export async function resolveDisplayNames(
  ids: string[],
  selfId: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (ids.length === 0) return out
  const [{ data: users }, { data: nickRows }] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').in('id', ids),
    supabaseAdmin.from('study_user_prefs').select('student_id, nickname').in('student_id', ids),
  ])
  const nameMap = new Map<string, string>()
  for (const u of (users ?? [])) nameMap.set(u.id as string, (u.name as string | null) ?? 'Student')
  const nickMap = new Map<string, string>()
  for (const r of (nickRows ?? [])) {
    if (r.nickname) nickMap.set(r.student_id as string, r.nickname as string)
  }
  for (const id of ids) {
    const nick = nickMap.get(id)
    out.set(id, nick ?? maskName(nameMap.get(id) ?? 'Student', id === selfId))
  }
  return out
}
