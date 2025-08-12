import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Basic security check - you can enhance this with API keys or other auth
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_KEY || 'your-secret-key-here'
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the recurring invoice generation endpoint
    const baseUrl = req.nextUrl.origin
    const generateUrl = `${baseUrl}/api/payments/recurring/generate`

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
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