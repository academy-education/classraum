import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: sub } = await supabaseAdmin
    .from('study_subscriptions')
    .select('status, plan, price_cents, currency, trial_ends_at, current_period_start, current_period_end, cancel_at_period_end')
    .eq('student_id', user.id)
    .maybeSingle()

  return NextResponse.json({ subscription: sub ?? null })
}
