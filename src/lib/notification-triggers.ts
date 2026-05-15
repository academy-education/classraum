import { supabase } from '@/lib/supabase'
import { createBulkNotifications, createNotification, sendPushNotification } from '@/lib/notifications'

/**
 * Unwrap a supabase joined-relation field that's typed as an array but
 * carries a single object at runtime. Foreign-key joins where the parent
 * has exactly one related row come back as `{...}` but the generated TS
 * type is `{...}[]`. Returns the first element of an array, or the value
 * itself if it's already a single object, or undefined if missing.
 */
function one<T>(value: T | T[] | null | undefined): T | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

/**
 * Dynamically import admin client for server-side operations (cron jobs, API routes)
 * Uses dynamic import so client-side code that imports this module isn't broken
 */
async function getAdminClient() {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  return supabaseAdmin
}

/**
 * Create notifications directly in the database (server-side only)
 * Bypasses the relative URL fetch('/api/...') that fails in server context
 */
async function createServerNotifications(
  userIds: string[],
  options: {
    titleKey: string
    messageKey: string
    titleParams?: Record<string, string | number | undefined>
    messageParams?: Record<string, string | number | undefined>
    type: string
    navigationData?: { page?: string; filters?: Record<string, string> }
    fallbackTitle?: string
    fallbackMessage?: string
  }
) {
  const adminClient = await getAdminClient()

  const notifications = userIds.map(userId => ({
    user_id: userId,
    title_key: options.titleKey,
    message_key: options.messageKey,
    title_params: options.titleParams || {},
    message_params: options.messageParams || {},
    title: options.fallbackTitle || '',
    message: options.fallbackMessage || '',
    type: options.type,
    navigation_data: options.navigationData,
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  const { error } = await adminClient
    .from('notifications')
    .insert(notifications)

  if (error) {
    console.error('Error creating server notifications:', error)
    throw error
  }

  // Also send push notifications
  const pushData: Record<string, string> = { type: options.type }
  if (options.navigationData?.page) pushData.page = options.navigationData.page
  if (options.navigationData?.filters) {
    Object.entries(options.navigationData.filters).forEach(([k, v]) => {
      if (v) pushData[k] = v
    })
  }

  sendPushNotification(
    userIds,
    options.fallbackTitle || 'Classraum',
    options.fallbackMessage || 'You have a new notification',
    pushData
  ).catch(err => console.error('Push notification error:', err))
}

/**
 * Get the right Supabase client for the current execution context.
 *
 * Critical: when these helpers are called from server-side cron / webhook
 * handlers, RLS on `family_members` and `users` blocks the anon-key
 * client from reading any rows — so fan-out to parents silently returned
 * empty and only the student themselves got pushed. Using the admin
 * client (service role) bypasses RLS for those server contexts.
 *
 * In browser context (UI handlers), the anon client is correct — it
 * respects the logged-in user's session and RLS.
 */
async function getReadClient() {
  if (typeof window === 'undefined') {
    return await getAdminClient()
  }
  return supabase
}

/**
 * Helper function to get all family members for a student (includes siblings)
 */
export async function getStudentFamilyMembers(studentId: string): Promise<string[]> {
  try {
    const db = await getReadClient()

    // First get the family ID(s) for this student
    const { data: studentFamily } = await db
      .from('family_members')
      .select('family_id')
      .eq('user_id', studentId)

    if (!studentFamily || studentFamily.length === 0) {
      return [studentId] // Return just the student if no family found
    }

    const familyIds = studentFamily.map(sf => sf.family_id)

    // Get all family members for these families
    const { data: allFamilyMembers } = await db
      .from('family_members')
      .select('user_id')
      .in('family_id', familyIds)

    // Dedupe: a user can belong to multiple families (split-household), which
    // would otherwise produce one notification row per family membership.
    const ids = allFamilyMembers?.map(fm => fm.user_id) ?? []
    const unique = Array.from(new Set(ids))
    return unique.length > 0 ? unique : [studentId]
  } catch (error) {
    console.error('Error getting student family members:', error)
    return [studentId] // Fallback to just the student
  }
}

/**
 * Helper function to get only parents (non-student family members) for a student
 */
export async function getStudentParents(studentId: string): Promise<string[]> {
  try {
    const db = await getReadClient()

    // First get the family ID(s) for this student
    const { data: studentFamily } = await db
      .from('family_members')
      .select('family_id')
      .eq('user_id', studentId)

    if (!studentFamily || studentFamily.length === 0) {
      return [] // No family found
    }

    const familyIds = studentFamily.map(sf => sf.family_id)

    // Get all family members for these families
    const { data: allFamilyMembers } = await db
      .from('family_members')
      .select('user_id')
      .in('family_id', familyIds)

    if (!allFamilyMembers || allFamilyMembers.length === 0) {
      return []
    }

    // Dedupe: a parent can be in the same family list twice if the student
    // is split across multiple family rows.
    const familyMemberIds = Array.from(new Set(allFamilyMembers.map(fm => fm.user_id)))

    // Filter to only include parents (users with role 'parent')
    const { data: parents } = await db
      .from('users')
      .select('id')
      .in('id', familyMemberIds)
      .eq('role', 'parent')

    return Array.from(new Set(parents?.map(p => p.id) ?? []))
  } catch (error) {
    console.error('Error getting student parents:', error)
    return []
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

    const session = one(assignment.classroom_sessions)
    const classroom = one(session?.classrooms)
    if (!classroom) {
      console.error('Classroom not found for assignment:', assignmentId)
      return
    }
    const studentIds = (classroom.classroom_students || []).map((cs: { student_id: string }) => cs.student_id)

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

    const session = one(attendance.classroom_sessions)
    const sessionClassroom = one(session?.classrooms)

    // Get student and their parents (not siblings)
    const parents = await getStudentParents(attendance.student_id)
    // Include the student themselves and their parents
    const recipients = [attendance.student_id, ...parents]

    if (recipients.length === 0) {
      console.log('No recipients found for attendance notification')
      return
    }

    // Get student name
    const { data: student } = await supabase
      .from('users')
      .select('name')
      .eq('id', attendance.student_id)
      .single()

    // Create notifications
    await createBulkNotifications(recipients, {
      titleKey: 'notifications.content.attendance.changed.title',
      messageKey: 'notifications.content.attendance.changed.message',
      titleParams: {
        student: student?.name || 'Student',
        status: newStatus
      },
      messageParams: {
        student: student?.name || 'Student',
        classroom: sessionClassroom?.name || '',
        status: newStatus,
        date: session?.date || ''
      },
      type: 'attendance',
      navigationData: {
        page: 'attendance',
        filters: { studentId: attendance.student_id }
      },
      fallbackTitle: 'Attendance Updated',
      fallbackMessage: `Attendance marked as ${newStatus} for ${student?.name || 'student'}`
    })

    console.log(`Attendance notifications sent to ${recipients.length} recipients (student + parents)`)
  } catch (error) {
    console.error('Error triggering attendance changed notifications:', error)
  }
}

/**
 * Self check-in notification trigger
 */
export async function triggerSelfCheckInNotifications(
  studentId: string,
  studentName: string,
  classroomNames: string[],
  statuses: ('present' | 'late')[]
) {
  try {
    // Get parents for this student
    const parents = await getStudentParents(studentId)
    // Include the student themselves and their parents
    const recipients = [studentId, ...parents]

    if (recipients.length === 0) {
      console.log('No recipients found for self check-in notification')
      return
    }

    // Determine overall status (late if any are late)
    const hasLate = statuses.includes('late')
    const overallStatus = hasLate ? 'late' : 'present'
    const classroomList = classroomNames.join(', ')

    // Create notifications
    await createBulkNotifications(recipients, {
      titleKey: 'notifications.content.attendance.selfCheckIn.title',
      messageKey: 'notifications.content.attendance.selfCheckIn.message',
      titleParams: {
        student: studentName,
        status: overallStatus
      },
      messageParams: {
        student: studentName,
        classrooms: classroomList,
        status: overallStatus
      },
      type: 'attendance',
      navigationData: {
        page: 'attendance',
        filters: { studentId: studentId }
      },
      fallbackTitle: `${studentName} checked in`,
      fallbackMessage: `${studentName} self checked in as ${overallStatus} for ${classroomList}`
    })

    console.log(`Self check-in notifications sent to ${recipients.length} recipients (student + parents)`)
  } catch (error) {
    console.error('Error triggering self check-in notifications:', error)
  }
}

/**
 * Invoice creation notification trigger
 */
export async function triggerInvoiceCreatedNotifications(invoiceId: string) {
  try {
    const isServer = typeof window === 'undefined'
    const db = isServer ? await getAdminClient() : supabase

    // Get invoice details (don't use students!inner - FK points to users not students)
    const { data: invoice } = await db
      .from('invoices')
      .select('id, amount, final_amount, due_date, student_id')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      console.error('Invoice not found for notification:', invoiceId)
      return
    }

    // Get student name from users table (invoices.student_id FK points to users.id)
    const { data: userData } = await db
      .from('users')
      .select('name')
      .eq('id', invoice.student_id)
      .single()

    const studentName = userData?.name || 'Student'

    // Get student and family members
    let familyMembers: string[]
    if (isServer) {
      // Query family members directly with admin client
      const { data: studentFamily } = await db
        .from('family_members')
        .select('family_id')
        .eq('user_id', invoice.student_id)

      if (studentFamily && studentFamily.length > 0) {
        const familyIds = studentFamily.map((sf: { family_id: string }) => sf.family_id)
        const { data: allFamilyMembers } = await db
          .from('family_members')
          .select('user_id')
          .in('family_id', familyIds)
        familyMembers = allFamilyMembers?.map((fm: { user_id: string }) => fm.user_id) || [invoice.student_id]
      } else {
        familyMembers = [invoice.student_id]
      }
    } else {
      familyMembers = await getStudentFamilyMembers(invoice.student_id)
    }

    if (familyMembers.length === 0) {
      console.log('No family members found for invoice notification')
      return
    }

    const notifOptions = {
      titleKey: 'notifications.content.payment.new_invoice.title',
      messageKey: 'notifications.content.payment.new_invoice.message',
      titleParams: {
        student: studentName,
        amount: `${invoice.final_amount.toLocaleString()} won`
      },
      messageParams: {
        student: studentName,
        amount: `${invoice.final_amount.toLocaleString()} won`,
        dueDate: invoice.due_date
      },
      type: 'billing' as const,
      navigationData: {
        page: 'payments',
        // invoiceId enables the mobile notification handler to deep-link
        // straight to /mobile/invoice/[id] instead of the invoices list.
        filters: { studentId: invoice.student_id, invoiceId: invoice.id }
      },
      fallbackTitle: 'New Invoice',
      fallbackMessage: `New invoice for ${studentName}: ${invoice.final_amount.toLocaleString()} won`
    }

    if (isServer) {
      await createServerNotifications(familyMembers, notifOptions)
    } else {
      await createBulkNotifications(familyMembers, notifOptions)
    }

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
    // Use admin client (this is called from webhook API route, server-side only)
    const db = await getAdminClient()

    // Get invoice details (don't use students!inner - FK points to users not students)
    const { data: invoice } = await db
      .from('invoices')
      .select('id, amount, final_amount, paid_at, student_id')
      .eq('id', invoiceId)
      .eq('status', 'paid')
      .single()

    if (!invoice) {
      console.error('Paid invoice not found for notification:', invoiceId)
      return
    }

    // Get student name from users table (invoices.student_id FK points to users.id)
    const { data: userData } = await db
      .from('users')
      .select('name')
      .eq('id', invoice.student_id)
      .single()

    const studentName = userData?.name || 'Student'

    // Get student's academy
    const { data: studentRecord } = await db
      .from('students')
      .select('academy_id')
      .eq('user_id', invoice.student_id)
      .limit(1)
      .single()

    if (!studentRecord) {
      console.error('Student record not found for invoice payment notification')
      return
    }

    // Get academy managers using admin client
    const { data: managersData } = await db
      .from('managers')
      .select('user_id')
      .eq('academy_id', studentRecord.academy_id)
      .eq('active', true)
    const managers = managersData?.map(m => m.user_id) || []

    if (managers.length === 0) {
      console.log('No managers found for invoice payment notification')
      return
    }

    await createServerNotifications(managers, {
      titleKey: 'notifications.content.payment.paid.title',
      messageKey: 'notifications.content.payment.paid.message',
      titleParams: {
        student: studentName,
        amount: `${invoice.final_amount.toLocaleString()} won`
      },
      messageParams: {
        student: studentName,
        amount: `${invoice.final_amount.toLocaleString()} won`,
        paidAt: invoice.paid_at || new Date().toISOString()
      },
      type: 'billing',
      navigationData: {
        page: 'payments',
        filters: { invoiceId: invoice.id, studentId: invoice.student_id },
      },
      fallbackTitle: 'Payment Received',
      fallbackMessage: `Payment received from ${studentName}: ${invoice.final_amount.toLocaleString()} won`
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

    const studentUser = one(one(report.students)?.users)
    const studentName = studentUser?.name || 'Student'

    // Create notifications
    await createBulkNotifications(familyMembers, {
      titleKey: 'notifications.content.report.completed.title',
      messageKey: 'notifications.content.report.completed.message',
      titleParams: {
        student: studentName,
        reportName: report.report_name || 'Student Report'
      },
      messageParams: {
        student: studentName,
        reportName: report.report_name || 'Student Report'
      },
      type: 'report',
      navigationData: {
        page: 'reports',
        // reportId enables the mobile notification handler to deep-link
        // straight to /mobile/report/[id] instead of the reports list.
        filters: { studentId: report.student_id, reportId: report.id },
      },
      fallbackTitle: 'Report Completed',
      fallbackMessage: `Report completed for ${studentName}: ${report.report_name || 'Student Report'}`
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

    const teacher = one(classroom.users)
    const teacherName = teacher?.name || 'Unknown Teacher'

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
        teacher: teacherName
      },
      messageParams: {
        name: classroom.name,
        grade: classroom.grade || '__NO_GRADE__',
        subject: classroom.subject || '__NO_SUBJECT__',
        teacher: teacherName
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

    const sessionClassroom = one(session.classrooms)
    if (!sessionClassroom) {
      console.error('Classroom missing on session for notification:', sessionId)
      return
    }
    const sessionTeacher = one(sessionClassroom.users)

    // Get managers, teacher, and substitute teacher
    const managers = await getAcademyManagers(sessionClassroom.academy_id)
    const recipientList = [
      ...managers,
      sessionClassroom.teacher_id,
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
        classroom: sessionClassroom.name,
        date: session.date,
        time: session.start_time
      },
      messageParams: {
        classroom: sessionClassroom.name,
        date: session.date,
        time: `${session.start_time} - ${session.end_time}`,
        location: session.location || '__NO_LOCATION__',
        teacher: sessionTeacher?.name || 'Unknown Teacher',
        substituteTeacher: substituteTeacherName
      },
      type: 'session',
      navigationData: {
        page: 'sessions',
        filters: { sessionId: session.id }
      },
      fallbackTitle: 'New Session Created',
      fallbackMessage: `New session created for ${sessionClassroom.name} on ${session.date} at ${session.start_time}`
    })

    console.log(`Session creation notifications sent to ${recipients.length} recipients`)
  } catch (error) {
    console.error('Error triggering session creation notifications:', error)
  }
}

/**
 * Shared session-context fetch + recipient-set assembly used by the
 * cancel and reschedule triggers. Returns:
 *   - `classroomName`, `teacherName`  — for message params
 *   - `recipients` — parents + students enrolled in the classroom plus
 *     the teacher and any substitute. Managers are intentionally omitted
 *     because they're the ones who initiated the change.
 * Returns null when the session/classroom join fails or no recipients
 * exist; callers log and exit on null.
 */
async function getSessionChangeRecipients(sessionId: string): Promise<{
  classroomId: string
  classroomName: string
  teacherName: string
  recipients: string[]
} | null> {
  const { data: session } = await supabase
    .from('classroom_sessions')
    .select(`
      id,
      substitute_teacher,
      classrooms!inner(
        id,
        name,
        teacher_id,
        users!teacher_id(name),
        classroom_students(student_id)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (!session) {
    console.error('[Session change] Session not found:', sessionId)
    return null
  }

  const classroom = one(session.classrooms)
  if (!classroom) {
    console.error('[Session change] Classroom missing on session:', sessionId)
    return null
  }
  const teacher = one(classroom.users)

  // Family members for every enrolled student (parents + the student themselves)
  const studentIds = (classroom.classroom_students || []).map(
    (cs: { student_id: string }) => cs.student_id,
  )
  const recipients = new Set<string>()
  for (const studentId of studentIds) {
    const familyMembers = await getStudentFamilyMembers(studentId)
    familyMembers.forEach(id => recipients.add(id))
  }

  // Plus the teacher and the substitute (if assigned). They need to know
  // about cancel/reschedule even more than the parents do.
  if (classroom.teacher_id) recipients.add(classroom.teacher_id)
  if (session.substitute_teacher) recipients.add(session.substitute_teacher)

  if (recipients.size === 0) {
    return null
  }

  return {
    classroomId: classroom.id,
    classroomName: classroom.name,
    teacherName: teacher?.name || 'Unknown Teacher',
    recipients: Array.from(recipients),
  }
}

/**
 * Session canceled notification trigger.
 *
 * Fires when a session's status transitions to 'cancelled' — either via
 * single-session edit or bulk status update. Recipients are everyone
 * who'd otherwise show up: enrolled students, their parents, the teacher,
 * and the substitute. Translation keys
 * (`notifications.content.session.cancelled.*`) already exist in the
 * locale files; this trigger is what makes them fire.
 *
 * Pass the original date/start_time/end_time from the row before the
 * update committed — they're what the message renders, since after the
 * cancel they may have been edited too.
 */
export async function triggerSessionCanceledNotifications(
  sessionId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  try {
    const ctx = await getSessionChangeRecipients(sessionId)
    if (!ctx) {
      console.log('[Session canceled] No recipients — skipping')
      return
    }

    await createBulkNotifications(ctx.recipients, {
      titleKey: 'notifications.content.session.cancelled.title',
      messageKey: 'notifications.content.session.cancelled.message',
      titleParams: {
        classroom: ctx.classroomName,
      },
      messageParams: {
        classroom: ctx.classroomName,
        // Raw structured fields — the renderer formats {when} per locale.
        dateISO: date,
        startTime: (startTime || '').slice(0, 5),
        endTime: (endTime || '').slice(0, 5),
        // Legacy params kept so older clients without the augmenter still
        // render *something* sensible if they hit this row.
        date,
        time: `${(startTime || '').slice(0, 5)} – ${(endTime || '').slice(0, 5)}`,
      },
      type: 'session',
      navigationData: {
        page: 'sessions',
        filters: { sessionId },
      },
      fallbackTitle: 'Session Cancelled',
      fallbackMessage: `The session for ${ctx.classroomName} on ${date} has been cancelled.`,
    })

    console.log(`[Session canceled] Sent to ${ctx.recipients.length} recipients`)
  } catch (error) {
    console.error('[Session canceled] Error:', error)
  }
}

/**
 * Session rescheduled notification trigger.
 *
 * Fires when a session's date or start_time changes. Same recipient set
 * as the cancel trigger. The message includes both old and new times so
 * recipients see the move at a glance.
 *
 * Pass `oldDate` + `oldStartTime` from the pre-update row. The new
 * values are read from the now-updated row inside the helper.
 */
export async function triggerSessionRescheduledNotifications(
  sessionId: string,
  oldDate: string,
  oldStartTime: string,
  newDate: string,
  newStartTime: string,
  oldEndTime?: string,
  newEndTime?: string,
) {
  try {
    const ctx = await getSessionChangeRecipients(sessionId)
    if (!ctx) {
      console.log('[Session rescheduled] No recipients — skipping')
      return
    }

    // Drop seconds; renderer formats {oldWhen}/{newWhen} per locale.
    const trimSec = (t: string) => (t || '').slice(0, 5)

    await createBulkNotifications(ctx.recipients, {
      titleKey: 'notifications.content.session.rescheduled.title',
      messageKey: 'notifications.content.session.rescheduled.message',
      titleParams: {
        classroom: ctx.classroomName,
      },
      messageParams: {
        classroom: ctx.classroomName,
        // Raw structured fields — renderer formats {oldWhen}/{newWhen} per locale.
        oldDateISO: oldDate,
        oldStartTime: trimSec(oldStartTime),
        oldEndTime: oldEndTime ? trimSec(oldEndTime) : '',
        newDateISO: newDate,
        newStartTime: trimSec(newStartTime),
        newEndTime: newEndTime ? trimSec(newEndTime) : '',
        // Legacy fields for older clients.
        oldTime: oldEndTime
          ? `${oldDate} ${trimSec(oldStartTime)} – ${trimSec(oldEndTime)}`
          : `${oldDate} ${trimSec(oldStartTime)}`,
        newTime: newEndTime
          ? `${newDate} ${trimSec(newStartTime)} – ${trimSec(newEndTime)}`
          : `${newDate} ${trimSec(newStartTime)}`,
        date: newDate,
      },
      type: 'session',
      navigationData: {
        page: 'sessions',
        filters: { sessionId },
      },
      fallbackTitle: 'Session Rescheduled',
      fallbackMessage: `The session for ${ctx.classroomName} has been moved from ${oldDate} ${trimSec(oldStartTime)}${oldEndTime ? '–' + trimSec(oldEndTime) : ''} to ${newDate} ${trimSec(newStartTime)}${newEndTime ? '–' + trimSec(newEndTime) : ''}.`,
    })

    console.log(`[Session rescheduled] Sent to ${ctx.recipients.length} recipients`)
  } catch (error) {
    console.error('[Session rescheduled] Error:', error)
  }
}

/**
 * Assignment graded notification trigger.
 *
 * Fires when a teacher gives a numeric score to an `assignment_grades`
 * row. Recipients are the student plus their family (parents). The
 * teacher and managers don't get this — they're the ones who graded.
 *
 * Translation keys (`notifications.content.assignment.graded.*`) already
 * exist in both `en.json` and `ko.json`. Korean parents in particular
 * care about per-assignment scores — this closes the assignment lifecycle
 * gap (created push exists, graded push didn't until now).
 *
 * Caller is responsible for only invoking this when a grade was newly
 * scored (transitioned from null/undefined score to a numeric score).
 * The trigger doesn't try to dedupe — it trusts the caller to gate.
 */
export async function triggerAssignmentGradedNotifications(gradeId: string) {
  try {
    const { data: grade } = await supabase
      .from('assignment_grades')
      .select(`
        id,
        score,
        student_id,
        assignments!inner(
          id,
          title
        )
      `)
      .eq('id', gradeId)
      .single()

    if (!grade) {
      console.error('[Assignment graded] Grade not found:', gradeId)
      return
    }

    const assignment = one(grade.assignments)
    if (!assignment) {
      console.error('[Assignment graded] Assignment join missing:', gradeId)
      return
    }

    // Recipients: the student themselves + every family member (parents).
    // getStudentFamilyMembers() returns the student id too when no family
    // is linked, so this naturally falls back to "just notify the student".
    const recipients = await getStudentFamilyMembers(grade.student_id)
    if (recipients.length === 0) {
      console.log('[Assignment graded] No recipients — skipping')
      return
    }

    // Format the score for display. Numeric scores render as "85"; null /
    // missing scores fall through to the fallback message text.
    const scoreDisplay = grade.score != null ? String(grade.score) : '—'

    await createBulkNotifications(recipients, {
      titleKey: 'notifications.content.assignment.graded.title',
      messageKey: 'notifications.content.assignment.graded.message',
      titleParams: {
        title: assignment.title,
      },
      messageParams: {
        title: assignment.title,
        score: scoreDisplay,
      },
      type: 'grade',
      navigationData: {
        page: 'assignments',
        filters: { studentId: grade.student_id },
      },
      fallbackTitle: 'Assignment Graded',
      fallbackMessage: `Your '${assignment.title}' assignment has been graded. Score: ${scoreDisplay}`,
    })

    console.log(`[Assignment graded] Sent to ${recipients.length} recipients`)
  } catch (error) {
    console.error('[Assignment graded] Error:', error)
  }
}

/**
 * Session reminder notification trigger (cron-driven).
 *
 * Runs once per day from /api/cron/session-reminders. For every
 * session scheduled tomorrow that hasn't already been reminded, fires
 * an in-app + push notification to enrolled students, their families
 * (parents), and the assigned teacher.
 *
 * Dedupe lives in the DB: each session row's `reminder_sent_at`
 * timestamp is set after a successful push. The query filters
 * `WHERE reminder_sent_at IS NULL AND status = 'scheduled' AND date =
 * tomorrow`, so accidental cron re-runs (preview-deploy retries, manual
 * curl, etc.) won't double-notify.
 *
 * Uses the admin client because cron runs in a server-side, unauthed
 * context; bypassing RLS is required to read across academies.
 *
 * Translation keys (`notifications.content.session.reminder.*`) already
 * exist in en.json and ko.json — they were authored long ago waiting
 * for this trigger to land.
 */
export async function triggerSessionReminderNotifications() {
  try {
    const db = await getAdminClient()

    // "Tomorrow" in YYYY-MM-DD. We use UTC date math because Vercel
    // crons fire on UTC; the cron runs at 00:00 UTC (= 09:00 KST),
    // so adding +1 day to today's UTC date lands on the right Korean
    // calendar day for the reminder.
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    // Pull tomorrow's not-yet-reminded scheduled sessions in one query.
    const { data: sessions, error: fetchError } = await db
      .from('classroom_sessions')
      .select(`
        id,
        date,
        start_time,
        end_time,
        substitute_teacher,
        classrooms!inner(
          id,
          name,
          teacher_id,
          users!teacher_id(name),
          classroom_students(student_id)
        )
      `)
      .eq('status', 'scheduled')
      .eq('date', tomorrowDate)
      .is('reminder_sent_at', null)

    if (fetchError) {
      console.error('[Session reminder] Fetch failed:', fetchError)
      throw fetchError
    }

    if (!sessions || sessions.length === 0) {
      console.log('[Session reminder] No sessions need reminding for', tomorrowDate)
      return { remindedSessions: 0 }
    }

    let successCount = 0

    for (const session of sessions) {
      try {
        const classroom = one(session.classrooms)
        if (!classroom) continue

        // Recipients: enrolled students + their families + the teacher
        // + any substitute. Same recipient set as cancel/reschedule —
        // anyone who'd otherwise show up should hear about it the day
        // before too.
        const studentIds = (classroom.classroom_students || []).map(
          (cs: { student_id: string }) => cs.student_id,
        )
        const recipients = new Set<string>()
        for (const studentId of studentIds) {
          const familyMembers = await getStudentFamilyMembers(studentId)
          familyMembers.forEach(id => recipients.add(id))
        }
        if (classroom.teacher_id) recipients.add(classroom.teacher_id)
        if (session.substitute_teacher) recipients.add(session.substitute_teacher)

        if (recipients.size === 0) {
          // No one to notify but we still mark sent so we don't keep
          // re-fetching this row tomorrow.
          await db
            .from('classroom_sessions')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', session.id)
          continue
        }

        // Use createServerNotifications (direct supabaseAdmin insert) instead
        // of createBulkNotifications. The latter does a relative-URL fetch
        // to /api/notifications/create which fails server-side in cron
        // context. createServerNotifications throws on failure so the
        // catch below correctly skips the row-mark + successCount on a
        // real failure.
        await createServerNotifications(Array.from(recipients), {
          titleKey: 'notifications.content.session.reminder.title',
          messageKey: 'notifications.content.session.reminder.message',
          titleParams: {
            classroom: classroom.name,
          },
          messageParams: {
            classroom: classroom.name,
            time: `${session.date} ${session.start_time}`,
          },
          type: 'session',
          navigationData: {
            page: 'sessions',
            filters: { sessionId: session.id },
          },
          fallbackTitle: 'Session Reminder',
          fallbackMessage: `Reminder: ${classroom.name} tomorrow at ${session.start_time}.`,
        })

        // Mark only after notification creation succeeds. If it threw, we
        // want the next cron pass to retry — better double-remind than lose.
        await db
          .from('classroom_sessions')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', session.id)

        successCount++
      } catch (sessionError) {
        // Don't let one bad session block the rest of the batch.
        console.error('[Session reminder] Failed for session', session.id, sessionError)
      }
    }

    console.log(`[Session reminder] Sent reminders for ${successCount}/${sessions.length} sessions`)
    return { remindedSessions: successCount, totalSessions: sessions.length }
  } catch (error) {
    console.error('[Session reminder] Cron error:', error)
    throw error
  }
}

/**
 * Helper used by both assignment crons. Resolves an assignment to:
 *  - classroom name (for the message)
 *  - the recipient set: enrolled students + their families (parents)
 *
 * Teachers and managers are excluded — they're the people who set the
 * due date in the first place. The reminder is for whoever has to do
 * the work, plus the parents who care about it getting done.
 */
async function getAssignmentRemindRecipients(
  db: Awaited<ReturnType<typeof getAdminClient>>,
  assignment: {
    classroom_sessions: unknown
  },
): Promise<{ classroomName: string; recipients: string[] } | null> {
  const session = one(assignment.classroom_sessions as { classrooms?: unknown }[] | { classrooms?: unknown } | null | undefined)
  const classroom = one((session as { classrooms?: unknown } | undefined)?.classrooms as { id: string; name: string; classroom_students?: { student_id: string }[] }[] | { id: string; name: string; classroom_students?: { student_id: string }[] } | null | undefined)
  if (!classroom) return null

  const studentIds = (classroom.classroom_students || []).map(cs => cs.student_id)
  const recipients = new Set<string>()
  for (const studentId of studentIds) {
    // Reuse the same family-fan-out helper used by every other trigger.
    // Cron is a server context but supabase (anon-key) here works because
    // family_members has a permissive read policy; if that ever tightens,
    // swap in a db.from(...) call here.
    const familyMembers = await getStudentFamilyMembers(studentId)
    familyMembers.forEach(id => recipients.add(id))
  }

  // Suppress unused parameter warning — `db` is reserved for future use
  // when family_members RLS tightens; the call site is uniform with the
  // payment helper which does need `db`.
  void db

  return {
    classroomName: classroom.name,
    recipients: Array.from(recipients),
  }
}

/**
 * Assignment due-tomorrow reminder (cron-driven).
 *
 * Mirrors the session-reminder design: pulls assignments whose due_date
 * is tomorrow and `due_reminder_sent_at IS NULL`, fan-outs to enrolled
 * students + their parents, then stamps the row so re-runs skip it.
 *
 * Translation keys `notifications.content.assignment.due.*` already
 * exist in en.json / ko.json — this trigger is what makes them fire.
 */
export async function triggerAssignmentDueReminderNotifications() {
  try {
    const db = await getAdminClient()

    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const { data: assignments, error: fetchError } = await db
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        classroom_sessions!inner(
          id,
          classrooms!inner(
            id,
            name,
            classroom_students(student_id)
          )
        )
      `)
      .eq('due_date', tomorrowDate)
      .is('due_reminder_sent_at', null)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('[Assignment due reminder] Fetch failed:', fetchError)
      throw fetchError
    }

    if (!assignments || assignments.length === 0) {
      console.log('[Assignment due reminder] None due tomorrow:', tomorrowDate)
      return { remindedAssignments: 0 }
    }

    let successCount = 0

    for (const assignment of assignments) {
      try {
        const ctx = await getAssignmentRemindRecipients(db, assignment)
        if (!ctx || ctx.recipients.length === 0) {
          // Mark sent anyway — empty classroom shouldn't keep churning.
          await db
            .from('assignments')
            .update({ due_reminder_sent_at: new Date().toISOString() })
            .eq('id', assignment.id)
          continue
        }

        // createServerNotifications: direct supabaseAdmin insert, throws
        // on failure (vs createBulkNotifications which uses relative-URL
        // fetch and silently returns success: false in server contexts).
        await createServerNotifications(ctx.recipients, {
          titleKey: 'notifications.content.assignment.due.title',
          messageKey: 'notifications.content.assignment.due.message',
          titleParams: { title: assignment.title },
          messageParams: {
            title: assignment.title,
            classroom: ctx.classroomName,
          },
          type: 'assignment',
          navigationData: {
            page: 'assignments',
          },
          fallbackTitle: 'Assignment Due',
          fallbackMessage: `Assignment '${assignment.title}' for ${ctx.classroomName} is due tomorrow.`,
        })

        await db
          .from('assignments')
          .update({ due_reminder_sent_at: new Date().toISOString() })
          .eq('id', assignment.id)

        successCount++
      } catch (err) {
        console.error('[Assignment due reminder] Failed for', assignment.id, err)
      }
    }

    console.log(`[Assignment due reminder] Sent ${successCount}/${assignments.length}`)
    return { remindedAssignments: successCount, totalAssignments: assignments.length }
  } catch (error) {
    console.error('[Assignment due reminder] Cron error:', error)
    throw error
  }
}

/**
 * Assignment overdue notification (cron-driven).
 *
 * Fires once per assignment whose due_date has passed and that hasn't
 * yet had an overdue notification sent. Same recipient set as the
 * due-reminder. The trigger is intentionally idempotent and fires only
 * once — daily-spammed "still overdue!" pings would be hostile.
 */
export async function triggerAssignmentOverdueNotifications() {
  try {
    const db = await getAdminClient()

    const today = new Date().toISOString().split('T')[0]
    // Grace period: only notify about assignments that became overdue in
    // the last 7 days. Without this, the very first cron run (or any run
    // after backfilling the column) blasts pushes for every historical
    // overdue assignment — months of "now overdue" stuff arriving at once.
    // 7 days picked so an assignment that quietly slipped past Friday's
    // deadline still surfaces by next Friday's cron, but anything older is
    // assumed forgotten by both sides and ignored.
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data: assignments, error: fetchError } = await db
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        classroom_sessions!inner(
          id,
          classrooms!inner(
            id,
            name,
            classroom_students(student_id)
          )
        )
      `)
      .lt('due_date', today)
      .gte('due_date', cutoffDate)
      .is('overdue_notification_sent_at', null)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('[Assignment overdue] Fetch failed:', fetchError)
      throw fetchError
    }

    if (!assignments || assignments.length === 0) {
      console.log('[Assignment overdue] None pending')
      return { notifiedAssignments: 0 }
    }

    let successCount = 0

    for (const assignment of assignments) {
      try {
        const ctx = await getAssignmentRemindRecipients(db, assignment)
        if (!ctx || ctx.recipients.length === 0) {
          await db
            .from('assignments')
            .update({ overdue_notification_sent_at: new Date().toISOString() })
            .eq('id', assignment.id)
          continue
        }

        await createServerNotifications(ctx.recipients, {
          titleKey: 'notifications.content.assignment.overdue.title',
          messageKey: 'notifications.content.assignment.overdue.message',
          titleParams: { title: assignment.title },
          messageParams: {
            title: assignment.title,
            classroom: ctx.classroomName,
          },
          type: 'assignment',
          navigationData: {
            page: 'assignments',
          },
          fallbackTitle: 'Assignment Overdue',
          fallbackMessage: `Assignment '${assignment.title}' for ${ctx.classroomName} is now overdue.`,
        })

        await db
          .from('assignments')
          .update({ overdue_notification_sent_at: new Date().toISOString() })
          .eq('id', assignment.id)

        successCount++
      } catch (err) {
        console.error('[Assignment overdue] Failed for', assignment.id, err)
      }
    }

    console.log(`[Assignment overdue] Sent ${successCount}/${assignments.length}`)
    return { notifiedAssignments: successCount, totalAssignments: assignments.length }
  } catch (error) {
    console.error('[Assignment overdue] Cron error:', error)
    throw error
  }
}

/**
 * Payment due reminder (cron-driven).
 *
 * Pushes 3 days before an invoice's due_date — Korean parents
 * routinely set up bank transfers a few days ahead, so 3 days lands
 * before the standard "I'll do it tonight" procrastination window.
 *
 * Recipients: every family member (parents) of the invoice's student,
 * plus the student themselves. Translation keys
 * `notifications.content.payment.reminder.*` already exist.
 */
export async function triggerPaymentDueReminderNotifications() {
  try {
    const db = await getAdminClient()

    // Three days from now (UTC math; cron runs at 09:00 KST so the
    // "3 days" feel right to a Korean parent's calendar).
    const target = new Date()
    target.setUTCDate(target.getUTCDate() + 3)
    const targetDate = target.toISOString().split('T')[0]

    const { data: invoices, error: fetchError } = await db
      .from('invoices')
      .select('id, final_amount, amount, due_date, student_id, status')
      .eq('due_date', targetDate)
      .neq('status', 'paid')
      .is('due_reminder_sent_at', null)
      // Note: invoices has no `deleted_at` column (verified against
      // migration history). Don't add a soft-delete filter here.

    if (fetchError) {
      console.error('[Payment due reminder] Fetch failed:', fetchError)
      throw fetchError
    }

    if (!invoices || invoices.length === 0) {
      console.log('[Payment due reminder] None due', targetDate)
      return { remindedInvoices: 0 }
    }

    let successCount = 0

    for (const invoice of invoices) {
      try {
        // Get the student's name for the message — parents see "Payment
        // for 민준 is due..." rather than just an opaque amount.
        const { data: student } = await db
          .from('users')
          .select('name')
          .eq('id', invoice.student_id)
          .single()
        const studentName = student?.name || 'Student'

        const recipients = await getStudentFamilyMembers(invoice.student_id)
        if (recipients.length === 0) {
          await db
            .from('invoices')
            .update({ due_reminder_sent_at: new Date().toISOString() })
            .eq('id', invoice.id)
          continue
        }

        const amount = invoice.final_amount ?? invoice.amount ?? 0
        const formattedAmount = `₩${Number(amount).toLocaleString('ko-KR')}`

        await createServerNotifications(recipients, {
          titleKey: 'notifications.content.payment.reminder.title',
          messageKey: 'notifications.content.payment.reminder.message',
          titleParams: { student: studentName },
          messageParams: {
            amount: formattedAmount,
            student: studentName,
            dueDate: invoice.due_date,
          },
          type: 'billing',
          navigationData: {
            page: 'payments',
            filters: { studentId: invoice.student_id, invoiceId: invoice.id },
          },
          fallbackTitle: 'Payment Reminder',
          fallbackMessage: `Payment of ${formattedAmount} for ${studentName} is due on ${invoice.due_date}.`,
        })

        await db
          .from('invoices')
          .update({ due_reminder_sent_at: new Date().toISOString() })
          .eq('id', invoice.id)

        successCount++
      } catch (err) {
        console.error('[Payment due reminder] Failed for', invoice.id, err)
      }
    }

    console.log(`[Payment due reminder] Sent ${successCount}/${invoices.length}`)
    return { remindedInvoices: successCount, totalInvoices: invoices.length }
  } catch (error) {
    console.error('[Payment due reminder] Cron error:', error)
    throw error
  }
}

/**
 * Payment overdue notification (cron-driven).
 *
 * Fires once per invoice whose due_date has passed and that hasn't yet
 * had an overdue ping sent. Recipients include the academy's managers
 * in addition to family — managers need to know who's behind so they
 * can follow up directly.
 */
export async function triggerPaymentOverdueNotifications() {
  try {
    const db = await getAdminClient()

    const today = new Date().toISOString().split('T')[0]
    // Grace period: only notify about invoices that became overdue in the
    // last 7 days. Without this, the first cron run after backfilling the
    // dedup column tries to notify every historically-overdue invoice in
    // one batch — months of "now overdue" pings hitting parents at once.
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0]

    const { data: invoices, error: fetchError } = await db
      .from('invoices')
      .select('id, final_amount, amount, due_date, student_id, academy_id, status')
      .lt('due_date', today)
      .gte('due_date', cutoffDate)
      .neq('status', 'paid')
      .is('overdue_notification_sent_at', null)
      // Note: invoices has no `deleted_at` column.

    if (fetchError) {
      console.error('[Payment overdue] Fetch failed:', fetchError)
      throw fetchError
    }

    if (!invoices || invoices.length === 0) {
      console.log('[Payment overdue] None pending')
      return { notifiedInvoices: 0 }
    }

    let successCount = 0

    for (const invoice of invoices) {
      try {
        const { data: student } = await db
          .from('users')
          .select('name')
          .eq('id', invoice.student_id)
          .single()
        const studentName = student?.name || 'Student'

        // Family + academy managers. Managers get the same message; the
        // navigation data takes them to the right invoice.
        const familyRecipients = await getStudentFamilyMembers(invoice.student_id)
        const managerRecipients = invoice.academy_id
          ? await getAcademyManagers(invoice.academy_id)
          : []
        const recipients = Array.from(new Set([...familyRecipients, ...managerRecipients]))

        if (recipients.length === 0) {
          await db
            .from('invoices')
            .update({ overdue_notification_sent_at: new Date().toISOString() })
            .eq('id', invoice.id)
          continue
        }

        const amount = invoice.final_amount ?? invoice.amount ?? 0
        const formattedAmount = `₩${Number(amount).toLocaleString('ko-KR')}`

        await createServerNotifications(recipients, {
          titleKey: 'notifications.content.payment.overdue.title',
          messageKey: 'notifications.content.payment.overdue.message',
          titleParams: { student: studentName },
          messageParams: {
            amount: formattedAmount,
            student: studentName,
          },
          type: 'billing',
          navigationData: {
            page: 'payments',
            filters: { studentId: invoice.student_id, invoiceId: invoice.id },
          },
          fallbackTitle: 'Payment Overdue',
          fallbackMessage: `Payment of ${formattedAmount} for ${studentName} is now overdue. Please settle immediately.`,
        })

        await db
          .from('invoices')
          .update({ overdue_notification_sent_at: new Date().toISOString() })
          .eq('id', invoice.id)

        successCount++
      } catch (err) {
        console.error('[Payment overdue] Failed for', invoice.id, err)
      }
    }

    console.log(`[Payment overdue] Sent ${successCount}/${invoices.length}`)
    return { notifiedInvoices: successCount, totalInvoices: invoices.length }
  } catch (error) {
    console.error('[Payment overdue] Cron error:', error)
    throw error
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
 * Pending grades reminder notification trigger (for scheduled job)
 * Sends notifications to teachers/managers when they have assignments
 * past due date with ungraded submissions
 */
export async function triggerPendingGradesReminderNotifications() {
  try {
    // Use admin client for server-side cron context (bypasses RLS)
    const db = await getAdminClient()

    // Get yesterday's date
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0] // YYYY-MM-DD

    console.log(`[CRON] Checking for pending grades with due date: ${yesterdayStr}`)

    // Find assignments that were due yesterday with pending grades
    const { data: assignmentsWithPendingGrades, error: assignmentError } = await db
      .from('assignments')
      .select(`
        id,
        title,
        due_date,
        classroom_sessions!inner(
          id,
          classrooms!inner(
            id,
            name,
            teacher_id,
            academy_id
          )
        ),
        assignment_grades!inner(
          id,
          status,
          student_id
        )
      `)
      .eq('due_date', yesterdayStr)
      .is('deleted_at', null)
      .in('assignment_grades.status', ['pending', 'not submitted'])

    if (assignmentError) {
      console.error('Error fetching assignments with pending grades:', assignmentError)
      throw assignmentError
    }

    if (!assignmentsWithPendingGrades || assignmentsWithPendingGrades.length === 0) {
      console.log('[CRON] No assignments with pending grades found for yesterday')
      return { notificationsSent: 0, academiesNotified: 0 }
    }

    // Group by academy and teacher
    const academyTeacherMap = new Map<string, {
      academyId: string
      teacherId: string
      pendingCount: number
      classrooms: Set<string>
    }>()

    for (const assignment of assignmentsWithPendingGrades) {
      const session = one(assignment.classroom_sessions)
      const classroom = one(session?.classrooms)
      if (!classroom) continue
      const key = `${classroom.academy_id}-${classroom.teacher_id}`
      const pendingGrades = assignment.assignment_grades.filter(
        (g: { status: string }) => g.status === 'pending' || g.status === 'not submitted'
      )

      if (pendingGrades.length > 0) {
        if (!academyTeacherMap.has(key)) {
          academyTeacherMap.set(key, {
            academyId: classroom.academy_id,
            teacherId: classroom.teacher_id,
            pendingCount: 0,
            classrooms: new Set()
          })
        }
        const entry = academyTeacherMap.get(key)!
        entry.pendingCount += pendingGrades.length
        entry.classrooms.add(classroom.name)
      }
    }

    if (academyTeacherMap.size === 0) {
      console.log('[CRON] No pending grades to notify about')
      return { notificationsSent: 0, academiesNotified: 0 }
    }

    // Send notifications
    let notificationsSent = 0
    const academiesNotified = new Set<string>()

    for (const [, data] of academyTeacherMap) {
      // Get managers for this academy (using admin client directly)
      const { data: managersData } = await db
        .from('managers')
        .select('user_id')
        .eq('academy_id', data.academyId)
        .eq('active', true)
      const managerIds = managersData?.map(m => m.user_id) || []

      // Combine teacher and managers (deduplicate)
      const recipients = [...new Set([data.teacherId, ...managerIds])]
      const classroomList = Array.from(data.classrooms).join(', ')

      await createServerNotifications(recipients, {
        titleKey: 'notifications.content.assignment.pending_grades.title',
        messageKey: 'notifications.content.assignment.pending_grades.message',
        titleParams: {
          count: data.pendingCount.toString()
        },
        messageParams: {
          count: data.pendingCount.toString(),
          classrooms: classroomList
        },
        type: 'assignment',
        navigationData: {
          page: 'assignments',
          filters: { status: 'pending' }
        },
        fallbackTitle: `${data.pendingCount} Pending Grades`,
        fallbackMessage: `You have ${data.pendingCount} pending grades to review in ${classroomList}`
      })

      notificationsSent += recipients.length
      academiesNotified.add(data.academyId)
    }

    console.log(`[CRON] Pending grades notifications sent to ${notificationsSent} recipients across ${academiesNotified.size} academies`)
    return { notificationsSent, academiesNotified: academiesNotified.size }
  } catch (error) {
    console.error('Error triggering pending grades reminder notifications:', error)
    throw error
  }
}

/**
 * Session auto-completion notification trigger (for scheduled job)
 */
export async function triggerSessionAutoCompletionNotifications() {
  try {
    // Use admin client for server-side cron context (bypasses RLS)
    const db = await getAdminClient()

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format

    // Find sessions that should be auto-completed
    const { data: expiredSessions } = await db
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
    await db
      .from('classroom_sessions')
      .update({ status: 'completed' })
      .in('id', sessionIds)

    // Group sessions by academy for notifications
    const academyGroups = new Map<string, typeof expiredSessions>()

    expiredSessions.forEach(session => {
      const c = one(session.classrooms)
      if (!c) return
      const academyId = c.academy_id
      if (!academyGroups.has(academyId)) {
        academyGroups.set(academyId, [])
      }
      academyGroups.get(academyId)!.push(session)
    })

    // Send notifications for each academy
    for (const [academyId, sessions] of academyGroups) {
      // Get managers using admin client directly
      const { data: managersData } = await db
        .from('managers')
        .select('user_id')
        .eq('academy_id', academyId)
        .eq('active', true)
      const managerIds = managersData?.map(m => m.user_id) || []
      const teachers = [...new Set(sessions.map(s => one(s.classrooms)?.teacher_id).filter(Boolean) as string[])]
      const allRecipients = [...new Set([...managerIds, ...teachers])]

      if (allRecipients.length === 0) continue

      const sessionCount = sessions.length
      const sessionNames = sessions.map(s => one(s.classrooms)?.name || '').filter(Boolean).join(', ')

      await createServerNotifications(allRecipients, {
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

/**
 * Fires when a level-test attempt is submitted (either via the public share
 * link or the in-person completion flow). Notifies every manager of the
 * academy that owns the test.
 *
 * Inserts directly via supabaseAdmin rather than going through
 * createBulkNotifications(), because that helper relies on a relative fetch
 * to /api/notifications/create which doesn't resolve from server-side
 * contexts. supabaseAdmin bypasses RLS cleanly.
 *
 * All errors are swallowed — notifications are best-effort and must never
 * cause the submit flow to fail.
 */
export async function triggerLevelTestSubmittedNotifications(attemptId: string) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')

    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select(`
        id,
        taker_name,
        score,
        needs_manual_grading,
        status,
        total_questions,
        level_tests!inner (
          id,
          title,
          academy_id
        )
      `)
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      console.error('[level-test notification] attempt not found:', attemptId)
      return
    }

    const test = Array.isArray(attempt.level_tests)
      ? attempt.level_tests[0]
      : (attempt.level_tests as { id: string; title: string; academy_id: string } | null)
    if (!test) {
      console.error('[level-test notification] test join missing for attempt:', attemptId)
      return
    }

    // Find managers of the academy. Using supabaseAdmin so this works even
    // when called from the public (unauthed) submit path.
    const { data: managerRows } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('academy_id', test.academy_id)
      .eq('active', true)

    const managerIds = (managerRows || []).map(r => r.user_id).filter(Boolean)
    if (managerIds.length === 0) {
      console.log('[level-test notification] no managers to notify for academy:', test.academy_id)
      return
    }

    // Build the score suffix so the message reads naturally whether or not
    // the attempt is fully graded. Manual-grading attempts get an empty
    // suffix; fully graded ones get " (85%)".
    const scoreSuffix =
      attempt.score !== null && !attempt.needs_manual_grading
        ? ` (${attempt.score}%)`
        : ''

    const now = new Date().toISOString()
    const takerName = attempt.taker_name || 'Student'
    const notifications = managerIds.map(userId => ({
      user_id: userId,
      title_key: 'notifications.content.levelTest.submitted.title',
      message_key: 'notifications.content.levelTest.submitted.message',
      title_params: { taker: takerName, test: test.title },
      message_params: { taker: takerName, test: test.title, scoreSuffix },
      title: 'Level test submitted', // Fallback for legacy clients
      message: `${takerName} completed ${test.title}${scoreSuffix}.`,
      type: 'system',
      navigation_data: {
        page: 'level-tests',
        action: `open-test:${test.id}`,
      },
      is_read: false,
      created_at: now,
      updated_at: now,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      console.error('[level-test notification] insert error:', insertError)
      return
    }

    console.log(`[level-test notification] sent to ${managerIds.length} managers for attempt ${attemptId}`)
  } catch (error) {
    // Never throw — notifications are best-effort. The submit flow must
    // succeed even if we can't notify anyone.
    console.error('Error triggering level-test submitted notifications:', error)
  }
}