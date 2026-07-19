/**
 * Study plan catalog — single source of truth for tiers, pricing,
 * monthly credit grants, and premium entitlements. Server routes
 * (billing-key, cron renewal, pack purchase, feature gates) and the
 * subscription UI all read from here so a price change is one edit.
 *
 * Credits: every full mock test consumes credits per section (see
 * SECTION_CREDIT_COST — e.g. SAT R&W/Math 2, TOEFL Reading/Writing 1,
 * Speaking/Listening 2). Retakes, resume, review, and FAILED starts
 * never consume a credit (routes reserve at start and refund on any
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
  // 2026-07 credit-system relaunch: sections cost 1-2 credits each (see
  // SECTION_CREDIT_COST below) and the good-better-best ladder is
  // Basic 10 / Premium 20 / Premium Plus 30 credits.
  general_v1: {
    id: 'general_v1',
    tier: 'general',
    priceWon: 9900,
    monthlyCredits: 10,
    intervalDays: 30,
    orderName: 'Classraum Study — Basic (Monthly)',
    name_en: 'Basic',
    name_ko: '베이직',
  },
  premium_v1: {
    id: 'premium_v1',
    tier: 'premium',
    priceWon: 18900,
    monthlyCredits: 20,
    intervalDays: 30,
    orderName: 'Classraum Study — Premium (Monthly)',
    name_en: 'Premium',
    name_ko: '프리미엄',
  },
  // Premium Plus — the "best" rung of good-better-best. Same premium
  // entitlements (a heavy generator is the real cost driver, so credits
  // are the lever).
  premium_plus_v1: {
    id: 'premium_plus_v1',
    tier: 'premium',
    priceWon: 26900,
    monthlyCredits: 30,
    intervalDays: 30,
    orderName: 'Classraum Study — Premium Plus (Monthly)',
    name_en: 'Premium Plus',
    name_ko: '프리미엄 플러스',
  },
  // Prepaid Premium — commitment discounts for students who plan around a
  // sitting. Same 20-credit monthly cadence (refreshed every 30d via
  // next_grant_at); billed once up front.
  premium_3mo_v1: {
    id: 'premium_3mo_v1',
    tier: 'premium',
    priceWon: 45000,
    monthlyCredits: 20,
    intervalDays: 90,
    orderName: 'Classraum Study — Premium (3 Months)',
    name_en: 'Premium · 3 months',
    name_ko: '프리미엄 · 3개월',
  },
  premium_6mo_v1: {
    id: 'premium_6mo_v1',
    tier: 'premium',
    priceWon: 84000,
    monthlyCredits: 20,
    intervalDays: 180,
    orderName: 'Classraum Study — Premium (6 Months)',
    name_en: 'Premium · 6 months',
    name_ko: '프리미엄 · 6개월',
  },
  // Annual plans — ~2 months free vs monthly. Same monthly credit
  // cadence; billed once a year. Korean parents prefer a single lump
  // "결제 한 번" over a recurring monthly charge.
  general_annual_v1: {
    id: 'general_annual_v1',
    tier: 'general',
    priceWon: 99000,
    monthlyCredits: 10,
    intervalDays: 365,
    orderName: 'Classraum Study — Basic (Annual)',
    name_en: 'Basic · Annual',
    name_ko: '베이직 · 연간',
  },
  premium_annual_v1: {
    id: 'premium_annual_v1',
    // 10× the monthly — keeps the "2 months free" annual framing.
    tier: 'premium',
    priceWon: 189000,
    monthlyCredits: 20,
    intervalDays: 365,
    orderName: 'Classraum Study — Premium (Annual)',
    name_en: 'Premium · Annual',
    name_ko: '프리미엄 · 연간',
  },
  premium_plus_annual_v1: {
    id: 'premium_plus_annual_v1',
    // 10× the monthly — keeps the "2 months free" annual framing.
    tier: 'premium',
    priceWon: 269000,
    monthlyCredits: 30,
    intervalDays: 365,
    orderName: 'Classraum Study — Premium Plus (Annual)',
    name_en: 'Premium Plus · Annual',
    name_ko: '프리미엄 플러스 · 연간',
  },
  // Exam-sitting passes — ONE-TIME seasonal passes, not recurring plans.
  // Each grants Premium features until a specific exam date plus a batch
  // of test credits. Modelled as an active row with cancel_at_period_end
  // = true so the billing cron finalizes it (→ cancelled) at expiry and
  // NEVER charges a renewal. Guard rails (isPassPlan) keep them out of the
  // renewal/reactivate paths. One STUDY_PLANS entry per pass so tier /
  // feature resolution works; the sale terms live in STUDY_PASSES below.
  sunung_pass_v1: {
    id: 'sunung_pass_v1',
    tier: 'premium',
    priceWon: 39000,
    monthlyCredits: 0, // pass credits are a one-time purchased-bucket grant
    intervalDays: 3650, // never "due" for a renewal charge; expiry is date-driven
    orderName: 'Classraum Study — 수능 대비 패스',
    name_en: 'Exam Prep Pass',
    name_ko: '수능 대비 패스',
  },
  sat_pass_v1: {
    id: 'sat_pass_v1',
    tier: 'premium',
    priceWon: 29000,
    monthlyCredits: 0,
    intervalDays: 3650,
    orderName: 'Classraum Study — SAT Sitting Pass',
    name_en: 'SAT Sitting Pass',
    name_ko: 'SAT 대비 패스',
  },
  toefl_pass_v1: {
    id: 'toefl_pass_v1',
    tier: 'premium',
    priceWon: 29000,
    monthlyCredits: 0,
    intervalDays: 3650,
    orderName: 'Classraum Study — TOEFL 3-Month Pass',
    name_en: 'TOEFL 3-Month Pass',
    name_ko: 'TOEFL 3개월 패스',
  },
}

/** Monthly credit-grant cadence — annual plans still refresh credits
 *  every 30 days, decoupled from their yearly charge. */
