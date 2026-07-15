import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  resolvePlan, planFeatures, STUDY_PLANS, CREDIT_PACK, CREDIT_PACKS,
  SUNUNG_PASS_PLAN_ID, SUNUNG_PASS_CREDITS, SUNUNG_EXAM_DATE, SUNUNG_PASS_WINDOW_DAYS,
} from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * GET  /api/study/subscription          — return current row.
 * POST /api/study/subscription/cancel   — set cancel_at_period_end.
 * POST /api/study/subscription/reactivate — clear cancel_at_period_end.
 * POST /api/study/subscription/checkout — stub: extend the period 30
 *      days as if a real PortOne payment cleared. Phase 4.5 replaces
 *      this stub with the actual PortOne billing-key + recurring
 *      charge flow.
 *
 * This file only handles the GET. The mutation routes live in
 * sibling subdirectories so each one is a clear action endpoint.
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, pending_plan, price_cents, currency, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, grant_credits_remaining, purchased_credits_remaining')
    .eq('student_id', user.id)
    .maybeSingle()

  // The 수능 pass is a one-time seasonal SKU, not a recurring plan card —
  // keep it out of the plan grid and surface it separately. The purchase
  // CTA is only offered inside the pre-exam window and to members not on
  // an active recurring plan. Computed even for null-row (brand-new) users
  // so the offer can reach them too.
  const passPlan = STUDY_PLANS[SUNUNG_PASS_PLAN_ID]!
  const examEnd = new Date(`${SUNUNG_EXAM_DATE}T23:59:59+09:00`)
  const daysToExam = Math.ceil((examEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  const inSeason = daysToExam > 0 && daysToExam <= SUNUNG_PASS_WINDOW_DAYS
  const onPass = sub?.plan === SUNUNG_PASS_PLAN_ID && sub?.status === 'active'
  // Offer to anyone not currently on an active recurring plan (a live
  // pass-holder is 'active' too, so this also hides it while a pass runs).
  const passOffer = inSeason && sub?.status !== 'active'
  const passBlock = {
    id: passPlan.id,
    priceWon: passPlan.priceWon,
    credits: SUNUNG_PASS_CREDITS,
    examDate: SUNUNG_EXAM_DATE,
    daysToExam,
    offer: passOffer,
    onPass,
  }

  if (!sub) return NextResponse.json({ subscription: null, pass: passBlock })

  // Enrich with the resolved tier, credit balance, and feature flags
  // so every client surface (subscription page, upsell cards, snap
  // limit banner) reads one payload instead of re-deriving plan rules.
  const plan = resolvePlan(sub.plan)
  const tier = sub.status === 'trial' ? 'general' : plan.tier

  return NextResponse.json({
    subscription: sub,
    tier,
    planMeta: plan,
    credits: {
      grant: sub.grant_credits_remaining ?? 0,
      purchased: sub.purchased_credits_remaining ?? 0,
      total: (sub.grant_credits_remaining ?? 0) + (sub.purchased_credits_remaining ?? 0),
    },
    features: planFeatures(tier),
    catalog: {
      plans: Object.values(STUDY_PLANS).filter(p => p.id !== SUNUNG_PASS_PLAN_ID),
      pack: CREDIT_PACK,
      packs: CREDIT_PACKS,
    },
    pass: passBlock,
  })
}
