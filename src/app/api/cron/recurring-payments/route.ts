import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { generateRecurringInvoices } from '@/lib/payments/generate-recurring'

/**
 * Daily cron — generates recurring student invoices.
 *
 * Schedule (vercel.json): 00:35 UTC daily = 09:35 KST. Deliberately
 * clear of the other money crons (09:00/09:15 UTC billing) and of the
 * 00:00–00:10 UTC notification crons.
 *
 * WHY THERE IS NO fetch() HERE ANY MORE (root cause of the 2026-08-21/22/23
 * failures). This route used to do:
 *
 *     fetch(`${req.nextUrl.origin}/api/payments/recurring/generate`, …)
 *
 * i.e. the app calling itself over the public internet to run a function
 * that lives in its own bundle. On Vercel, `req.nextUrl.origin` is the
 * immutable deployment URL, and Deployment Protection guards that URL.
 * Every run got, verbatim from the heartbeat:
 *
 *     generate returned 401: {"protection":{"vercel_auth_enabled":true,
 *     "vercel_auth_callback":"https://vercel.com/sso-api?url=…%2Fapi%2F
 *     payments%2Frecurring%2Fgenerate&nonce=…"}}
 *
 * The request never reached the generate route. `CRON_SECRET` was never
 * the problem and forwarding it could never have helped — Vercel's SSO
 * gate answers before any of our code runs, and it does not read that
 * header. (The inbound cron request is exempt because Vercel Cron is
 * internal; its own outbound copy of the same URL is not.) That JSON
 * body having no `message` key is also why the first two failures said
 * only "Failed to generate recurring invoices".
 *
 * The work is now imported. No origin to guess, no second credential, no
 * gateway in the path — the same thing /api/cron/refresh-test-specs has
 * always done. The HTTP route still exists, unchanged, for manual and
 * external callers.
 *
 * Before this was scheduled, all 19 active templates were overdue — some
 * since Jan 2025 — and generation invoices ONE period per run before
 * advancing next_due_date. Switching the cron on without first rolling
 * every template to a FUTURE occurrence would have emitted weeks of
 * back-dated invoices to real parents. The roll-forward
 * (scripts/roll-forward-recurring-templates.ts) is a prerequisite, not
 * an optional tidy-up.
 */
export async function GET(req: NextRequest) {
  const started = Date.now()
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await generateRecurringInvoices()

    // Log the result for monitoring
    console.log('[CRON] Recurring payments cron job completed:', result)

    // `withHeartbeat` is not used here on purpose. Generation returns
    // normally with a non-empty `errors[]` when SOME templates failed
    // — a partial failure that means real families were not invoiced.
    // withHeartbeat would see a resolved promise and mark the run green,
    // so the one signal that something is wrong would be the thing the
    // monitoring throws away.
    const partialFailures: string[] = Array.isArray(result?.errors) ? result.errors : []
    await recordHeartbeat(
      'recurring-payments',
      {
        ok: partialFailures.length === 0,
        detail: {
          templatesFound: result?.templatesFound ?? 0,
          templatesProcessed: result?.templatesProcessed ?? 0,
          totalInvoicesCreated: result?.totalInvoicesCreated ?? 0,
          skipped: result?.skipped ?? false,
          ...(partialFailures.length > 0 ? { errors: partialFailures } : {}),
        },
      },
      Date.now() - started,
    )

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cron_result: result
    })

  } catch (error) {
    console.error('[CRON] Error in recurring payments cron job:', error)
    await recordHeartbeat(
      'recurring-payments',
      { ok: false, detail: { error: (error as Error).message } },
      Date.now() - started,
    )
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// You can also set up a POST endpoint for webhooks from external cron services
export async function POST(req: NextRequest) {
  return GET(req) // Same logic for now
}
