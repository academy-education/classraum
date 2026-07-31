/**
 * @jest-environment node
 *
 * REACHABILITY guard for /account-deletion.
 *
 * The page can be perfect and still be a 307 to /auth. The app-subdomain
 * branch of src/middleware.ts falls through to "redirect unknown routes to
 * /auth", so the allowlist entry is the ONLY thing making this URL loadable
 * by a Google Play reviewer who has never signed in. Deleting that one `if`
 * block is a silent regression that breaks a store listing without breaking
 * anything a developer would notice locally (the main domain allows unknown
 * paths through, and localhost dev allows everything).
 *
 * Node environment, not jsdom: NextRequest needs the WHATWG `Request` global,
 * which jsdom does not provide.
 *
 * Verified by removing the allowlist entry and re-running: the pass-through
 * assertions fail with a Location of https://app.classraum.com/auth.
 */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function requestFor(pathname: string, host = 'app.classraum.com') {
  return new NextRequest(new URL(`https://${host}${pathname}`), {
    headers: { host },
  })
}

describe('/account-deletion middleware reachability', () => {
  it('passes through on the app subdomain (the native app host)', () => {
    const res = middleware(requestFor('/account-deletion'))
    // NextResponse.next() carries no Location; a redirect would.
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('passes through on the main domain', () => {
    const res = middleware(requestFor('/account-deletion', 'classraum.com'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('CONTROL: the app-subdomain fallthrough really does redirect to /auth', () => {
    // Without this the reachability assertions above prove nothing — a
    // middleware that returned next() for everything would pass them.
    const res = middleware(requestFor('/some-unlisted-page'))
    expect(res.headers.get('location')).toBe('https://app.classraum.com/auth')
  })

  it('CONTROL: the allowlist is exact, not a prefix', () => {
    // A startsWith() match would quietly make every future
    // /account-deletion-* route public.
    const res = middleware(requestFor('/account-deletion-admin'))
    expect(res.headers.get('location')).toBe('https://app.classraum.com/auth')
  })
})
