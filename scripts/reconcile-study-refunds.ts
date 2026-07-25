/**
 * Reconcile study_payments against PortOne's authoritative payment status.
 *
 *   npx tsx scripts/reconcile-study-refunds.ts          # report only (safe)
 *   npx tsx scripts/reconcile-study-refunds.ts --apply  # stamp refunded_at
 *
 * Why this exists: `refunded_at` is only written when a refund is issued
 * THROUGH our admin console (or, since the webhook fix, when PortOne notifies
 * us of a cancellation). Refunds performed directly in the PortOne dashboard
 * BEFORE that webhook wiring — or whose webhook delivery was lost — leave the
 * row still looking Paid, so the admin over-reports revenue.
 *
 * This walks every recorded payment, asks PortOne what actually happened, and
 * reports (or fixes) the drift. Safe to re-run; --apply only ever stamps rows
 * PortOne itself reports as CANCELLED / PARTIAL_CANCELLED.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')

const PORTONE_API_BASE = 'https://api.portone.io'
const apiSecret = process.env.PORTONE_API_SECRET
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface PortOneStatus {
  ok: boolean
  status?: string
  cancelledAmount?: number
  message?: string
}

async function fetchStatus(paymentId: string): Promise<PortOneStatus> {
  try {
    const res = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `PortOne ${apiSecret}` },
    })
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      const msg = typeof body.message === 'string' ? body.message : `HTTP ${res.status}`
      return { ok: false, message: msg }
    }
    const amount = body.amount as { cancelled?: number; total?: number } | undefined
    return {
      ok: true,
      status: typeof body.status === 'string' ? body.status : undefined,
      cancelledAmount: amount?.cancelled,
    }
  } catch (e) {
    return { ok: false, message: (e as Error).message }
  }
}

async function main() {
  if (!apiSecret) throw new Error('PORTONE_API_SECRET missing from .env.local')

  const { data: rows, error } = await supabase
    .from('study_payments')
    .select('payment_id, student_id, kind, amount_won, refunded_at, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error

  console.log(`Checking ${rows?.length ?? 0} study payments against PortOne…\n`)

  const drifted: string[] = []
  const unreadable: string[] = []
  let alreadyCorrect = 0

  for (const r of rows ?? []) {
    const id = r.payment_id as string
    const info = await fetchStatus(id)

    if (!info.ok) {
      unreadable.push(`${id}  (${info.message})`)
      continue
    }

    const cancelledAtPortOne = info.status === 'CANCELLED' || info.status === 'PARTIAL_CANCELLED'
    const cancelledLocally = !!r.refunded_at

    if (cancelledAtPortOne && !cancelledLocally) {
      drifted.push(id)
      console.log(
        `DRIFT  ${id}\n` +
        `       PortOne: ${info.status}  ·  ours: PAID  ·  ₩${(r.amount_won as number)?.toLocaleString() ?? '?'} (${r.kind})`,
      )
      if (APPLY) {
        const { error: upErr } = await supabase
          .from('study_payments')
          .update({
            refunded_at: new Date().toISOString(),
            refund_reason: `reconciled from PortOne (${info.status})`,
          })
          .eq('payment_id', id)
          .is('refunded_at', null)
        console.log(upErr ? `       !! update failed: ${upErr.message}` : '       -> stamped refunded_at')
      }
    } else if (!cancelledAtPortOne && cancelledLocally) {
      // The opposite drift: we think it's refunded but PortOne says it's live.
      console.log(`REVERSE ${id}\n        PortOne: ${info.status}  ·  ours: REFUNDED  (needs a human look)`)
    } else {
      alreadyCorrect++
    }
  }

  console.log('\n──────── summary ────────')
  console.log(`in sync        : ${alreadyCorrect}`)
  console.log(`drifted        : ${drifted.length}${APPLY ? ' (stamped)' : ' (run with --apply to fix)'}`)
  console.log(`unreadable     : ${unreadable.length}`)
  if (unreadable.length) {
    console.log('\nUnreadable (test-channel or deleted payments — expected for seeded data):')
    for (const u of unreadable.slice(0, 20)) console.log('  ' + u)
    if (unreadable.length > 20) console.log(`  … and ${unreadable.length - 20} more`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
