import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { LEAGUE_TIERS } from '@/lib/study/league-rewards'

/**
 * GET /api/study/league — current week's leaderboard for the caller.
 *
 * Returns:
 *   - league tier + week_start
 *   - top 20 members sorted by xp_this_week DESC
 *   - the caller's own rank (1-indexed) + xp
 *   - seconds until weekly reset (Sunday 23:59:59 UTC)
 *
 * If the caller has not yet earned XP this week, they aren't in any
 * cohort yet — we return a "not joined yet" envelope so the UI can
 * prompt them to start studying.
 */

export const dynamic = 'force-dynamic'

interface LeaderboardRow {
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

  const blocked = enforceRateLimit(`league:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  // The caller's own public nickname — the league page gates joining behind
  // confirming a handle, so it needs to know whether one is set.
  const { data: myPrefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('nickname')
    .eq('student_id', user.id)
    .maybeSingle()
  const myNickname = (myPrefs?.nickname as string | null) ?? null

  // Current week start (Sunday-based ISO week — Postgres date_trunc('week') uses Monday).
  // We align to Monday-of-current-week UTC to match the SQL RPC.
  const now = new Date()
  const utcDay = now.getUTCDay()           // 0 = Sun, 1 = Mon, ...
  const diffFromMon = (utcDay + 6) % 7      // days since most-recent Monday
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffFromMon))
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000)
  const weekStartIso = weekStart.toISOString().slice(0, 10)

  // Find the caller's current-week membership.
  const { data: myMembership } = await supabaseAdmin
    .from('study_league_memberships')
    .select(`
      id, league_id, xp_this_week,
      league:study_leagues!inner ( tier, week_start, capacity )
    `)
    .eq('student_id', user.id)
    .eq('study_leagues.week_start', weekStartIso)
    .maybeSingle()

  const league = myMembership?.league as { tier: string; week_start: string; capacity: number } | { tier: string; week_start: string; capacity: number }[] | null
  const tier = (Array.isArray(league) ? league[0]?.tier : league?.tier) ?? null

  const resetSeconds = Math.max(0, Math.floor((weekEnd.getTime() - Date.now()) / 1000))

  if (!myMembership || !tier) {
    return NextResponse.json({
      joined: false,
      tier: null,
      weekStart: weekStartIso,
      resetSeconds,
      myRank: null,
      myXp: 0,
      leaderboard: [],
      myNickname,
    })
  }

  // Top 20 members in the same league, plus the total cohort size — the
  // promotion/relegation cutoffs are the top/bottom THIRD (see
  // close_study_league_week), so the UI needs the member count to draw
  // the right zone instead of a hardcoded rank.
  const [{ data: top }, { count: memberCount }] = await Promise.all([
    supabaseAdmin
      .from('study_league_memberships')
      .select('student_id, xp_this_week')
      .eq('league_id', myMembership.league_id)
      .order('xp_this_week', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('study_league_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', myMembership.league_id),
  ])

  const ids = (top ?? []).map(r => r.student_id)
  // Two identity sources, resolved in parallel: the real name (masked for
  // privacy) and the opt-in public nickname. A member who set a nickname
  // shows it UNMASKED — it's a handle they chose to be seen by; everyone
  // else keeps the masked real name.
  const [{ data: users }, { data: nickRows }] = await Promise.all([
    ids.length > 0
      ? supabaseAdmin.from('users').select('id, name').in('id', ids)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
    ids.length > 0
      ? supabaseAdmin.from('study_user_prefs').select('student_id, nickname').in('student_id', ids)
      : Promise.resolve({ data: [] as { student_id: string; nickname: string | null }[] }),
  ])
  const nameMap = new Map<string, string>()
  for (const u of (users ?? [])) nameMap.set(u.id as string, (u.name as string | null) ?? 'Student')
  const nickMap = new Map<string, string>()
  for (const r of (nickRows ?? [])) {
    if (r.nickname) nickMap.set(r.student_id as string, r.nickname as string)
  }

  const leaderboard: LeaderboardRow[] = (top ?? []).map((m, i) => {
    const sid = m.student_id as string
    const nick = nickMap.get(sid)
    return {
      student_id: sid,
      // Nickname wins (shown as-is); otherwise fall back to the masked name.
      display_name: nick ?? maskName(nameMap.get(sid) ?? 'Student', sid === user.id),
      xp_this_week: m.xp_this_week as number,
      rank: i + 1,
      is_me: sid === user.id,
    }
  })

  // Caller's actual rank — if not in top 20, count all members with
  // strictly more XP and add 1.
  let myRank = leaderboard.find(r => r.is_me)?.rank ?? null
  if (myRank === null) {
    const { count } = await supabaseAdmin
      .from('study_league_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', myMembership.league_id)
      .gt('xp_this_week', myMembership.xp_this_week)
    myRank = (count ?? 0) + 1
  }

  // Most-recent CLOSED membership — if its promotion_event is set and
  // we haven't shown it yet (closed_at within the last 36 hours), we
  // surface a "you were promoted!" banner on the page. 36 hours is
  // generous enough that a student who skips Monday morning still sees
  // it Tuesday evening.
  const { data: lastClosed } = await supabaseAdmin
    .from('study_league_memberships')
    .select(`
      final_rank, promotion_event, next_tier, closed_at,
      league:study_leagues!inner ( tier, week_start )
    `)
    .eq('student_id', user.id)
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let promotionNotice: null | {
    event: 'promoted' | 'held' | 'demoted'
    fromTier: string
    toTier: string
    finalRank: number
    rewardCredits: number
  } = null
  if (lastClosed && lastClosed.closed_at) {
    const ageMs = Date.now() - new Date(lastClosed.closed_at as string).getTime()
    if (ageMs < 36 * 60 * 60 * 1000) {
      const prevLeague = lastClosed.league as { tier: string; week_start: string } | { tier: string; week_start: string }[] | null
      const fromTier = (Array.isArray(prevLeague) ? prevLeague[0]?.tier : prevLeague?.tier) ?? null
      const closedWeek = (Array.isArray(prevLeague) ? prevLeague[0]?.week_start : prevLeague?.week_start) ?? null
      const event = lastClosed.promotion_event as 'promoted' | 'held' | 'demoted' | null
      const toTier = (lastClosed.next_tier as string | null) ?? fromTier
      if (event && fromTier && toTier) {
        // Credits earned from that closed week's podium / promotion /
        // milestone rewards, to show alongside the promotion banner.
        let rewardCredits = 0
        if (closedWeek) {
          const { data: rewardRows } = await supabaseAdmin
            .from('study_league_rewards')
            .select('credits')
            .eq('student_id', user.id)
            .eq('week_start', closedWeek)
          rewardCredits = (rewardRows ?? []).reduce((s, r) => s + ((r.credits as number) ?? 0), 0)
        }
        promotionNotice = {
          event,
          fromTier,
          toTier,
          finalRank: (lastClosed.final_rank as number) ?? 0,
          rewardCredits,
        }
      }
    }
  }

  // Season high — the highest tier the student has ever been placed in
  // (a cosmetic "personal best" for the league page). Includes the
  // current cohort's tier.
  const { data: myLeagues } = await supabaseAdmin
    .from('study_league_memberships')
    .select('league:study_leagues!inner(tier)')
    .eq('student_id', user.id)
  const tierIndex = (t: string | null | undefined) => (t ? LEAGUE_TIERS.indexOf(t as typeof LEAGUE_TIERS[number]) : -1)
  let seasonHigh: string | null = tier
  for (const row of myLeagues ?? []) {
    const lg = row.league as { tier: string } | { tier: string }[] | null
    const t = Array.isArray(lg) ? lg[0]?.tier : lg?.tier
    if (tierIndex(t) > tierIndex(seasonHigh)) seasonHigh = t ?? seasonHigh
  }

  return NextResponse.json({
    joined: true,
    tier,
    weekStart: weekStartIso,
    resetSeconds,
    myRank,
    myXp: myMembership.xp_this_week,
    memberCount: memberCount ?? leaderboard.length,
    leaderboard,
    promotionNotice,
    seasonHigh,
    myNickname,
  })
}

/** Privacy: show full name only for the caller; mask others to first
 *  syllable / initial + tail. Prevents accidental classmate exposure. */
function maskName(name: string, isMe: boolean): string {
  if (isMe) return name
  const trimmed = name.trim()
  if (trimmed.length <= 2) return trimmed
  // For Korean names: first char + ** + last char.
  const isKorean = /[ㄱ-힝]/.test(trimmed)
  if (isKorean) return `${trimmed[0]}**${trimmed[trimmed.length - 1]}`
  // For Latin names: first letter + dot.
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return `${parts[0][0]}***`
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}
