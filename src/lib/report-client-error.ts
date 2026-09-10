import { authHeaders } from '@/lib/auth-headers'

/**
 * Report a browser-side failure to /api/client-error, which writes it to
 * error_logs where the admin dashboard can see it.
 *
 * Use it at the catch sites that currently swallow — the ones that log to the
 * console and show the user a toast. `console.error` in a browser reaches
 * nobody: every student edit failed for months on a column that does not
 * exist, and the only trace was a console line on a manager's laptop.
 *
 *     try { ... } catch (error) {
 *       reportClientError('useStudentActions.updateStudent', error, { studentId })
 *       return { success: false, error: error as Error }
 *     }
 *
 * RULES THIS FOLLOWS, all of them about not making a bad moment worse:
 *
 *   - never throws and never rejects. A reporter that can fail turns one
 *     broken feature into two, and the second one is in the error path.
 *   - never awaited by the caller. Reporting must not add latency to the
 *     failure the user is already waiting on.
 *   - silent on failure. If the report cannot be sent there is nothing useful
 *     left to do, and a console line about a failed error report is noise.
 *   - no PII in `context`. Pass ids, counts and flags — never names, emails
 *     or anything a student typed. The server clamps values but cannot know
 *     what they mean.
 */
export function reportClientError(
  where: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  // Server-rendered passes have no browser to report from, and no fetch
  // credentials either.
  if (typeof window === 'undefined') return

  void (async () => {
    try {
      const message =
        error instanceof Error ? error.message
        : typeof error === 'string' ? error
        : (() => { try { return JSON.stringify(error) } catch { return String(error) } })()

      const headers = await authHeaders()
      await fetch('/api/client-error', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          where,
          message,
          stack: error instanceof Error ? error.stack : undefined,
          context,
        }),
        // Survives a navigation triggered by the same failure.
        keepalive: true,
      })
    } catch {
      // Deliberately empty. See the rules above: there is no second reporter
      // to report this to.
    }
  })()
}
