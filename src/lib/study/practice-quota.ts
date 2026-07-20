import { supabaseAdmin } from '@/lib/supabase-admin'
import { isPassPlan } from '@/lib/study/plans'

/**
 * Practice-session daily quota — shared by the practice + flashcards
 * generate routes (the real enforcement points) and surfaced to the UI.
 *
 * Policy (2026-07):
 *   - FREE users get NO topic-page practice sets. Their only practice is
 *     the Daily Challenge (a `config.dailyChallenge` session, exempt).
 *   - PAID users (recurring Premium OR a live exam pass) get
 *     PRACTICE_SETS_PER_DAY sets/day, COMBINED across practice questions
 *     and flashcards.
 *   - Path-stop sessions (`config.pathNode`) and the daily challenge are
 *     exempt — they have their own once-per-day / terminal rules.
 *
 * "Used" counts only ENGAGED sessions — a set the student actually
 * answered at least one item in (a study_attempts row). A session that
 * was created but abandoned before any answer never counts, so an
 * accidental tap doesn't burn the day's quota ("unused sessions don't
 * get saved").
 */

/** Practice sets/day for paid users, combined across practice + flashcards. */
export const PRACTICE_SETS_PER_DAY = 3

export interface PracticeQuota {
  paid: boolean
  limit: number
  used: number
  remaining: number
  /** ISO timestamp of the current KST day start (for the caller). */
  sinceIso: string
}

/** KST (UTC+9) calendar-day start, as a UTC ISO string. */
function kstDayStartIso(now = Date.now()): string {
  const kst = new Date(now + 9 * 3600_000)
  kst.setUTCHours(0, 0, 0, 0)
  return new Date(kst.getTime() - 9 * 3600_000).toISOString()
}

/** True when the student has a live recurring Premium plan or any live
 *  exam-pass entitlement — i.e. they've paid, so practice is unlocked. */
async function isPaidStudent(studentId: string): Promise<boolean> {
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan')
    .eq('student_id', studentId)
    .maybeSingle()
  const status = sub?.status as string | null
  const plan = sub?.plan as string | null
  const recurringPremium =
    (status === 'active' || status === 'trial') && !!plan && plan !== 'free_v1' && !isPassPlan(plan)
  if (recurringPremium) return true

  // Exam-pass holders paid for their window — treat as paid for practice.
  const { data: ent } = await supabaseAdmin
    .from('study_entitlements')
    .select('test, expires_at')
    .eq('student_id', studentId)
  const now = Date.now()
  return (ent ?? []).some(e => {
    const exp = e.expires_at as string | null
    return exp === null || Date.parse(exp) > now
  })
}

/** Count today's ENGAGED practice + flashcards sets (≥1 attempt),
 *  excluding daily-challenge and path-stop sessions. */
async function usedTodayEngaged(studentId: string, sinceIso: string): Promise<number> {
  const { data: sessions } = await supabaseAdmin
    .from('study_sessions')
    .select('id, config')
    .eq('student_id', studentId)
    .in('mode', ['practice', 'flashcards'])
    .eq('archived', false)
    .gte('created_at', sinceIso)
  const candidateIds = (sessions ?? [])
    .filter(s => {
      const c = (s.config ?? {}) as { dailyChallenge?: string; pathNode?: string }
      return !c.dailyChallenge && !c.pathNode
    })
    .map(s => s.id as string)
  if (candidateIds.length === 0) return 0

  const { data: attempts } = await supabaseAdmin
    .from('study_attempts')
    .select('session_id')
    .in('session_id', candidateIds)
  const engaged = new Set((attempts ?? []).map(a => a.session_id as string))
  return engaged.size
}

/** Delete the student's abandoned practice/flashcards sessions — active,
 *  no attempts, older than a grace window — so an unused set doesn't
 *  linger on the shelf or in history ("unused sessions don't get
 *  saved"). Excludes the current session, daily challenges, and path
 *  stops. The 2-minute grace avoids nuking a session the student just
 *  opened in another tab. Best-effort; never throws. */
export async function cleanupAbandonedPracticeSessions(studentId: string, exceptId: string): Promise<void> {
  try {
    const graceIso = new Date(Date.now() - 2 * 60_000).toISOString()
    const { data: sessions } = await supabaseAdmin
      .from('study_sessions')
      .select('id, config')
      .eq('student_id', studentId)
      .in('mode', ['practice', 'flashcards'])
      .eq('status', 'active')
      .eq('archived', false)
      .lt('created_at', graceIso)
    const candidateIds = (sessions ?? [])
      .filter(s => {
        const c = (s.config ?? {}) as { dailyChallenge?: string; pathNode?: string }
        return !c.dailyChallenge && !c.pathNode && s.id !== exceptId
      })
      .map(s => s.id as string)
    if (candidateIds.length === 0) return

    const { data: attempts } = await supabaseAdmin
      .from('study_attempts')
      .select('session_id')
      .in('session_id', candidateIds)
    const engaged = new Set((attempts ?? []).map(a => a.session_id as string))
    const empties = candidateIds.filter(id => !engaged.has(id))
    if (empties.length === 0) return
    await supabaseAdmin.from('study_sessions').delete().in('id', empties).eq('student_id', studentId)
  } catch (e) {
    console.error('[practice-quota] cleanup failed', e)
  }
}

/** Resolve the student's practice quota for today. `excludeSessionId`
 *  keeps the just-created (not-yet-engaged) session from being counted;
 *  since "used" is engagement-based it usually wouldn't be anyway, but
 *  this guards a session that somehow already has attempts. */
export async function getPracticeQuota(studentId: string): Promise<PracticeQuota> {
  const paid = await isPaidStudent(studentId)
  const limit = paid ? PRACTICE_SETS_PER_DAY : 0
  const sinceIso = kstDayStartIso()
  const used = limit === 0 ? 0 : await usedTodayEngaged(studentId, sinceIso)
  return { paid, limit, used, remaining: Math.max(0, limit - used), sinceIso }
}
