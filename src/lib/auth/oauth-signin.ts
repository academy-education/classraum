/**
 * The two halves of an OAuth round trip, with every I/O call injected.
 *
 * Everything here is ordering and error handling — the part that cannot
 * be checked by reading it, and that would otherwise only be exercisable
 * against live provider credentials that do not exist yet. Injecting the
 * Supabase calls, the browser hand-off and the fetches means the ordering
 * IS testable now: that the context is stored before the redirect, that a
 * failed hand-off does not leave a stale context behind, that a join
 * failure surfaces instead of silently producing a study student.
 *
 * The page keeps only the React state.
 */

import {
  captureOAuthContext,
  clearOAuthContext,
  restoreOAuthContext,
  toJoinRequest,
  contextFromSearch,
  type ContextStore,
  type OAuthSignupContext,
  type RestoreFailure,
} from './oauth-context'
import { oauthRedirectTo, markOAuthFlow } from './oauth-callback'
import { PROVIDER_SCOPES, type OAuthProvider } from './oauth-providers'
import {
  classifyOAuthOutcome,
  type OAuthOutcome,
  type OAuthIdentityFact,
} from './oauth-outcome'

// ───────────────────────────── start ─────────────────────────────

export interface StartDeps {
  /** `db.auth.signInWithOAuth`, narrowed to what we use. */
  signInWithOAuth(args: {
    provider: OAuthProvider
    options: { redirectTo: string; scopes?: string; skipBrowserRedirect?: boolean }
  }): Promise<{ data: { url: string | null }; error: { message: string } | null }>
  /** Hand a URL to the OS browser. Native only. */
  openExternal(url: string): Promise<boolean>
  native: boolean
  store: ContextStore
  /** `window.location.search` at the moment the button was pressed. */
  search: string
  location: { protocol: string; hostname: string; port: string }
  now?: number
}

export type StartResult =
  | { ok: true; context: OAuthSignupContext | null }
  | { ok: false; reason: 'start_failed' | 'no_url' | 'handoff_failed'; message?: string }

/**
 * Begin a social sign-in.
 *
 * THE CONTEXT IS WRITTEN FIRST, and cleared again on every failure path.
 * Writing it after the redirect call is not an option on web — the call
 * navigates away — and leaving it behind after a failed start is how a
 * user who abandoned a parent invite gets attached to that academy the
 * next time they sign in with Google (within the TTL). Both orderings
 * look identical in a code review.
 */
export async function startOAuthSignIn(
  provider: OAuthProvider,
  deps: StartDeps
): Promise<StartResult> {
  const now = deps.now ?? Date.now()
  const context = captureOAuthContext(contextFromSearch(deps.search), deps.store, now)

  const redirectTo = markOAuthFlow(
    oauthRedirectTo({
      native: deps.native,
      protocol: deps.location.protocol,
      hostname: deps.location.hostname,
      port: deps.location.port,
    })
  )

  let result: Awaited<ReturnType<StartDeps['signInWithOAuth']>>
  try {
    result = await deps.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: PROVIDER_SCOPES[provider],
        // Native: we need the URL back so it can be opened OUTSIDE the
        // WebView. Google refuses to authenticate inside an embedded
        // WebView (`disallowed_useragent`), and a Custom Tab / Safari
        // View Controller is also the only place the user's existing
        // provider session lives.
        ...(deps.native ? { skipBrowserRedirect: true } : {}),
      },
    })
  } catch (e) {
    clearOAuthContext(deps.store)
    return { ok: false, reason: 'start_failed', message: (e as Error)?.message }
  }

  if (result.error) {
    clearOAuthContext(deps.store)
    return { ok: false, reason: 'start_failed', message: result.error.message }
  }

  if (deps.native) {
    const url = result.data?.url
    if (!url) {
      clearOAuthContext(deps.store)
      return { ok: false, reason: 'no_url' }
    }
    // openExternalUrl returns false rather than throwing when the OS has
    // no browser to hand off to — a dead button and a working button look
    // the same otherwise (see the comment on openExternalUrl).
    const handed = await deps.openExternal(url)
    if (!handed) {
      clearOAuthContext(deps.store)
      return { ok: false, reason: 'handoff_failed' }
    }
  }

  return { ok: true, context }
}

// ───────────────────────────── return ─────────────────────────────

export interface IdentityFacts {
  email: string | null
  userCreatedAt: string | null
  identities: OAuthIdentityFact[]
  profileExists: boolean
}

