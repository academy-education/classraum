import { NextRequest, NextResponse } from 'next/server'
import {
  triggerPaymentDueReminderNotifications,
  triggerPaymentOverdueNotifications,
} from '@/lib/notification-triggers'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * Daily cron — pushes payment-related reminders.
 *
 * Two events per run, in order:
 *   1. "Payment due in 3 days" — for invoices whose due_date is +3d
 *      and not yet paid, with `due_reminder_sent_at IS NULL`. Three
 *      days picked deliberately: Korean parents typically schedule
 *      bank transfers a couple of days ahead, so 3 days lands before
 *      the standard "I'll do it tonight" procrastination window.
 *   2. "Payment now overdue" — for invoices with due_date < today
 *      and not yet paid, with `overdue_notification_sent_at IS NULL`.
 *      Recipients include managers in addition to family so they can
 *      follow up directly.
 *
 * Both triggers stamp their dedup column after a successful push.
 *
 * Schedule (vercel.json): 00:10 UTC daily = 09:10 KST.
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dueResult = await triggerPaymentDueReminderNotifications()
    const overdueResult = await triggerPaymentOverdueNotifications()

    console.log('[CRON] Payment reminders cron completed:', { dueResult, overdueResult })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dueResult,
      overdueResult,
    })
  } catch (error) {
    console.error('[CRON] Error in payment reminders cron:', error)
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
