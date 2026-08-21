/**
 * Signup context that has to survive an OAuth round-trip.
 *
 * THE PROBLEM THIS EXISTS FOR
 *
 * The invite link is `/auth?role=parent&academy_id=…[&family_member_id=…]`.
 * Password signup reads those params and hands them to `signUp()` as user
 * metadata, which `handle_new_user()` (migration 094) turns into the
 * academy membership.
 *
 * An OAuth signup has NO metadata. The user leaves for Google/Kakao/Apple
 * and comes back to a fresh navigation with the params gone, so the trigger
 * fires with an empty `raw_user_meta_data`: role defaults to 'student',
 * academy_id is NULL. An invited parent silently becomes a study student,
 * and nothing anywhere reports it. That is the failure this module is
 * built to prevent, and it is the reason the logic lives here — pure,
 * storage-injected, unit-tested — instead of inline in the auth page where
 * it could only be exercised against a live provider.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not grant anything. The restored context is a HINT that gets
 * POSTed to `/api/academy/join`, which re-reads the family_members row
 * server-side and is authoritative over role and family. This module is
 * a second gate in front of that one, not the only gate.
 *
 * SECURITY PINS (each has a test; see __tests__/oauth-context.test.ts)
 *
 *  1. `role` is only ever honoured ALONGSIDE an academyId. A stored blob
 *     carrying a role with no invite is reduced to a plain study signup.
 *     Without this, `{"role":"parent"}` typed into localStorage would be
 *     a self-service claim of parenthood.
 *  2. `role` is narrowed to student|parent. Those are the only two roles
 *     the join route accepts; a stored 'manager' must not even be
 *     attempted, and must not be silently downgraded to something that
 *     looks like it worked. It is rejected, with a reason the UI shows.
 *  3. Every id is UUID-shaped. Anything else is not an academy of ours.
 *  4. The context EXPIRES (TTL_MS). A blob from last week must not attach
 *     today's signup to that academy — a shared/kiosk browser is the
 *     realistic case, and "silently joined a stranger's academy" is worse
 *     than "invite link stopped working, click it again".
 *  5. A `createdAt` in the future beyond a small skew allowance is
 *     rejected, so a tampered timestamp cannot buy unbounded lifetime.
 *  6. Restore CONSUMES. One redirect, one use; a second tab returning
 *     later gets nothing rather than re-joining.
 */

/** Roles an invite may carry through an OAuth round-trip. */
export type InviteRole = 'student' | 'parent'

export interface OAuthSignupContext {
  /** Which signup door the user came through. */
  intent: 'study' | 'academy'
  /** Present only together with academyId — see pin 1. */
  role?: InviteRole
  academyId?: string
  familyId?: string
  familyMemberId?: string
  /** Study-door friend referral code (uppercased, <= 16 chars). */
  ref?: string
  /** Epoch ms at capture. Written by capture, checked by restore. */
  createdAt: number
}

/** What restore hands back. `context` is null when there is nothing usable. */
export type RestoreResult =
  | { context: OAuthSignupContext; reason: null }
  | { context: null; reason: RestoreFailure }

export type RestoreFailure =
  | 'absent'
  | 'malformed'
  | 'expired'
  | 'future'
  | 'unsupported_role'

export const OAUTH_CONTEXT_KEY = 'classraum.oauth.signup_context.v1'

/**
 * 30 minutes. Long enough for a provider consent screen, an account
 * chooser, a password prompt and a 2FA SMS on a slow phone; short enough
 * that the blob is gone before the next person uses the browser.
 */
export const TTL_MS = 30 * 60 * 1000

/** Tolerance for a clock that is merely wrong rather than tampered. */
export const FUTURE_SKEW_MS = 5 * 60 * 1000

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const INVITE_ROLES: readonly string[] = ['student', 'parent']

