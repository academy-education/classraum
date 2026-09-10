import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/api-auth'
import { enforceRateLimit } from '@/lib/rate-limit'
import { loggers } from '@/lib/error-monitoring'

/**
 * POST /api/client-error — the browser's way into error_logs.
 *
 * The server logger cannot be called from a component: it writes with the
 * service-role client, which throws on import without server env and must
 * never reach a bundle. So client code posts here instead.
 *
 * This exists because of a specific failure. Every student edit was failing
 * for months — the payload named `students.family_id`, a column that has
 * never existed — and the hook did `console.error` and returned
 * `{ success: false }`. In a browser that console line reaches nobody. The
 * manager saw a toast, assumed they had done something wrong, and tried
 * again. Nothing was recorded anywhere.
 *
 * SHAPE OF THE TRUST HERE. Everything in the body is attacker-controlled, so
 * nothing from it is used as an identity or a lookup key:
 *   - the caller must be signed in, and `user_id` comes from the TOKEN, never
 *     the body
 *   - `where` is clamped and only labels the log line
 *   - the message and stack are clamped hard; a stack is the one field that
 *     can be enormous
 *   - `context` is accepted but flattened to strings and capped, so a page
 *     cannot post a megabyte of state
 *   - rate limited per user, because a component in a render loop would
 *     otherwise write until the table filled
 *
 * It always answers 204. A reporting endpoint that returns an error invites a
 * client to retry — and a retry loop on the error path is how a small bug
 * becomes an outage.
 */

export const dynamic = 'force-dynamic'

const MAX_MESSAGE = 300
const MAX_STACK = 2000
const MAX_WHERE = 80
const MAX_CONTEXT_KEYS = 12
const MAX_CONTEXT_VALUE = 200

interface Body {
  /** Where in the UI it happened, e.g. 'useStudentActions.updateStudent'. */
  where?: string
  message?: string
  stack?: string
  context?: Record<string, unknown>
}

/** Strings only, clamped, bounded key count. Anything else is dropped. */
function safeContext(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_CONTEXT_KEYS) break
    if (v === null || v === undefined) continue
    const s = typeof v === 'object' ? '[object]' : String(v)
    out[k.slice(0, 40)] = s.slice(0, MAX_CONTEXT_VALUE)
  }
  return out
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  // Not 401: an unauthenticated report is dropped, not argued with. Telling a
  // client its error report failed just produces a second error report.
  if (!user) return new NextResponse(null, { status: 204 })

  const blocked = enforceRateLimit(`client-error:user:${user.id}`, {
    windowMs: 60 * 1000,
    max: 20,
  })
  if (blocked) return new NextResponse(null, { status: 204 })

  let body: Body
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const message = String(body.message ?? '').trim().slice(0, MAX_MESSAGE)
  if (!message) return new NextResponse(null, { status: 204 })

  const where = String(body.where ?? 'unknown').trim().slice(0, MAX_WHERE)
  const error = new Error(message)
  if (typeof body.stack === 'string') error.stack = body.stack.slice(0, MAX_STACK)

  loggers.client.error(where, error, {
    // From the verified token, never from the body.
    userId: user.id,
    where,
    ...safeContext(body.context),
  })

  return new NextResponse(null, { status: 204 })
}
