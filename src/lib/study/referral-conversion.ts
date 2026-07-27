import { dbAdmin } from '@/lib/supabase-admin'
import { REFERRAL_PREMIUM_CREDITS } from '@/lib/study/referral'
import { FREE_CREDITS } from '@/lib/study/plans'
import { trackEvent } from '@/lib/study/analytics'
import { raiseAlert } from '@/lib/ops/alert'

/**
 * Stage 2 of the referral loop — the PREMIUM conversion bonus.
 *
 * When a student who was referred (has a redemption row as the referee)
 * first becomes a paying subscriber, BOTH sides get
 * REFERRAL_PREMIUM_CREDITS purchased credits, exactly once. Call this from
 * every paid-conversion entry point (the subscribe / billing-key route)
 * with the buyer's id.
 *
 * Idempotency / race-safety: the redemption row's `converted` flag is the
 * guard. We flip it with a conditional UPDATE (... WHERE converted = false
 * RETURNING) so only the request that actually flips it goes on to grant
 * credits — a double-charge or concurrent purchase can't reward twice.
 * Best-effort and self-contained: never throws (a failure here must not
 * fail the subscription that already succeeded); logs for reconciliation.
 */
export async function grantReferralConversionIfEligible(refereeId: string): Promise<void> {
  try {
    // Is this buyer a referee with a not-yet-converted referral?
    const { data: redemption } = await dbAdmin
      .from('study_referral_redemptions')
      .select('id, referrer_id, converted')
      .eq('referee_id', refereeId)
      .eq('converted', false)
      .maybeSingle()
    if (!redemption) return

    // Claim the conversion atomically — only the row we flip from false→true
    // proceeds. A concurrent caller's UPDATE matches zero rows and returns
    // empty, so it grants nothing.
    const { data: claimed } = await dbAdmin
      .from('study_referral_redemptions')
      .update({ converted: true, converted_at: new Date().toISOString() })
      .eq('id', redemption.id)
      .eq('converted', false)
      .select('id, referrer_id')
      .maybeSingle()
    if (!claimed) return

    const referrerId = claimed.referrer_id as string
    // Reward BOTH sides. The credit RPC keys on student_id and silently
    // no-ops when a side has no study_subscriptions row — a referrer who
    // owns a code but never subscribed is exactly that case — so provision
    // the free row for both first, mirroring the redeem route.
    await Promise.all([
      ensureFreeSubscription(refereeId),
      ensureFreeSubscription(referrerId),
    ])
    const [referee, referrer] = await Promise.all([
      grantPremiumCredits(refereeId, claimed.id),
      grantPremiumCredits(referrerId, claimed.id),
    ])

    // `converted` is already flipped (it has to be, it's the race guard), so
    // there is no retry: a failed grant is only recoverable by hand.
    if (!referee || !referrer) {
      await raiseAlert({
        severity: 'critical',
        title: 'Referral conversion bonus was not granted',
        message:
          `A referred student converted to paid but ${!referee && !referrer ? 'neither side' : !referee ? 'the referee' : 'the referrer'} ` +
          `received the ${REFERRAL_PREMIUM_CREDITS} conversion credits. The redemption is already ` +
          `marked converted, so this cannot retry — grant the missing credits manually.`,
        dedupeKey: `referral-conversion-grant-failed:${claimed.id}`,
        context: {
          redemptionId: claimed.id,
          refereeId,
          referrerId,
          refereeGranted: referee,
          referrerGranted: referrer,
          credits: REFERRAL_PREMIUM_CREDITS,
        },
      })
    }

    void trackEvent(refereeId, 'referral_converted', { referrerId, creditsEach: REFERRAL_PREMIUM_CREDITS })
  } catch (err) {
    console.error('[study/referral-conversion] grant failed', { refereeId, error: err })
  }
}

/**
 * Provision the free study_subscriptions row for a student who doesn't have
 * one, so the credit RPC (which keys on student_id) has a row to update.
 * Mirrors ensureFreeSubscription in the redeem route; a lost race against a
 * concurrent insert (23505) is fine.
 */
async function ensureFreeSubscription(studentId: string): Promise<void> {
  const { data: existing } = await dbAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (existing) return

  const { error } = await dbAdmin
    .from('study_subscriptions')
    .insert({
      student_id: studentId,
      status: 'free',
      plan: 'free_v1',
      grant_credits_remaining: FREE_CREDITS,
    })
  if (error && (error as { code?: string }).code !== '23505') {
    // Not fatal here: grantPremiumCredits re-reads and reports a hard
    // failure (which alerts) if the row still isn't there.
    console.error('[study/referral-conversion] free-row provision failed', { studentId, error })
  }
}

/**
 * Add REFERRAL_PREMIUM_CREDITS to a student's purchased bucket + ledger.
 * Requires a subscription row for the RPC to update (callers run
 * ensureFreeSubscription first), so a missing row here is a real failure.
 * Returns true only when the credits provably landed.
 */
async function grantPremiumCredits(studentId: string, sourceId: string): Promise<boolean> {
  const { data: sub } = await dbAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (!sub) return false

  const { error: rpcErr } = await dbAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId,
    p_delta: REFERRAL_PREMIUM_CREDITS,
  })
  if (rpcErr) {
    console.error('[study/referral-conversion] credit grant failed', { studentId, error: rpcErr })
    return false
  }
  // Balance moved → the grant succeeded. A failed ledger row is an
  // audit-trail gap, never a reason to re-grant.
  const { error: ledgerErr } = await dbAdmin.from('study_credit_ledger').insert({
    student_id: studentId,
    delta: REFERRAL_PREMIUM_CREDITS,
    bucket: 'purchased',
    kind: 'referral',
    source_id: sourceId,
    note: 'referral premium conversion bonus',
  })
  if (ledgerErr) {
    await raiseAlert({
      severity: 'warning',
      title: 'Referral conversion ledger row missing',
      message:
        `${REFERRAL_PREMIUM_CREDITS} conversion credits were added to a balance but the ledger ` +
        `insert failed, so the balance no longer reconciles against the ledger. Do not re-grant.`,
      dedupeKey: `referral-conversion-ledger-failed:${sourceId}:${studentId}`,
      error: ledgerErr,
      context: { studentId, redemptionId: sourceId, credits: REFERRAL_PREMIUM_CREDITS },
    })
  }
  return true
}
