/**
 * What a cron run's outcome means for its heartbeat. Pure, so every
 * decision here is unit-tested without a database.
 *
 * WHY THIS EXISTS. Until 2026-10-02 the heartbeat only knew "threw / did
 * not throw". Three jobs were green while failing: apple-secret-expiry
 * reported ok over `kind: "missing"` (Apple enabled, secret unset, critical
 * alert open for a month), refresh-test-specs over 13 of 16 attempted
 * targets failing, refresh-test-spec-examples over 10 of 11. Every batch
 * job that catches per-item errors so the batch can continue had the same
 * shape: the counter was in `detail`, and nothing read it.
 *
 *   ok        nothing failed
 *   degraded  the run completed, but some items failed. ok=false, so the
 *             dashboard shows it failing and a job-failed alert opens —
 *             but last_ok_at still moves, because the job DID run, and the
 *             watchdog must not page "has stopped running" over it.
 *   failed    the job's work was not done (or a failure rate above the
 *             threshold). ok=false, last_ok_at frozen, streak escalates.
 */

export type RunStatus = 'ok' | 'degraded' | 'failed'

/** Default share of attempted items that may fail before a run is 'failed'. */
export const DEFAULT_FAIL_RATE_THRESHOLD = 0.5

/**
 * Status for a batch that attempted `attempted` items and saw `failed` of
 * them fail. An input it cannot read (negative, non-finite, failed >
 * attempted) is 'failed', never 'ok' — a check that cannot read its input
 * must not return a pass.
 */
export function batchRunStatus(input: {
  attempted: number
  failed: number
  failRateThreshold?: number
}): RunStatus {
  const { attempted, failed } = input
  const threshold = input.failRateThreshold ?? DEFAULT_FAIL_RATE_THRESHOLD
  const readable =
    Number.isFinite(attempted) && Number.isFinite(failed) &&
    attempted >= 0 && failed >= 0 && failed <= attempted
  if (!readable) return 'failed'
  if (failed === 0) return 'ok'
  if (failed === attempted || failed / attempted > threshold) return 'failed'
  return 'degraded'
}

/** Worst of several statuses: failed > degraded > ok. */
export function worstStatus(...statuses: RunStatus[]): RunStatus {
  if (statuses.includes('failed')) return 'failed'
  if (statuses.includes('degraded')) return 'degraded'
  return 'ok'
}

/** Status a heartbeat result stands for. `ok:true` is always 'ok'. */
export function statusOf(result: { ok: boolean; status?: RunStatus }): RunStatus {
  if (result.ok) return 'ok'
  return result.status === 'degraded' ? 'degraded' : 'failed'
}

/**
 * The job_heartbeats columns a run writes, minus job/duration/detail.
 * last_ok_at reads "last time the job ran to completion": set for ok and
 * degraded, left alone for failed.
 */
export function heartbeatRowFields(
  status: RunStatus,
  prevFailStreak: number,
  nowIso: string,
): { ok: boolean; fail_streak: number; last_run_at: string; last_ok_at?: string } {
  const ok = status === 'ok'
  return {
    ok,
    fail_streak: ok ? 0 : (Number.isFinite(prevFailStreak) ? prevFailStreak : 0) + 1,
    last_run_at: nowIso,
    ...(status === 'failed' ? {} : { last_ok_at: nowIso }),
  }
}

/**
 * Alert severity for a non-ok run. A failed run escalates to critical at
 * three in a row; a degraded one stays at the job's own severity, since
 * the work is mostly getting done.
 */
export function alertSeverityFor(
  status: Exclude<RunStatus, 'ok'>,
  failStreak: number,
  specSeverity: 'warning' | 'critical' | undefined,
): 'warning' | 'critical' {
  if (status === 'failed' && failStreak >= 3) return 'critical'
  return specSeverity ?? 'warning'
}
