import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { notifyStudent } from '@/lib/study/notify'
import { tierParam } from '@/lib/study/notification-copy'
import { grantLeagueRewards } from '@/lib/study/league-rewards'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'

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

type PromotionEvent = 'promoted' | 'held' | 'demoted'

/**
 * study_league_memberships.promotion_event is plain nullable text, so the
 * typed row hands us `string | null`. close_study_league_week only ever
 * writes these three values; this guard turns that expectation into a
 * checked one so a stray value is skipped rather than propagated.
 */
function isPromotionEvent(v: string | null): v is PromotionEvent {
  return v === 'promoted' || v === 'held' || v === 'demoted'
}

export async function GET(req: NextRequest) {
  // Shared guard: accepts CRON_SECRET (the name Vercel Cron actually
  // requires to send its Authorization header) as well as the legacy
  // CRON_SECRET_KEY, and allows genuinely-local dev through. This
  // route previously inlined its own CRON_SECRET_KEY check, so the
  // CRON_SECRET fix did not reach it and it would still 401 in prod.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat timing starts past the auth guard — a 401'd request never
  // ran the job, so nothing below may report on its behalf.
  const startedAt = Date.now()

  // Close the week that ended yesterday (Sunday → its week_start is
  // the Monday 7 days back). The cron fires Monday 00:05 UTC.
  const now = new Date()
  const lastMonday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7) - 7,
  ))
  const lastWeekStart = lastMonday.toISOString().slice(0, 10)

  const { data: processed, error } = await dbAdmin
    .rpc('close_study_league_week', { p_week_start: lastWeekStart })

  if (error) {
    console.error('[study-league-roll]', error)
    // The roll is the whole job — a failed RPC means no cohort closed.
    // Recorded explicitly because this branch returns rather than throws.
    await recordHeartbeat(
      'study-league-roll',
      { ok: false, detail: { weekStart: lastWeekStart, error: error.message } },
      Date.now() - startedAt,
    )
    return NextResponse.json({ error: error.message, weekStart: lastWeekStart }, { status: 500 })
  }

  // Notify every closed-week member so the result lands in their
  // notifications inbox alongside system events. The league page also
  // surfaces it as a banner for 36h — the inbox row stays around as
  // a permanent record.
  const { data: closed } = await dbAdmin
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
    // promotion_event is a plain nullable text column in Postgres, so the
    // typed row gives us `string | null`. Narrow it with a real runtime
    // guard rather than asserting — an unexpected value from the RPC now
    // skips the row instead of being force-fed to grantLeagueRewards.
    const event = isPromotionEvent(m.promotion_event) ? m.promotion_event : null
    const fromTier = m.league?.tier ?? null
    const toTier = m.next_tier ?? fromTier
    const rank = m.final_rank
    if (!event || !fromTier || !toTier || !rank) continue

    // Grant podium / promotion / first-tier-milestone credit rewards
    // BEFORE notifying, so the notification can mention what was earned.
    // Idempotent — a cron re-run never double-pays.
    const reward = await grantLeagueRewards({
      studentId: m.student_id,
      weekStart: lastWeekStart,
      fromTier,
      finalRank: rank,
      promotionEvent: event,
      nextTier: toTier,
    })
    creditsAwarded += reward.total

    // Copy is chosen by (kind, variant); the tier names travel as
    // `@`-prefixed translation-key references so the reader sees
    // "Silver" or "실버" depending on THEIR language, not this cron's.
    const credited = reward.total > 0
    const titleParams = { tier: tierParam(toTier) }
    const messageParams = {
      rank,
      fromTier: tierParam(fromTier),
      toTier: tierParam(toTier),
      ...(credited ? { credits: reward.total } : {}),
    }
    if (event === 'demoted') {
      await notifyStudent({
        studentId: m.student_id,
        kind: 'study_league_demoted',
        variant: credited ? 'demotedCredits' : 'demoted',
        titleParams,
        messageParams,
        link: '/mobile/study/league',
        push: true,
      })
    } else {
      await notifyStudent({
        studentId: m.student_id,
        kind: 'study_league_promoted',
        variant: event === 'promoted'
          ? (credited ? 'promotedCredits' : 'promoted')
          : (credited ? 'stayedCredits' : 'stayed'),
        titleParams,
        messageParams,
        link: '/mobile/study/league',
        push: true,
      })
    }
    notified++
  }

  const summary = {
    weekStart: lastWeekStart,
    cohortsProcessed: processed ?? 0,
    notified,
    creditsAwarded,
  }
  await recordHeartbeat('study-league-roll', { ok: true, detail: summary }, Date.now() - startedAt)

  return NextResponse.json(summary)
}
