/**
 * Pure helpers for the two test-spec refresh crons. Kept apart from
 * test-spec-refresh.ts (which imports the admin client and the model SDK)
 * so the status decision and the ordering are unit-tested.
 */
import { batchRunStatus, type RunStatus } from '@/lib/ops/run-status'

export interface RefreshOutcome {
  ok: boolean
  notes?: string
  examplesAdded?: number
}

export interface RefreshSummary {
  ran: number
  ok: number
  failed: number
  skippedFresh: number
  /** Targets that cost a model call: ran minus the fresh skips. */
  attempted: number
  remaining: number
  budgetHit: boolean
  status: RunStatus
  /** First few failure notes, so the heartbeat says WHY, not just how many. */
  failures: string[]
}

const isFreshSkip = (r: RefreshOutcome) => r.ok && /skipped/.test(r.notes ?? '')

/**
 * The denominator is ATTEMPTED targets, not ran: a fresh skip returns
 * ok:true without doing anything, and counting 21 of those as successes
 * is how 13 failures out of 16 real attempts read as "24 ok, 13 failed"
 * and the run stayed green (2026-10-01).
 */
export function summarizeRefresh(
  results: Array<RefreshOutcome & { family?: string; sectionKey?: string }>,
  remaining: number,
): RefreshSummary {
  const skippedFresh = results.filter(isFreshSkip).length
  const failedRows = results.filter(r => !r.ok)
  const attempted = results.length - skippedFresh
  return {
    ran: results.length,
    ok: results.filter(r => r.ok).length,
    failed: failedRows.length,
    skippedFresh,
    attempted,
    remaining,
    budgetHit: remaining > 0,
    status: batchRunStatus({ attempted, failed: failedRows.length }),
    failures: failedRows
      .slice(0, 8)
      .map(r => `${r.family ?? '?'}/${r.sectionKey ?? '?'}: ${(r.notes ?? '').slice(0, 120)}`),
  }
}

/**
 * Least-recently-attempted first. The targets come back from the catalog
 * in a fixed order and the run stops at a time budget, so a target that
 * keeps failing near the front was retried every day while the ones
 * behind it were never reached: on 2026-10-01 the examples pass ran 11
 * targets, failed 10, and left 33 it had not touched. Never-attempted
 * targets go first.
 */
export function orderByLeastRecentlyAttempted<T extends { family: string; sectionKey: string }>(
  targets: T[],
  attempts: Array<{ family: string; section_key: string; last_attempted_at: string | null }>,
): T[] {
  const at = new Map(
    attempts.map(a => [`${a.family}\u0000${a.section_key}`, a.last_attempted_at ? Date.parse(a.last_attempted_at) : NaN]),
  )
  const key = (t: T) => {
    const v = at.get(`${t.family}\u0000${t.sectionKey}`)
    return v === undefined || Number.isNaN(v) ? -Infinity : v
  }
  // Stable: equal keys keep catalog order.
  return targets
    .map((t, i) => ({ t, i, k: key(t) }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k - b.k))
    .map(x => x.t)
}

/**
 * Say WHICH field failed validation. Every format-refresh failure on
 * 2026-10-01 was recorded as "No object generated: response did not match
 * schema." — the AI SDK's wrapper message — so ten failures across
 * Writing/Speaking/KSAT sections carried no clue to the field. The zod
 * issues are on the error's cause chain (NoObjectGeneratedError ->
 * TypeValidationError -> ZodError); this walks it and names the paths.
 */
export function describeExtractionError(err: unknown): string {
  const base = err instanceof Error ? err.message : String(err)
  let cur: unknown = err
  for (let depth = 0; depth < 5 && cur && typeof cur === 'object'; depth++) {
    const issues = (cur as { issues?: unknown }).issues
    if (Array.isArray(issues) && issues.length > 0) {
      const parts = issues.slice(0, 4).map(i => {
        const it = i as { path?: unknown[]; message?: string }
        const path = Array.isArray(it.path) && it.path.length > 0 ? it.path.join('.') : '(root)'
        return `${path}: ${it.message ?? 'invalid'}`
      })
      return `${base} [${parts.join('; ')}${issues.length > 4 ? `; +${issues.length - 4} more` : ''}]`
    }
    cur = (cur as { cause?: unknown }).cause
  }
  const finish = (err as { finishReason?: unknown } | null)?.finishReason
  return typeof finish === 'string' && finish !== 'stop' ? `${base} [finishReason=${finish}]` : base
}