/**
 * Minimal storage surface, injected so the pure logic is testable with no
 * DOM and no jsdom quirks. `localStorage` — NOT sessionStorage — because
 * `handleSignIn` on the auth page calls `sessionStorage.clear()`, and
 * because the native shell's return trip is not guaranteed to stay inside
 * the same session storage partition. The TTL is what makes localStorage
 * safe here; without it this would be a permanent attachment token.
 */
export interface ContextStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Raw, untrusted shape as it may arrive from the URL or from storage. */
export interface OAuthContextInput {
  intent?: string | null
  role?: string | null
  academyId?: string | null
  familyId?: string | null
  familyMemberId?: string | null
  ref?: string | null
}

const uuidOrUndefined = (v: unknown): string | undefined =>
  typeof v === 'string' && UUID_RE.test(v.trim()) ? v.trim().toLowerCase() : undefined

/**
 * Normalise an untrusted input into the context we are willing to act on.
 *
 * Returns `{ context }` or `{ reason }`. Pure: no storage, no clock beyond
 * the `now` you pass. Every pin listed at the top of the file is enforced
 * HERE, so capture and restore cannot diverge — restore re-runs this over
 * whatever came out of storage rather than trusting that capture wrote it.
 */
export function sanitizeOAuthContext(
  input: OAuthContextInput,
  now: number
): { context: OAuthSignupContext; reason: null } | { context: null; reason: RestoreFailure } {
  const academyId = uuidOrUndefined(input.academyId)
  const familyId = uuidOrUndefined(input.familyId)
  const familyMemberId = uuidOrUndefined(input.familyMemberId)

  const rawRole = typeof input.role === 'string' ? input.role.trim().toLowerCase() : ''

  // Pin 2 — an out-of-range role is REJECTED, never downgraded. A teacher
  // or manager invite genuinely cannot complete over OAuth today (the join
  // route only speaks student|parent), and turning it into a study student
  // would look like success while losing the academy.
  if (rawRole && !INVITE_ROLES.includes(rawRole)) {
    return { context: null, reason: 'unsupported_role' }
  }

  // Pin 1 — the role is meaningless without the invite it came from.
  const role: InviteRole | undefined =
    academyId && rawRole ? (rawRole as InviteRole) : undefined

  const ref =
    typeof input.ref === 'string' && input.ref.trim()
      ? input.ref.trim().toUpperCase().slice(0, 16)
      : undefined

  // An 'academy' intent with no academyId is not an invite; it is the
  // manual door, which OAuth cannot complete either (the user must type an
  // academy id). Downgrading to 'study' here would attach nothing, so we
  // record the intent honestly and let the caller decide.
  const intent: 'study' | 'academy' = academyId ? 'academy' : 'study'

  return {
    context: {
      intent,
      ...(role ? { role } : {}),
      ...(academyId ? { academyId } : {}),
      // family ids are only meaningful inside an academy invite
      ...(academyId && familyId ? { familyId } : {}),
      ...(academyId && familyMemberId ? { familyMemberId } : {}),
      ...(ref && !academyId ? { ref } : {}),
      createdAt: now,
    },
    reason: null,
  }
}

/**
 * True when the restored context describes an academy invite we can act
 * on — i.e. there is something to POST to /api/academy/join.
 *
 * `familyMemberId` alone is not enough: the join route requires both a
 * role and an academyId in the body.
 */
export function hasJoinablePayload(
  context: OAuthSignupContext
): context is OAuthSignupContext & { role: InviteRole; academyId: string } {
  return Boolean(context.academyId && context.role)
}

/** Body for POST /api/academy/join, derived from a restored context. */
export function toJoinRequest(context: OAuthSignupContext): {
  role: InviteRole
  academyId: string
  familyId?: string
  familyMemberId?: string
} | null {
  if (!hasJoinablePayload(context)) return null
  return {
    role: context.role,
    academyId: context.academyId,
    ...(context.familyId ? { familyId: context.familyId } : {}),
    ...(context.familyMemberId ? { familyMemberId: context.familyMemberId } : {}),
  }
}

