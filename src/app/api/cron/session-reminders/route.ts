import { NextRequest, NextResponse } from 'next/server'
import { triggerSessionReminderNotifications } from '@/lib/notification-triggers'
import { verifyCronAuth } from '@/lib/cron-auth'

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

    const result = await triggerSessionReminderNotifications()

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
