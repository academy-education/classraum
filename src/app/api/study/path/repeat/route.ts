import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { trackEvent } from '@/lib/study/analytics'
import { reserveTestCredits, refundTestCredits } from '@/lib/study/credits'
import { getPathTemplate, PATH_REPEAT_CREDITS } from '@/lib/study-path'

/**
 * POST /api/study/path/repeat — restart the WHOLE study path from
 * stop 1 for PATH_REPEAT_CREDITS (2) credits.
 *
 * Single stops are terminal once completed (enforced in
 * practice/generate + test/assemble); this route is the only repeat
 * affordance. It:
 *   1. verifies EVERY node of the target-test template has a completed
 *      unarchived session (partial paths can't be reset — nothing to
 *      repeat, and it would be a free do-over of finished stops),
 *   2. charges PATH_REPEAT_CREDITS via the same use_study_credit RPC
 *      slices full tests use. The charge source id derives
 *      deterministically from the exact set of completed session ids
 *      being retired, so a double-tap (two concurrent calls seeing the
 *      same run) resolves to the SAME idempotent debit pair — the
 *      student is never charged twice for one reset,
 *   3. archives every path-tagged session for the template's nodes.
 *      Path progress is derived from unarchived sessions, so archiving
 *      IS the reset — history/attempt data stays intact, and the
 *      per-node "already completed" guards clear for the new run.
 *
 * Failure modes: 409 path_incomplete when not all stops are done,
 * 402 no_credits / no_subscription when the charge can't be covered
 * (client shows the standard out-of-credits upsell).
 */

export const dynamic = 'force-dynamic'

/** Deterministic v5-style UUID for the repeat charge — same formatting
 *  trick as creditSourceId in lib/study/credits.ts. */
function repeatChargeId(seed: string): string {
  const h = createHash('sha1').update(seed).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(
    `path-repeat:user:${user.id}`,
    { windowMs: 60 * 1000, max: 5 },
  )
  if (blocked) return blocked

  let body: { target?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const template = getPathTemplate(body.target)
  if (!template) return NextResponse.json({ error: 'unknown target test' }, { status: 400 })

  const nodeIds = new Set(template.nodes.map(n => n.id))

  // Every unarchived path-tagged session for this student; filter to
  // this template's nodes app-side (jsonb `in` filters are awkward and
  // the row count per student is small).
  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from('study_sessions')
    .select('id, status, config')
    .eq('student_id', user.id)
    .eq('archived', false)
    .not('config->pathNode', 'is', null)
  if (rowsErr) return NextResponse.json({ error: 'lookup failed' }, { status: 500 })

  const pathRows = ((rows ?? []) as Array<{ id: string; status: string; config: { pathNode?: string } | null }>)
    .filter(r => r.config?.pathNode && nodeIds.has(r.config.pathNode))

  const completedNodeIds = new Set(
    pathRows.filter(r => r.status === 'completed').map(r => r.config!.pathNode as string),
  )
  const allComplete = template.nodes.every(n => completedNodeIds.has(n.id))
  if (!allComplete) {
    return NextResponse.json(
      { error: 'path not fully completed', reason: 'path_incomplete' },
      { status: 409 },
    )
  }

  // ── Charge — idempotent against double-taps ────────────────────
  // The charge id is a pure function of (student, test, the exact
  // completed-session set being retired). Two racing calls for the
  // same run derive identical credit-slice sources, and the
  // use_study_credit RPC debits at most once per (student, source),
  // so the reset can never double-charge.
  const completedIds = pathRows
    .filter(r => r.status === 'completed')
    .map(r => r.id)
    .sort()
  const chargeId = repeatChargeId(
    `path-repeat:${user.id}:${template.testSlug}:${completedIds.join(',')}`,
  )
  // Path repeats target one test family — spend that pass's credits first.
  const repeatFamily = template.testSlug.replace(/^test-/, '').split('-')[0]?.toLowerCase() || null
  const credit = await reserveTestCredits(user.id, chargeId, PATH_REPEAT_CREDITS, repeatFamily)
  if (!credit.ok) {
    void trackEvent(user.id, 'out_of_credits', { reason: credit.reason ?? 'no_credits', kind: 'path_repeat' })
    return NextResponse.json(
      { error: 'not enough credits', reason: credit.reason === 'no_subscription' ? 'no_subscription' : 'no_credits' },
      { status: 402 },
    )
  }

  // ── Reset — archive the whole run (completed AND stray unfinished
  // sessions) so progress derivation starts clean at node 0.
  const allIds = pathRows.map(r => r.id)
  const { error: archiveErr } = await supabaseAdmin
    .from('study_sessions')
    .update({ archived: true })
    .in('id', allIds)
  if (archiveErr) {
    // Charge without a reset would be theft — give the credits back.
    await refundTestCredits(user.id, chargeId, PATH_REPEAT_CREDITS)
    return NextResponse.json({ error: 'reset failed' }, { status: 500 })
  }

  void trackEvent(user.id, 'path_repeated', {
    test: template.testSlug,
    creditCost: PATH_REPEAT_CREDITS,
    retiredSessions: allIds.length,
  })

  return NextResponse.json({
    ok: true,
    creditsSpent: PATH_REPEAT_CREDITS,
    credits: { grant: credit.grant ?? null, purchased: credit.purchased ?? null },
  })
}
