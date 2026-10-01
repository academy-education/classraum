import { dbAdmin } from '@/lib/supabase-admin'
import { trackEvent } from '@/lib/study/analytics'

/**
 * Stage 2 of the referral loop: record that a referred student went paid.
 *
 * Until 2026-10-01 this also paid BOTH sides REFERRAL_PREMIUM_CREDITS. The
 * offer is now one reward only: the invited friend gets
 * REFERRAL_INVITEE_CREDITS when they redeem the code (see the redeem route),
 * and nothing is paid on conversion, to either side. The conversion is still
 * recorded, because it is the referral programme's only quality signal and
 * the referral page counts it.
 *
 * Idempotency: the `converted` flag is flipped with a conditional UPDATE
 * (... WHERE converted = false RETURNING), so a double charge or a
 * concurrent purchase records the conversion once. Never throws: a failure
 * here must not fail a subscription that already succeeded.
 */
export async function grantReferralConversionIfEligible(refereeId: string): Promise<void> {
  try {
    const { data: claimed } = await dbAdmin
      .from('study_referral_redemptions')
      .update({ converted: true, converted_at: new Date().toISOString() })
      .eq('referee_id', refereeId)
      .eq('converted', false)
      .select('id, referrer_id')
      .maybeSingle()
    if (!claimed) return
    void trackEvent(refereeId, 'referral_converted', { referrerId: claimed.referrer_id as string, creditsEach: 0 })
  } catch (err) {
    console.error('[study/referral-conversion] could not record conversion', { refereeId, error: err })
  }
}
