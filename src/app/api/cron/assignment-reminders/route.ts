import { NextRequest, NextResponse } from 'next/server'
import {
  triggerAssignmentDueReminderNotifications,
  triggerAssignmentOverdueNotifications,
} from '@/lib/notification-triggers'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * Daily cron — pushes assignment-related reminders.
 *
 * Two events per run, in order:
 *   1. "Assignment due tomorrow" — for assignments with due_date = +1d
 *      and `due_reminder_sent_at IS NULL`. Single fire per row.
 *   2. "Assignment now overdue" — for assignments with due_date < today
 *      and `overdue_notification_sent_at IS NULL`. Single fire per row.
 *
 * Both triggers are idempotent — they stamp their respective columns
 * after a successful push so re-runs (preview deploys, manual curl,
 * Vercel retries) skip already-notified rows.
 *
 * Schedule (vercel.json): 00:05 UTC daily = 09:05 KST. Offset by 5
 * minutes from the session-reminders cron so they don't both kick off
 * the same supabase connection storm at the top of the hour.
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dueResult = await triggerAssignmentDueReminderNotifications()
    const overdueResult = await triggerAssignmentOverdueNotifications()

    console.log('[CRON] Assignment reminders cron completed:', { dueResult, overdueResult })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dueResult,
      overdueResult,
    })
  } catch (error) {
    console.error('[CRON] Error in assignment reminders cron:', error)
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
