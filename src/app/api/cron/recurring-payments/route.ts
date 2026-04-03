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
    // Pass CRON_SECRET_KEY if available, otherwise fall back to User-Agent
    if (process.env.CRON_SECRET_KEY) {
      headers['Authorization'] = `Bearer ${process.env.CRON_SECRET_KEY}`
    } else {
      headers['User-Agent'] = 'vercel-cron/1.0'
    }

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