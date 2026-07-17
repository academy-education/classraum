import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Variable-cost credit reservation on top of the 1-credit
 * use_study_credit / refund_study_credit RPCs (migration 037).
 *
 * The RPCs debit exactly one credit per (student, source) and are
 * idempotent on that pair. A test costing N credits reserves N debits
 * whose source ids derive deterministically from the session id —
 * so retries never double-charge, and refunds can always reconstruct
 * the exact same source set from (sessionId, cost).
 *
 * TODO: fold into an amount-param RPC when the next credit-system
 * migration lands; app-level multi-reserve is correct but chattier.
 */

/** Deterministic valid UUID for the Nth credit slice of a session.
 *  Slice 0 is the session id itself (backward compatible with every
 *  pre-relaunch 1-credit ledger row). */
function creditSourceId(sessionId: string, slice: number): string {
  if (slice === 0) return sessionId
  const h = createHash('sha1').update(`${sessionId}:credit:${slice}`).digest('hex')
  // Format as a v5-style UUID (variant + version nibbles set).
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

export interface ReserveResult {
  ok: boolean
  reason?: string
  /** Remaining balances after the reserve (from the last RPC call). */
  grant?: number
  purchased?: number
}

/** Reserve `cost` credits for a session. All-or-nothing: on a partial
 *  failure every already-reserved slice is refunded before returning. */
export async function reserveTestCredits(studentId: string, sessionId: string, cost: number): Promise<ReserveResult> {
  const reserved: string[] = []
  let last: ReserveResult = { ok: true }
  for (let i = 0; i < cost; i++) {
    const source = creditSourceId(sessionId, i)
    const { data, error } = await supabaseAdmin
      .rpc('use_study_credit', { p_student: studentId, p_source: source })
    const r = (data ?? {}) as { ok?: boolean; reason?: string; grant?: number; purchased?: number }
    if (error || !r.ok) {
      // Roll back the slices we did get so a failed start never eats credits.
      for (const s of reserved) {
        await supabaseAdmin.rpc('refund_study_credit', { p_student: studentId, p_source: s }).then(() => {}, () => {})
      }
      return { ok: false, reason: error ? 'rpc_error' : (r.reason ?? 'no_credits'), grant: r.grant, purchased: r.purchased }
    }
    reserved.push(source)
    last = { ok: true, grant: r.grant, purchased: r.purchased }
  }
  return last
}

/** Refund every credit slice of a session (idempotent — safe to call
 *  on any failure path regardless of how many slices were reserved). */
export async function refundTestCredits(studentId: string, sessionId: string, cost: number): Promise<void> {
  for (let i = 0; i < cost; i++) {
    const source = creditSourceId(sessionId, i)
    try {
      await supabaseAdmin.rpc('refund_study_credit', { p_student: studentId, p_source: source })
    } catch (e) {
      console.error('[credits] refund slice failed', sessionId, i, e)
    }
  }
}