/**
 * Persist the context before handing control to the provider.
 *
 * Returns the context actually stored (post-sanitisation) or null when the
 * input carried nothing worth keeping. Storage failures (Safari private
 * mode, quota) are swallowed: a failed capture degrades to "OAuth signup
 * produced a study student", which the post-return wiring detects and
 * surfaces — it must not block the sign-in itself.
 */
export function captureOAuthContext(
  input: OAuthContextInput,
  store: ContextStore,
  now: number = Date.now()
): OAuthSignupContext | null {
  const result = sanitizeOAuthContext(input, now)
  if (!result.context) return null
  const ctx = result.context
  // Nothing to carry: a bare study signup needs no context, and writing
  // one would only create a blob to expire.
  if (!ctx.academyId && !ctx.ref) return null
  try {
    store.setItem(OAUTH_CONTEXT_KEY, JSON.stringify(ctx))
  } catch {
    return null
  }
  return ctx
}

/**
 * Read, validate and CONSUME the stored context.
 *
 * The entry is removed before validation, so a malformed or expired blob
 * cannot sit in storage being re-evaluated on every load.
 */
export function restoreOAuthContext(
  store: ContextStore,
  now: number = Date.now()
): RestoreResult {
  let raw: string | null = null
  try {
    raw = store.getItem(OAUTH_CONTEXT_KEY)
  } catch {
    return { context: null, reason: 'absent' }
  }
  try {
    store.removeItem(OAUTH_CONTEXT_KEY)
  } catch {
    /* best effort — validation below does not depend on the removal */
  }

  if (!raw) return { context: null, reason: 'absent' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { context: null, reason: 'malformed' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { context: null, reason: 'malformed' }
  }

  const blob = parsed as Record<string, unknown>
  const createdAt = blob.createdAt
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
    return { context: null, reason: 'malformed' }
  }
  // Pin 5 before pin 4: a future timestamp is not "not yet expired", it is
  // a timestamp we refuse to reason about.
  if (createdAt > now + FUTURE_SKEW_MS) return { context: null, reason: 'future' }
  if (now - createdAt > TTL_MS) return { context: null, reason: 'expired' }

  // Re-sanitise. Storage is untrusted input even though we wrote it —
  // this is the line that makes pins 1-3 hold against a hand-edited blob,
  // and it is why capture and restore share sanitizeOAuthContext.
  const result = sanitizeOAuthContext(
    {
      intent: typeof blob.intent === 'string' ? blob.intent : null,
      role: typeof blob.role === 'string' ? blob.role : null,
      academyId: typeof blob.academyId === 'string' ? blob.academyId : null,
      familyId: typeof blob.familyId === 'string' ? blob.familyId : null,
      familyMemberId:
        typeof blob.familyMemberId === 'string' ? blob.familyMemberId : null,
      ref: typeof blob.ref === 'string' ? blob.ref : null,
    },
    createdAt
  )
  if (!result.context) return { context: null, reason: result.reason }
  return { context: result.context, reason: null }
}

/** Drop any stored context without acting on it. */
export function clearOAuthContext(store: ContextStore): void {
  try {
    store.removeItem(OAUTH_CONTEXT_KEY)
  } catch {
    /* nothing to do */
  }
}

/** Browser storage, or a no-op stub during SSR. */
export function browserContextStore(): ContextStore {
  if (typeof window === 'undefined') {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return window.localStorage
}

/** Read the capture input straight off a location search string. */
export function contextFromSearch(search: string): OAuthContextInput {
  const p = new URLSearchParams(search)
  return {
    intent: p.get('intent'),
    role: p.get('role'),
    academyId: p.get('academy_id'),
    familyId: p.get('family_id'),
    familyMemberId: p.get('family_member_id'),
    ref: p.get('ref'),
  }
}
