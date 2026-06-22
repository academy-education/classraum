import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/study/subscription/checkout — extend or start a paid
 * period.
 *
 * Phase 4 STUB: this endpoint pretends a PortOne charge succeeded
 * and advances current_period_end by 30 days, flipping status to
 * 'active' and clearing cancel_at_period_end. It's a stand-in until
 * Phase 4.5 wires up the real PortOne billing-key issue + recurring
 * charge against it.
 *
 * The route contract (auth, response shape, mutation surface) is
 * what the real implementation will keep — only the "did the charge
 * actually clear" step gets replaced. UI built against this stub
 * will work unchanged.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // TODO(phase-4.5): issue a PortOne billing-key for the student, run
  // the recurring charge, and only on success advance the period.
  // The stub below assumes the charge cleared.

  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Upsert. New students hit this without a row yet (e.g. coming
  // straight from the trial-expired paywall); existing trial/cancel
  // rows get advanced.
  const { error } = await supabaseAdmin
    .from('study_subscriptions')
    .upsert({
      student_id: user.id,
      status: 'active',
      plan: 'monthly_v1',
      price_cents: 990000,
      currency: 'KRW',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      updated_at: now.toISOString(),
    }, { onConflict: 'student_id' })

  if (error) return NextResponse.json({ error: 'checkout failed', details: error.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    current_period_end: periodEnd.toISOString(),
  })
}
