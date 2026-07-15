import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Study funnel analytics — a lightweight, vendor-free event log written to
 * study_analytics_events. Server routes call trackEvent() directly; client
 * code posts to /api/study/track (see track-client.ts) which calls this.
 *
 * The canonical event vocabulary lives here so the funnel stays queryable:
 *   onboarding_completed
 *     → test_started → test_completed        (activation / core usage)
 *     → out_of_credits                       (the paywall trigger)
 *     → checkout_started → checkout_completed (subscription funnel)
 *   pack_purchased / pass_purchased / plan_changed / gift_redeemed /
 *   referral_redeemed                        (revenue events)
 *   activation_cta_clicked                   (first-test nudge)
 */
export type StudyEvent =
  | 'onboarding_completed'
  | 'test_started'
  | 'test_completed'
  | 'out_of_credits'
  | 'checkout_started'
  | 'checkout_completed'
  | 'pack_purchased'
  | 'pass_purchased'
  | 'plan_changed'
  | 'gift_redeemed'
  | 'referral_redeemed'
  | 'referral_converted'
  | 'activation_cta_clicked'

/** Client-supplied events are restricted to this set so the endpoint can't
 *  be used to write arbitrary rows. Server-only events (revenue) are never
 *  accepted from the client. */
export const CLIENT_TRACKABLE: ReadonlySet<string> = new Set<StudyEvent>([
  'onboarding_completed',
  'test_started',
  'out_of_credits',
  'checkout_started',
  'activation_cta_clicked',
])

/** Fire-and-forget server-side event write. Never throws — analytics must
 *  not break the request it rides along with. */
export async function trackEvent(
  studentId: string,
  event: StudyEvent,
  props?: Record<string, unknown>,
): Promise<void> {
  if (!studentId) return
  try {
    await supabaseAdmin.from('study_analytics_events').insert({
      student_id: studentId,
      event,
      props: props ?? null,
    })
  } catch (e) {
    console.error('[analytics] track failed', event, e)
  }
}
