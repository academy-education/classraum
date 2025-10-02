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
  triggerWelcomeNotifications
} from '@/lib/notification-triggers'

interface NotificationTriggerRequest {
  trigger: string
  data: Record<string, any>
}

export async function POST(req: NextRequest) {
  try {
    const body: NotificationTriggerRequest = await req.json()
    const { trigger, data } = body

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger type is required' }, { status: 400 })
    }

    let result = null

    switch (trigger) {
      case 'assignment_created':
        if (!data.assignmentId) {
          return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 })
        }
        await triggerAssignmentCreatedNotifications(data.assignmentId)
        result = { message: 'Assignment creation notifications sent' }
        break

      case 'attendance_changed':
        if (!data.attendanceId || !data.oldStatus || !data.newStatus) {
          return NextResponse.json(
            { error: 'attendanceId, oldStatus, and newStatus are required' },
            { status: 400 }
          )
        }
        await triggerAttendanceChangedNotifications(data.attendanceId, data.oldStatus, data.newStatus)
        result = { message: 'Attendance change notifications sent' }
        break

      case 'invoice_created':
        if (!data.invoiceId) {
          return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 })
        }
        await triggerInvoiceCreatedNotifications(data.invoiceId)
        result = { message: 'Invoice creation notifications sent' }
        break

      case 'invoice_payment':
        if (!data.invoiceId) {
          return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 })
        }
        await triggerInvoicePaymentNotifications(data.invoiceId)
        result = { message: 'Invoice payment notifications sent' }
        break

      case 'report_completed':
        if (!data.reportId) {
          return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
        }
        await triggerStudentReportCompletedNotifications(data.reportId)
        result = { message: 'Report completion notifications sent' }
        break

      case 'user_deactivated':
        if (!data.userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await triggerUserDeactivatedNotifications(data.userId)
        result = { message: 'User deactivation notifications sent' }
        break

      case 'classroom_created':
        if (!data.classroomId) {
          return NextResponse.json({ error: 'classroomId is required' }, { status: 400 })
        }
        await triggerClassroomCreatedNotifications(data.classroomId)
        result = { message: 'Classroom creation notifications sent' }
        break

      case 'session_created':
        if (!data.sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
        }
        await triggerSessionCreatedNotifications(data.sessionId)
        result = { message: 'Session creation notifications sent' }
        break

      case 'welcome':
        if (!data.userId) {
          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
        await triggerWelcomeNotifications(data.userId)
        result = { message: 'Welcome notifications sent' }
        break

      default:
        return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      trigger,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[API] Error triggering notifications:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger notifications',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/health check
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Notification triggers API is running',
    availableTriggers: [
      'assignment_created',
      'attendance_changed',
      'invoice_created',
      'invoice_payment',
      'report_completed',
      'user_deactivated',
      'classroom_created',
      'session_created',
      'welcome'
    ],
    timestamp: new Date().toISOString()
  })
}