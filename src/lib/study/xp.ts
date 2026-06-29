import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Study XP awarding — wraps the award_study_xp Postgres function.
 *
 * Why a Postgres function: the membership lookup + cohort placement +
 * XP increment is atomic that way. Service-role only — never called
 * directly from clients.
 *
 * XP table (lightweight, tunable):
 *   attempt_correct  → 10
 *   session_complete → 25
 *   flashcard_easy   → 5
 *   flashcard_hard   → 8 (rewards effort, not just speed)
 *   flashcard_again  → 2 (still credit for showing up)
 *   snap_solve       → 5
 *   response_graded  → 20
 *
 * Fire-and-forget — the caller should never block their primary
 * response path on this. We log + swallow errors.
 */

export type XpEventType =
  | 'attempt_correct'
  | 'session_complete'
  | 'flashcard_easy'
  | 'flashcard_hard'
  | 'flashcard_again'
  | 'snap_solve'
  | 'response_graded'

export const XP_VALUES: Record<XpEventType, number> = {
  attempt_correct: 10,
  session_complete: 25,
  flashcard_easy: 5,
  flashcard_hard: 8,
  flashcard_again: 2,
  snap_solve: 5,
  response_graded: 20,
}

export async function awardXp(
  studentId: string,
  eventType: XpEventType,
  sourceId?: string | null,
): Promise<void> {
  const xp = XP_VALUES[eventType]
  try {
    const { error } = await supabaseAdmin.rpc('award_study_xp', {
      p_student_id: studentId,
      p_event_type: eventType,
      p_xp: xp,
      p_source_id: sourceId ?? null,
    })
    if (error) console.error('[xp] award_study_xp failed', error)
  } catch (e) {
    console.error('[xp] award failed', e)
  }
}
