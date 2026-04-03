import { NextRequest, NextResponse } from 'next/server'
import { triggerSessionAutoCompletionNotifications } from '@/lib/notification-triggers'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run session auto-completion check
    const result = await triggerSessionAutoCompletionNotifications()

    // Log the result for monitoring
    console.log('[CRON] Session auto-completion cron job completed:', result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('[CRON] Error in session auto-completion cron job:', error)
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