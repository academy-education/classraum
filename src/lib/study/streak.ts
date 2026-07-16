import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyStudent } from '@/lib/study/notify'

/**
 * Streak + freeze engine.
 *
 * The raw streak is derived from study_sessions.last_active_at (distinct
 * active days, walked back from today with yesterday-grace). On top of
 * that we layer a FREEZE: an inventory of tokens that auto-protect a
 * missed day so a single skipped day doesn't reset a long streak.
 *
 * State lives in study_streak_state (one row/student). Evaluation runs
 * lazily on read (streak + landing endpoints) — no cron dependency. It's
 * idempotent: a protected day is recorded so a freeze is never charged
 * twice, and milestone grants ratchet on last_milestone_awarded.
 */

const MAX_FREEZES = 2          // inventory cap
const SEED_FREEZES = 1         // new students start with one freeze
const MILESTONE_EVERY = 7      // grant a freeze each 7-day streak milestone
const WINDOW_DAYS = 60         // activity look-back (matches the streak route)

/** Local day key (YYYY-MM-DD). Server runs in UTC on Vercel; using the
 *  same local getters as the existing streak routes keeps the number
 *  identical. Padded so the string is a valid Postgres `date` literal. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevDay(d: Date): Date {
  const n = new Date(d)
  n.setDate(n.getDate() - 1)
  return n
}

export interface FreezeEval {
  /** Streak length — active days only; protected (frozen) days keep the
   *  chain alive but don't increment the count. */
  streak: number
  /** Freezes remaining after any consumed this evaluation. */
  freezesLeft: number
  /** Day keys newly protected by a freeze in THIS evaluation. */
  newlyProtected: string[]
}

/**
 * Pure freeze computation — exported for unit testing. Walks back from
 * today; when it hits a missed, unprotected day it measures the whole
 * contiguous missed run up to the next covered day and consumes one
 * freeze per day ONLY if the inventory can bridge the entire run (so a
 * freeze is never wasted on an unbridgeable gap).
 */
export function computeStreakWithFreeze(
  activeKeys: Set<string>,
  protectedKeys: Set<string>,
  freezes: number,
  today: Date,
): FreezeEval {
  // Yesterday-grace: today isn't required to keep the streak alive.
  let cursor = new Date(today)
  if (!activeKeys.has(dayKey(today)) && !protectedKeys.has(dayKey(today))) {
    cursor = prevDay(today)
  }

  let streak = 0
  let freezesLeft = freezes
  const newlyProtected: string[] = []
  let guard = 0

  while (guard++ < 500) {
    const k = dayKey(cursor)
    if (activeKeys.has(k)) { streak++; cursor = prevDay(cursor); continue }
    if (protectedKeys.has(k)) { cursor = prevDay(cursor); continue } // already frozen — bridges, no increment

    // Missed & unprotected: measure the contiguous missed run back to the
    // next covered (active or already-protected) day.
    let runLen = 0
    let scan = new Date(cursor)
    let scanGuard = 0
    while (
      !activeKeys.has(dayKey(scan)) &&
      !protectedKeys.has(dayKey(scan)) &&
      scanGuard++ < WINDOW_DAYS + 5
    ) {
      runLen++
      scan = prevDay(scan)
    }
    const bridgesToCovered = activeKeys.has(dayKey(scan)) || protectedKeys.has(dayKey(scan))

    if (bridgesToCovered && runLen >= 1 && freezesLeft >= runLen) {
      // Consume freezes to protect the whole run, then continue from the
      // covered day beyond it.
      let c = new Date(cursor)
      for (let i = 0; i < runLen; i++) { newlyProtected.push(dayKey(c)); c = prevDay(c) }
      freezesLeft -= runLen
      cursor = scan
      continue
    }
    break // can't (or needn't) bridge — streak ends here
  }

  return { streak, freezesLeft, newlyProtected }
}

export interface StreakResult {
  streak: number
  freezes: number
  maxStreak: number
  /** A meaningful (≥3) streak that fully lapsed with no freeze left to
   *  save it — drives the "streak lost, start fresh" banner. */
  priorLostStreak: number
  /** A freeze is currently holding the streak (yesterday was missed but
   *  protected) — drives the positive "streak protected" banner. */
  streakSaved: boolean
}

/**
 * Evaluate + persist a student's streak/freeze state. Safe to call on
 * every read; idempotent within a day.
 */
