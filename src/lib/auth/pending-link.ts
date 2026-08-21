/**
 * The prove-then-link handshake, in one small expiring marker.
 *
 * Sequence:
 *   1. OAuth returns; `classifyOAuthOutcome` says `link_required`.
 *   2. The caller unlinks the just-attached identity and signs out.
 *   3. A marker is written here: "this person still wants to connect
 *      Kakao to this email".
 *   4. The auth page shows the sign-in form with a one-line explanation.
 *      The user proves ownership with the password.
 *   5. The marker is consumed and `linkIdentity({ provider })` runs, this
 *      time as a DELIBERATE link from an authenticated session.
 *
 * The marker is a UI convenience, never an authorisation. Step 5 links
 * whatever account step 4 actually signed into — if the user signs in as
 * somebody else, the provider gets linked to that account, which is fine,
 * because they proved they own it. The `email` field is only used to
 * prefill the form and to drop the marker when it does not match, so a
 * stale marker cannot silently attach a provider to an unrelated login.
 *
 * TTL is short: this is a single continuous interaction, not a state you
 * come back to tomorrow.
 */

import type { ContextStore } from './oauth-context'
import type { OAuthProvider } from './oauth-providers'

export const PENDING_LINK_KEY = 'classraum.oauth.pending_link.v1'
export const PENDING_LINK_TTL_MS = 10 * 60 * 1000

export interface PendingLink {
  provider: OAuthProvider
  email: string
  createdAt: number
}

const PROVIDERS: readonly string[] = ['kakao', 'google', 'apple']

export function savePendingLink(
  provider: string,
  email: string,
  store: ContextStore,
  now: number = Date.now()
): PendingLink | null {
  const p = String(provider).trim().toLowerCase()
  const e = String(email ?? '').trim().toLowerCase()
  if (!PROVIDERS.includes(p) || !e) return null
  const marker: PendingLink = { provider: p as OAuthProvider, email: e, createdAt: now }
  try {
    store.setItem(PENDING_LINK_KEY, JSON.stringify(marker))
  } catch {
    return null
  }
  return marker
}

/** Read WITHOUT consuming — the auth page needs it to render the prompt
 *  across re-renders before the user has typed anything. */
export function peekPendingLink(
  store: ContextStore,
  now: number = Date.now()
): PendingLink | null {
  let raw: string | null = null
  try {
    raw = store.getItem(PENDING_LINK_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearPendingLink(store)
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    clearPendingLink(store)
    return null
  }
  const blob = parsed as Record<string, unknown>
  const provider = typeof blob.provider === 'string' ? blob.provider.toLowerCase() : ''
  const email = typeof blob.email === 'string' ? blob.email.trim().toLowerCase() : ''
  const createdAt = blob.createdAt

  if (
    !PROVIDERS.includes(provider) ||
    !email ||
    typeof createdAt !== 'number' ||
    !Number.isFinite(createdAt)
  ) {
    clearPendingLink(store)
    return null
  }
  if (now - createdAt > PENDING_LINK_TTL_MS || createdAt > now + PENDING_LINK_TTL_MS) {
    clearPendingLink(store)
    return null
  }
  return { provider: provider as OAuthProvider, email, createdAt }
}

/**
 * Consume the marker for a sign-in that just succeeded as `signedInEmail`.
 *
 * Returns the provider to link, or null. The email comparison is the
 * guard: it prevents a marker left over from one person's attempt from
 * attaching their provider to the next person's account on a shared
 * device. The marker is cleared either way — one shot.
 */
export function takePendingLinkFor(
  signedInEmail: string | null | undefined,
  store: ContextStore,
  now: number = Date.now()
): OAuthProvider | null {
  const marker = peekPendingLink(store, now)
  clearPendingLink(store)
  if (!marker) return null
  const signed = String(signedInEmail ?? '').trim().toLowerCase()
  if (!signed || signed !== marker.email) return null
  return marker.provider
}

export function clearPendingLink(store: ContextStore): void {
  try {
    store.removeItem(PENDING_LINK_KEY)
  } catch {
    /* nothing to do */
  }
}
