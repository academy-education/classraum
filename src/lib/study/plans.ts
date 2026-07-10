/**
 * Study plan catalog — single source of truth for tiers, pricing,
 * monthly credit grants, and premium entitlements. Server routes
 * (billing-key, cron renewal, pack purchase, feature gates) and the
 * subscription UI all read from here so a price change is one edit.
 *
 * Credits: 1 credit = 1 successfully generated full mock test.
 * Retakes, resume, review, and FAILED generations never consume a
 * credit (the generate route reserves at start and refunds on any
 * failure path).
 */

export type StudyTier = 'general' | 'premium'

export interface StudyPlan {
  id: string
  tier: StudyTier
  priceWon: number
  /** Monthly test-credit grant, reset (not accumulated) each cycle. */
  monthlyCredits: number
  orderName: string
  name_en: string
  name_ko: string
}

export const STUDY_PLANS: Record<string, StudyPlan> = {
  free_v1: {
    id: 'free_v1',
    tier: 'general',
    priceWon: 0,
    // One-time FREE_CREDITS grant at signup — never reset by the
    // billing cron (free rows have status 'free', which the cron and
    // renewal paths never touch).
    monthlyCredits: 0,
    orderName: 'Classraum Study — Free',
    name_en: 'Free',
    name_ko: '무료',
  },
  general_v1: {
    id: 'general_v1',
    tier: 'general',
    priceWon: 9900,
    monthlyCredits: 8,
    orderName: 'Classraum Study — General (Monthly)',
    name_en: 'General',
    name_ko: '일반',
  },
  premium_v1: {
    id: 'premium_v1',
    tier: 'premium',
    priceWon: 16900,
    monthlyCredits: 20,
    orderName: 'Classraum Study — Premium (Monthly)',
    name_en: 'Premium',
    name_ko: '프리미엄',
  },
}

/** Credit top-up pack — Premium members only. Purchased credits never
 *  expire and are consumed only after the monthly grant runs out. */
export const CREDIT_PACK = {
  id: 'pack5_v1',
  credits: 5,
  priceWon: 6900,
  orderName: 'Classraum Study — 5 Test Credits',
}

/** Credits granted when the 7-day trial row is auto-provisioned. */
export const TRIAL_CREDITS = 3

/** One-time AI-generation credits granted with the auto-provisioned
 *  Free plan. Premade (bank) tests never consume credits, so these
 *  only meter the live AI generator. */
export const FREE_CREDITS = 3

/** Resolve a subscription row's plan id to a catalog entry. Legacy
 *  'monthly_v1' rows (pre-tier era) are grandfathered as General. */
export function resolvePlan(planId: string | null | undefined): StudyPlan {
  if (planId && STUDY_PLANS[planId]) return STUDY_PLANS[planId]
  return STUDY_PLANS.general_v1!
}

/** Premium-gated capabilities. Trial rows get General entitlements. */
export function planFeatures(tier: StudyTier) {
  return {
    audioSpeakingGrading: tier === 'premium',
    unlimitedSnap: tier === 'premium',
    scoreAnalytics: tier === 'premium',
    creditPacks: tier === 'premium',
    /** Daily snap-to-solve cap for non-premium users. */
    snapDailyLimit: tier === 'premium' ? Infinity : 5,
  }
}
