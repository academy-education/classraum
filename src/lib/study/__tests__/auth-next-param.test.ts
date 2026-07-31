/**
 * The ?next= post-login redirect, exercised through the exact validator
 * /auth uses.
 *
 * WHY THIS DESERVES ITS OWN TEST. A post-login redirect is one of the classic
 * open-redirect sinks: an attacker sends a student /auth?next=<their site>,
 * the student signs in for real, and the app hands them straight to the
 * attacker — with a live session and every reason to trust the page, because
 * they DID just log in to the real Classraum.
 *
 * /auth reuses safeNotificationPath rather than growing a second path check.
 * These cases pin the properties that reuse is relied on for, so that
 * swapping in a looser validator (or "simplifying" to a startsWith('/')) is
 * caught here rather than in a phishing report.
 */
import { safeNotificationPath } from '../notification-link'

describe('?next= post-login redirect', () => {
  it('accepts the destination subscribe-on-web actually sends', () => {
    expect(safeNotificationPath('/mobile/study/subscription?plan=premium_v1'))
      .toBe('/mobile/study/subscription?plan=premium_v1')
  })

  it.each([
    ['absolute http', 'https://evil.example.com'],
    // The critical one: browsers treat "//host" as protocol-relative, so it
    // leaves the origin while passing a naive startsWith('/') check.
    ['protocol-relative', '//evil.example.com'],
    ['backslash variant', '/\\evil.example.com'],
    ['double backslash', '\\\\evil.example.com'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,<script>alert(1)</script>'],
    // Leading control characters are stripped by some parsers, turning this
    // back into a scheme URL after the check would have passed.
    ['newline-prefixed scheme', '\njavascript:alert(1)'],
    ['relative without leading slash', 'mobile/study/subscription'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(safeNotificationPath(value)).toBeNull()
  })

  it('rejects non-strings, so a missing param cannot become a destination', () => {
    // URLSearchParams.get returns null when ?next= is absent; that must fall
    // through to the normal role-based routing, not throw or redirect.
    expect(safeNotificationPath(null)).toBeNull()
    expect(safeNotificationPath(undefined)).toBeNull()
  })
})
