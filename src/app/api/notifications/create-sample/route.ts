import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  createPaymentNotification,
  createSessionNotification,
  createAttendanceNotification,
  createAssignmentNotification,
  createStudentNotification,
  createSystemNotification
} from '@/lib/notifications'

/**
 * API route to create sample notifications for testing the multilingual notification system
 * This demonstrates how to integrate notification creation throughout the application
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, type } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let result
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    switch (type) {
      case 'payment_success':
        result = await createPaymentNotification(
          userId,
          'success',
          { student: '김철수', amount: '50,000' },
          { page: 'payments', filters: { studentId: 'student-123' } }
        )
        break

      case 'payment_failed':
        result = await createPaymentNotification(
          userId,
          'failed',
          { student: '이영희' },
          { page: 'payments', filters: { studentId: 'student-456' } }
        )
        break

      case 'payment_reminder':
        result = await createPaymentNotification(
          userId,
          'reminder',
          { 
            student: '박민수', 
            amount: '75,000',
            dueDate: tomorrow.toLocaleDateString('ko-KR')
          },
          { page: 'payments' }
        )
        break

      case 'session_reminder':
        result = await createSessionNotification(
          userId,
          'reminder',
          { 
            classroom: '수학 고급반',
            time: '오후 3:00'
          },
          { page: 'sessions', filters: { classroomId: 'classroom-123' } }
        )
        break

      case 'session_cancelled':
        result = await createSessionNotification(
          userId,
          'cancelled',
          { 
            classroom: '영어 기초반',
            date: tomorrow.toLocaleDateString('ko-KR'),
            time: '오후 2:00'
          },
          { page: 'sessions' }
        )
        break

      case 'attendance_absent':
        result = await createAttendanceNotification(
          userId,
          'absent',
          { 
            student: '정다은',
            classroom: '과학 실험반',
            date: now.toLocaleDateString('ko-KR')
          },
          { page: 'attendance', filters: { studentId: 'student-789' } }
        )
        break

      case 'attendance_late':
        result = await createAttendanceNotification(
          userId,
          'late',
          { 
            student: '최우진',
            classroom: '미술 창작반',
            date: now.toLocaleDateString('ko-KR')
          },
          { page: 'attendance' }
        )
        break

      case 'assignment_new':
        result = await createAssignmentNotification(
          userId,
          'new',
          { 
            title: '미분과 적분 연습문제',
            classroom: '수학 고급반',
            dueDate: tomorrow.toLocaleDateString('ko-KR')
          },
          { page: 'assignments', filters: { classroomId: 'classroom-123' } }
        )
        break

      case 'assignment_submitted':
        result = await createAssignmentNotification(
          userId,
          'submitted',
          { 
            student: '한소영',
            title: '영어 에세이 과제'
          },
          { page: 'assignments', filters: { studentId: 'student-999' } }
        )
        break

      case 'assignment_graded':
        result = await createAssignmentNotification(
          userId,
          'graded',
          { 
            title: '화학 실험 보고서',
            score: '95점'
          },
          { page: 'assignments' }
        )
        break

      case 'student_enrolled':
        result = await createStudentNotification(
          userId,
          'enrolled',
          { 
            student: '신지혜',
            classroom: '물리 심화반'
          },
          { page: 'students', filters: { studentId: 'student-1001' } }
        )
        break

      case 'system_welcome':
        result = await createSystemNotification(
          userId,
          'welcome',
          {},
          { page: 'dashboard' }
        )
        break

      case 'system_maintenance':
        result = await createSystemNotification(
          userId,
          'maintenance',
          { 
            date: tomorrow.toLocaleDateString('ko-KR'),
            startTime: '오전 2:00',
            endTime: '오전 4:00'
          },
          { page: 'dashboard' }
        )
        break

      case 'all_samples':
        // Create multiple sample notifications
        const sampleTypes = [
          'payment_success', 'session_reminder', 'attendance_absent', 
          'assignment_new', 'student_enrolled', 'system_welcome'
        ]
        
        const results = []
        for (const sampleType of sampleTypes) {
          const sampleResult = await POST(new NextRequest(request.url, {
            method: 'POST',
            body: JSON.stringify({ userId, type: sampleType })
          }))
          results.push(await sampleResult.json())
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'All sample notifications created',
          results 
        })

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Sample notification created successfully',
        data: result.data 
      })
    } else {
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating sample notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET endpoint to list available sample notification types
 */
export async function GET() {
  const sampleTypes = [
    { type: 'payment_success', description: 'Payment successful notification' },
    { type: 'payment_failed', description: 'Payment failed notification' },
    { type: 'payment_reminder', description: 'Payment reminder notification' },
    { type: 'session_reminder', description: 'Session reminder notification' },
    { type: 'session_cancelled', description: 'Session cancelled notification' },
    { type: 'attendance_absent', description: 'Student absent notification' },
    { type: 'attendance_late', description: 'Student late notification' },
    { type: 'assignment_new', description: 'New assignment notification' },
    { type: 'assignment_submitted', description: 'Assignment submitted notification' },
    { type: 'assignment_graded', description: 'Assignment graded notification' },
    { type: 'student_enrolled', description: 'Student enrolled notification' },
    { type: 'system_welcome', description: 'Welcome notification' },
    { type: 'system_maintenance', description: 'Maintenance notification' },
    { type: 'all_samples', description: 'Create all sample types' }
  ]

  return NextResponse.json({ sampleTypes })
}