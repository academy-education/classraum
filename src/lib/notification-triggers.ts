import { supabase } from '@/lib/supabase'
import { createBulkNotifications, createNotification } from '@/lib/notifications'

/**
 * Helper function to get all family members for a student
 */
export async function getStudentFamilyMembers(studentId: string): Promise<string[]> {
  try {
    // First get the family ID(s) for this student
    const { data: studentFamily } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', studentId)

    if (!studentFamily || studentFamily.length === 0) {
      return [studentId] // Return just the student if no family found
    }

    const familyIds = studentFamily.map(sf => sf.family_id)

    // Get all family members for these families
    const { data: allFamilyMembers } = await supabase
      .from('family_members')
      .select('user_id')
      .in('family_id', familyIds)

    return allFamilyMembers?.map(fm => fm.user_id) || [studentId]
  } catch (error) {
    console.error('Error getting student family members:', error)
    return [studentId] // Fallback to just the student
  }
}

/**
 * Helper function to get all managers for an academy
 */
export async function getAcademyManagers(academyId: string): Promise<string[]> {
  try {
    const { data: managers } = await supabase
      .from('managers')
      .select('user_id')
      .eq('academy_id', academyId)
      .eq('active', true)

    return managers?.map(m => m.user_id) || []
  } catch (error) {
    console.error('Error getting academy managers:', error)
    return []
  }
}

/**
 * Helper function to get academy teachers
 */
export async function getAcademyTeachers(academyId: string): Promise<string[]> {
  try {
    const { data: teachers } = await supabase
      .from('teachers')
      .select('user_id')
      .eq('academy_id', academyId)
      .eq('active', true)

    return teachers?.map(t => t.user_id) || []
  } catch (error) {
    console.error('Error getting academy teachers:', error)
    return []
  }
}

/**
 * Assignment creation notification trigger
 */
