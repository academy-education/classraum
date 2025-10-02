import { NextRequest, NextResponse } from 'next/server'
import {
  triggerAssignmentCreatedNotifications,
  triggerAttendanceChangedNotifications,
  triggerInvoiceCreatedNotifications,
  triggerInvoicePaymentNotifications,
  triggerStudentReportCompletedNotifications,
  triggerUserDeactivatedNotifications,
  triggerClassroomCreatedNotifications,
  triggerSessionCreatedNotifications,
  triggerWelcomeNotifications,
  triggerSessionAutoCompletionNotifications
} from '@/lib/notification-triggers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { trigger, testData } = body

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger type is required' }, { status: 400 })
    }

    console.log(`Testing notification trigger: ${trigger}`)

    let result

    switch (trigger) {
      case 'assignment_created':
        // For testing, you'll need to provide a real assignment ID
        result = await triggerAssignmentCreatedNotifications(testData.assignmentId)
        break

      case 'attendance_changed':
        result = await triggerAttendanceChangedNotifications(
          testData.attendanceId,
          testData.oldStatus,
          testData.newStatus
        )
        break

      case 'invoice_created':
        result = await triggerInvoiceCreatedNotifications(testData.invoiceId)
        break

      case 'invoice_payment':
        result = await triggerInvoicePaymentNotifications(testData.invoiceId)
        break

      case 'report_completed':
        result = await triggerStudentReportCompletedNotifications(testData.reportId)
        break

      case 'user_deactivated':
        result = await triggerUserDeactivatedNotifications(testData.userId)
        break

      case 'classroom_created':
        result = await triggerClassroomCreatedNotifications(testData.classroomId)
        break

      case 'session_created':
        result = await triggerSessionCreatedNotifications(testData.sessionId)
        break

      case 'welcome':
        result = await triggerWelcomeNotifications(testData.userId)
        break

      case 'session_auto_completion':
        result = await triggerSessionAutoCompletionNotifications()
        break

      default:
        return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      trigger,
      result,
      message: `Successfully tested ${trigger} trigger`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[TEST] Error testing notification trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test notification trigger',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Notification Testing API',
    description: 'Use POST with trigger type and testData to test notification triggers',
    example: {
      trigger: 'welcome',
      testData: { userId: 'user-uuid' }
    },
    availableTriggers: [
      { name: 'assignment_created', requires: ['assignmentId'] },
      { name: 'attendance_changed', requires: ['attendanceId', 'oldStatus', 'newStatus'] },
      { name: 'invoice_created', requires: ['invoiceId'] },
      { name: 'invoice_payment', requires: ['invoiceId'] },
      { name: 'report_completed', requires: ['reportId'] },
      { name: 'user_deactivated', requires: ['userId'] },
      { name: 'classroom_created', requires: ['classroomId'] },
      { name: 'session_created', requires: ['sessionId'] },
      { name: 'welcome', requires: ['userId'] },
      { name: 'session_auto_completion', requires: [] }
    ],
    timestamp: new Date().toISOString()
  })
}