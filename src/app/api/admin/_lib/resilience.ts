/**
 * Retry + per-section degradation for admin routes that fan out.
 *
 * WHY
 * ---
 * /api/admin/dashboard issues ~40 Supabase requests per load. Every one of
 * them was inside a `Promise.all` under one `try`, so a single failure threw
 * the whole route to its 500 handler and the page rendered
 *
 *     Failed to load dashboard data
 *     count(users_trend_2026-08-13) failed: TypeError: fetch failed
 *
 * — the ENTIRE dashboard blanked because one of ten sparkline buckets could
 * not open a socket. Two things are wrong with that and they need different
 * fixes:
 *
 *   1. `TypeError: fetch failed` is a TRANSIENT network fault. At 40
 *      requests a load, an independent per-request failure probability of
 *      even 0.5% makes a failed load an 18% event. Retrying is the fix.
 *   2. A failure that survives the retries should cost you ONE TILE, not
 *      the page. `settle` is the fix.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not turn a failure into a zero. `settle` returns `{ ok: false }`
 * and the caller renders the tile as unavailable. Substituting a plausible
 * number for a failed read is the exact defect countRows() was written to
 * kill (see _lib/admin-auth.ts) and degradation must not smuggle it back.
 */

/**
 * Errors that are DETERMINISTIC: retrying re-runs the same broken query and
 * fails identically, three times, 450ms slower.
 *
 * Matched against the message because that is all a thrown
 * `Error('count(x) failed: <postgrest message>')` carries by the time it
 * reaches here. The list is deliberately short — anything unrecognized is
 * treated as retryable, because a needless retry costs milliseconds while a
 * missed retry costs the tile.
 */
const PERMANENT_PATTERNS: readonly RegExp[] = [
  /does not exist/i,
  /undefined (table|column|function)/i,
  /permission denied/i,
  /violates .* constraint/i,
  /invalid input syntax/i,
  /could not find the table/i,
  /schema cache/i,
  // PostgREST error codes for undefined table / insufficient privilege.
  /\b(42P01|42703|42501)\b/,
  // Auth / authorization is not going to change between attempts.
  /\b(401|403)\b/,
]

export function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return !PERMANENT_PATTERNS.some(re => re.test(message))
}

export interface RetryOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number
  /** Delay before attempt N is `baseDelayMs * 2 ** (N - 2)`. Default 120ms. */
  baseDelayMs?: number
  /** Injectable for tests — the real one is setTimeout. */
  sleep?: (ms: number) => Promise<void>
  /** Included in the warning log so a flaky read is identifiable. */
  label?: string
}

const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 120, sleep = realSleep, label } = options

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt === attempts || !isRetryable(e)) break
      console.warn(
        `[admin] transient failure${label ? ` on ${label}` : ''} (attempt ${attempt}/${attempts}): ${
          e instanceof Error ? e.message : String(e)
        }`
      )
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw lastError
}

export type Settled<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * Run one independent SECTION of a route. A section is whatever a single
 * tile needs — its headline number, its trend and its growth figure — so a
 * tile is either wholly right or wholly marked unavailable, never a real
 * number beside a stale one.
 */
export async function settle<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<Settled<T>> {
  try {
    return { ok: true, value: await withRetry(fn, { ...options, label }) }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    console.error(`[admin] section "${label}" failed after retries: ${error}`)
    return { ok: false, error }
  }
}

/** `settle` result → the value, or null. Pairs with a nullable API field. */
export function valueOrNull<T>(s: Settled<T>): T | null {
  return s.ok ? s.value : null
}
