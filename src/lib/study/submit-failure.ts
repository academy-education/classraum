import { normaliseErrorLabel } from '@/lib/ops/api-failure-label'

/**
 * Props for the client `submit_failed` analytics event.
 *
 * Until 2026-10-04 a failed submit reached only the browser console, so the
 * week of essay-section 400s left no row anywhere. This is the client half;
 * the server half is withApiFailureLogging on the submit route. Having both
 * matters: a submit that never reaches the server (offline, CORS, a crash
 * before fetch) only exists on the client.
 *
 * Only shape, never content: the server's short `error` label (normalised —
 * the same string the server records), the HTTP status, the stage, and
 * counts. The `details` field is NOT included — it can carry a zod message
 * quoting the student's answer.
 */
export type SubmitFailureStage = 'network' | 'http' | 'client'

export interface SubmitFailure {
  stage: SubmitFailureStage
  status?: number | null
  error?: unknown
}

export function submitFailedProps(
  failure: SubmitFailure | null,
  ctx: { sessionId: string; questionCount: number; answeredCount: number },
): Record<string, string | number | null> {
  const stage = failure?.stage ?? 'client'
  return {
    sessionId: ctx.sessionId,
    stage,
    status: failure?.status ?? null,
    error: stage === 'client' ? 'client exception' : normaliseErrorLabel(failure?.error),
    questionCount: ctx.questionCount,
    answeredCount: ctx.answeredCount,
  }
}
