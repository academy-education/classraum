/**
 * Bounded retry for a grading stage whose output failed its schema.
 *
 * The 2026-10-07 grader ladder recorded four `rubric_grade` attempts that
 * came back failing schema validation, all on low-scoring Email answers.
 * Production did not retry, so each one was a 502 a student would have
 * seen on an answer the model could grade on the next call.
 *
 * What this does and does NOT do:
 *
 *  - It retries ONLY a schema / parse failure (the model produced output
 *    that does not fit the contract). A network error, a 4xx/5xx from the
 *    provider or a bug in our code is thrown at once: re-sending the same
 *    request will not fix those, and retrying them would only hide them.
 *  - It re-sends the SAME inputs. Nothing is relaxed between attempts.
 *  - When every attempt fails it throws the LAST error, unchanged. It
 *    never returns a default, partial or zero grade. "Fixing a loud
 *    failure by making it quiet is a regression" (CLAUDE.md): a required
 *    `topic_relevance` key once turned a 502 into a silent score of 0.
 *  - It runs BEFORE anything is persisted (it wraps the model calls inside
 *    runStagedGrade), so a retry can never create a submission row. One
 *    writer per item still holds: only gradeAndPersistResponse writes,
 *    once, after the whole pipeline has returned.
 */

/** Extra attempts after the first one. 1 + 2 = at most 3 calls per stage. */
export const STAGE_SCHEMA_RETRIES = 2

const SCHEMA_ERROR_NAMES = new Set([
  // ai-sdk generateObject: the model's output did not parse or validate.
  'AI_NoObjectGeneratedError',
  'AI_TypeValidationError',
  'AI_JSONParseError',
  // A caller that parses the model's JSON itself (the audio route).
  'ZodError',
  'SyntaxError',
])

/** True when the error says the model's OUTPUT did not fit the schema. */
export function isSchemaFailure(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: unknown }).name
  return typeof name === 'string' && SCHEMA_ERROR_NAMES.has(name)
}

export interface StageRetryInfo {
  stage: string
  /** 1-based number of the attempt that just failed. */
  attempt: number
  maxAttempts: number
  error: unknown
}

export async function withSchemaRetry<T>(
  stage: string,
  call: () => Promise<T>,
  opts: {
    retries?: number
    /** Called after each failed attempt that will be retried. */
    onRetry?: (info: StageRetryInfo) => void
  } = {},
): Promise<T> {
  const retries = opts.retries ?? STAGE_SCHEMA_RETRIES
  const maxAttempts = retries + 1
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (err) {
      if (!isSchemaFailure(err) || attempt >= maxAttempts) throw err
      const info: StageRetryInfo = { stage, attempt, maxAttempts, error: err }
      // Logged every time, so a stage that only succeeds on its third try
      // is still visible in the server logs rather than silently absorbed.
      console.warn(
        `[gradePipeline] ${stage} failed its schema (attempt ${attempt}/${maxAttempts}), retrying:`,
        err instanceof Error ? err.message.slice(0, 200) : String(err),
      )
      opts.onRetry?.(info)
    }
  }
}
