import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  resolvePlan, planFeatures, STUDY_PLANS, CREDIT_PACK, CREDIT_PACKS,
  STUDY_PASSES, isPassPlan,
} from '@/lib/study/plans'
import { requireStudyUser } from '@/lib/study/auth'
import { getTestAccess } from '@/lib/study/entitlements'

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

  // Exam-sitting passes are one-time seasonal SKUs, not recurring plan
  // cards — keep them out of the plan grid and surface them separately.
  // Each purchase CTA is offered only inside its pre-exam window and to
  // members not on an active plan. Computed even for null-row (brand-new)
  // users so offers can reach them too.
  // Per-test entitlements — lets client surfaces (topic pages, plan
  // grid) lock tests a pass-scoped user can't access. { all:true } for
  // recurring-plan / all-access-pass / free-trial users.
  const access = await getTestAccess(user.id)

  const now = Date.now()
  const activePassId = sub?.status === 'active' && isPassPlan(sub.plan) ? sub.plan : null
  const passes = STUDY_PASSES.map(p => {
    // Date-anchored passes are seasonal (offer only inside their pre-exam
    // window, show a D-<n> countdown). Rolling passes are always offered
    // and show their duration instead.
    let daysToExam: number | null = null
    let available = true
    if (p.examDate) {
      const examEnd = new Date(`${p.examDate}T23:59:59+09:00`)
      daysToExam = Math.ceil((examEnd.getTime() - now) / (24 * 60 * 60 * 1000))
      available = daysToExam > 0 && daysToExam <= (p.windowDays ?? 120)
    }
    return {
      id: p.id,
      priceWon: STUDY_PLANS[p.id]?.priceWon ?? p.priceWon,
      credits: p.credits,
      examDate: p.examDate ?? null,
      durationDays: p.durationDays ?? null,
      daysToExam,
      name_en: p.name_en,
      name_ko: p.name_ko,
      blurb_en: p.blurb_en,
      blurb_ko: p.blurb_ko,
      // Offer only when available. Shown to non-active members and — so a
      // pass holder can stack another test — to pass holders for any pass
      // OTHER than the one they're already on. Recurring-plan actives
      // (all-access) never see pass offers.
      offer: available && (sub?.status !== 'active' || (activePassId !== null && activePassId !== p.id)),
      onPass: activePassId === p.id,
    }
  })

  if (!sub) return NextResponse.json({ subscription: null, passes, access })

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
      plans: Object.values(STUDY_PLANS).filter(p => !isPassPlan(p.id)),
      pack: CREDIT_PACK,
      packs: CREDIT_PACKS,
    },
    passes,
    access,
  })
}
