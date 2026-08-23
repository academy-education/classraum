import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { verifyCronAuth } from '@/lib/cron-auth'
import { generateRecurringInvoices } from '@/lib/payments/generate-recurring'

// The generation logic lives in src/lib/payments/generate-recurring.ts,
// and the recurrence arithmetic under it in src/lib/payments/recurrence.ts.
//
// This route is now ONLY an HTTP wrapper: auth guard in, JSON out. The
// daily cron used to reach the work by fetching this URL from inside the
// same deployment; Vercel Deployment Protection answered that fetch with
// its own 401 and the job produced nothing for three days. The cron
// imports the function directly now. Request and response shapes here
// are unchanged, because manual and external callers still use them.

export async function POST(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(await generateRecurringInvoices())

  } catch (error) {
    console.error('[RECURRING] Unexpected error in automated invoice generation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        message: (error as Error).message 
      }, 
      { status: 500 }
    )
  }
}

// GET endpoint for testing/monitoring
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all active templates (both due and upcoming)
    const { data: allTemplates, error: allError } = await dbAdmin
      .from('recurring_payment_templates')
      .select('*')
      .eq('is_active', true)
      .order('next_due_date', { ascending: true })

    if (allError) throw allError

    // Get templates due today
    const { data: dueTemplates, error: dueError } = await dbAdmin
      .from('recurring_payment_templates')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today)

    if (dueError) throw dueError

    // Find the next execution date (earliest next_due_date)
    const nextExecutionDate = allTemplates && allTemplates.length > 0 
      ? allTemplates[0].next_due_date 
      : null

    return NextResponse.json({
      date: today,
      templatesReady: dueTemplates?.length || 0,
      totalActiveTemplates: allTemplates?.length || 0,
      nextExecutionDate,
      daysUntilNextRun: nextExecutionDate 
        ? Math.ceil((new Date(nextExecutionDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      templates: {
        due: dueTemplates?.map(t => ({
          id: t.id,
          name: t.name,
          next_due_date: t.next_due_date,
          recurrence_type: t.recurrence_type
        })) || [],
        upcoming: allTemplates?.slice(0, 5).map(t => ({
          id: t.id,
          name: t.name,
          next_due_date: t.next_due_date,
          recurrence_type: t.recurrence_type,
          days_until_due: Math.ceil((new Date(t.next_due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
        })) || []
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check recurring templates', message: (error as Error).message },
      { status: 500 }
    )
  }
}