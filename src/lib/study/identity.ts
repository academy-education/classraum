import { dbAdmin } from '@/lib/supabase-admin'
import { isStudyAvatarId } from '@/lib/study/avatars'
import { normaliseAvatarConfig, type AvatarConfig } from '@/lib/study/avatarConfig'

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
  /** The PRESET the student started from, or null. Kept on the wire for
   *  clients that have no config to draw — and for the pre-072 world,
   *  where it is the only avatar signal there is. */
  avatar_id: string | null
  /** The customised avatar (migration 072). null → the client falls back
   *  to avatar_id, and failing that to its own initials avatar. */
  avatar_config: AvatarConfig | null
}

interface PrefsRow {
  nickname: string | null
  avatar_id: string | null
  avatar_config: unknown
}

/**
 * The select lists this function will try, WIDEST FIRST.
 *
 * Each successive entry drops the column added by the migration above
 * it, so the file works against a database at any of three states:
 * post-072, post-071, and pre-071 (today).
 */
const PREFS_SELECTS = [
  { columns: 'student_id, nickname, avatar_id, avatar_config', needs: 'migration 072' },
  { columns: 'student_id, nickname, avatar_id', needs: 'migration 071' },
  { columns: 'student_id, nickname', needs: 'nothing' },
] as const

/**
 * Read nickname + avatar for a set of students.
 *
 * TOLERATES MISSING AVATAR COLUMNS, and that tolerance is the whole
 * reason this function exists rather than an inline select.
 *
 * PostgREST rejects a select naming a column it does not know (42703)
 * and returns `data: null` for the WHOLE query — not just that field.
 * So a single unapplied migration does not mean "avatars are missing",
 * it means EVERY NICKNAME ON THE LEADERBOARD SILENTLY BECOMES
 * "Student", and nothing throws. That trap was hit once for avatar_id
 * and guarded; `avatar_config` (migration 072, NOT APPLIED) is the same
 * trap one column later, and adding it to the existing wide select
 * without widening the ladder would have re-armed it — the fallback
 * below drops straight to nickname-only, so the avatars that DO work
 * today would have disappeared too.
 *
 * Delete a rung once its migration is applied everywhere. Until then
 * each one is the difference between "the new avatar doesn't work yet"
 * and "the leaderboard lost everyone's name".
 */
async function readPrefsIdentity(ids: string[]): Promise<Map<string, PrefsRow>> {
  const out = new Map<string, PrefsRow>()
  if (ids.length === 0) return out

  for (const [i, attempt] of PREFS_SELECTS.entries()) {
    const { data, error } = await dbAdmin
      .from('study_user_prefs')
      .select(attempt.columns)
      .in('student_id', ids)

    if (error) {
      console.warn('[study/identity] prefs select failed — trying a narrower one', {
        code: (error as { code?: string }).code,
        tried: attempt.columns,
        requires: attempt.needs,
      })
      continue
    }

    for (const raw of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      out.set(raw.student_id as string, {
        nickname: (raw.nickname as string | null) ?? null,
        avatar_id: (raw.avatar_id as string | null) ?? null,
        avatar_config: raw.avatar_config ?? null,
      })
    }
    if (i > 0) {
      console.warn('[study/identity] served identities without', attempt.needs === 'nothing'
        ? 'any avatar columns'
        : `columns beyond ${attempt.columns}`)
    }
    return out
  }

  // Every rung failed: this is not a missing column, it is a broken
  // table. Names are gone either way, so say so loudly rather than
  // returning an empty map that reads as "no students have nicknames".
  console.error('[study/identity] every prefs select failed — identities will fall back to real names')
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
    // Normalised HERE and not on the client, for the same reason the id
    // is filtered here: what leaves the server is what this build can
    // draw. A stored config with a retired part reaches the client
    // already degraded, so every surface degrades identically instead
    // of each one deciding for itself.
    out.set(id, {
      display_name: nick ?? maskName(nameMap.get(id) ?? 'Student', id === selfId),
      avatar_id: avatarId,
      avatar_config: normaliseAvatarConfig(row?.avatar_config),
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
