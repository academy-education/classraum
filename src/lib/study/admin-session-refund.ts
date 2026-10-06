import { dbAdmin } from '@/lib/supabase-admin'
import { refundTestCredits, type RefundResult } from '@/lib/study/credits'
import { raiseAlert } from '@/lib/ops/alert'
import { notifyCreditRefund, type RefundNoticeOutcome } from '@/lib/study/credit-refund-notify'
import type { RefundNoticeReason } from '@/lib/study/credit-refund-notice'

/**
 * Operator refund of ONE test session's credits.
 *
 * Exists because there was no supported way to give a student back the
 * credits of a test they could not finish (the paused-SAT student of the
 * week of 2026-09-28 had to ask, and the only remedy was hand-written SQL).
 *
 * Safety properties, and where each one comes from:
 *
 *   - IDEMPOTENT IN THE DATABASE, not here. refund_study_credit answers
 *     `already` once a refund ledger row exists for (student, source), and
 *     the ledger's UNIQUE(student_id, kind, source_id) index rejects a second
 *     refund row outright. Two admins pressing at once: one slice wins, the
 *     loser's RPC errors (counted `failed`, answered 502), and a retry reads
 *     `already`. There is deliberately no read-then-write guard in this file
 *     (see CLAUDE.md, "idempotent that is a read followed by a write is not").
 *   - PRICE-AGNOSTIC. Prices changed over time (SAT 2 -> 3), so the cost is
 *     not recomputed from today's table. Every slice up to MAX_SLICES is
 *     offered to the RPC; a slice never debited answers `no_debit`, a no-op.
 *   - REFUSES DELIVERED TESTS by default. A completed session was a test the
 *     student received; refunding it is a goodwill decision that needs
 *     `allowCompleted: true`.
 *   - AUDITED TWICE. The refund ledger rows this call wrote are labelled
 *     with the admin and reason (the ledger row IS the audit row), and an
 *     admin_activity_logs row is written by the route.
 *   - A refunded, unfinished session is ARCHIVED so the refund cannot be
 *     followed by finishing the same test for free.
 *   - The STUDENT IS TOLD (2026-10-06) when `notify` is set: one in-app
 *     notice + email via notifyCreditRefund, exactly once per ledger row.
 *     A batch caller passes notify:false per session and calls
 *     notifyCreditRefund once with every session's refundLedgerIds, so six
 *     sessions read as one "12 credits returned", not six messages.
 */

/** Above the highest price ever charged (3), with margin. */
export const MAX_SLICES = 6

export interface SessionRefundInput {
  adminId: string
  sessionId: string
  /** Required when the session row no longer exists (assemble rollback
   *  deletes it; the alert carries both ids). Must match when it does. */
  studentId?: string
  reason: string
  allowCompleted?: boolean
  /** Notify the student about the credits THIS call returned. */
  notify?: boolean
  /** Student-facing sentence per language (the audit `reason` is internal). */
  noticeReason?: RefundNoticeReason
}

export interface SessionRefundOutcome {
  status: number
  body: Record<string, unknown>
  /** Present when credits were examined — for the activity log. */
  result?: RefundResult & { studentId: string; archived: boolean; labelled: boolean; refundLedgerIds: string[] }
  /** Present when `notify` was set and credits were returned. */
  notice?: RefundNoticeOutcome
}

type SessionRow = { id: string; student_id: string; status: string | null; mode: string | null; archived: boolean | null; config: unknown }

