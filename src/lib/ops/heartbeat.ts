import { dbAdmin } from '@/lib/supabase-admin'
import { toJson } from '@/lib/json'
import { raiseAlert } from '@/lib/ops/alert'
import { jobSpec } from '@/lib/ops/jobs'

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
  detail?: Record<string, unknown>
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

    const failStreak = result.ok ? 0 : ((prev?.fail_streak as number | undefined) ?? 0) + 1

    // Checked, not because we can do anything about it here, but because
    // a dropped upsert is indistinguishable from a job that never ran:
    // the watchdog reads last_ok_at going stale and pages for a cron that
    // is in fact perfectly healthy — or, worse, the row keeps a *stale
    // successful* last_ok_at and a genuinely dead job stays green.
    const { error: upsertError } = await dbAdmin.from('job_heartbeats').upsert(
      {
        job,
        last_run_at: now,
        ...(result.ok ? { last_ok_at: now } : {}),
        ok: result.ok,
        duration_ms: durationMs ?? null,
        detail: result.detail ? toJson(result.detail) : null,
        fail_streak: failStreak,
      },
      { onConflict: 'job' },
    )
    if (upsertError) {
      console.error('[heartbeat] upsert rejected for', job, upsertError)
    }

    if (!result.ok) {
      const spec = jobSpec(job)
      await raiseAlert({
        severity: failStreak >= 3 ? 'critical' : (spec?.severity ?? 'warning'),
        title: `${spec?.label ?? job} failed`,
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
          (typeof (result.detail as { emailError?: unknown } | null)?.emailError === 'string'
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
): Promise<T> {
  const started = Date.now()
  try {
    const out = await fn()
    const detail =
      out && typeof out === 'object' && !Array.isArray(out)
        ? (out as Record<string, unknown>)
        : undefined
    await recordHeartbeat(job, { ok: true, detail }, Date.now() - started)
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
