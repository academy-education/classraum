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
  /** The target ran correctly and found nothing usable (no MC items, none verified hard). Counted as ok,
   *  reported separately: on 2026-10-20 these were 9 of the examples pass's 14 "failures", a red job
   *  every day for an answer that was simply "nothing to add". */
  empty?: boolean
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
  /** Ran fine, found nothing usable. Not failures; listed so they stay visible. */
  empty: number
  emptyNotes: string[]
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
    empty: results.filter(r => r.ok && r.empty).length,
    emptyNotes: results
      .filter(r => r.ok && r.empty)
      .slice(0, 8)
      .map(r => `${r.family ?? '?'}/${r.sectionKey ?? '?'}: ${(r.notes ?? '').slice(0, 120)}`),
  }
}

/**
 * Sections with no multiple-choice items at all (essays, speaking). The examples pass collects MC items only,
 * so it can never succeed on them: 2026-10-20 failed toeic/Writing, ssat/Writing and ielts/Speaking for exactly
 * this. "Reading and Writing" (SAT) is MC and is not matched.
 */
export function isNonMcSection(sectionKey: string): boolean {
  return /\b(writing|speaking|essay)\b/i.test(sectionKey) && !/reading/i.test(sectionKey)
}

/**
 * Families the FORMAT cron skips. Their makers document the test per module, so web search returns per-module
 * counts and the sanity check rejects every extraction (SAT since 2026-09; TOEFL failed it daily through
 * 2026-10-20: "extracted 20 Q vs baseline 48", "28 vs 48"). The hardcoded baselines stay; the admin endpoint
 * still refreshes them by hand. The examples cron is not affected.
 */
const FORMAT_SKIP = new Set(['sat', 'toefl'])
const EXAMPLES_SKIP = new Set(['sat'])
export function cronSkipsFamily(kind: 'format' | 'examples', family: string): boolean {
  return (kind === 'format' ? FORMAT_SKIP : EXAMPLES_SKIP).has(family)
}

/**
 * A difficulty mix on the wrong SCALE. IELTS Listening failed the format refresh on 2026-10-20 with
 * "difficultyMix.hard: Number must be less than or equal to 1" (a percent mix, 30/50/20), and the 10-20 fix
 * converted only mixes summing to ~100. It failed again on 2026-10-21 with the same message, so the model's
 * mix was on another non-fraction scale (percent not summing to 100, or item counts). Any all-non-negative mix
 * with a value above 1 is now rescaled by its own sum, which keeps the ratios the model reported. A negative
 * value or a zero sum is still left for the schema to reject.
 */
export function normalizeDifficultyMix(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v
  const o = v as Record<string, unknown>
  const vals = ['easy', 'medium', 'hard'].map(k => o[k])
  if (!vals.every(x => typeof x === 'number' && Number.isFinite(x))) return v
  const nums = vals as number[], sum = nums.reduce((a, b) => a + b, 0)
  if (!nums.some(x => x > 1) || nums.some(x => x < 0) || sum <= 0) return v
  return { ...o, easy: nums[0] / sum, medium: nums[1] / sum, hard: nums[2] / sum }
}

/**
 * A sample item's difficulty in the model's own words. The examples refresh failed on 2026-10-21 with
 * "items.0.difficulty: Invalid enum value" (AP English Language). Case, whitespace and a short list of plain
 * synonyms are mapped; any other word is returned unchanged so the enum still rejects it.
 */
const DIFFICULTY_SYNONYMS: Record<string, 'easy' | 'medium' | 'hard'> = {
  easy: 'easy', simple: 'easy', basic: 'easy', low: 'easy',
  medium: 'medium', moderate: 'medium', intermediate: 'medium', average: 'medium', mid: 'medium',
  hard: 'hard', difficult: 'hard', challenging: 'hard', advanced: 'hard', high: 'hard',
}
export function normalizeItemDifficulty(v: unknown): unknown {
  if (typeof v !== 'string') return v
  return DIFFICULTY_SYNONYMS[v.trim().toLowerCase()] ?? v
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
