import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifyStudent } from '@/lib/study/notify'
import { trackEvent } from '@/lib/study/analytics'

/**
 * 1v1 XP-duel helpers. A duel scores each side by the XP they earn between
 * start_at and end_at (summed from study_xp_events). Resolution is lazy:
 * the first read after end_at finalizes the winner, guarded so it happens
 * exactly once — and that same guarded flip is what triggers the win
 * reward + notifications (see awardDuelOutcome).
 */

export const DUEL_DAYS = 7

/** Credits granted to a duel winner. Kept small — see the anti-farm floor
 *  below. Set to 0 to make duels a bragging-rights-only feature. */
export const DUEL_WIN_CREDITS = 1
/**
 * A winner only earns credits if they actually studied during the duel
 * (this much XP in the window). Without a floor, two friends could trade
 * near-zero-effort wins to farm credits — this forces real work per win.
 * Collusion is still *possible* at scale (alternate real study across many
 * friends); revisit with a weekly cap if that shows up in analytics.
 */
export const DUEL_MIN_XP_FOR_CREDIT = 100

/** Winner of a duel by XP: higher side wins, equal XP is a tie (null). */
export function decideDuelWinner(
  challengerId: string, opponentId: string, challengerXp: number, opponentXp: number,
): string | null {
  if (challengerXp > opponentXp) return challengerId
  if (opponentXp > challengerXp) return opponentId
  return null
}

/** A win only pays credits when the winner did real work in the window —
 *  the anti-farm floor. Also respects DUEL_WIN_CREDITS=0 (rewards off). */
export function duelCreditEligible(winnerXp: number): boolean {
  return DUEL_WIN_CREDITS > 0 && winnerXp >= DUEL_MIN_XP_FOR_CREDIT
}

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
    const winner = decideDuelWinner(row.challenger_id, row.opponent_id, cxp, oxp)
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
    // A non-null row here means THIS call won the flip race (the WHERE
    // status='active' matched). That's the single owner of the outcome
    // side effects, so rewards/notifications fire exactly once.
    if (data) await awardDuelOutcome(data as ChallengeRow)
    return (data as ChallengeRow | null) ?? { ...row, status: 'completed', challenger_xp: cxp, opponent_xp: oxp, winner_id: winner }
  } catch (err) {
    console.error('[study/challenges] resolveIfEnded failed', { id: row.id, error: err })
    return row
  }
}

/**
 * One-time side effects when a duel finalizes: credit the winner (gated by
 * the anti-farm XP floor), fire analytics for both sides, and drop an inbox
 * notification (+ push) to each player. Called only by the guarded flip in
 * resolveIfEnded, so it runs exactly once per duel. Never throws — a duel
 * must still resolve even if a reward or notification hiccups.
 */
async function awardDuelOutcome(row: ChallengeRow): Promise<void> {
  const { challenger_id: c, opponent_id: o, winner_id: w, challenger_xp: cx, opponent_xp: ox } = row
  const link = '/mobile/study/friends'
  try {
    if (w === null) {
      // Tie — no credit, both sides told.
      await Promise.all([
        notifyStudent({ studentId: c, kind: 'study_duel_lost', title: '듀얼 무승부', message: `듀얼이 무승부로 끝났어요 · ${cx} XP`, link, push: true }),
        notifyStudent({ studentId: o, kind: 'study_duel_lost', title: '듀얼 무승부', message: `듀얼이 무승부로 끝났어요 · ${ox} XP`, link, push: true }),
      ])
      return
    }
    const loser = w === c ? o : c
    const winnerXp = w === c ? cx : ox
    const loserXp = w === c ? ox : cx

    let credited = false
    if (duelCreditEligible(winnerXp)) {
      const { error } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
        p_student_id: w, p_delta: DUEL_WIN_CREDITS,
      })
      if (error) console.error('[study/challenges] credit grant failed', { id: row.id, error })
      else credited = true
    }

    await Promise.all([
      trackEvent(w, 'challenge_won', { opponentId: loser, myXp: winnerXp, theirXp: loserXp, credited }),
      trackEvent(loser, 'challenge_lost', { opponentId: w, myXp: loserXp, theirXp: winnerXp }),
      notifyStudent({
        studentId: w, kind: 'study_duel_won',
        title: '듀얼 승리! 🏆',
        message: credited
          ? `${winnerXp} XP로 승리하고 크레딧 ${DUEL_WIN_CREDITS}개를 받았어요`
          : `${winnerXp} XP로 듀얼에서 이겼어요`,
        link, push: true,
      }),
      notifyStudent({
        studentId: loser, kind: 'study_duel_lost',
        title: '듀얼 종료',
        message: `이번 듀얼은 아쉽게 졌어요 · ${loserXp} XP`,
        link, push: true,
      }),
    ])
  } catch (err) {
    console.error('[study/challenges] awardDuelOutcome failed', { id: row.id, error: err })
  }
}
