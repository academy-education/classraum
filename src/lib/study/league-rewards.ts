import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * League reward payouts — granted by the weekly roll cron
 * (study-league-roll) after close_study_league_week snapshots each
 * member's final_rank / promotion_event / next_tier.
 *
 * Reward currency: never-expiring PURCHASED-bucket credits
 * (increment_study_purchased_credits), same path duel wins + packs use.
 * Every grant is written to study_league_rewards, which has unique
 * indexes so a cron re-run never double-pays.
 *
 * Payouts are intentionally CONSERVATIVE — only a handful of credits
 * change hands per cohort per week (3 podium winners + the promoted
 * third), and each is capped by rank/tier, so the credit burn stays
 * small and predictable. Tune the tables below to adjust.
 */

export const LEAGUE_TIERS = [
  'bronze', 'silver', 'gold', 'sapphire', 'ruby',
  'emerald', 'amethyst', 'pearl', 'obsidian', 'diamond',
] as const

/** Podium (top-3 finish in your cohort) → credits by rank. */
const PODIUM_CREDITS: Record<number, number> = { 1: 3, 2: 2, 3: 1 }

/** Any promotion (top-third finisher moving up a tier) → flat credits. */
const PROMOTION_CREDITS = 1

/** First-ever time reaching a tier → one-time milestone credits. The
 *  entry tiers (bronze/silver) pay nothing; the reward grows toward the
 *  top so climbing feels rewarding without a big burn. */
const MILESTONE_CREDITS: Record<string, number> = {
  gold: 2, sapphire: 2, ruby: 3, emerald: 3,
  amethyst: 4, pearl: 4, obsidian: 5, diamond: 8,
}

export interface ClosedMember {
  studentId: string
  weekStart: string          // the closing week (YYYY-MM-DD)
  fromTier: string           // tier of the cohort that just closed
  finalRank: number
  promotionEvent: 'promoted' | 'held' | 'demoted'
  nextTier: string           // tier they'll sit in next week
}

export interface RewardBreakdown {
  podium: number
  promotion: number
  milestone: number
  milestoneTier: string | null
  total: number
}

/** Add credits to the purchased bucket + write an audit ledger row. */
async function grantCredits(studentId: string, delta: number, note: string): Promise<boolean> {
  if (delta <= 0) return false
  // Ensure a subscription row exists FIRST. increment_study_purchased_credits
  // only UPDATEs an existing row, and a free student who has only ever studied
  // (never bought a pack / redeemed a referral) may not have one yet — the
  // increment would silently no-op and the reward would vanish. Create the
  // same lazy free row the purchase/referral paths create.
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions').select('id').eq('student_id', studentId).maybeSingle()
  if (!sub) {
    await supabaseAdmin.from('study_subscriptions').insert({
      student_id: studentId, status: 'free', plan: 'free_v1', currency: 'KRW',
      grant_credits_remaining: 0, purchased_credits_remaining: 0,
    }).then(() => {}, () => {}) // ignore a lost create race; the increment below still lands
  }
  const { error } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId, p_delta: delta,
  })
  if (error) { console.error('[league-rewards] credit grant failed', { studentId, delta, error }); return false }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: studentId, delta, bucket: 'purchased', kind: 'league_reward', note,
  }).then(() => {}, () => {})
  return true
}

/** Record a reward row; returns true only if it was newly inserted
 *  (a unique-violation → already granted → false, so credits aren't
 *  double-paid on a cron re-run). */
async function recordReward(row: { student_id: string; week_start: string; kind: string; tier?: string | null; rank?: number | null; credits: number }): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('study_league_rewards')
    .insert(row)
    .select('id')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') return false // already granted
    console.error('[league-rewards] reward insert failed', { row, error })
    return false
  }
  return !!data
}

/** Has the student ever been placed in this tier before? Used to gate
 *  the "first time reaching a tier" milestone (a re-promotion into a
 *  tier you once held doesn't re-pay). */
async function hasReachedTier(studentId: string, tier: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('study_league_memberships')
    .select('id, league:study_leagues!inner(tier)')
    .eq('student_id', studentId)
    .eq('study_leagues.tier', tier)
    .limit(1)
  return !!(data && data.length > 0)
}

/**
 * Grant all earned rewards for one closed-week member, idempotently.
 * Returns the credit breakdown (zeros if nothing / already granted) so
 * the cron can fold it into the result notification.
 */
export async function grantLeagueRewards(m: ClosedMember): Promise<RewardBreakdown> {
  const out: RewardBreakdown = { podium: 0, promotion: 0, milestone: 0, milestoneTier: null, total: 0 }

  // Podium — top 3 in the cohort.
  const podiumCredits = PODIUM_CREDITS[m.finalRank]
  if (podiumCredits) {
    const fresh = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'podium', tier: m.fromTier, rank: m.finalRank, credits: podiumCredits })
    if (fresh && await grantCredits(m.studentId, podiumCredits, `podium #${m.finalRank} ${m.fromTier} ${m.weekStart}`)) out.podium = podiumCredits
  }

  if (m.promotionEvent === 'promoted') {
    // Promotion — flat bonus for moving up.
    const fresh = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'promotion', tier: m.nextTier, rank: m.finalRank, credits: PROMOTION_CREDITS })
    if (fresh && await grantCredits(m.studentId, PROMOTION_CREDITS, `promotion → ${m.nextTier} ${m.weekStart}`)) out.promotion = PROMOTION_CREDITS

    // Milestone — first time EVER reaching next_tier.
    const milestoneCredits = MILESTONE_CREDITS[m.nextTier]
    if (milestoneCredits && !(await hasReachedTier(m.studentId, m.nextTier))) {
      const fresh2 = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'tier_milestone', tier: m.nextTier, rank: m.finalRank, credits: milestoneCredits })
      if (fresh2 && await grantCredits(m.studentId, milestoneCredits, `first ${m.nextTier} ${m.weekStart}`)) {
        out.milestone = milestoneCredits
        out.milestoneTier = m.nextTier
      }
    }
  }

  out.total = out.podium + out.promotion + out.milestone
  return out
}
