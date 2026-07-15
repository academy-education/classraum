import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolvePlan } from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET /api/study/stats — lifetime + weekly aggregates for the
 * student. Powers the stats dashboard.
 *
 * Returns total counts (sessions, attempts, correct), accuracy,
 * total hours, per-day question count for the last 14 days (for a
 * sparkline), top mastered + weak topics. All scoped to the caller.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Current ISO-week (Mon-Sun) start in UTC. Matches award_study_xp.
  const now = new Date()
  const utcDay = now.getUTCDay()
  const diffFromMon = (utcDay + 6) % 7
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffFromMon))
  const weekStartIso = weekStart.toISOString()
  const weekStartDate = weekStartIso.slice(0, 10)

  // Counts.
  const [
    { count: sessionCount },
    { data: attempts },
    { data: mastery },
    { count: snapCount },
    { count: responseCount },
  ] = await Promise.all([
    supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('archived', false),
    // Archived sessions (and every question answered inside them) are
    // excluded from all aggregates — matching the history page, which
    // hides archived sessions entirely.
    supabaseAdmin
      .from('study_attempts')
      .select(`
        id, is_correct, time_spent_seconds, created_at,
        session:study_sessions!inner ( student_id, archived )
      `)
      .eq('session.student_id', user.id)
      .eq('session.archived', false),
    supabaseAdmin
      .from('study_mastery')
      .select(`
        score, attempts_count,
        topic:study_topics ( name_en, name_ko, slug )
      `)
      .eq('student_id', user.id)
      .order('score', { ascending: false }),
    supabaseAdmin
      .from('study_snap_captures')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id),
    supabaseAdmin
      .from('study_response_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', user.id),
  ])

  const totalAttempts = attempts?.length ?? 0
  // Accuracy is over GRADABLE attempts only. Open-response items (writing /
  // speaking) store is_correct=null — they have no objective verdict, so
  // they belong in neither the numerator nor the denominator. Counting them
  // (as the old `filter(a => a.is_correct)` over all attempts did) inflated
  // accuracy on TOEFL/IELTS. totalAttempts stays all-inclusive for the
  // "questions practiced" style counters/achievements.
  const gradableAttempts = attempts?.filter(a => a.is_correct !== null).length ?? 0
  const correct = attempts?.filter(a => a.is_correct === true).length ?? 0
  const accuracy = gradableAttempts === 0 ? 0 : Math.round((correct / gradableAttempts) * 100)
  const totalSeconds = (attempts ?? []).reduce((s, a) => s + ((a.time_spent_seconds as number | null) ?? 0), 0)
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10  // 1 decimal

  // Bucket every attempt per local-day so we can build BOTH the 14d
  // sparkline AND the 90d heatmap from the same pass.
  const dayBuckets: Record<string, number> = {}
  for (const a of attempts ?? []) {
    const d = new Date(a.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dayBuckets[key] = (dayBuckets[key] ?? 0) + 1
  }
  const last14: Array<{ date: string; count: number }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    last14.push({ date: key, count: dayBuckets[key] ?? 0 })
  }
  const last90: Array<{ date: string; count: number }> = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    last90.push({ date: key, count: dayBuckets[key] ?? 0 })
  }

  // Score trajectory — completed full-test scores per topic (topic =
  // section identity, e.g. toefl-reading), oldest→newest so the client
  // can draw "42% → 61% over 3 attempts" trend lines. Only topics with
  // 2+ completed tests are returned (one point isn't a trend).
  const { data: testSessions } = await supabaseAdmin
    .from('study_sessions')
    .select(`
      score, completed_at,
      topic:study_topics ( name_en, name_ko, slug )
    `)
    .eq('student_id', user.id)
    .eq('archived', false)
    .eq('mode', 'full_test')
    .eq('status', 'completed')
    .not('score', 'is', null)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true })

  type TrendTopic = { name_en: string; name_ko: string; slug: string }
  const trendMap = new Map<string, { topic: TrendTopic; attempts: Array<{ score: number; date: string }> }>()
  for (const row of testSessions ?? []) {
    const topicRaw = row.topic as unknown
    const topic = (Array.isArray(topicRaw) ? topicRaw[0] : topicRaw) as TrendTopic | null
    if (!topic?.slug) continue
    const entry = trendMap.get(topic.slug) ?? { topic, attempts: [] }
    entry.attempts.push({
      score: Math.round(Number(row.score)),
      date: (row.completed_at as string).slice(0, 10),
    })
    trendMap.set(topic.slug, entry)
  }
  let scoreTrend = [...trendMap.values()]
    .filter(e => e.attempts.length >= 2)
    // Cap to the last 10 attempts per topic so the payload + chart
    // stay bounded for heavy users.
    .map(e => ({ ...e.topic, attempts: e.attempts.slice(-10) }))
    // Most recently active topic first.
    .sort((a, b) => (b.attempts[b.attempts.length - 1]!.date).localeCompare(a.attempts[a.attempts.length - 1]!.date))

  // Score analytics are a Premium capability. General/trial users get
  // an empty trend + a locked flag so the stats page renders an
  // upsell card instead of the chart.
  const { data: subRow } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', user.id)
    .maybeSingle()
  const isPremium = subRow?.status === 'active' && resolvePlan(subRow.plan).tier === 'premium'
  const scoreTrendLocked = !isPremium && scoreTrend.length > 0
  if (!isPremium) scoreTrend = []

  // Top mastered + weakest topics (score-based, attempts >= 2).
  type MasteryRow = { score: number; attempts_count: number; topic: { name_en: string; name_ko: string; slug: string } | null }
  const masteryRows = (mastery ?? []).map(m => {
    const topicRaw = m.topic as unknown
    const topic = Array.isArray(topicRaw) ? (topicRaw[0] as MasteryRow['topic']) ?? null : (topicRaw as MasteryRow['topic']) ?? null
    return { score: m.score, attempts_count: m.attempts_count, topic }
  }).filter(r => r.attempts_count >= 2 && r.topic)
  const topMastered = masteryRows.filter(r => r.score >= 80).slice(0, 3)
  const topWeak = [...masteryRows].filter(r => r.score < 70).sort((a, b) => a.score - b.score).slice(0, 3)

  // Achievements — pure derivations from the data we already have.
  // No new schema; just compute and tag in the response. Each entry
  // is an i18n key that the client renders + an unlocked flag.
  const masteredCount = masteryRows.filter(r => r.score >= 80).length
  const achievements = [
    { key: 'firstSteps',     unlocked: totalAttempts >= 1,    threshold: 1,    value: totalAttempts },
    { key: 'centurion',      unlocked: totalAttempts >= 100,  threshold: 100,  value: totalAttempts },
    { key: 'marathoner',     unlocked: totalAttempts >= 1000, threshold: 1000, value: totalAttempts },
    { key: 'sharpshooter',   unlocked: totalAttempts >= 20 && accuracy >= 90, threshold: 90, value: accuracy },
    { key: 'dedicated',      unlocked: totalHours >= 1,       threshold: 1,    value: totalHours },
    { key: 'devoted',        unlocked: totalHours >= 10,      threshold: 10,   value: totalHours },
    { key: 'firstMastery',   unlocked: masteredCount >= 1,    threshold: 1,    value: masteredCount },
    { key: 'polyglot',       unlocked: masteredCount >= 5,    threshold: 5,    value: masteredCount },
    { key: 'sessionStarter', unlocked: (sessionCount ?? 0) >= 10,  threshold: 10,  value: sessionCount ?? 0 },
    { key: 'sessionMaster',  unlocked: (sessionCount ?? 0) >= 50,  threshold: 50,  value: sessionCount ?? 0 },
  ]

  // Weekly XP, active days, and league rank — for the "This week" panel.
  const [{ data: weekXpEvents }, { data: membership }] = await Promise.all([
    supabaseAdmin
      .from('study_xp_events')
      .select('xp, created_at')
      .eq('student_id', user.id)
      .gte('created_at', weekStartIso),
    supabaseAdmin
      .from('study_league_memberships')
      .select(`
        xp_this_week, league_id,
        league:study_leagues!inner ( tier, week_start )
      `)
      .eq('student_id', user.id)
      .eq('study_leagues.week_start', weekStartDate)
      .maybeSingle(),
  ])

  const weekXp = (weekXpEvents ?? []).reduce((s, e) => s + ((e.xp as number) ?? 0), 0)
  const activeDaySet = new Set<string>()
  for (const e of (weekXpEvents ?? [])) {
    activeDaySet.add((e.created_at as string).slice(0, 10))
  }
  // Also count attempt days as active (older attempts pre-XP, or chat-only).
  const weekAttempts = (attempts ?? []).filter(a => (a.created_at as string) >= weekStartIso)
  for (const a of weekAttempts) activeDaySet.add((a.created_at as string).slice(0, 10))
  const activeDays = activeDaySet.size

  const league = membership?.league as { tier: string; week_start: string } | { tier: string; week_start: string }[] | null
  const leagueTier = (Array.isArray(league) ? league[0]?.tier : league?.tier) ?? null

  let leagueRank: number | null = null
  if (membership?.league_id) {
    const { count: ahead } = await supabaseAdmin
      .from('study_league_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', membership.league_id)
      .gt('xp_this_week', membership.xp_this_week as number)
    leagueRank = (ahead ?? 0) + 1
  }

  return NextResponse.json({
    sessionCount: sessionCount ?? 0,
    totalAttempts,
    correct,
    accuracy,
    totalHours,
    last14,
    last90,
    scoreTrend,
    scoreTrendLocked,
    topMastered,
    topWeak,
    achievements,
    snapCount: snapCount ?? 0,
    responseCount: responseCount ?? 0,
    week: {
      xp: weekXp,
      activeDays,
      tier: leagueTier,
      rank: leagueRank,
    },
  })
}
