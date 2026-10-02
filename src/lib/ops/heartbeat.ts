import { dbAdmin } from '@/lib/supabase-admin'
import { toJson } from '@/lib/json'
import { raiseAlert, resolveAlerts } from '@/lib/ops/alert'
import { jobSpec } from '@/lib/ops/jobs'
import {
  alertSeverityFor,
  heartbeatRowFields,
  statusOf,
  type RunStatus,
} from '@/lib/ops/run-status'

/**
 * Record that a scheduled job ran.
 *
 * Wrap a cron's body in `withHeartbeat` and it reports success, failure,
 * and duration without the route having to remember to. The watchdog
 * then alerts on *absence* — the case a job can never report itself,
 * because a job that 401s or never boots runs no code at all.
 *
 * Never throws: a monitoring failure must not fail the job it monitors.
 */

export interface HeartbeatResult {
  ok: boolean
  /**
   * Only read when ok is false: 'degraded' means the run completed but
   * some items failed (see run-status.ts). Omitted means 'failed'.
   */
  status?: RunStatus
  detail?: Record<string, unknown>
}

/** Build a HeartbeatResult from a RunStatus, stamping it into detail. */
export function heartbeatFor(
  status: RunStatus,
  detail?: Record<string, unknown>,
): HeartbeatResult {
  return { ok: status === 'ok', status, detail: { ...(detail ?? {}), status } }
}

export async function recordHeartbeat(
  job: string,
  result: HeartbeatResult,
  durationMs?: number,
): Promise<void> {
  const now = new Date().toISOString()
  try {
    // Read the streak so a flapping job escalates rather than logging
    // the same warning forever.
    const { data: prev } = await dbAdmin
      .from('job_heartbeats')
      .select('fail_streak')
      .eq('job', job)
      .maybeSingle()

    const status = statusOf(result)
    const fields = heartbeatRowFields(
      status,
      (prev?.fail_streak as number | undefined) ?? 0,
      now,
    )
    const failStreak = fields.fail_streak

    // Checked, not because we can do anything about it here, but because
    // a dropped upsert is indistinguishable from a job that never ran:
    // the watchdog reads last_ok_at going stale and pages for a cron that
    // is in fact perfectly healthy — or, worse, the row keeps a *stale
    // successful* last_ok_at and a genuinely dead job stays green.
    const { error: upsertError } = await dbAdmin.from('job_heartbeats').upsert(
      {
        job,
        ...fields,
        duration_ms: durationMs ?? null,
        detail: result.detail ? toJson(result.detail) : null,
      },
      { onConflict: 'job' },
    )
    if (upsertError) {
      console.error('[heartbeat] upsert rejected for', job, upsertError)
    }

    if (result.ok) {
      // A job that succeeds clears its own failure alert; until 2026-09-29
      // these stayed open until someone clicked, so the dashboard showed
      // a digest as failing days after it had recovered.
      await resolveAlerts(`job-failed:${job}`)
    }
    if (status !== 'ok') {
      const spec = jobSpec(job)
      await raiseAlert({
        severity: alertSeverityFor(status, failStreak, spec?.severity),
        title: `${spec?.label ?? job} ${status === 'degraded' ? 'partially failed' : 'failed'}`,
        /*
         * Say WHICH half failed. The generic line read "Scheduled work
         * it is responsible for is not being done" for every job, and on
         * 2026-09-01 that sent someone looking for unpurged accounts
         * over a digest whose own detail said `overdue: 0` — the
         * deletions had run, only the email announcing them had not.
         * An alert that overstates is one you learn to discount.
         */
        message:
          `The job reported a failure${failStreak > 1 ? ` (${failStreak} consecutive)` : ''}.` +
          (status === 'degraded'
            ? ' It ran to completion, but some of the items it processed failed; the counts are in the alert context.'
            : typeof (result.detail as { emailError?: unknown } | null)?.emailError === 'string'
            ? ' Its work ran, but the notification could not be delivered:'
              + ` ${(result.detail as { emailError: string }).emailError}`
              + ' Nobody is being told the result.'
            : ' Scheduled work it is responsible for is not being done.'),
        dedupeKey: `job-failed:${job}`,
        context: { job, failStreak, detail: result.detail ?? null },
      })
    }
  } catch (e) {
    console.error('[heartbeat] failed to record', job, e)
  }
}

/**
 * Run a cron body with automatic heartbeat + failure alerting.
 * Rethrows, so the route still returns its own 500 — this only observes.
 */
export async function withHeartbeat<T>(
  job: string,
  fn: () => Promise<T>,
  /**
   * How to read the result. Without it a resolved promise is 'ok', which
   * is wrong for any batch that catches per-item errors and returns a
   * count — pass a function that reads the count (run-status.ts).
   */
  statusOfResult?: (out: T) => RunStatus,
): Promise<T> {
  const started = Date.now()
  try {
    const out = await fn()
    const detail =
      out && typeof out === 'object' && !Array.isArray(out)
        ? (out as Record<string, unknown>)
        : undefined
    const status = statusOfResult ? statusOfResult(out) : 'ok'
    await recordHeartbeat(job, heartbeatFor(status, detail), Date.now() - started)
    return out
  } catch (err) {
    await recordHeartbeat(
      job,
      { ok: false, detail: { error: err instanceof Error ? err.message : String(err) } },
      Date.now() - started,
    )
    throw err
  }
}
