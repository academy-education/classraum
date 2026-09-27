/**
 * Which incoming universal links must be LOADED, not routed.
 *
 * The native app receives https://app.classraum.com/... links via
 * `appUrlOpen` (universal links / app links work — the app opens). But the
 * only listeners were the authenticated layouts' router.push handler and
 * the OAuth-return hook, so a confirmation or reset link opened the app on
 * whatever page it had (the auth page, logged out) and the link itself was
 * never followed (reported 2026-09-28). `/auth/confirm` and `/auth/callback`
 * are SERVER routes — they must be fetched, so the fix is a full
 * `window.location.assign`, and the client router must keep its hands off.
 */
const OUR_HOST = /^(app\.)?(www\.)?classraum\.com$|^app\.localhost(:\d+)?$|^localhost(:\d+)?$/
const AUTH_PATHS = ['/auth/confirm', '/auth/callback']

export function isAuthLinkPath(pathname: string, search = ''): boolean {
  if (AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true
  if (pathname === '/auth' || pathname === '/auth/') {
    const q = new URLSearchParams(search)
    return q.has('token_hash') || q.has('access_token') || q.has('code') || q.get('type') === 'confirmed' || q.get('type') === 'reset'
  }
  return false
}

/** The URL to load for an auth link on our host, else null (someone else's link). */
export function authLinkTarget(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (!OUR_HOST.test(u.host)) return null
    return isAuthLinkPath(u.pathname, u.search) ? u.toString() : null
  } catch { return null }
}
