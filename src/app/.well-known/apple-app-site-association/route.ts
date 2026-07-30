/**
 * Serves the Apple App Site Association document at the exact path Apple
 * fetches, with the Content-Type Apple requires.
 *
 * WHY A ROUTE AND NOT A STATIC FILE. This lived at
 * `public/.well-known/apple-app-site-association` for months. It was served
 * with a 200 and contained correct-looking JSON — and iOS ignored it, because
 * the file has no extension, so Vercel labels it `application/octet-stream`.
 * Apple requires `application/json` and discards anything else. With the file
 * discarded, the `applinks:app.classraum.com` entitlement in App.entitlements
 * resolved to nothing: Universal Links never activated, and a tapped invite
 * link opened Safari rather than the app.
 *
 * Two things were tried first, and are recorded so they are not retried:
 *
 *  1. A `headers()` entry in next.config setting Content-Type. Measured
 *     against a dev server — the response stayed `application/octet-stream`.
 *     Next's static-file handler sets Content-Type itself and headers() does
 *     not override it.
 *  2. A `beforeFiles` rewrite to an /api route. The rewrite never matched, and
 *     a control source with no leading dot rewrote no better, so the dot was
 *     not the cause. Abandoned once this route worked.
 *
 * A route handler owns the whole response, and Next resolves a `.well-known`
 * folder under app/ normally, so no rewrite is involved.
 *
 * The other historical bug, fixed at the same time: `appID` read
 * "TEAM_ID.com.classraum.app" — a literal placeholder that no build step ever
 * substituted.
 *
 * Apple fetches this path directly and does NOT follow redirects, so this must
 * stay a real 200 at this exact URL.
 */
import { NextResponse } from 'next/server'
import { APPLE_APP_SITE_ASSOCIATION } from '@/lib/deeplinks'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(APPLE_APP_SITE_ASSOCIATION, {
    headers: {
      'Content-Type': 'application/json',
      // Apple's CDN caches this; an hour keeps a correction from taking a
      // day to propagate without hammering the origin.
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
