import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 1v1 XP-duel helpers. A duel scores each side by the XP they earn between
 * start_at and end_at (summed from study_xp_events). Resolution is lazy:
 * the first read after end_at finalizes the winner, guarded so it happens
 * exactly once.
 */

export const DUEL_DAYS = 7

export interface ChallengeRow {
  id: string
  challenger_id: string
  opponent_id: string
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
  start_at: string | null
  end_at: string | null
  challenger_xp: number
  opponent_xp: number
  winner_id: string | null
}

/** Sum a student's XP in [start, end). */
export async function sumXpInWindow(studentId: string, startIso: string, endIso: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('study_xp_events')
    .select('xp')
    .eq('student_id', studentId)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
  return (data ?? []).reduce((sum, r) => sum + ((r.xp as number | null) ?? 0), 0)
}

/**
 * If an ACTIVE duel is past its end, finalize it: snapshot each side's XP,
 * set the winner (null on a tie), flip to 'completed'. Guarded on
 * status='active' so a concurrent reader can't double-resolve. Returns the
 * settled row (or the input unchanged when not yet due / not active).
 * Never throws.
 */
export async function resolveIfEnded(row: ChallengeRow, nowIso: string): Promise<ChallengeRow> {
  if (row.status !== 'active' || !row.start_at || !row.end_at) return row
  if (row.end_at > nowIso) return row
  try {
    const [cxp, oxp] = await Promise.all([
      sumXpInWindow(row.challenger_id, row.start_at, row.end_at),
      sumXpInWindow(row.opponent_id, row.start_at, row.end_at),
    ])
    const winner = cxp > oxp ? row.challenger_id : oxp > cxp ? row.opponent_id : null
    const { data } = await supabaseAdmin
      .from('study_challenges')
      .update({
        status: 'completed',
        challenger_xp: cxp,
        opponent_xp: oxp,
        winner_id: winner,
        resolved_at: nowIso,
      })
      .eq('id', row.id)
      .eq('status', 'active') // only the winner of the race flips it
      .select('id, challenger_id, opponent_id, status, start_at, end_at, challenger_xp, opponent_xp, winner_id')
      .maybeSingle()
    return (data as ChallengeRow | null) ?? { ...row, status: 'completed', challenger_xp: cxp, opponent_xp: oxp, winner_id: winner }
  } catch (err) {
    console.error('[study/challenges] resolveIfEnded failed', { id: row.id, error: err })
    return row
  }
}
