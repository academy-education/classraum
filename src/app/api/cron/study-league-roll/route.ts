import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyStudent } from '@/lib/study/notify'
import { grantLeagueRewards } from '@/lib/study/league-rewards'

/**
 * GET /api/cron/study-league-roll — Sunday-night promotion / relegation.
 *
 * Runs Monday 00:05 UTC (= Sunday 19:05 EST, KST Monday 09:05).
 * Closes every cohort from the prior week:
 *   - Snapshots final_rank per member
 *   - Top third → promoted (next tier)
 *   - Middle third → held
 *   - Bottom third → demoted (prev tier)
 * Diamond can't promote further; Bronze can't demote.
 *
 * award_study_xp reads next_tier from each student's most-recent
 * closed membership when they earn XP the following week, placing
 * them into the right tier automatically.
 *
 * Auth: CRON_SECRET_KEY bearer header (same pattern as other crons).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET_KEY}`
  if (!process.env.CRON_SECRET_KEY || authHeader !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Close the week that ended yesterday (Sunday → its week_start is
  // the Monday 7 days back). The cron fires Monday 00:05 UTC.
  const now = new Date()
  const lastMonday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7) - 7,
  ))
  const lastWeekStart = lastMonday.toISOString().slice(0, 10)

  const { data: processed, error } = await supabaseAdmin
    .rpc('close_study_league_week', { p_week_start: lastWeekStart })

  if (error) {
    console.error('[study-league-roll]', error)
    return NextResponse.json({ error: error.message, weekStart: lastWeekStart }, { status: 500 })
  }

  // Notify every closed-week member so the result lands in their
  // notifications inbox alongside system events. The league page also
  // surfaces it as a banner for 36h — the inbox row stays around as
  // a permanent record.
  const { data: closed } = await supabaseAdmin
    .from('study_league_memberships')
    .select(`
      student_id, promotion_event, next_tier, final_rank,
      league:study_leagues!inner ( tier, week_start )
    `)
    .eq('study_leagues.week_start', lastWeekStart)
    .not('closed_at', 'is', null)

  let notified = 0
  let creditsAwarded = 0
  for (const m of closed ?? []) {
    const event = m.promotion_event as 'promoted' | 'held' | 'demoted' | null
    const fromTier = (Array.isArray(m.league) ? m.league[0]?.tier : (m.league as { tier: string } | null)?.tier) ?? null
    const toTier = (m.next_tier as string | null) ?? fromTier
    const rank = m.final_rank as number | null
    if (!event || !fromTier || !toTier || !rank) continue

    // Grant podium / promotion / first-tier-milestone credit rewards
    // BEFORE notifying, so the notification can mention what was earned.
    // Idempotent — a cron re-run never double-pays.
    const reward = await grantLeagueRewards({
      studentId: m.student_id as string,
      weekStart: lastWeekStart,
      fromTier,
      finalRank: rank,
      promotionEvent: event,
      nextTier: toTier,
    })
    creditsAwarded += reward.total

    const title = event === 'promoted'
      ? `승급! ${toTier} 리그로 이동`
      : event === 'demoted'
        ? `${toTier} 리그로 강등`
        : `${toTier} 리그 유지`
    const base = `지난주 ${rank}위 — ${fromTier} → ${toTier}`
    const message = reward.total > 0
      ? `${base} · 크레딧 ${reward.total}개 획득`
      : base
    await notifyStudent({
      studentId: m.student_id as string,
      kind: event === 'demoted' ? 'study_league_demoted' : 'study_league_promoted',
      title,
      message,
      link: '/mobile/study/league',
      push: true,
    })
    notified++
  }

  return NextResponse.json({
    weekStart: lastWeekStart,
    cohortsProcessed: processed ?? 0,
    notified,
    creditsAwarded,
  })
}