export async function triggerAssignmentCreatedNotifications(assignmentId: string) {
  try {
    // Get assignment details with classroom and session info
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        classroom_sessions!inner(
          id,
          classroom_id,
          classrooms!inner(
            id,
            name,
            academy_id,
            classroom_students(student_id)
          )
        )
      `)
      .eq('id', assignmentId)
      .single()

    if (!assignment) {
      console.error('Assignment not found for notification:', assignmentId)
      return
    }

    const classroom = assignment.classroom_sessions.classrooms
    const studentIds = classroom.classroom_students.map((cs: { student_id: string }) => cs.student_id)

    // Get all family members for enrolled students
    const allRecipients = new Set<string>()

    for (const studentId of studentIds) {
      const familyMembers = await getStudentFamilyMembers(studentId)
      familyMembers.forEach(memberId => allRecipients.add(memberId))
    }

    if (allRecipients.size === 0) {
      console.log('No recipients found for assignment notification')
      return
    }

    // Create notifications
    await createBulkNotifications(Array.from(allRecipients), {
      titleKey: 'notifications.content.assignment.new.title',
      messageKey: 'notifications.content.assignment.new.message',
      titleParams: {
        title: assignment.title,
        classroom: classroom.name
      },
      messageParams: {
        title: assignment.title,
        classroom: classroom.name,
        dueDate: assignment.due_date || 'No due date'
      },
      type: 'assignment',
      navigationData: {
        page: 'assignments',
        filters: { classroomId: classroom.id }
      },
      fallbackTitle: 'New Assignment',
      fallbackMessage: `New assignment: ${assignment.title} in ${classroom.name}`
    })

    console.log(`Assignment notifications sent to ${allRecipients.size} recipients`)
  } catch (error) {
    console.error('Error triggering assignment created notifications:', error)
  }
}

/**
 * Attendance change notification trigger
 */
export async function triggerAttendanceChangedNotifications(attendanceId: string, oldStatus: string, newStatus: string) {
  try {
    // Skip if changing from one non-pending status to another
    if (oldStatus !== 'pending') {
      return
    }

    // Get attendance details
    const { data: attendance } = await supabase
      .from('attendance')
      .select(`
        id,
        status,
        student_id,
        classroom_sessions!inner(
          id,
          date,
          classrooms!inner(
            name,
            academy_id
          )
        )
      `)
      .eq('id', attendanceId)
      .single()

    if (!attendance) {
      console.error('Attendance record not found for notification:', attendanceId)
      return
    }

    // Get student and family members
    const familyMembers = await getStudentFamilyMembers(attendance.student_id)

    if (familyMembers.length === 0) {
      console.log('No family members found for attendance notification')
      return
    }

    // Get student name
    const { data: student } = await supabase
      .from('users')
      .select('name')
      .eq('id', attendance.student_id)
      .single()

    // Create notifications
    await createBulkNotifications(familyMembers, {
      titleKey: 'notifications.content.attendance.changed.title',
      messageKey: 'notifications.content.attendance.changed.message',
      titleParams: {
        student: student?.name || 'Student',
        status: newStatus
      },
      messageParams: {
        student: student?.name || 'Student',
        classroom: attendance.classroom_sessions.classrooms.name,
        status: newStatus,
        date: attendance.classroom_sessions.date
      },
      type: 'attendance',
      navigationData: {
        page: 'attendance',
        filters: { studentId: attendance.student_id }
      },
      fallbackTitle: 'Attendance Updated',
      fallbackMessage: `Attendance marked as ${newStatus} for ${student?.name || 'student'}`
    })

    console.log(`Attendance notifications sent to ${familyMembers.length} family members`)
  } catch (error) {
    console.error('Error triggering attendance changed notifications:', error)
  }
}

/**
 * Invoice creation notification trigger
 */
export async function triggerInvoiceCreatedNotifications(invoiceId: string) {
  try {
    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        final_amount,
        due_date,
        student_id,
        students!inner(
          user_id,
          academy_id,
          users!inner(name)
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      console.error('Invoice not found for notification:', invoiceId)
      return
    }

    // Get student and family members
    const familyMembers = await getStudentFamilyMembers(invoice.student_id)

    if (familyMembers.length === 0) {
      console.log('No family members found for invoice notification')
      return
    }

    // Create notifications
    await createBulkNotifications(familyMembers, {
      titleKey: 'notifications.content.payment.new_invoice.title',
      messageKey: 'notifications.content.payment.new_invoice.message',
      titleParams: {
        student: invoice.students.users.name,
        amount: `${invoice.final_amount.toLocaleString()} won`
      },
      messageParams: {
        student: invoice.students.users.name,
        amount: `${invoice.final_amount.toLocaleString()} won`,
        dueDate: invoice.due_date
      },
      type: 'billing',
      navigationData: {
        page: 'payments',
        filters: { studentId: invoice.student_id }
      },
      fallbackTitle: 'New Invoice',
      fallbackMessage: `New invoice for ${invoice.students.users.name}: ${invoice.final_amount.toLocaleString()} won`
    })

    console.log(`Invoice notifications sent to ${familyMembers.length} family members`)
  } catch (error) {
    console.error('Error triggering invoice created notifications:', error)
  }
}

/**
 * Invoice payment notification trigger (for managers)
 */
export async function triggerInvoicePaymentNotifications(invoiceId: string) {
  try {
    // Get invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        final_amount,
        paid_at,
        student_id,
        students!inner(
          user_id,
          academy_id,
          users!inner(name)
        )
      `)
      .eq('id', invoiceId)
      .eq('status', 'paid')
      .single()

    if (!invoice) {
      console.error('Paid invoice not found for notification:', invoiceId)
      return
    }

    // Get academy managers
    const managers = await getAcademyManagers(invoice.students.academy_id)

    if (managers.length === 0) {
      console.log('No managers found for invoice payment notification')
      return
    }

    // Create notifications
    await createBulkNotifications(managers, {
      titleKey: 'notifications.content.payment.paid.title',
      messageKey: 'notifications.content.payment.paid.message',
      titleParams: {
        student: invoice.students.users.name,
        amount: `${invoice.final_amount.toLocaleString()} won`
      },
      messageParams: {
        student: invoice.students.users.name,
        amount: `${invoice.final_amount.toLocaleString()} won`,
        paidAt: invoice.paid_at || new Date().toISOString()
      },
      type: 'billing',
      navigationData: {
        page: 'payments'
      },
      fallbackTitle: 'Payment Received',
      fallbackMessage: `Payment received from ${invoice.students.users.name}: ${invoice.final_amount.toLocaleString()} won`
    })

    console.log(`Invoice payment notifications sent to ${managers.length} managers`)
  } catch (error) {
    console.error('Error triggering invoice payment notifications:', error)
  }
}

/**
 * Student report completion notification trigger
 */
