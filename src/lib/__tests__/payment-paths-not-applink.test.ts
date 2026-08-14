/**
 * The payment paths must NOT be claimed as Universal Links.
 *
 * This is the regression that cost two customers on 2026-08-13. The app
 * claims ["/invite/*", "/mobile/*", "/dashboard/*", "/auth/*"], and both
 * the "pay on the web" hand-off and the PG's return URL sat under
 * `/mobile/*`. iOS therefore handed each of them to the Classraum app
 * instead of the browser that started the purchase:
 *
 *   - the hand-off bounced the buyer back into the app after sign-in,
 *     where the only control hands off to the web again ("first she
 *     tried with the web only and then it led her back to the app")
 *   - the PG return landed in the app's WKWebView while the intent had
 *     been stashed in the SFSafariViewController that opened the card
 *     window. Two WebViews, two storage jars, no intent — card
 *     registered, nobody charged.
 *
 * A path being unclaimed is invisible: nothing renders differently, no
 * test fails, and the damage only shows up as a buyer who cannot pay. So
 * assert it directly, against the SAME constant the served
 * apple-app-site-association is built from.
 */
// purchase-credits reaches supabase-js, which is published as untranspiled
// ESM and kills the suite at import — printing "Tests: 0" for this file
// while other suites still show their passes. The constant needs none of it.
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/supabase', () => ({ db: {} }))
jest.mock('@portone/browser-sdk/v2', () => ({}), { virtual: true })

import { APPLE_APP_LINK_PATHS } from '@/lib/deeplinks'
import { BILLING_REDIRECT_PATH } from '@/lib/study/purchase-credits'

/**
 * Apple's matcher, restricted to the shapes we actually use. `*` matches
 * any run of characters; everything else is literal. Deliberately NOT a
 * substring test — `/auth/*` does NOT match a bare `/auth`, and that
 * distinction is load-bearing: it is why the sign-in leg of the hand-off
 * stayed in the browser while the forward after it did not.
 */
function claimsPath(pattern: string, path: string): boolean {
  const rx = new RegExp('^' + pattern.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
  return rx.test(path)
}

const claimed = (path: string) => APPLE_APP_LINK_PATHS.some(p => claimsPath(p, path))

describe('the matcher itself reproduces Apple\'s behaviour', () => {
  it('matches a prefix wildcard', () => {
    expect(claimsPath('/mobile/*', '/mobile/study/subscription')).toBe(true)
  })
  it('does NOT match the bare stem — the trailing slash is required', () => {
    expect(claimsPath('/auth/*', '/auth')).toBe(false)
  })
  it('does not match an unrelated path', () => {
    expect(claimsPath('/mobile/*', '/pay/return')).toBe(false)
  })
})

describe('payment paths are outside the Universal Link claim', () => {
  it('the PG return path is not claimed', () => {
    expect(claimed(BILLING_REDIRECT_PATH)).toBe(false)
  })

  it('the web checkout hand-off is not claimed', () => {
    expect(claimed('/pay/subscribe')).toBe(false)
  })

  it('the paths that DID break are still claimed — proving the test can fail', () => {
    // If these ever come back false the claim list changed, and the two
    // assertions above stopped meaning anything.
    expect(claimed('/mobile/study/billing-redirect')).toBe(true)
    expect(claimed('/mobile/study/subscription')).toBe(true)
  })
})

/**
 * The Android half of the same rule, read straight from the manifest.
 *
 * Android's claim list is not served from our code — it is compiled into
 * the APK. So unlike the iOS association, a mistake here CANNOT be undone
 * by a deploy: it ships to the Play Store and stays broken until the next
 * release. That asymmetry is why this is asserted rather than left to the
 * comment in the manifest.
 *
 * The claim it removes was defensible when written ("Android checks out
 * in-app, the return must re-enter the app") and became actively harmful
 * on 2026-08-10 when both native platforms moved to the web hand-off —
 * the buyer now starts in an external browser, so pulling the return into
 * the app is what loses the purchase.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('AndroidManifest claims no payment path', () => {
  const manifest = readFileSync(
    join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'), 'utf8')
  const prefixes = [...manifest.matchAll(/pathPrefix="([^"]+)"/g)].map(m => m[1])

  it('does not claim /pay/*', () => {
    expect(prefixes.filter(p => p.startsWith('/pay'))).toEqual([])
  })

  it('does not claim the old billing-redirect path, or anything under /mobile/study', () => {
    expect(prefixes.filter(p => p.startsWith('/mobile/study'))).toEqual([])
  })

  it('CONTROL: notification deep links are still claimed', () => {
    // Without this the assertions above would pass on an empty/renamed
    // file, and stripping every deep link would look like a fix.
    expect(prefixes).toEqual(expect.arrayContaining(['/mobile/session', '/invite/']))
  })
})
