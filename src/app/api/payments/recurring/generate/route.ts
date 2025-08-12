import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Calculate the next due date based on recurrence pattern
function calculateNextDueDate(template: any): string {
  const today = new Date()
  const startDate = new Date(template.start_date)
  
  // If payment hasn't started yet, return start date
  if (startDate > today) {
    return template.start_date
  }

  // If payment has ended, return end date or indicate completion
  if (template.end_date && new Date(template.end_date) <= today) {
    return template.end_date
  }

  if (template.recurrence_type === 'monthly' && template.day_of_month) {
    const nextDue = new Date(today)
    
    // Set to the target day of current month
    nextDue.setDate(template.day_of_month)
    
    // If that day has already passed this month, move to next month
    if (nextDue <= today) {
      nextDue.setMonth(nextDue.getMonth() + 1)
      nextDue.setDate(template.day_of_month)
    }
    
    // Handle months with fewer days (e.g., Feb 30th becomes Feb 28th/29th)
    if (nextDue.getDate() !== template.day_of_month) {
      nextDue.setDate(0) // Go to last day of previous month
    }
    
    return nextDue.toISOString().split('T')[0]
  }

  if (template.recurrence_type === 'weekly' && template.day_of_week !== null) {
    const nextDue = new Date(today)
    const targetDayOfWeek = template.day_of_week
    const currentDayOfWeek = today.getDay()
    
    // Calculate days until target day
    let daysUntilTarget = (targetDayOfWeek || 0) - currentDayOfWeek
    
    // If target day is today or has passed this week, move to next week
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7
    }
    
    nextDue.setDate(today.getDate() + daysUntilTarget)
    return nextDue.toISOString().split('T')[0]
  }

  // Fallback to stored next_due_date
  return template.next_due_date
}

export async function POST(req: NextRequest) {
  try {
    // Basic authentication check - you might want to add API key or other security
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]
    console.log(`[RECURRING] Starting automated invoice generation for ${today}`)

    // 🚀 SMART EARLY EXIT: Quick check if any templates are due
    const { count: dueTemplatesCount, error: countError } = await supabase
      .from('recurring_payment_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('next_due_date', today)

    if (countError) {
      console.error('[RECURRING] Error checking due templates count:', countError)
      throw countError
    }

    // Early exit if no templates are due - saves 99% of execution time
    if (!dueTemplatesCount || dueTemplatesCount === 0) {
      console.log(`[RECURRING] No templates due today (${today}). Skipping processing.`)
      return NextResponse.json({
        success: true,
        date: today,
        templatesFound: 0,
        templatesProcessed: 0,
        totalInvoicesCreated: 0,
        skipped: true,
        message: 'No templates due today - execution skipped'
      })
    }

    console.log(`[RECURRING] Found ${dueTemplatesCount} templates due for processing`)

    // Get all active recurring payment templates that are due today or overdue
    const { data: templates, error: templatesError } = await supabase
      .from('recurring_payment_templates')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', today)

    if (templatesError) {
      console.error('[RECURRING] Error fetching templates:', templatesError)
      throw templatesError
    }

    let totalInvoicesCreated = 0
    let templatesProcessed = 0
    const errors: string[] = []

    if (templates && templates.length > 0) {
      for (const template of templates) {
        try {
          console.log(`[RECURRING] Processing template: ${template.name} (${template.id})`)

          // Get all students for this template
          const { data: templateStudents, error: studentsError } = await supabase
            .from('recurring_payment_template_students')
            .select(`
              student_id,
              amount_override,
              students!inner(
                user_id,
                academy_id,
                active,
                users!inner(
                  id,
                  name,
                  email
                )
              )
            `)
            .eq('template_id', template.id)
            .eq('students.active', true)

          if (studentsError) {
            console.error(`[RECURRING] Error fetching students for template ${template.id}:`, studentsError)
            errors.push(`Template ${template.name}: ${studentsError.message}`)
            continue
          }

          if (!templateStudents || templateStudents.length === 0) {
            console.log(`[RECURRING] No active students found for template: ${template.name}`)
            continue
          }

          console.log(`[RECURRING] Found ${templateStudents.length} active students for template: ${template.name}`)

          // Create invoices for all active students
          const invoices = templateStudents.map((templateStudent: any) => {
            const finalAmount = templateStudent.amount_override || template.amount
            return {
              student_id: templateStudent.student_id,
              template_id: template.id,
              amount: finalAmount,
              final_amount: finalAmount,
              due_date: template.next_due_date,
              status: 'pending',
              discount_amount: 0,
              created_at: new Date().toISOString()
            }
          })

          // Insert the invoices
          const { error: invoiceError } = await supabase
            .from('invoices')
            .insert(invoices)

          if (invoiceError) {
            console.error(`[RECURRING] Error creating invoices for template ${template.id}:`, invoiceError)
            errors.push(`Template ${template.name}: ${invoiceError.message}`)
            continue
          }

          totalInvoicesCreated += invoices.length
          console.log(`[RECURRING] Created ${invoices.length} invoices for template: ${template.name}`)

          // Update template's next_due_date to the next occurrence
          const nextDueDate = calculateNextDueDate(template)
          
          const { error: updateError } = await supabase
            .from('recurring_payment_templates')
            .update({ next_due_date: nextDueDate })
            .eq('id', template.id)

          if (updateError) {
            console.error(`[RECURRING] Error updating next_due_date for template ${template.id}:`, updateError)
            errors.push(`Template ${template.name} update: ${updateError.message}`)
            continue
          }

          console.log(`[RECURRING] Updated template ${template.name} next_due_date to: ${nextDueDate}`)
          templatesProcessed++

        } catch (templateError) {
          console.error(`[RECURRING] Unexpected error processing template ${template.id}:`, templateError)
          errors.push(`Template ${template.name}: ${(templateError as Error).message}`)
        }
      }
    }

    const result = {
      success: true,
      date: today,
      templatesFound: templates?.length || 0,
      templatesProcessed,
      totalInvoicesCreated,
      errors: errors.length > 0 ? errors : undefined
    }

    console.log(`[RECURRING] Completed processing:`, result)

    return NextResponse.json(result)

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
export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all active templates (both due and upcoming)
    const { data: allTemplates, error: allError } = await supabase
      .from('recurring_payment_templates')
      .select('*')
      .eq('is_active', true)
      .order('next_due_date', { ascending: true })

    if (allError) throw allError

    // Get templates due today
    const { data: dueTemplates, error: dueError } = await supabase
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