export async function triggerStudentReportCompletedNotifications(reportId: string) {
  try {
    // Get report details
    const { data: report } = await supabase
      .from('student_reports')
      .select(`
        id,
        report_name,
        student_id,
        students!inner(
          user_id,
          academy_id,
          users!inner(name)
        )
      `)
      .eq('id', reportId)
      .eq('status', 'Finished')
      .single()

    if (!report) {
      console.error('Finished report not found for notification:', reportId)
      return
    }

    // Get student and family members
    const familyMembers = await getStudentFamilyMembers(report.student_id)

    if (familyMembers.length === 0) {
      console.log('No family members found for report completion notification')
      return
    }

    // Create notifications
    await createBulkNotifications(familyMembers, {
      titleKey: 'notifications.content.report.completed.title',
      messageKey: 'notifications.content.report.completed.message',
      titleParams: {
        student: report.students.users.name,
        reportName: report.report_name || 'Student Report'
      },
      messageParams: {
        student: report.students.users.name,
        reportName: report.report_name || 'Student Report'
      },
      type: 'report',
      navigationData: {
        page: 'reports',
        filters: { studentId: report.student_id }
      },
      fallbackTitle: 'Report Completed',
      fallbackMessage: `Report completed for ${report.students.users.name}: ${report.report_name || 'Student Report'}`
    })

    console.log(`Report completion notifications sent to ${familyMembers.length} family members`)
  } catch (error) {
    console.error('Error triggering report completion notifications:', error)
  }
}

/**
 * User deactivation notification trigger
 */
export async function triggerUserDeactivatedNotifications(userId: string) {
  try {
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single()

    if (!user) {
      console.error('User not found for deactivation notification:', userId)
      return
    }

    // Create notification for the user
    await createNotification({
      userId: userId,
      titleKey: 'notifications.content.account.deactivated.title',
      messageKey: 'notifications.content.account.deactivated.message',
      titleParams: { name: user.name },
      messageParams: { name: user.name, email: user.email },
      type: 'alert',
      fallbackTitle: 'Account Deactivated',
      fallbackMessage: `Your account has been deactivated. Please contact support if you have questions.`
    })

    console.log(`Deactivation notification sent to user: ${user.name}`)
  } catch (error) {
    console.error('Error triggering user deactivation notifications:', error)
  }
}

/**
 * Classroom creation notification trigger
 */
export async function triggerClassroomCreatedNotifications(classroomId: string) {
  try {
    // Get classroom details
    const { data: classroom } = await supabase
      .from('classrooms')
      .select(`
        id,
        name,
        grade,
        subject,
        teacher_id,
        academy_id,
        users!teacher_id(name)
      `)
      .eq('id', classroomId)
      .single()

    if (!classroom) {
      console.error('Classroom not found for notification:', classroomId)
      return
    }

    // Get managers and teacher
    const managers = await getAcademyManagers(classroom.academy_id)
    // Use Set to deduplicate recipients (teacher might also be a manager)
    const allRecipients = [...new Set([...managers, classroom.teacher_id])]

    if (allRecipients.length === 0) {
      console.log('No recipients found for classroom creation notification')
      return
    }

    // Create notifications
    await createBulkNotifications(allRecipients, {
      titleKey: 'notifications.content.classroom.created.title',
      messageKey: 'notifications.content.classroom.created.message',
      titleParams: {
        name: classroom.name,
        teacher: classroom.users?.name || 'Unknown Teacher'
      },
      messageParams: {
        name: classroom.name,
        grade: classroom.grade || '__NO_GRADE__',
        subject: classroom.subject || '__NO_SUBJECT__',
        teacher: classroom.users?.name || 'Unknown Teacher'
      },
      type: 'alert',
      navigationData: {
        page: 'classrooms',
        filters: { classroomId: classroom.id }
      },
      fallbackTitle: 'New Classroom Created',
      fallbackMessage: `New classroom created: ${classroom.name}`
    })

    console.log(`Classroom creation notifications sent to ${allRecipients.length} recipients`)
  } catch (error) {
    console.error('Error triggering classroom creation notifications:', error)
  }
}

/**
 * Session creation notification trigger
 */
