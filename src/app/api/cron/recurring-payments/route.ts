import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'
import { recordHeartbeat } from '@/lib/ops/heartbeat'

/**
 * Daily cron — generates recurring student invoices.
 *
 * Thin forwarder: the work is in POST /api/payments/recurring/generate,
 * which is also reachable from the payments UI. This route exists so
 * Vercel Cron (which only issues GET) can drive it.
 *
 * Schedule (vercel.json): 20:00 UTC daily = 05:00 KST. Deliberately
 * clear of the other money crons (09:00/09:15 UTC billing, 00:10 UTC
 * payment reminders) so a slow run cannot contend with them, and clear
 * of 00:00–00:10 UTC where three notification crons already sit.
 *
 * Before this was scheduled, all 19 active templates were overdue — some
 * since Jan 2025 — and the generate route invoices ONE period per run
 * before advancing next_due_date. Switching the cron on without first
 * rolling every template to a FUTURE occurrence would have emitted weeks
 * of back-dated invoices to real parents. The roll-forward
 * (scripts/roll-forward-recurring-templates.ts) is a prerequisite, not
 * an optional tidy-up.
 */
export async function GET(req: NextRequest) {
  const started = Date.now()
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the recurring invoice generation endpoint
    const baseUrl = req.nextUrl.origin
    const generateUrl = `${baseUrl}/api/payments/recurring/generate`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    // Forward the same secret the inbound guard accepts. CRON_SECRET
    // first — that is the name Vercel Cron requires, and the one likely
    // to be the only one set. Reading CRON_SECRET_KEY alone meant this
    // route could authenticate INBOUND via verifyCronAuth and then
    // forward no credential at all, so recurring invoice generation
    // 401'd downstream and silently produced nothing.
    //
    // The old `else` fell back to a 'vercel-cron/1.0' User-Agent. That
    // was always spoofable, and verifyCronAuth deliberately stopped
    // honouring it — so the fallback could not authenticate anything.
    // Fail loudly instead of firing a request that is certain to 401.
    const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY
    if (!cronSecret) {
      console.error('[cron/recurring-payments] no CRON_SECRET configured — cannot authenticate to the generate endpoint')
      // Past the auth guard, so this run DID happen and must be
      // reported — a misconfigured secret that stayed silent is exactly
      // how this job would look identical to a healthy one while
      // generating nothing.
      await recordHeartbeat(
        'recurring-payments',
        { ok: false, detail: { error: 'CRON_SECRET not configured' } },
        Date.now() - started,
      )
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 },
      )
    }
    headers['Authorization'] = `Bearer ${cronSecret}`

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers,
    })

    // Read the body as TEXT first. A non-2xx from the generate route may
    // be HTML (a Next error page) or empty, in which case .json() throws
    // and the catch below reports the parse failure instead of the real
    // status — which is exactly what happened on 2026-08-21/22: two
    // failed runs whose heartbeat said only "Failed to generate
    // recurring invoices", with no status and no body to act on.
    const raw = await response.text()
    let result: {
      message?: string
      totalInvoicesCreated?: number
      templatesFound?: number
      templatesProcessed?: number
      errors?: string[]
      skipped?: boolean
    } = {}
    try {
      result = raw ? JSON.parse(raw) : {}
    } catch {
      // leave result empty; `raw` is carried in the error below
    }

    if (!response.ok) {
      throw new Error(
        `generate returned ${response.status}: ${result.message || raw.slice(0, 300) || '(empty body)'}`,
      )
    }

    // Log the result for monitoring
    console.log('[CRON] Recurring payments cron job completed:', result)

    // `withHeartbeat` is not used here on purpose. The generate endpoint
    // answers 200 with a non-empty `errors[]` when SOME templates failed
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
