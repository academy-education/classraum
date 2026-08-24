"use client"

import { authHeaders } from '@/lib/auth-headers'

/**
 * Turn a camp assignment into a solvable session id.
 *
 * ONE implementation, shared by every student-facing camp entry point
 * (the "From your teacher" shelf on the study landing and the Camp card
 * on the Grades surfaces). Two copies of this would drift: the shelf's
 * copy already encoded the reuse-the-session rule, and a second card
 * that re-derived it would be one bug away from minting a duplicate
 * session for an assignment the student had already started.
 *
 * Returns the session id, or null when the start failed — callers show
 * their own inline error, because the surrounding surfaces differ.
 */
export async function resolveCampSessionId(assignment: {
  id: string
  sessionId: string | null
}): Promise<string | null> {
  // Already started (or finished): the session page renders the review
  // screen for a completed full test, so this one branch covers both
  // 'in_progress' and 'done'.
  if (assignment.sessionId) return assignment.sessionId

  try {
    const headers = await authHeaders()
    const res = await fetch('/api/study/camp/start', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignmentId: assignment.id }),
    })
    const json = (await res.json().catch(() => null)) as { sessionId?: string } | null
    if (!res.ok || !json?.sessionId) return null
    return json.sessionId
  } catch {
    return null
  }
}

/** Where a resolved camp session is read/solved. */
export function campSessionHref(sessionId: string): string {
  return `/mobile/study/session/${sessionId}`
}