/**
 * Which provider did this return come from?
 *
 * The callback URL does not say — Supabase does not echo it back — and
 * storing it would be a second expiring blob to keep in step with the
 * first. It is derivable instead: the newest identity that is not the
 * password ('email') one. That is exactly the identity the round trip
 * just produced, in both the clean-signup case and the auto-link case.
 *
 * Returns null when nothing is derivable, so the caller shows a generic
 * message rather than naming the wrong provider at the user.
 */
export function inferProvider(facts: IdentityFacts): string | null {
  const social = facts.identities.filter((i) => i.provider !== 'email')
  if (social.length === 0) return null
  let best = social[0]
  let bestAt = Date.parse(best.createdAt ?? '')
  for (const i of social.slice(1)) {
    const at = Date.parse(i.createdAt ?? '')
    if (Number.isFinite(at) && (!Number.isFinite(bestAt) || at > bestAt)) {
      best = i
      bestAt = at
    }
  }
  return best.provider
}

export interface CompleteDeps {
  store: ContextStore
  /** Omit to infer it from the identities — see inferProvider. */
  provider?: string
  /** GET /api/auth/oauth-identity */
  fetchIdentity(): Promise<IdentityFacts | null>
  /** POST /api/auth/oauth-provision — repair a missing users row. */
  provision(): Promise<boolean>
  /** POST /api/academy/join */
  join(body: {
    role: 'student' | 'parent'
    academyId: string
    familyId?: string
    familyMemberId?: string
  }): Promise<{ ok: boolean }>
  deliberateLink?: boolean
  now?: number
}

export type CompleteResult =
  /** Session is safe to keep; `joined` says whether an invite was attached. */
  | { kind: 'ok'; joined: boolean; context: OAuthSignupContext | null }
  /* every non-ok result carries the provider it concerns, so the caller
     can name it in the message without re-deriving it */
  /** Signed in, but the invite could not be attached. Must be shown. */
  | { kind: 'join_failed'; context: OAuthSignupContext }
  /** The invite context did not survive, or was never usable. */
  | { kind: 'context_lost'; reason: RestoreFailure }
  /** Session must NOT be kept — the caller signs out. */
  | { kind: 'blocked'; outcome: Exclude<OAuthOutcome, { kind: 'ok' }>; provider: string }
  /** The identity lookup itself failed; caller retries or degrades. */
  | { kind: 'unknown' }

/**
 * Finish an OAuth return: decide whether the session may be kept, then
 * attach the invite if there was one.
 *
 * ORDER IS THE POINT. The takeover check runs BEFORE the join, because a
 * join performed on a session we are about to reject would write a real
 * membership row for the wrong person and no sign-out undoes that.
 */
export async function completeOAuthReturn(deps: CompleteDeps): Promise<CompleteResult> {
  const now = deps.now ?? Date.now()

  let facts: IdentityFacts | null
  try {
    facts = await deps.fetchIdentity()
  } catch {
    facts = null
  }
  if (!facts) return { kind: 'unknown' }

  const provider = deps.provider ?? inferProvider(facts) ?? 'oauth'

  let outcome = classifyOAuthOutcome({
    email: facts.email,
    userCreatedAt: facts.userCreatedAt,
    identities: facts.identities,
    provider,
    profileExists: facts.profileExists,
    deliberateLink: deps.deliberateLink,
    now,
  })

  // A missing profile row is repairable when there IS an email; try once
  // before telling the user their account is broken.
  if (outcome.kind === 'no_profile') {
    let repaired = false
    try {
      repaired = await deps.provision()
    } catch {
      repaired = false
    }
    if (repaired) outcome = { kind: 'ok' }
  }

  if (outcome.kind !== 'ok') {
    // The context is dropped: this session is being thrown away, and a
    // context left behind would attach the invite to whatever account
    // signs in next.
    clearOAuthContext(deps.store)
    return { kind: 'blocked', outcome, provider }
  }

  const restored = restoreOAuthContext(deps.store, now)
  if (!restored.context) {
    // 'absent' is the ordinary case — a plain social sign-in with no
    // invite. Anything else means an invite was carried and lost, which
    // the caller must SAY, because the alternative is an invited parent
    // silently becoming a study student.
    return restored.reason === 'absent'
      ? { kind: 'ok', joined: false, context: null }
      : { kind: 'context_lost', reason: restored.reason }
  }

  const joinBody = toJoinRequest(restored.context)
  if (!joinBody) return { kind: 'ok', joined: false, context: restored.context }

  try {
    const res = await deps.join(joinBody)
    if (!res.ok) return { kind: 'join_failed', context: restored.context }
  } catch {
    return { kind: 'join_failed', context: restored.context }
  }

  return { kind: 'ok', joined: true, context: restored.context }
}
