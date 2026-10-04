import { dbAdmin } from '@/lib/supabase-admin'
import { raiseAlert } from '@/lib/ops/alert'
import { normaliseErrorLabel } from '@/lib/ops/api-failure-label'

export { normaliseErrorLabel }

/**
 * Record every non-2xx response from a student-facing API route.
 *
 * WHY (2026-10-04). Every SSAT/ISEE Writing submit returned 400 for a week —
 * the zod enum lacked `essay` — and nothing anywhere recorded it. The route
 * returned `{ error: 'bad payload' }`, TestSession wrote it to the browser
 * console, and three students lost ten credits before anyone noticed.
 * Supabase logs cannot see a Next route's 4xx, and Vercel logs are read by
 * nobody. So the failure is written where the admin dashboard already looks
 * (`error_logs`, service `StudyApi`), and when the SAME failure reaches two
 * or more distinct students in 24h it becomes an ops alert — one student
 * hitting an edge case is noise; two hitting the same wall is a bug.
 *
 * WHAT IS RECORDED, deliberately narrow:
 *   route, status, the response's short `error` label (normalised: uuids,
 *   emails and long numbers masked, clamped), zod issue PATHS and CODES when
 *   the body carries a zod message — never the issue messages (a zod
 *   message can quote the received value, i.e. the student's answer) — and
 *   the user id from the verified token. No request body, no answer text,
 *   no email, no name.
 *
 * Never throws and never changes the response: monitoring must not be able
 * to fail the request it watches.
 */

export const API_FAILURE_SERVICE = 'StudyApi'
/** Distinct students on one failure signature before it pages. */
export const DISTINCT_STUDENT_THRESHOLD = 2
const WINDOW_MS = 24 * 60 * 60 * 1000
/**
 * Zod issue paths and codes from a `details` string, if it is a serialised
 * ZodError (a JSON array of issues). Messages and received values are
 * dropped on purpose.
 */
export function zodIssueShape(details: unknown): string[] {
  if (typeof details !== 'string') return []
  let parsed: unknown
  try { parsed = JSON.parse(details) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  const out: string[] = []
  for (const issue of parsed.slice(0, 10)) {
    if (!issue || typeof issue !== 'object') continue
    const { path, code } = issue as { path?: unknown; code?: unknown }
    const p = Array.isArray(path)
      ? path.map((seg) => (typeof seg === 'number' ? '#' : String(seg).slice(0, 30))).join('.')
      : ''
    out.push(`${p || '<root>'}:${typeof code === 'string' ? code.slice(0, 30) : '?'}`)
  }
  return Array.from(new Set(out))
}

export interface ApiFailure {
  /** Route label, e.g. 'study/test/submit'. */
  route: string
  status: number
  /** Raw `error` field of the response body (normalised here). */
  error?: unknown
  /** Raw `details` field, mined for zod issue paths only. */
  details?: unknown
  userId?: string | null
}

export function failureSignature(route: string, status: number, label: string): string {
  return `${route}|${status}|${label}`
}

export async function recordApiFailure(f: ApiFailure): Promise<void> {
  try {
    const label = normaliseErrorLabel(f.error)
    const signature = failureSignature(f.route, f.status, label)
    const issues = zodIssueShape(f.details)
    const userId = f.userId || null

    const { error: insertError } = await dbAdmin.from('error_logs').insert({
      service_name: API_FAILURE_SERVICE,
      level: f.status >= 500 ? 'error' : 'warn',
      message: `${f.route} ${f.status} ${label}`,
      error_message: label,
      context: {
        route: f.route,
        status: f.status,
        error: label,
        signature,
        ...(issues.length ? { zodIssues: issues } : {}),
      },
      user_id: userId,
    })
    if (insertError) {
      // A dropped failure record is the exact silence this module exists to
      // end, so it goes to the other channel.
      console.error('[api-failure] error_logs insert rejected', insertError)
      await raiseAlert({
        severity: 'warning',
        title: 'error_logs write failed',
        message: `Could not record a ${f.status} from ${f.route}. API failures are being dropped.`,
        dedupeKey: 'error-logs-write-failed',
        context: { route: f.route, status: f.status, dbError: insertError.message },
      })
      return
    }

    if (userId) await checkSpread(signature, f.route, f.status, label)
  } catch (e) {
    console.error('[api-failure] record failed', e)
  }
}

/**
 * The on-write check: has this exact failure reached enough DISTINCT
 * students in the last 24h to be a bug rather than one person's edge case?
 * raiseAlert dedupes on the open alert, so a sustained outage refreshes one
 * row instead of paging per request.
 */
async function checkSpread(signature: string, route: string, status: number, label: string) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const { data, error } = await dbAdmin
    .from('error_logs')
    .select('user_id')
    .eq('service_name', API_FAILURE_SERVICE)
    .gte('created_at', since)
    .contains('context', { signature })
    .not('user_id', 'is', null)
    .limit(500)
  if (error) {
    console.error('[api-failure] spread check failed', error)
    return
  }
  const students = new Set((data ?? []).map((r) => r.user_id).filter(Boolean))
  if (students.size < DISTINCT_STUDENT_THRESHOLD) return

  await raiseAlert({
    severity: status >= 500 ? 'critical' : 'warning',
    title: 'Students hitting the same API failure',
    message:
      `${route} returned ${status} "${label}" to ${students.size} distinct students in the last 24h. ` +
      `See error_logs (service ${API_FAILURE_SERVICE}) for the issue paths.`,
    dedupeKey: `api-failure-spread:${signature}`,
    context: { route, status, error: label, distinctStudents: students.size },
  })
}

/** Resolve the caller's id from the Bearer token — failure path only. */
async function userIdFrom(req: Request): Promise<string | null> {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (!token) return null
    const { data } = await dbAdmin.auth.getUser(token)
    return data?.user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Wrap a route handler so every non-2xx response (and every throw) is
 * recorded. Use as `export const POST = withApiFailureLogging('study/x', handler)`
 * — the handler stays unexported, so the route file still exports only
 * handlers and config.
 */
export function withApiFailureLogging<A extends [Request, ...unknown[]], R extends Response | undefined>(
  route: string,
  handler: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const req = args[0]
    let res: R
    try {
      res = await handler(...args)
    } catch (e) {
      await recordApiFailure({ route, status: 500, error: 'unhandled exception', userId: await userIdFrom(req) })
      throw e
    }
    if (!res) {
      // Next turns a handler that resolves nothing into a 500.
      await recordApiFailure({ route, status: 500, error: 'handler returned no response', userId: await userIdFrom(req) })
      return res
    }
    if (res.status >= 200 && res.status < 300) return res
    // 401 is the one non-2xx NOT recorded: it is an expired or missing
    // token, has no verified student to attribute (so it can never reach
    // the distinct-student alert), and any unauthenticated caller could
    // otherwise write rows into error_logs at will.
    if (res.status === 401) return res

    let body: { error?: unknown; details?: unknown } = {}
    try {
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('application/json')) body = (await res.clone().json()) ?? {}
    } catch { /* non-JSON body: recorded as unlabelled */ }

    await recordApiFailure({
      route,
      status: res.status,
      error: body.error,
      details: body.details,
      userId: await userIdFrom(req),
    })
    return res
  }
}