export const GRANT_INTERVAL_DAYS = 30

/**
 * Exam-sitting passes. Each is sold in the run-up to a specific exam,
 * grants Premium until that exam date, and drops a one-time batch of test
 * credits. `examDate` and `windowDays` drive the CTA visibility and the
 * pass expiry — UPDATE THESE each exam season. The `id` matches a premium
 * STUDY_PLANS entry so feature gates resolve.
 */
export interface StudyPass {
  id: string
  priceWon: number
  credits: number
  /** Test family this pass unlocks (lowercase, matches topic slug prefix):
   *  'sat' | 'toefl'. '*' = all tests (a general Premium pass, e.g. 수능). */
  test: 'sat' | 'toefl' | '*'
  /** Date-anchored pass: ISO date it runs until (end-of-day KST). Set
   *  this OR durationDays, not both. Anchored passes are seasonal — the
   *  CTA only shows inside `windowDays` before the date. */
  examDate?: string
  /** CTA visible within this many days before examDate (anchored passes). */
  windowDays?: number
  /** Rolling pass: runs this many days from the moment of purchase, and
   *  the CTA is always available (not tied to a calendar date). */
  durationDays?: number
  name_en: string
  name_ko: string
  blurb_en: string
  blurb_ko: string
}
export const STUDY_PASSES: StudyPass[] = [
  {
    id: 'sunung_pass_v1',
    priceWon: 39000,
    credits: 30,
    test: '*',
    // Date-anchored to the 2027학년도 수능 — Thursday, 19 Nov 2026.
    examDate: '2026-11-19',
    windowDays: 120,
    name_en: 'Exam Prep Pass',
    name_ko: '수능 대비 패스',
    blurb_en: 'Every Premium feature through 수능 day',
    blurb_ko: '수능일까지 프리미엄 전 기능',
  },
  {
    id: 'sat_pass_v1',
    priceWon: 29000,
    credits: 20,
    test: 'sat',
    // Rolling 3-month pass from purchase — no fixed exam date.
    durationDays: 90,
    name_en: 'SAT 3-Month Pass',
    name_ko: 'SAT 3개월 패스',
    blurb_en: '3 months of Premium to prep for your SAT',
    blurb_ko: 'SAT 준비를 위한 프리미엄 3개월',
  },
  {
    id: 'toefl_pass_v1',
    priceWon: 29000,
    credits: 20,
    test: 'toefl',
    // Rolling 3-month pass from purchase, mirroring the SAT pass.
    durationDays: 90,
    name_en: 'TOEFL 3-Month Pass',
    name_ko: 'TOEFL 3개월 패스',
    blurb_en: '3 months of Premium to prep for your TOEFL',
    blurb_ko: 'TOEFL 준비를 위한 프리미엄 3개월',
  },
]

