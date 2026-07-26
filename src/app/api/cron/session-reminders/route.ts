import { NextRequest, NextResponse } from 'next/server'
import { triggerSessionReminderNotifications } from '@/lib/notification-triggers'
import { verifyCronAuth } from '@/lib/cron-auth'
import { withHeartbeat } from '@/lib/ops/heartbeat'

/**
 * Daily cron — sends "session is tomorrow" reminders.
 *
 * Schedule (vercel.json): 00:00 UTC daily = 09:00 KST. Korean parents
 * get the reminder when they wake up; the notification covers every
 * session scheduled for the following Korean calendar day.
 *
 * Idempotent: each session row carries a `reminder_sent_at` timestamp
 * the trigger sets after a successful push. Re-runs of this endpoint
 * (preview deploys, manual curl, retries) skip rows that already have
 * the timestamp set.
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Heartbeat is recorded only past the auth guard — a 401'd request
    // never ran the job, so letting it report would mask a dead cron.
    const result = await withHeartbeat('session-reminders', () =>
      triggerSessionReminderNotifications(),
    )

    console.log('[CRON] Session reminder cron completed:', result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error) {
    console.error('[CRON] Error in session reminder cron:', error)
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

// POST mirrors GET so external cron services that prefer POSTing also work.
export async function POST(req: NextRequest) {
  return GET(req)
}
