import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { resolveDisplayNames } from '@/lib/study/identity'
import { listAcceptedFriendIds } from '@/lib/study/friends'

/**
 * GET /api/study/friends/leaderboard
 *
 * The caller + their accepted friends, ranked by XP earned this week.
 * Weekly XP is read from the OPEN league membership (closed_at IS NULL is
 * the current week), so the numbers match the league leaderboard exactly;
 * a friend with no XP this week has no open membership and shows 0.
 */

export const dynamic = 'force-dynamic'

interface FriendRow {
  student_id: string
  display_name: string
  xp_this_week: number
  rank: number
  is_me: boolean
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const friendIds = await listAcceptedFriendIds(user.id)
  const ids = [user.id, ...friendIds]

  const [{ data: memberships }, names] = await Promise.all([
    supabaseAdmin
      .from('study_league_memberships')
      .select('student_id, xp_this_week')
      .in('student_id', ids)
      .is('closed_at', null),
    resolveDisplayNames(ids, user.id),
  ])

  const xp = new Map<string, number>()
  for (const m of (memberships ?? [])) xp.set(m.student_id as string, (m.xp_this_week as number) ?? 0)

  const rows: FriendRow[] = ids
    .map(id => ({
      student_id: id,
      display_name: names.get(id) ?? 'Student',
      xp_this_week: xp.get(id) ?? 0,
      rank: 0,
      is_me: id === user.id,
    }))
    // XP desc; stable tiebreak by name so ranks don't jump between loads.
    .sort((a, b) => b.xp_this_week - a.xp_this_week || a.display_name.localeCompare(b.display_name))
    .map((r, i) => ({ ...r, rank: i + 1 }))

  const myRank = rows.find(r => r.is_me)?.rank ?? 1
  return NextResponse.json({ rows, friendCount: friendIds.length, myRank })
}
