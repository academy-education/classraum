import { dbAdmin } from '@/lib/supabase-admin'
import { refundTestCredits } from '@/lib/study/credits'
import { MAX_SLICES } from '@/lib/study/admin-session-refund'
import { raiseAlert } from '@/lib/ops/alert'

/**
 * PROPOSED POLICY — not scheduled. Owner decision pending (2026-10-04).
 *
 * A full test is charged when it is OPENED (/api/study/test/assemble), and
 * the server learns nothing more until submit: answers, the timer and the
 * pause state live in the student's localStorage, and last_active_at is
 * never advanced by TestSession. So "charge on first answer" cannot be built
 * without a new client->server engagement call, and that call would be
 * client-trusted — a student who never sends it would never be charged.
 *
 * What the server CAN see: a session that was never submitted and never
 * reached Module 2 (module2_route stays null until the student finishes
 * Module 1 of an adaptive test). This sweep refunds those once they are
 * ABANDON_AFTER_DAYS old, and archives them so the refund cannot be
 * followed by finishing the same test for free.
 *
 * Trade-offs, stated so the owner can pick N:
 *   - A student who paused and returns after N days finds the test gone
 *     (but has the credits back). A shorter N refunds more peeks sooner and
 *     strands more genuine pauses; 7 days keeps every resume we have seen.
 *   - Abuse: open a test, read the items, wait N days, get the credits back.
 *     Bounded: no answers or explanations are shown without submit, and the
 *     opened items are written to study_item_exposures at assemble time, so
 *     peeking burns the student's own unseen pool and the exhaustion gate
 *     closes sooner.
 *   - A linear test (SSAT/ISEE/ACT/TOEFL Writing/Speaking, SAT non-adaptive)
 *     has no Module-2 signal, so a student who sat most of one and walked
 *     away is refunded too. That errs toward the student.
 *
 * Mechanics: claim each row with a CONDITIONAL update (still active, still
 * unarchived, still no module 2) — the claim is the guard, not a prior read
 * — then refund. Refunds are idempotent in the database (refund_study_credit
 * + the ledger's unique index), so a re-run or an admin refund of the same
 * session cannot pay twice. A failed refund pages with the ids the admin
 * refund route needs; the row stays archived.
 */

export const ABANDON_AFTER_DAYS = 7
const MAX_PER_RUN = 200

export interface AbandonedCandidate {
  id: string
  student_id: string
  created_at: string
  config: unknown
}

export interface SweepResult {
  dryRun: boolean
  candidates: number
  claimed: number
  creditsRefunded: number
  failedSessions: string[]
  sessions: Array<{ id: string; studentId: string; createdAt: string; refunded?: number }>
}

export async function sweepAbandonedTests(opts: { now?: Date; apply: boolean }): Promise<SweepResult> {
  const now = opts.now ?? new Date()
  const cutoff = new Date(now.getTime() - ABANDON_AFTER_DAYS * 86_400_000).toISOString()

  const { data, error } = await dbAdmin
    .from('study_sessions')
    .select('id, student_id, created_at, config')
    .eq('mode', 'full_test')
    .eq('status', 'active')
    .eq('archived', false)
    .is('module2_route', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)
  // Never a number over input we could not read (CLAUDE.md).
  if (error) throw new Error(`abandoned-test sweep: list failed: ${error.message}`)
  const rows = (data ?? []) as AbandonedCandidate[]

  const out: SweepResult = {
    dryRun: !opts.apply, candidates: rows.length, claimed: 0, creditsRefunded: 0, failedSessions: [],
    sessions: rows.map(r => ({ id: r.id, studentId: r.student_id, createdAt: r.created_at })),
  }
  if (!opts.apply) return out

  for (const [i, row] of rows.entries()) {
    const cfg = row.config && typeof row.config === 'object' && !Array.isArray(row.config)
      ? row.config as Record<string, unknown> : {}
    const { data: claimed, error: claimErr } = await dbAdmin
      .from('study_sessions')
      .update({
        archived: true,
        config: { ...cfg, credit_refund: { at: now.toISOString(), by: 'cron:study-refund-abandoned-tests', reason: `abandoned: not submitted within ${ABANDON_AFTER_DAYS} days` } },
      })
      .eq('id', row.id)
      .eq('status', 'active')
      .eq('archived', false)
      .is('module2_route', null)
      .select('id')
    if (claimErr || !claimed || claimed.length === 0) continue  // submitted / resumed / someone else's
    out.claimed++

    const r = await refundTestCredits(row.student_id, row.id, MAX_SLICES)
    out.creditsRefunded += r.refunded
    out.sessions[i].refunded = r.refunded
    if (r.refundedSources.length > 0) {
      // Audit label on the ledger rows this run wrote. Best effort: the
      // refund itself is already durable.
      await dbAdmin
        .from('study_credit_ledger')
        .update({ note: `auto refund: abandoned test ${row.id}` })
        .eq('student_id', row.student_id)
        .eq('kind', 'refund')
        .in('source_id', r.refundedSources)
    }
    if (r.failed > 0) {
      out.failedSessions.push(row.id)
      await raiseAlert({
        severity: 'critical',
        title: 'Abandoned-test refund incomplete',
        message:
          `Session ${row.id} was archived as abandoned but ${r.failed} credit slice(s) did not refund. ` +
          `Retry with POST /api/admin/study/sessions/refund-credits { sessionId: "${row.id}" }.`,
        dedupeKey: `abandoned-test-refund:${row.id}`,
        context: { sessionId: row.id, studentId: row.student_id, ...r },
      })
    }
  }
  return out
}
