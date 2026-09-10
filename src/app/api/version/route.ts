import { NextResponse } from 'next/server'

/**
 * GET /api/version — which commit is actually running.
 *
 *     curl -s https://app.classraum.com/api/version
 *     {"commit":"6106fa2","branch":"main","env":"production","builtAt":"..."}
 *
 * This exists because "is my change live?" was unanswerable twice in one
 * week. Once a six-day-old CDN cache read as "the deploy never landed" and
 * sent me looking for a deploy failure that had already been fixed; once I
 * asserted production was on a given commit and Andy had to settle it with a
 * screenshot of the Vercel dashboard. Both cost more than this file.
 *
 * Vercel exposes the commit as a system environment variable and nothing in
 * the app read it. Read at MODULE scope so it is captured when the deployment
 * is built — a request-time read would be identical on Vercel today, but this
 * cannot drift if the function is ever pre-rendered or moved to the edge.
 *
 * DELIBERATELY PUBLIC, and deliberately thin. A short SHA and a branch name
 * are what a deploy check needs. VERCEL_GIT_COMMIT_MESSAGE is available too
 * and is NOT included: commit subjects leak roadmap and, in this repo, the
 * names of things that are broken.
 */

const COMMIT = process.env.VERCEL_GIT_COMMIT_SHA ?? null
const BRANCH = process.env.VERCEL_GIT_COMMIT_REF ?? null
const ENV = process.env.VERCEL_ENV ?? null
/** Captured when this module is first evaluated — i.e. at build. */
const BUILT_AT = new Date().toISOString()

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      // Short SHA: it is what `git log --oneline` shows and what you paste
      // into a comparison. The full one is a click away in Vercel.
      commit: COMMIT ? COMMIT.slice(0, 7) : 'local',
      branch: BRANCH ?? 'local',
      env: ENV ?? 'development',
      builtAt: BUILT_AT,
    },
    {
      // Never cached. A cached answer to "what is running" is the exact
      // failure this endpoint exists to prevent — see the six-day CDN cache
      // in the comment above.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
