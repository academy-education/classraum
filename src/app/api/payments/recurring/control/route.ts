import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, templateId, studentId } = body

    if (!action || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, templateId' },
        { status: 400 }
      )
    }

    if (!['pause', 'resume', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: pause, resume, or deactivate' },
        { status: 400 }
      )
    }

    // Handle template-level actions (affect entire template)
    if (!studentId) {
      let updateData: any = {}
      
      switch (action) {
        case 'pause':
          // For template-level pause, deactivate the entire template
          updateData = { 
            is_active: false,
            updated_at: new Date().toISOString()
          }
          break
          
        case 'resume':
          // For template-level resume, reactivate the template
          updateData = { 
            is_active: true,
            updated_at: new Date().toISOString()
          }
          break

        case 'deactivate':
          updateData = { 
            is_active: false,
            updated_at: new Date().toISOString()
          }
          
          // Also delete all student assignments for this template
          const { error: deleteStudentsError } = await supabase
            .from('recurring_payment_template_students')
            .delete()
            .eq('template_id', templateId)

          if (deleteStudentsError) throw deleteStudentsError
          break
      }

      const { error: templateError } = await supabase
        .from('recurring_payment_templates')
        .update(updateData)
        .eq('id', templateId)

      if (templateError) throw templateError

      return NextResponse.json({
        success: true,
        action,
        templateId,
        message: `Template ${action}d successfully`
      })
    }

    // Handle student-level actions (affect individual student)
    else {
      // For student-level control, we remove the student from the template entirely
      switch (action) {
        case 'pause':
        case 'resume':
          return NextResponse.json({
            error: 'Student-level pause/resume not supported. Use template-level controls instead.'
          }, { status: 400 })
          
        case 'deactivate':
          // Remove student from template
          const { error: studentError } = await supabase
            .from('recurring_payment_template_students')
            .delete()
            .eq('template_id', templateId)
            .eq('student_id', studentId)

          if (studentError) throw studentError

          return NextResponse.json({
            success: true,
            action,
            templateId,
            studentId,
            message: `Student removed from template successfully`
          })
      }
    }

  } catch (error) {
    console.error('Error in recurring payment control:', error)
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

// GET endpoint to check status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId parameter required' },
        { status: 400 }
      )
    }

    // Get template info
    const { data: template, error: templateError } = await supabase
      .from('recurring_payment_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError) throw templateError

    // Get students status
    const { data: students, error: studentsError } = await supabase
      .from('recurring_payment_template_students')
      .select(`
        student_id,
        amount_override,
        students!inner(
          users!inner(
            name,
            email
          )
        )
      `)
      .eq('template_id', templateId)

    if (studentsError) throw studentsError

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        is_active: template.is_active,
        next_due_date: template.next_due_date
      },
      students: students?.map((s: any) => ({
        student_id: s.student_id,
        name: s.students?.users?.name,
        email: s.students?.users?.email,
        amount_override: s.amount_override
      })) || []
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status', message: (error as Error).message },
      { status: 500 }
    )
  }
}