import { supabaseAdmin } from '@/lib/supabase-admin'
import { REFERRAL_PREMIUM_CREDITS } from '@/lib/study/referral'
import { trackEvent } from '@/lib/study/analytics'

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
    const { data: redemption } = await supabaseAdmin
      .from('study_referral_redemptions')
      .select('id, referrer_id, converted')
      .eq('referee_id', refereeId)
      .eq('converted', false)
      .maybeSingle()
    if (!redemption) return

    // Claim the conversion atomically — only the row we flip from false→true
    // proceeds. A concurrent caller's UPDATE matches zero rows and returns
    // empty, so it grants nothing.
    const { data: claimed } = await supabaseAdmin
      .from('study_referral_redemptions')
      .update({ converted: true, converted_at: new Date().toISOString() })
      .eq('id', redemption.id)
      .eq('converted', false)
      .select('id, referrer_id')
      .maybeSingle()
    if (!claimed) return

    const referrerId = claimed.referrer_id as string
    // Reward BOTH sides. Each grant is independent + best-effort: one side
    // lacking a subscription row (RPC no-ops) doesn't block the other.
    await Promise.all([
      grantPremiumCredits(refereeId, claimed.id),
      grantPremiumCredits(referrerId, claimed.id),
    ])

    void trackEvent(refereeId, 'referral_converted', { referrerId, creditsEach: REFERRAL_PREMIUM_CREDITS })
  } catch (err) {
    console.error('[study/referral-conversion] grant failed', { refereeId, error: err })
  }
}

/**
 * Add REFERRAL_PREMIUM_CREDITS to a student's purchased bucket + ledger,
 * but only if they have a subscription row for the RPC to update (it keys
 * on student_id and would otherwise silently no-op). Mirrors the signup
 * grant in the redeem route.
 */
async function grantPremiumCredits(studentId: string, sourceId: string): Promise<void> {
  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('student_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (!sub) return

  const { error: rpcErr } = await supabaseAdmin.rpc('increment_study_purchased_credits', {
    p_student_id: studentId,
    p_delta: REFERRAL_PREMIUM_CREDITS,
  })
  if (rpcErr) {
    console.error('[study/referral-conversion] credit grant failed', { studentId, error: rpcErr })
    return
  }
  await supabaseAdmin.from('study_credit_ledger').insert({
    student_id: studentId,
    delta: REFERRAL_PREMIUM_CREDITS,
    bucket: 'purchased',
    kind: 'referral',
    source_id: sourceId,
    note: 'referral premium conversion bonus',
  })
}
