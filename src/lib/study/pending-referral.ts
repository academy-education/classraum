/**
 * Client-side holding pen for a referral code that arrived via an invite
 * link (`/mobile/study?ref=CODE`).
 *
 * The invite link lands the recipient on the study home, not the referral
 * page, and a brand-new recipient may bounce through /auth + onboarding
 * before they're an authenticated study user who can redeem. We therefore
 * stash the code in localStorage the moment it appears in the URL and read
 * it back once the user is established, rather than losing it on the first
 * navigation. Cleared on a successful (or self/duplicate) redemption so the
 * claim banner doesn't linger.
 */

const KEY = 'study_pending_ref'

/** Persist a code from an invite link. Uppercased; ignores empty. */
export function savePendingReferral(code: string): void {
  if (typeof window === 'undefined') return
  const c = code.trim().toUpperCase()
  if (!c) return
  try { window.localStorage.setItem(KEY, c) } catch { /* storage blocked */ }
}

/** Read the stashed invite code, or null. */
export function readPendingReferral(): string | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(KEY) } catch { return null }
}

/** Forget the stashed invite code (after redeem, or on dismiss). */
export function clearPendingReferral(): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}

/**
 * Read `?ref=CODE` off the current URL and persist it — WITHOUT touching
 * the URL. Render-safe (pure read + idempotent localStorage write, never
 * throws), so it can run synchronously during a render high in the tree,
 * before an auth gate's redirect effect fires and drops the query string.
 * Returns the captured code, or null.
 */
export function stashReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = new URL(window.location.href).searchParams.get('ref')
    if (!raw) return null
    const code = raw.trim().toUpperCase()
    if (!code) return null
    savePendingReferral(code)
    return code
  } catch {
    return null
  }
}

/**
 * Read `?ref=CODE` off the current URL, persist it, and strip it from the
 * address bar (history.replaceState) so a refresh / share of the current
 * URL doesn't re-trigger it. Returns the captured code, or null. Safe to
 * call on every landing mount.
 */
export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  let code: string | null = null
  try {
    const url = new URL(window.location.href)
    const raw = url.searchParams.get('ref')
    if (!raw) return null
    code = raw.trim().toUpperCase()
    if (!code) return null
    savePendingReferral(code)
    url.searchParams.delete('ref')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  } catch {
    return null
  }
  return code
}
