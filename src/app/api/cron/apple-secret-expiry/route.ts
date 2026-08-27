import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { withHeartbeat } from '@/lib/ops/heartbeat'
import { raiseAlert } from '@/lib/ops/alert'
import {
  classifyAppleSecret,
  severityFor,
  messageFor,
} from '@/lib/auth/apple-secret'

/**
 * Warn before the Apple Sign in with Apple client secret expires.
 *
 * Apple caps it at six months. When it lapses, web sign-in breaks with no
 * deploy, no code change, and nothing in our logs — the rejection happens
 * inside Apple's token exchange. A calendar reminder is the usual answer
 * and the usual thing to miss, so the schedule does it instead.
 *
 * Costs nothing: the expiry is a claim inside the JWT we already hold, so
 * there is no Apple API call and no rate limit to respect.
 *
 * Silent while `apple` is absent from NEXT_PUBLIC_OAUTH_PROVIDERS, so it
 * does not nag for months before the provider is switched on. The moment
 * it IS switched on, a missing secret becomes an alert in its own right.
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Heartbeat only past the auth guard: a 401'd request never ran the
    // job, and letting it report would mask a dead cron.
    const result = await withHeartbeat('apple-secret-expiry', async () => {
      const status = classifyAppleSecret({
        providersRaw: process.env.NEXT_PUBLIC_OAUTH_PROVIDERS,
        secret: process.env.APPLE_OAUTH_SECRET,
        now: new Date(),
      })

      const severity = severityFor(status)
      const message = messageFor(status)

      if (severity && message) {
        await raiseAlert({
          severity,
          title: 'Apple sign-in secret needs rotating',
          message,
          // One condition, not one per run — the watchdog refreshes an
          // open alert rather than inserting a row every day for a month.
          dedupeKey: `apple-secret:${status.kind}`,
          context: {
            kind: status.kind,
            expiresAt:
              'expiresAt' in status ? status.expiresAt.toISOString() : null,
          },
        })
      }

      return {
        kind: status.kind,
        severity,
        expiresAt: 'expiresAt' in status ? status.expiresAt.toISOString() : null,
        daysLeft: 'daysLeft' in status ? status.daysLeft : null,
      }
    })

    console.log('[CRON] Apple secret expiry check:', result)
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error) {
    console.error('[CRON] Error in apple secret expiry cron job:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