export async function evaluateStreak(studentId: string): Promise<StreakResult> {
  const today = new Date()
  const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()

  const [{ data: sessRows }, { data: stateRow }] = await Promise.all([
    supabaseAdmin
      .from('study_sessions')
      .select('last_active_at')
      .eq('student_id', studentId)
      .gte('last_active_at', cutoff)
      .order('last_active_at', { ascending: false })
      .limit(500),
    supabaseAdmin
      .from('study_streak_state')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle(),
  ])

  const activeKeys = new Set<string>()
  for (const r of sessRows ?? []) {
    if (r.last_active_at) activeKeys.add(dayKey(new Date(r.last_active_at as string)))
  }

  let freezes = (stateRow?.freezes as number | undefined) ?? SEED_FREEZES
  let lastMilestone = (stateRow?.last_milestone_awarded as number | undefined) ?? 0
  let maxStreak = (stateRow?.max_streak as number | undefined) ?? 0
  const lastSavedOn = (stateRow?.last_saved_notified_on as string | null) ?? null

  // Prune protected days outside the window so the array stays bounded.
  const windowKeys = new Set<string>()
  {
    let d = new Date(today)
    for (let i = 0; i <= WINDOW_DAYS; i++) { windowKeys.add(dayKey(d)); d = prevDay(d) }
  }
  const priorProtected = ((stateRow?.protected_days as string[] | null) ?? [])
    // Postgres returns dates as 'YYYY-MM-DD'; normalize to our key format.
    .map(s => dayKey(new Date(s)))
    .filter(k => windowKeys.has(k))
  const protectedKeys = new Set(priorProtected)

  const evalResult = computeStreakWithFreeze(activeKeys, protectedKeys, freezes, today)
  const streak = evalResult.streak
  freezes = evalResult.freezesLeft

  // Milestone freeze grants — one per 7-day boundary crossed, capped.
  const milestone = Math.floor(streak / MILESTONE_EVERY) * MILESTONE_EVERY
  if (milestone > lastMilestone && milestone >= MILESTONE_EVERY) {
    if (freezes < MAX_FREEZES) freezes = Math.min(MAX_FREEZES, freezes + 1)
    lastMilestone = milestone // advance even if capped so we don't retry every read
  } else if (milestone < lastMilestone) {
    lastMilestone = milestone // streak reset — lower the ratchet so future milestones re-grant
  }

  maxStreak = Math.max(maxStreak, streak)

  const mergedProtected = Array.from(new Set([...priorProtected, ...evalResult.newlyProtected]))
  const mergedProtectedSet = new Set(mergedProtected)

  const todayKey = dayKey(today)
  const yesterdayKey = dayKey(prevDay(today))

  // A freeze is holding the streak right now: yesterday was missed but is
  // protected, and the student hasn't studied yet today. Persists across
  // reads for the day (not just the eval that consumed the freeze).
  const streakSaved =
    streak > 0 &&
    !activeKeys.has(todayKey) &&
    !activeKeys.has(yesterdayKey) &&
    mergedProtectedSet.has(yesterdayKey)

  // Notify at most once/day, only on an actual consumption this eval.
  const consumedThisEval = evalResult.newlyProtected.length > 0
  const notify = consumedThisEval && streak > 0 && lastSavedOn !== todayKey

  await supabaseAdmin
    .from('study_streak_state')
    .upsert({
      student_id: studentId,
      freezes,
      protected_days: mergedProtected,
      max_streak: maxStreak,
      last_milestone_awarded: lastMilestone,
      last_saved_notified_on: notify ? todayKey : lastSavedOn,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' })

  if (notify) {
    await notifyStudent({
      studentId,
      kind: 'study_streak_saved',
      title: '❄️ Streak protected',
      message: `A streak freeze saved your ${streak}-day streak. Study today to keep it going!`,
      link: '/mobile/study',
      push: true,
    })
  }

  // Prior-lost streak (for the "start fresh" banner) — only when there's
  // genuinely no active streak and no freeze rescued it.
  let priorLostStreak = 0
  if (streak === 0) {
    const hasToday = activeKeys.has(todayKey)
    const hasYesterday = activeKeys.has(yesterdayKey)
    if (!hasToday && !hasYesterday) {
      let walk = prevDay(prevDay(today))
      while (activeKeys.has(dayKey(walk)) && priorLostStreak < 400) {
        priorLostStreak++
        walk = prevDay(walk)
      }
    }
  }

  return { streak, freezes, maxStreak, priorLostStreak, streakSaved }
}