/** Resolve a pass id to its sale terms (null if not a known pass). */
export function resolvePass(passId: string | null | undefined): StudyPass | null {
  return STUDY_PASSES.find(p => p.id === passId) ?? null
}

/** Rows on a seasonal pass must be excluded from the recurring-charge and
 *  reactivate paths — they finalize at expiry, never renew. */
export function isPassPlan(planId: string | null | undefined): boolean {
  return STUDY_PASSES.some(p => p.id === planId)
}

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
/** PRICING INVARIANT: per-credit price must stay ABOVE every
 *  subscription's per-credit rate (cheapest is Premium Plus at
 *  ₩26,900/30 ≈ ₩897, then Premium ₩945, Basic ₩990) so packs never
 *  undercut subscribing. Current ladder per credit: ₩1,900 / ₩1,580 /
 *  ₩1,390 — bulk discount within packs, but subscriptions always win. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack1_v1', credits: 1, priceWon: 1900, orderName: 'Classraum Study — 1 Test Credit' },
  { id: 'pack5_v2', credits: 5, priceWon: 7900, orderName: 'Classraum Study — 5 Test Credits' },
  { id: 'pack10_v1', credits: 10, priceWon: 13900, orderName: 'Classraum Study — 10 Test Credits' },
]
/** Micro top-up — the instant a free user burns their starter credits,
 *  a ₩1,900 single-credit "just let me finish" offer beats hard-walling
 *  them to a ₩9,900 plan. Since the 1/5/10 ladder this is simply the
 *  smallest pack, surfaced at the out-of-credits moment. */
export const MICRO_PACK: CreditPack = CREDIT_PACKS[0]!

/** Resolve a pack id to its catalog entry (defaults to the smallest
 *  pack, so an unknown id can never accidentally overcharge). */
export function resolvePack(packId: string | null | undefined): CreditPack {
  return CREDIT_PACKS.find(p => p.id === packId) ?? CREDIT_PACKS[0]!
}
/** Back-compat alias — the smallest pack. */
export const CREDIT_PACK = CREDIT_PACKS[0]!

/** Credits granted when the 7-day trial row is auto-provisioned. */
export const TRIAL_CREDITS = 3

/** One-time test credits granted with the auto-provisioned Free plan.
 *  Since the 2026-07 relaunch EVERY full mock test consumes credits
 *  (bank SAT included), so this is enough for exactly one SAT section
 *  test (2 credits). */
export const FREE_CREDITS = 2

/**
 * Per-section full-test credit costs (2026-07 credit relaunch). EVERY
 * full mock test now consumes credits — including bank-assembled SAT
 * tests, which were previously free. Longer / costlier-to-serve
 * sections price at 2; shorter ones at 1. Anything unlisted costs 1.
 */
const SECTION_CREDIT_COST: Record<string, Record<string, number>> = {
  sat: { reading_writing: 2, math: 2 },
  toefl: { reading: 1, writing: 1, speaking: 2, listening: 2 },
}

/** Credit cost to start one full test for (family, section). */
export function creditCostForTest(family: string | null | undefined, section: string | null | undefined): number {
  if (!family) return 1
  return SECTION_CREDIT_COST[family]?.[section ?? ''] ?? 1
}

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
