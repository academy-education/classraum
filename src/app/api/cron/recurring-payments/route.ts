import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
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

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to generate recurring invoices')
    }

    // Log the result for monitoring
    console.log('[CRON] Recurring payments cron job completed:', result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      cron_result: result
    })

  } catch (error) {
    console.error('[CRON] Error in recurring payments cron job:', error)
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