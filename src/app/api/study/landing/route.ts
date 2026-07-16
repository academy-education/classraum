import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { computeDailyChallenge } from '@/lib/study/daily-challenge'
import { requireStudyUser } from '@/lib/study/auth'
import { evaluateStreak } from '@/lib/study/streak'

/**
 * GET /api/study/landing — batched landing-page summary.
 *
 * The landing surface fires many small independent queries on cold
 * load (streak, active session for Resume banner, ready-tests count,
 * daily challenge state, SRS review counts). Consolidating them into
 * one server round-trip cuts tail-latency: individual fetches from
 * the client each incur an auth roundtrip + connection setup on the
 * Supabase side.
 *
 * Returns:
 *   streak            — server-authoritative day count (matches
 *                       /api/study/streak, computed here to avoid a
 *                       second query in the same request).
 *   activeSession     — most-recent non-completed session or null,
 *                       for the Resume banner.
 *   readyTests        — number of full_test rows at generation=ready.
 *   priorLostStreak   — days that lapsed when the student missed
 *                       both today AND yesterday; drives the streak-
 *                       at-risk banner. Zero if streak is still safe.
 *   progress          — today's minutes / questions / sessions +
 *                       goal, mirrors /api/study/progress. Consumed
 *                       by StudyHero, TodayProgressRing, and the
 *                       DailyGoalCelebration overlay.
 *   prefs             — the student's stored study prefs row (auto-
 *                       created if missing), mirrors /api/study/prefs.
 *                       Consumed by useOnboardingGate and the target-
 *                       test hoist on the landing.
 *
 * Individual sub-features (RecommendedShelf, MistakeBankShelf,
 * DailyChallenge, DailyReview) keep their existing endpoints because
 * they either have their own caching, POST semantics, or richer data
 * requirements. This route covers the top-of-fold band only.
 */

export const dynamic = 'force-dynamic'

interface ActiveSession {
  id: string
  mode: string
  title: string | null
  last_active_at: string
  topic_freeform: string | null
  topic: { name_en: string; name_ko: string } | null
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`landing:user:${user.id}`, { windowMs: 60 * 1000, max: 60 })
  if (blocked) return blocked

  const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [
    streakState,
    { data: activeRow },
    { count: readyCount },
    { data: attempts },
    { data: prefsRow },
    { data: subRow },
    { data: xpRows },
    dailyChallenge,
    { count: completedTestCount },
  ] = await Promise.all([
    // Streak + freeze: derives the count, auto-consumes freezes to bridge a
    // missed day, grants milestone freezes, and persists study_streak_state.
    evaluateStreak(user.id),
    supabaseAdmin
      .from('study_sessions')
      .select(`
        id, mode, title, last_active_at, topic_freeform,
        topic:study_topics ( name_en, name_ko )
      `)
      .eq('student_id', user.id)
      .eq('archived', false)
      .neq('status', 'completed')
      .order('last_active_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('archived', false)
      .eq('mode', 'full_test')
      .eq('status', 'active')
      .eq('generation_status', 'ready'),
    // Archived sessions' questions don't count toward today's totals —
    // consistent with the stats page and history.
    supabaseAdmin
      .from('study_attempts')
      .select(`
        time_spent_seconds, created_at,
        session:study_sessions!inner ( student_id, id, archived )
      `)
      .eq('session.student_id', user.id)
      .eq('session.archived', false)
      .gte('created_at', todayIso),
    supabaseAdmin
      .from('study_user_prefs')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle(),
    supabaseAdmin
      .from('study_subscriptions')
      .select('status')
      .eq('student_id', user.id)
      .maybeSingle(),
    // Today's XP — the hero stat row shows this instead of repeating
    // the streak (already shown in the hero chip).
    supabaseAdmin
      .from('study_xp_events')
      .select('xp')
      .eq('student_id', user.id)
      .gte('created_at', todayIso),
    computeDailyChallenge(user.id),
    // Activation: has the student ever COMPLETED a test? Drives the
    // first-test nudge for brand-new users (first-test completion is the
    // key activation signal).
    supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('mode', 'full_test')
      .eq('status', 'completed'),
  ])

  // Streak + freeze state (evaluated + persisted by evaluateStreak above).
  const { streak, freezes, maxStreak, priorLostStreak, streakSaved } = streakState

  // Progress block — mirrors /api/study/progress logic. Goal minutes
  // are read off the prefs row we already fetched above rather than
  // making a second call.
  const sessionIds = new Set<string>()
  let totalSeconds = 0
  for (const a of attempts ?? []) {
    totalSeconds += (a.time_spent_seconds as number | null) ?? 0
    const s = a.session as { id: string } | { id: string }[] | null
    const id = Array.isArray(s) ? s[0]?.id : s?.id
    if (id) sessionIds.add(id)
  }
  const goalMinutes = (prefsRow?.daily_goal_minutes as number | undefined) ?? 30
  const progress = {
    questionsToday: attempts?.length ?? 0,
    minutesToday: Math.round(totalSeconds / 60),
    sessionsToday: sessionIds.size,
    goalMinutes,
  }

  // Prefs block — auto-create default row on first visit so
  // useOnboardingGate can flip the wizard on for new users. Matches
  // /api/study/prefs's insert-on-miss behavior.
  let prefs = prefsRow
  if (!prefs) {
    const { data: created } = await supabaseAdmin
      .from('study_user_prefs')
      .insert({ student_id: user.id })
      .select()
      .single()
    prefs = created
  }

  return NextResponse.json({
    streak,
    priorLostStreak,
    // Streak-freeze state — inventory + whether a freeze is currently
    // holding the streak (drives the freeze chip + "protected" banner).
    freezes,
    maxStreak,
    streakSaved,
    readyTests: readyCount ?? 0,
    // True until the student finishes their first mock test — the landing
    // shows the first-test activation nudge while this holds.
    firstTestPending: (completedTestCount ?? 0) === 0,
    activeSession: (activeRow as unknown as ActiveSession | null) ?? null,
    progress,
    prefs,
    // Paid-tier gating for landing surfaces (e.g. the Recommended
    // shelf is a paid feature). 'free' when no row exists yet.
    subscriptionStatus: (subRow?.status as string | null) ?? 'free',
    xpToday: (xpRows ?? []).reduce((s, r) => s + ((r.xp as number | null) ?? 0), 0),
    // Batched so the landing's Today band paints in one frame instead
    // of the challenge card popping in after its own fetch.
    dailyChallenge,
  })
}
