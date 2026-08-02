import { dbAdmin } from '@/lib/supabase-admin'
import { isStudyAvatarId } from '@/lib/study/avatars'

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

export interface StudyIdentity {
  display_name: string
  /** The chosen Raumi avatar id, or null → the surface draws its own
   *  initials avatar exactly as it did before avatars existed. */
  avatar_id: string | null
}

/**
 * Read nickname + avatar_id for a set of students.
 *
 * TOLERATES A MISSING avatar_id COLUMN. Migration 071 adds it and is not
 * applied yet; a select naming a column PostgREST doesn't know returns
 * `data: null` for the WHOLE query (error 42703), which would have blanked
 * every nickname on the leaderboard — everyone would silently become
 * "Student", and nothing would throw. So: try the wide select, and on any
 * error fall back to the pre-071 columns. Delete the fallback once 071 is
 * applied everywhere; until then it is the difference between "avatars
 * don't work yet" and "the leaderboard lost everyone's name".
 */
async function readPrefsIdentity(
  ids: string[],
): Promise<Map<string, { nickname: string | null; avatar_id: string | null }>> {
  const out = new Map<string, { nickname: string | null; avatar_id: string | null }>()
  if (ids.length === 0) return out

  const { data, error } = await dbAdmin
    .from('study_user_prefs')
    .select('student_id, nickname, avatar_id')
    .in('student_id', ids)

  if (!error) {
    for (const r of data ?? []) {
      out.set(r.student_id, { nickname: r.nickname ?? null, avatar_id: r.avatar_id ?? null })
    }
    return out
  }

  console.warn('[study/identity] avatar_id select failed — falling back to pre-071 columns', {
    code: (error as { code?: string }).code,
  })
  const { data: legacy } = await dbAdmin
    .from('study_user_prefs')
    .select('student_id, nickname')
    .in('student_id', ids)
  for (const r of legacy ?? []) {
    out.set(r.student_id, { nickname: r.nickname ?? null, avatar_id: null })
  }
  return out
}

/**
 * Resolve display name + chosen avatar for each id. Two parallel lookups
 * (users.name + study_user_prefs). Returns a Map keyed by student id.
 */
export async function resolveIdentities(
  ids: string[],
  selfId: string,
): Promise<Map<string, StudyIdentity>> {
  const out = new Map<string, StudyIdentity>()
  if (ids.length === 0) return out
  const [{ data: users }, prefs] = await Promise.all([
    dbAdmin.from('users').select('id, name').in('id', ids),
    readPrefsIdentity(ids),
  ])
  const nameMap = new Map<string, string>()
  for (const u of (users ?? [])) nameMap.set(u.id as string, (u.name as string | null) ?? 'Student')
  for (const id of ids) {
    const row = prefs.get(id)
    const nick = row?.nickname ?? null
    // Only ids this build can draw are handed to the client. A retired or
    // hand-edited value resolves to null, which is the initials fallback —
    // never a blank disc.
    const avatarId = isStudyAvatarId(row?.avatar_id) ? row!.avatar_id! : null
    out.set(id, {
      display_name: nick ?? maskName(nameMap.get(id) ?? 'Student', id === selfId),
      avatar_id: avatarId,
    })
  }
  return out
}

/**
 * Name-only view of resolveIdentities, kept for callers that render no
 * avatar.
 */
export async function resolveDisplayNames(
  ids: string[],
  selfId: string,
): Promise<Map<string, string>> {
  const identities = await resolveIdentities(ids, selfId)
  const out = new Map<string, string>()
  for (const [id, identity] of identities) out.set(id, identity.display_name)
  return out
}
