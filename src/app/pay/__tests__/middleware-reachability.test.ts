/**
 * @jest-environment node
 *
 * REACHABILITY guard for /pay/* — the checkout hand-off and the PG return.
 *
 * Same trap that caught /account-deletion, and it cost a live payment
 * before this test existed. The app-subdomain branch of src/middleware.ts
 * falls through to "redirect unknown routes to /auth", so on the very
 * first deploy of the /pay move BOTH routes answered:
 *
 *     /pay/return     -> HTTP 307, location: /auth
 *     /pay/subscribe  -> HTTP 307, location: /auth
 *
 * measured against production, not imagined. That is worse than the bug it
 * was fixing: the return leg carries the issued `billingKey` in its query
 * string, and a redirect to /auth drops the query — so the card would be
 * registered at Inicis and the key discarded on our doorstep.
 *
 * These paths exist BECAUSE they sit outside the app's Universal Link
 * claim, which is exactly why nothing else in middleware.ts had heard of
 * them. Unclaimed and unrouted look identical until money moves.
 *
 * Node environment, not jsdom: NextRequest needs the WHATWG `Request`
 * global, which jsdom does not provide.
 */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function requestFor(pathname: string, host = 'app.classraum.com') {
  return new NextRequest(new URL(`https://${host}${pathname}`), { headers: { host } })
}

describe('/pay/* middleware reachability', () => {
  it('the PG return passes through on the app subdomain, with its query intact', () => {
    const res = middleware(requestFor('/pay/return?billingKey=bk_test_123'))
    // NextResponse.next() carries no Location; a redirect would — and that
    // redirect is what would strip billingKey.
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('the checkout hand-off passes through on the app subdomain', () => {
    const res = middleware(requestFor('/pay/subscribe?plan=premium_plus_v1'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.status).toBe(200)
  })

  it('CONTROL: the app-subdomain fallthrough really does redirect to /auth', () => {
    // Without this, the assertions above prove nothing — a middleware that
    // returned next() for everything would satisfy them just as well.
    const res = middleware(requestFor('/pay-not-a-real-route'))
    expect(res.headers.get('location')).toContain('/auth')
  })
})
