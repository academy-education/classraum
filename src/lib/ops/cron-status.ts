/**
 * Per-job status decisions for crons that catch per-item errors so the
 * batch can continue and then reported success regardless. Each reads the
 * count the job already returned. Pure; tested in
 * src/lib/ops/__tests__/cron-status.test.ts.
 *
 * Found 2026-10-02 by grepping every cron for "returns a failure count,
 * records ok:true". The jobs that already got this right (study-billing,
 * process-account-deletions, recurring-payments, auth-unconfirmed-cleanup,
 * study-reap-stuck-generations) are untouched.
 */
import { batchRunStatus, worstStatus, type RunStatus } from './run-status'

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Sends (push, email, receipts). `failed` is a send that was attempted
 * and did not go out; skips (opted out, no device, held) are not
 * attempts.
 */
export function deliveryStatus(r: { sent?: number; failed?: number }): RunStatus {
  const failed = n(r.failed)
  return batchRunStatus({ attempted: n(r.sent) + failed, failed })
}

/**
 * Reminder triggers in lib/notification-triggers.ts. `failed` counts the
 * per-item catch; items skipped for having no recipient are not failures.
 * Several results (due + overdue) combine to the worst.
 */
export function reminderStatus(...results: Array<{ failed?: number } & Record<string, unknown>>): RunStatus {
  return worstStatus(
    ...results.map(r => {
      const total = n(r.totalSessions ?? r.totalAssignments ?? r.totalInvoices)
      const failed = n(r.failed)
      // A total smaller than the failures means we cannot read the result.
      return batchRunStatus({ attempted: Math.max(total, 0), failed })
    }),
  )
}

/**
 * study-refund-sync. `unverifiable` = PortOne could not be reached or the
 * refund write was rejected; the payment's refund state is unknown, so a
 * refunded charge may still be counted as revenue. Any is degraded.
 */
export function refundSyncStatus(r: { checked: number; unverifiable: number }): RunStatus {
  return batchRunStatus({ attempted: r.checked, failed: r.unverifiable })
}

/**
 * study-resolve-duels. Every examined row has already ended; one that is
 * still active after resolveIfEnded hit its swallowed catch.
 */
export function duelsStatus(r: { examined: number; unresolved: number }): RunStatus {
  return batchRunStatus({ attempted: r.examined, failed: r.unresolved })
}

/** PortOne settlement/payout sync: each side's errors against its work. */
export function portoneSyncStatus(r: {
  settlements: { synced: number; errors: number }
  payouts: { synced: number; errors: number }
}): RunStatus {
  return worstStatus(
    batchRunStatus({ attempted: r.settlements.synced + r.settlements.errors, failed: r.settlements.errors }),
    batchRunStatus({ attempted: r.payouts.synced + r.payouts.errors, failed: r.payouts.errors }),
  )
}

/**
 * subscription-billing. Card declines are a customer outcome, not a job
 * failure. A rejected write or an unexpected throw means a charge may have
 * happened without the subscription advancing: failed. A data anomaly the
 * job reports and steps around (no next_billing_date, a pending tier it
 * cannot apply) is degraded — it was in errorCount and nothing read it.
 */
export function subscriptionBillingStatus(r: {
  writeFailures: number
  rejected: number
  anomalies: number
}): RunStatus {
  if (r.writeFailures > 0 || r.rejected > 0) return 'failed'
  if (r.anomalies > 0) return 'degraded'
  return 'ok'
}
