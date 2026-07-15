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
  /** Monthly test-credit grant, reset (not accumulated) every 30 days —
   *  even on annual plans (the grant cadence is decoupled from the
   *  charge cadence via study_subscriptions.next_grant_at). */
  monthlyCredits: number
  /** Charge cadence in days: 30 = monthly, 365 = annual. Drives the
   *  billing-key initial period and the recurring-charge cron advance. */
  intervalDays: number
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
    intervalDays: 30,
    orderName: 'Classraum Study — Free',
    name_en: 'Free',
    name_ko: '무료',
  },
  general_v1: {
    id: 'general_v1',
    tier: 'general',
    priceWon: 9900,
    monthlyCredits: 8,
    intervalDays: 30,
    orderName: 'Classraum Study — General (Monthly)',
    name_en: 'General',
    name_ko: '일반',
  },
  premium_v1: {
    id: 'premium_v1',
    tier: 'premium',
    priceWon: 16900,
    monthlyCredits: 20,
    intervalDays: 30,
    orderName: 'Classraum Study — Premium (Monthly)',
    name_en: 'Premium',
    name_ko: '프리미엄',
  },
  // Annual plans — ~2 months free vs monthly. Same monthly credit
  // cadence; billed once a year. Korean parents prefer a single lump
  // "결제 한 번" over a recurring monthly charge.
  general_annual_v1: {
    id: 'general_annual_v1',
    tier: 'general',
    priceWon: 99000,
    monthlyCredits: 8,
    intervalDays: 365,
    orderName: 'Classraum Study — General (Annual)',
    name_en: 'General · Annual',
    name_ko: '일반 · 연간',
  },
  premium_annual_v1: {
    id: 'premium_annual_v1',
    tier: 'premium',
    priceWon: 169000,
    monthlyCredits: 20,
    intervalDays: 365,
    orderName: 'Classraum Study — Premium (Annual)',
    name_en: 'Premium · Annual',
    name_ko: '프리미엄 · 연간',
  },
}

/** Monthly credit-grant cadence — annual plans still refresh credits
 *  every 30 days, decoupled from their yearly charge. */
export const GRANT_INTERVAL_DAYS = 30

/** Credit top-up packs — available to any active/trial subscriber (not
 *  just Premium). Bigger packs give a lower per-credit price to raise
 *  AOV. Purchased credits never expire and are consumed only after the
 *  monthly grant runs out. */
export interface CreditPack {
  id: string
  credits: number
  priceWon: number
  orderName: string
}
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack5_v1', credits: 5, priceWon: 6900, orderName: 'Classraum Study — 5 Test Credits' },
  { id: 'pack15_v1', credits: 15, priceWon: 16900, orderName: 'Classraum Study — 15 Test Credits' },
  { id: 'pack40_v1', credits: 40, priceWon: 36900, orderName: 'Classraum Study — 40 Test Credits' },
]
/** Resolve a pack id to its catalog entry (defaults to the 5-pack). */
export function resolvePack(packId: string | null | undefined): CreditPack {
  return CREDIT_PACKS.find(p => p.id === packId) ?? CREDIT_PACKS[0]!
}
/** Back-compat alias — the smallest pack. */
export const CREDIT_PACK = CREDIT_PACKS[0]!

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
    // Credit top-ups are open to any paid/trial tier (General runs out
    // of its 8 monthly credits fast — refusing their money was a leak).
    creditPacks: true,
    /** Daily snap-to-solve cap for non-premium users. */
    snapDailyLimit: tier === 'premium' ? Infinity : 5,
  }
}
