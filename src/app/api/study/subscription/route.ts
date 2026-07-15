import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolvePlan, planFeatures, STUDY_PLANS, CREDIT_PACK, CREDIT_PACKS } from '@/lib/study/plans'
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

  if (!sub) return NextResponse.json({ subscription: null })

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
    catalog: { plans: Object.values(STUDY_PLANS), pack: CREDIT_PACK, packs: CREDIT_PACKS },
  })
}