export async function refundSessionCredits(input: SessionRefundInput): Promise<SessionRefundOutcome> {
  const { data: sess, error: sessErr } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, status, mode, archived, config')
    .eq('id', input.sessionId)
    .maybeSingle()
  if (sessErr) return { status: 500, body: { error: 'session lookup failed' } }
  const row = (sess ?? null) as SessionRow | null

  let studentId: string
  if (row) {
    if (input.studentId && input.studentId !== row.student_id) {
      return { status: 400, body: { error: 'studentId does not own this session', code: 'student_mismatch' } }
    }
    if (row.status === 'completed' && !input.allowCompleted) {
      return {
        status: 409,
        body: { error: 'session was completed — the test was delivered. Pass allowCompleted to refund anyway.', code: 'session_completed' },
      }
    }
    studentId = row.student_id
  } else {
    if (!input.studentId) {
      return { status: 404, body: { error: 'session not found; pass studentId to refund a deleted session', code: 'session_not_found' } }
    }
    studentId = input.studentId
  }

  const r = await refundTestCredits(studentId, input.sessionId, MAX_SLICES)

  if (r.refunded === 0 && r.already === 0 && r.failed === 0) {
    return { status: 404, body: { error: 'no credits were ever charged for this session', code: 'no_debits' } }
  }

  // Label the refund rows THIS call wrote. Only these: an earlier automatic
  // refund (assemble rollback, reaper) must not be relabelled as an admin's.
  let labelled = true
  let refundLedgerIds: string[] = []
  if (r.refundedSources.length > 0) {
    const note = `admin refund by ${input.adminId}: ${input.reason}`.slice(0, 500)
    const { data: labelledRows, error: noteErr } = await dbAdmin
      .from('study_credit_ledger')
      .update({ note })
      .eq('student_id', studentId)
      .eq('kind', 'refund')
      .in('source_id', r.refundedSources)
      .select('id')
    refundLedgerIds = ((labelledRows ?? []) as Array<{ id: string }>).map(x => x.id)
    if (noteErr) {
      // The ids are still needed to notify; read them without the label.
      const { data: idRows } = await dbAdmin
        .from('study_credit_ledger').select('id')
        .eq('student_id', studentId).eq('kind', 'refund').in('source_id', r.refundedSources)
      refundLedgerIds = ((idRows ?? []) as Array<{ id: string }>).map(x => x.id)
      labelled = false
      await raiseAlert({
        severity: 'warning',
        title: 'Admin credit refund not labelled in the ledger',
        message: `Session ${input.sessionId}: ${r.refunded} credit(s) were refunded but the ledger note was not written. The refund stands; only the in-ledger audit label is missing.`,
        dedupeKey: `admin-session-refund-label:${input.sessionId}`,
        error: noteErr,
        context: { sessionId: input.sessionId, studentId, adminId: input.adminId },
      })
    }
  }

  // Archive an unfinished session once any credit has gone back, so it
  // cannot then be finished for free. A completed one keeps its place in
  // score history and is only stamped.
  let archived = false
  if (row && r.refunded > 0) {
    const cfg = row.config && typeof row.config === 'object' && !Array.isArray(row.config) ? row.config as Record<string, unknown> : {}
    const archive = row.status !== 'completed'
    const { error: upErr } = await dbAdmin
      .from('study_sessions')
      .update({
        ...(archive ? { archived: true } : {}),
        config: {
          ...cfg,
          credit_refund: { at: new Date().toISOString(), by: input.adminId, reason: input.reason, refunded: r.refunded },
        },
      })
      .eq('id', row.id)
    archived = archive && !upErr
    if (upErr && archive) {
      await raiseAlert({
        severity: 'warning',
        title: 'Refunded test session not archived',
        message: `Session ${row.id} had ${r.refunded} credit(s) refunded but could not be archived, so the student can still finish it.`,
        dedupeKey: `admin-session-refund-archive:${row.id}`,
        error: upErr,
        context: { sessionId: row.id, studentId },
      })
    }
  }

  // Never throws, and runs after the refund is final: a notification
  // problem cannot undo or fail the refund.
  let notice: RefundNoticeOutcome | undefined
  if (input.notify && refundLedgerIds.length > 0) {
    notice = await notifyCreditRefund(studentId, refundLedgerIds, input.noticeReason, { sessionIds: [input.sessionId] })
  }

  const result = { ...r, studentId, archived, labelled, refundLedgerIds }
  const summary = {
    sessionId: input.sessionId,
    studentId,
    refunded: r.refunded,
    alreadyRefunded: r.already,
    failed: r.failed,
    archived,
    labelled,
  }
  if (r.failed > 0) {
    // Some slices still debited. Safe to retry: the ones that went through
    // will read `already`.
    return { status: 502, body: { ok: false, error: 'some credit slices could not be refunded — retry', ...summary }, result, notice }
  }
  return { status: 200, body: { ok: true, ...summary }, result, notice }
}
