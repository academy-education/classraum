import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { raiseAlert } from '@/lib/ops/alert'

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
 *  failure every already-reserved slice is refunded before returning.
 *
 *  `testFamily` scopes spending: a student's exam-pass credits for that
 *  test (or the all-access '*' pass) are spent FIRST — before generic
 *  monthly/purchased credits — so a SAT pass depletes on SAT tests and its
 *  credits are never usable on another test. Omit for non-test charges. */
export async function reserveTestCredits(studentId: string, sessionId: string, cost: number, testFamily?: string | null, opts?: { skipPass?: boolean }): Promise<ReserveResult> {
  const reserved: string[] = []
  for (let i = 0; i < cost; i++) {
    const source = creditSourceId(sessionId, i)

    // Test-scoped pass credit first (idempotent per source; no-op reason
    // 'no_pass_credits' when the student holds none for this test). Skipped
    // when the student explicitly chose to spend a regular credit instead.
    let reservedSlice = false
    if (testFamily && !opts?.skipPass) {
      const { data } = await supabaseAdmin
        .rpc('use_study_pass_credit', { p_student: studentId, p_source: source, p_test: testFamily })
      if ((data as { ok?: boolean } | null)?.ok) reservedSlice = true
    }

    // Fall back to generic grant → purchased.
    let reason: string | undefined
    if (!reservedSlice) {
      const { data, error } = await supabaseAdmin
        .rpc('use_study_credit', { p_student: studentId, p_source: source })
      const r = (data ?? {}) as { ok?: boolean; reason?: string }
      if (!error && r.ok) reservedSlice = true
      else reason = error ? 'rpc_error' : (r.reason ?? 'no_credits')
    }

    if (!reservedSlice) {
      // Roll back the slices we did get so a failed start never eats credits.
      // refund_study_credit restores to whichever bucket each slice used
      // (pass / grant / purchased) via the ledger.
      //
      // This rollback is the ONLY thing standing between the student and lost
      // credits: no session row is written on this path, so the stale-session
      // reaper never sees it. The result must therefore be read (supabase-js
      // resolves `{ error }`, it does not throw) and any failure has to page
      // someone — the student has been debited for a test that never started.
      const failed: string[] = []
      for (const s of reserved) {
        try {
          const { data, error } = await supabaseAdmin
            .rpc('refund_study_credit', { p_student: studentId, p_source: s })
          const r = (data ?? {}) as { ok?: boolean; already?: boolean }
          if (error || !(r.ok || r.already)) failed.push(s)
        } catch {
          failed.push(s)
        }
      }
      if (failed.length > 0) {
        await raiseAlert({
          severity: 'critical',
          title: 'Study credits debited for a test that never started',
          message:
            `${failed.length} of ${reserved.length} reserved credit slice(s) could not be rolled ` +
            `back after a partial reserve failure. The student has lost these credits and no ` +
            `pending session exists for the reaper to clean up — refund them manually.`,
          dedupeKey: `study-credit-rollback-failed:${studentId}`,
          context: { studentId, sessionId, cost, testFamily: testFamily ?? null, failedSlices: failed },
        })
      }
      return { ok: false, reason: reason ?? 'no_credits' }
    }
    reserved.push(source)
  }
  return { ok: true }
}

export interface RefundResult {
  /** Slices that actually moved a credit back on THIS call. */
  refunded: number
  /** Slices already refunded by an earlier call (no-op, not a failure). */
  already: number
  /** Slices that were never debited (nothing to give back). */
  noDebit: number
}

/** Refund every credit slice of a session.
 *
 *  IDEMPOTENT AT THE DATABASE LEVEL — safe to call on any failure path,
 *  from any process, any number of times. `refund_study_credit` looks up
 *  the debit ledger row for (student, source), returns `no_debit` when
 *  there isn't one, and returns `already` without touching a balance when
 *  a refund ledger row for that source already exists. So a route's
 *  catch-path refund, its finally-path refund, and the stale-generation
 *  reaper can all fire for the same session and the student still gets
 *  exactly one credit back per slice.
 *
 *  Returns a per-slice breakdown so callers (the reaper especially) can
 *  log whether a refund was real or a replay. */
export async function refundTestCredits(studentId: string, sessionId: string, cost: number): Promise<RefundResult> {
  const out: RefundResult = { refunded: 0, already: 0, noDebit: 0 }
  for (let i = 0; i < cost; i++) {
    const source = creditSourceId(sessionId, i)
    try {
      const { data } = await supabaseAdmin
        .rpc('refund_study_credit', { p_student: studentId, p_source: source })
      const r = (data ?? {}) as { ok?: boolean; already?: boolean; reason?: string }
      if (r.already) out.already++
      else if (r.ok) out.refunded++
      else out.noDebit++
    } catch (e) {
      console.error('[credits] refund slice failed', sessionId, i, e)
    }
  }
  return out
}