export async function triggerSessionCreatedNotifications(sessionId: string) {
  try {
    // Get session details
    const { data: session } = await supabase
      .from('classroom_sessions')
      .select(`
        id,
        date,
        start_time,
        end_time,
        location,
        substitute_teacher,
        classrooms!inner(
          id,
          name,
          teacher_id,
          academy_id,
          users!teacher_id(name)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (!session) {
      console.error('Session not found for notification:', sessionId)
      return
    }

    // Get managers, teacher, and substitute teacher
    const managers = await getAcademyManagers(session.classrooms.academy_id)
    const recipientList = [
      ...managers,
      session.classrooms.teacher_id,
      ...(session.substitute_teacher ? [session.substitute_teacher] : [])
    ]
    // Use Set to deduplicate recipients (teacher/substitute might also be a manager)
    const recipients = [...new Set(recipientList)]

    if (recipients.length === 0) {
      console.log('No recipients found for session creation notification')
      return
    }

    // Get substitute teacher name if exists
    let substituteTeacherName = ''
    if (session.substitute_teacher) {
      const { data: subTeacher } = await supabase
        .from('users')
        .select('name')
        .eq('id', session.substitute_teacher)
        .single()
      substituteTeacherName = subTeacher?.name || 'Unknown Teacher'
    }

    // Create notifications
    await createBulkNotifications(recipients, {
      titleKey: 'notifications.content.session.created.title',
      messageKey: 'notifications.content.session.created.message',
      titleParams: {
        classroom: session.classrooms.name,
        date: session.date,
        time: session.start_time
      },
      messageParams: {
        classroom: session.classrooms.name,
        date: session.date,
        time: `${session.start_time} - ${session.end_time}`,
        location: session.location || '__NO_LOCATION__',
        teacher: session.classrooms.users?.name || 'Unknown Teacher',
        substituteTeacher: substituteTeacherName
      },
      type: 'session',
      navigationData: {
        page: 'sessions',
        filters: { sessionId: session.id }
      },
      fallbackTitle: 'New Session Created',
      fallbackMessage: `New session created for ${session.classrooms.name} on ${session.date} at ${session.start_time}`
    })

    console.log(`Session creation notifications sent to ${recipients.length} recipients`)
  } catch (error) {
    console.error('Error triggering session creation notifications:', error)
  }
}

/**
 * Welcome notification trigger for new users
 */
export async function triggerWelcomeNotifications(userId: string) {
  try {
    // Get user details
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', userId)
      .single()

    if (!user) {
      console.error('User not found for welcome notification:', userId)
      return
    }

    // Create welcome notification
    await createNotification({
      userId: userId,
      titleKey: 'notifications.content.system.welcome.title',
      messageKey: 'notifications.content.system.welcome.message',
      titleParams: { name: user.name },
      messageParams: {
        name: user.name,
        role: user.role,
        email: user.email
      },
      type: 'system',
      fallbackTitle: 'Welcome to Classraum',
      fallbackMessage: `Welcome to Classraum, ${user.name}! We're excited to have you on board.`
    })

    console.log(`Welcome notification sent to user: ${user.name}`)
  } catch (error) {
    console.error('Error triggering welcome notifications:', error)
  }
}

/**
 * Session auto-completion notification trigger (for scheduled job)
 */
export async function triggerSessionAutoCompletionNotifications() {
  try {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format

    // Find sessions that should be auto-completed
    const { data: expiredSessions } = await supabase
      .from('classroom_sessions')
      .select(`
        id,
        date,
        start_time,
        end_time,
        classrooms!inner(
          id,
          name,
          teacher_id,
          academy_id,
          users!teacher_id(name)
        )
      `)
      .eq('status', 'scheduled')
      .or(`date.lt.${currentDate},and(date.eq.${currentDate},end_time.lt.${currentTime})`)

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('No expired sessions found for auto-completion')
      return
    }

    // Update sessions to completed
    const sessionIds = expiredSessions.map(s => s.id)
    await supabase
      .from('classroom_sessions')
      .update({ status: 'completed' })
      .in('id', sessionIds)

    // Group sessions by academy for notifications
    const academyGroups = new Map<string, typeof expiredSessions>()

    expiredSessions.forEach(session => {
      const academyId = session.classrooms.academy_id
      if (!academyGroups.has(academyId)) {
        academyGroups.set(academyId, [])
      }
      academyGroups.get(academyId)!.push(session)
    })

    // Send notifications for each academy
    for (const [academyId, sessions] of academyGroups) {
      const managers = await getAcademyManagers(academyId)
      const teachers = [...new Set(sessions.map(s => s.classrooms.teacher_id))]
      const allRecipients = [...managers, ...teachers]

      if (allRecipients.length === 0) continue

      const sessionCount = sessions.length
      const sessionNames = sessions.map(s => s.classrooms.name).join(', ')

      await createBulkNotifications(allRecipients, {
        titleKey: 'notifications.content.session.auto_completed.title',
        messageKey: 'notifications.content.session.auto_completed.message',
        titleParams: {
          count: sessionCount.toString(),
          sessions: sessionNames
        },
        messageParams: {
          count: sessionCount.toString(),
          sessions: sessionNames,
          date: currentDate
        },
        type: 'session',
        navigationData: {
          page: 'sessions'
        },
        fallbackTitle: 'Sessions Auto-Completed',
        fallbackMessage: `${sessionCount} session(s) have been automatically marked as completed: ${sessionNames}`
      })
    }

    console.log(`Auto-completion notifications sent for ${expiredSessions.length} sessions`)
    return { completedSessions: expiredSessions.length }
  } catch (error) {
    console.error('Error triggering session auto-completion notifications:', error)
    throw error
  }
}