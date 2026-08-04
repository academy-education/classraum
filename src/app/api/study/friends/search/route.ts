import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { normalizeNickname } from '@/lib/study/nickname'
import { findFriendship } from '@/lib/study/friends'
import { resolveIdentities } from '@/lib/study/identity'

/**
 * GET /api/study/friends/search?q=<nickname>
 *
 * Prefix search over public nicknames for the "add by @username" flow.
 * Returns up to 8 matches with each result's current friendship state so
 * the UI can show Add / Pending / Friends inline. Excludes the caller.
 * Nickname is the only searchable field — real names are never searchable.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`friend-search:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const q = normalizeNickname(req.nextUrl.searchParams.get('q') ?? '')
  if (q.length < 2) return NextResponse.json({ results: [] })

  // Prefix match, ILIKE metachars escaped (nicknames may contain `_`).
  const pattern = q.replace(/([\\%_])/g, '\\$1') + '%'
  const { data } = await dbAdmin
    .from('study_user_prefs')
    .select('student_id, nickname')
    .ilike('nickname', pattern)
    .not('nickname', 'is', null)
    .limit(9)

  const rows = (data ?? []).filter(r => r.student_id !== user.id).slice(0, 8)

  // Annotate each with the current relationship so the row shows the right
  // action, plus their chosen avatar so a person looks the same here as in
  // the friends list. Cheap: the result set is capped at 8. avatar_id is
  // read through resolveIdentities rather than added to the select above,
  // because that helper tolerates migration 071 not being applied yet —
  // naming the column here directly would return zero search results
  // until it is.
  const avatars = await resolveIdentities(rows.map(r => r.student_id as string), user.id)
  const results = await Promise.all(rows.map(async r => {
    const edge = await findFriendship(user.id, r.student_id as string)
    const relation = !edge ? 'none'
      : edge.status === 'accepted' ? 'friends'
      : edge.requester_id === user.id ? 'pending_out' : 'pending_in'
    return {
      student_id: r.student_id as string,
      nickname: r.nickname as string,
      avatar_id: avatars.get(r.student_id as string)?.avatar_id ?? null,
      avatar_config: avatars.get(r.student_id as string)?.avatar_config ?? null,
      relation,
    }
  }))

  return NextResponse.json({ results })
}
