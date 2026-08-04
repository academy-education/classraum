import { dbAdmin } from '@/lib/supabase-admin'
import { PODIUM_CREDITS, PROMOTION_CREDITS, MILESTONE_CREDITS } from '@/lib/study/league-reward-values'

/**
 * League reward payouts — granted by the weekly roll cron
 * (study-league-roll) after close_study_league_week snapshots each
 * member's final_rank / promotion_event / next_tier.
 *
 * Reward currency: never-expiring PURCHASED-bucket credits
 * (increment_study_purchased_credits, an upsert since migration 055),
 * the same path duel wins + packs use.
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

// The payout tables (PODIUM_CREDITS / PROMOTION_CREDITS /
// MILESTONE_CREDITS) live in `league-reward-values.ts` — a
// dependency-free module the client-side league page can also import, so
// the numbers shown to the student are the numbers the cron pays rather
// than a hand-copied duplicate.

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
export async function grantCredits(studentId: string, delta: number, note: string): Promise<boolean> {
  if (delta <= 0) return false
  // No pre-provisioning needed: increment_study_purchased_credits is an
  // upsert as of migration 055, so a free student who has only ever
  // studied — never bought a pack or redeemed a referral, and therefore
  // has no study_subscriptions row — gets one created with the reward in
  // it. The hand-rolled create that used to live here also had to guess
  // the row's shape, and could refuse a grant the upsert handles fine.
  const { error } = await dbAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId, p_delta: delta,
  })
  if (error) { console.error('[league-rewards] credit grant failed', { studentId, delta, error }); return false }
  // Balance already moved — a lost ledger row is an audit gap, never a
  // reason to re-pay, but it breaks reconciliation so it must be visible.
  const { error: ledgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: studentId, delta, bucket: 'purchased', kind: 'league_reward', note,
  })
  if (ledgerErr) console.error('[league-rewards] ledger row missing', { studentId, delta, note, error: ledgerErr })
  return true
}

/** Record a reward row; returns true only if it was newly inserted
 *  (a unique-violation → already granted → false, so credits aren't
 *  double-paid on a cron re-run). */
async function recordReward(row: { student_id: string; week_start: string; kind: string; tier?: string | null; rank?: number | null; credits: number }): Promise<boolean> {
  const { data, error } = await dbAdmin
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
  const { data } = await dbAdmin
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

  /*
   * RECORDING IS NOT PAYING, since 073.
   *
   * Each branch writes an UNCLAIMED reward row and stops. The credits
   * move when the student taps Collect, in /api/study/league/claim —
   * the reward is a thing they receive rather than a number that
   * changed overnight.
   *
   * The breakdown returned below therefore means "what was EARNED this
   * close", which is what the result notification should say. It no
   * longer means "what landed in the balance", and the two are now
   * different facts.
   */

  // Podium — top 3 in the cohort.
  const podiumCredits = PODIUM_CREDITS[m.finalRank]
  if (podiumCredits) {
    const fresh = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'podium', tier: m.fromTier, rank: m.finalRank, credits: podiumCredits })
    if (fresh) out.podium = podiumCredits
  }

  if (m.promotionEvent === 'promoted') {
    // Promotion — flat bonus for moving up.
    const fresh = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'promotion', tier: m.nextTier, rank: m.finalRank, credits: PROMOTION_CREDITS })
    if (fresh) out.promotion = PROMOTION_CREDITS

    // Milestone — first time EVER reaching next_tier.
    const milestoneCredits = MILESTONE_CREDITS[m.nextTier]
    if (milestoneCredits && !(await hasReachedTier(m.studentId, m.nextTier))) {
      const fresh2 = await recordReward({ student_id: m.studentId, week_start: m.weekStart, kind: 'tier_milestone', tier: m.nextTier, rank: m.finalRank, credits: milestoneCredits })
      if (fresh2) {
        out.milestone = milestoneCredits
        out.milestoneTier = m.nextTier
      }
    }
  }

  out.total = out.podium + out.promotion + out.milestone
  return out
}


// ── Collecting ───────────────────────────────────────────────────────

export interface ClaimableReward {
  id: string
  week_start: string
  kind: string
  tier: string | null
  rank: number | null
  credits: number
}

/** Everything this student has earned and not yet collected. */
export async function listUnclaimedRewards(studentId: string): Promise<ClaimableReward[]> {
  const { data, error } = await dbAdmin
    .from('study_league_rewards')
    .select('id, week_start, kind, tier, rank, credits')
    .eq('student_id', studentId)
    .is('claimed_at', null)
    .gt('credits', 0)
    .order('week_start', { ascending: false })
  if (error) {
    console.error('[league-rewards] unclaimed list failed', { studentId, error })
    return []
  }
  return (data ?? []) as ClaimableReward[]
}

/**
 * Collect every waiting reward for one student.
 *
 * ── THE ONLY THING PREVENTING DOUBLE PAYMENT ─────────────────────────
 * The `.is('claimed_at', null)` on the UPDATE, and the fact that the
 * rows it RETURNS — not a prior SELECT — decide what gets paid.
 *
 * Two taps 200ms apart both reach this. Postgres serialises them on the
 * row: the first sets claimed_at and returns the row, the second finds
 * nothing still NULL, matches zero rows, and grants nothing. That works
 * because claiming and checking are ONE statement.
 *
 * The shape this deliberately is NOT:
 *
 *     const rows = await select(...).is('claimed_at', null)   // read
 *     await grantCredits(sum(rows))                           // pay
 *     await update(...).set({ claimed_at })                   // mark
 *
 * Both callers' SELECTs return the same rows and both pay. CLAUDE.md
 * records that exact race shipping once already — the TOEFL grader whose
 * "server-side idempotency" was a SELECT followed by an INSERT, which
 * produced four submission rows for two essays. A comment asserting an
 * invariant is not the invariant.
 *
 * ── Ordering: mark first, then pay ───────────────────────────────────
 * If the grant fails after the mark, the student is short and the row
 * says collected — recoverable, visible, and the ledger shows no entry.
 * If we paid first and the mark failed, a retry pays again. Given one
 * of those has to be possible, it is the one that cannot mint money.
 */
export async function claimRewards(studentId: string): Promise<{ claimed: number; credits: number }> {
  const { data, error } = await dbAdmin
    .from('study_league_rewards')
    .update({ claimed_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .is('claimed_at', null)
    .gt('credits', 0)
    .select('id, credits')

  if (error) {
    console.error('[league-rewards] claim update failed', { studentId, error })
    throw new Error('claim_failed')
  }

  const rows = (data ?? []) as Array<{ id: string; credits: number }>
  if (rows.length === 0) return { claimed: 0, credits: 0 }

  const total = rows.reduce((n, r) => n + r.credits, 0)
  const ok = await grantCredits(studentId, total, `league rewards x${rows.length}`)
  if (!ok) {
    // Loud, because the rows are marked collected and the balance did
    // not move. Not rolled back: un-marking would re-open the race this
    // whole function exists to close.
    console.error('[league-rewards] CLAIMED BUT NOT PAID — reconcile', {
      studentId, total, rewardIds: rows.map(r => r.id),
    })
  }
  return { claimed: rows.length, credits: total }
}
