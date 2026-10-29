import { db } from '@/lib/supabase'

/**
 * fetch() for client components calling auth-gated API routes, with the three
 * guards a bare `fetch(url, { headers: await authHeaders() })` lacks.
 *
 * Datadog (2026-10-28) showed bursts of 401s on /api/study/progress: seven
 * identical requests in one second from a test-session page, each failing in
 * 9-19 ms — before any token lookup, i.e. sent with no Authorization header.
 * The caller was a 30-second poll mounted in the mobile layout that kept firing
 * after the session had lapsed and while the tab was in the background.
 *
 * 1. No session, no request: returns `null` instead of sending an anonymous call
 *    the route can only reject.
 * 2. A 401 gets one refresh (shared by every caller in flight, so a burst does
 *    not stampede the token endpoint) and one retry; a second 401 is returned
 *    as-is, never retried again.
 * 3. Identical concurrent GETs share one network request; each caller gets its
 *    own clone of the response.
 */

let refreshing: Promise<string | null> | null = null
const inflight = new Map<string, Promise<Response | null>>()

async function currentToken(): Promise<string | null> {
  const { data: { session } } = await db.auth.getSession()
  return session?.access_token ?? null
}

/** One refresh at a time; concurrent 401s wait on the same promise. */
function refreshOnce(): Promise<string | null> {
  if (!refreshing) {
    refreshing = db.auth.refreshSession()
      .then(({ data }) => data.session?.access_token ?? null)
      .catch(() => null)
      .finally(() => { refreshing = null })
  }
  return refreshing
}

function withAuth(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  return { ...init, headers }
}

async function send(url: string, init?: RequestInit): Promise<Response | null> {
  const token = await currentToken()
  if (!token) return null
  const res = await fetch(url, withAuth(init, token))
  if (res.status !== 401) return res
  const fresh = await refreshOnce()
  if (!fresh || fresh === token) return res
  return fetch(url, withAuth(init, fresh))
}

export async function authedFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (method !== 'GET' || init?.body) return send(url, init)
  let shared = inflight.get(url)
  if (!shared) {
    shared = send(url, init).finally(() => { inflight.delete(url) })
    inflight.set(url, shared)
  }
  const res = await shared
  return res ? res.clone() : null
}

/** Test seam: clear module state between tests. */
export function __resetAuthedFetchForTests() {
  refreshing = null
  inflight.clear()
}
