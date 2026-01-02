import { supabase } from './supabase'
import { format } from 'date-fns'
import { getSessionsForDateRange, materializeSession, isVirtualSession, VirtualSession } from './virtual-sessions'
import { triggerSelfCheckInNotifications } from './notification-triggers'

export interface MatchedStudent {
  id: string
  name: string
  phone: string
}

export interface SessionForCheckIn {
  id: string
  classroomId: string
  classroomName: string
  date: string
  startTime: string
  endTime: string
  isVirtual: boolean
}

export interface CheckInResult {
  sessionId: string
  classroomName: string
  status: 'present' | 'late'
  alreadyCheckedIn: boolean
  error?: string
}

/**
 * Find students by the last 4 digits of their phone number
 */
export async function findStudentsByPhoneSuffix(
  academyId: string,
  phoneSuffix: string
): Promise<{ data: MatchedStudent[] | null; error: string | null }> {
  try {
    if (phoneSuffix.length !== 4 || !/^\d{4}$/.test(phoneSuffix)) {
      return { data: null, error: 'Please enter exactly 4 digits' }
    }

    // Query students whose phone ends with the given suffix
    const { data, error } = await supabase
      .from('students')
      .select(`
        user_id,
        phone,
        users!inner(name)
      `)
      .eq('academy_id', academyId)
      .eq('active', true)
      .like('phone', `%${phoneSuffix}`)

    if (error) {
      console.error('Error finding students:', error)
      return { data: null, error: 'Failed to search for students' }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null }
    }

    const students: MatchedStudent[] = data.map((student: any) => ({
      id: student.user_id,
      name: student.users?.name || 'Unknown',
      phone: student.phone
    }))

    return { data: students, error: null }
  } catch (err) {
    console.error('Exception finding students:', err)
    return { data: null, error: 'An error occurred while searching' }
  }
}

/**
 * Find today's sessions for a student across all their enrolled classrooms
 */
export async function findTodaySessionsForStudent(
  studentId: string,
  academyId: string
): Promise<{ data: SessionForCheckIn[] | null; error: string | null }> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')

    // Get student's enrolled classrooms
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('classroom_students')
      .select(`
        classroom_id,
        classrooms!inner(
          id,
          name,
          academy_id
        )
      `)
      .eq('student_id', studentId)

    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError)
      return { data: null, error: 'Failed to find student enrollments' }
    }

    if (!enrollments || enrollments.length === 0) {
      return { data: [], error: null }
    }

    // Filter to classrooms in this academy
    const classroomIds = enrollments
      .filter((e: any) => e.classrooms?.academy_id === academyId)
      .map((e: any) => e.classroom_id)

    if (classroomIds.length === 0) {
      return { data: [], error: null }
    }

    // Fetch real sessions for today
    const { data: realSessions, error: sessionsError } = await supabase
      .from('classroom_sessions')
      .select(`
        id,
        classroom_id,
        date,
        start_time,
        end_time,
        status,
        classrooms!inner(name)
      `)
      .in('classroom_id', classroomIds)
      .eq('date', today)
      .is('deleted_at', null)
      .neq('status', 'cancelled')

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return { data: null, error: 'Failed to find sessions' }
    }

    const sessions: SessionForCheckIn[] = []

    // Add real sessions
    for (const session of realSessions || []) {
      sessions.push({
        id: session.id,
        classroomId: session.classroom_id,
        classroomName: (session.classrooms as any)?.name || 'Unknown',
        date: session.date,
        startTime: session.start_time,
        endTime: session.end_time,
        isVirtual: false
      })
    }

    // Check for virtual sessions for each classroom
    const todayDate = new Date()
    for (const classroomId of classroomIds) {
      // Get existing real sessions for this classroom
      const classroomRealSessions = (realSessions || []).filter(
        (s: any) => s.classroom_id === classroomId
      )

      // Get all sessions (including virtual) for today
      const allSessions = await getSessionsForDateRange(
        classroomId,
        todayDate,
        todayDate,
        classroomRealSessions
      )

      // Find virtual sessions (ones not already in our list)
      const virtualSessions = allSessions.filter(
        (s: any) => s.is_virtual && s.status !== 'cancelled'
      )

      // Get classroom name from enrollments
      const enrollment = enrollments.find((e: any) => e.classroom_id === classroomId)
      const classroomName = (enrollment?.classrooms as any)?.name || 'Unknown'

      for (const vs of virtualSessions) {
        sessions.push({
          id: vs.id,
          classroomId: vs.classroom_id,
          classroomName: classroomName,
          date: vs.date,
          startTime: vs.start_time,
          endTime: vs.end_time,
          isVirtual: true
        })
      }
    }

    // Sort by start time
    sessions.sort((a, b) => a.startTime.localeCompare(b.startTime))

    return { data: sessions, error: null }
  } catch (err) {
    console.error('Exception finding sessions:', err)
    return { data: null, error: 'An error occurred while finding sessions' }
  }
}

/**
 * Perform check-in for a student across all their today's sessions
 */
export async function performCheckIn(
  studentId: string,
  studentName: string,
  sessions: SessionForCheckIn[],
  note: string = 'Self check-in'
): Promise<{ results: CheckInResult[]; error: string | null }> {
  try {
    if (sessions.length === 0) {
      return { results: [], error: 'No sessions to check into' }
    }

    const results: CheckInResult[] = []
    const now = new Date()

    for (const session of sessions) {
      let actualSessionId = session.id

      // If it's a virtual session, materialize it first
      if (session.isVirtual) {
        const virtualSession: VirtualSession = {
          id: session.id,
          classroom_id: session.classroomId,
          date: session.date,
          start_time: session.startTime,
          end_time: session.endTime,
          status: 'scheduled',
          is_virtual: true,
          location: null,
          notes: null,
          substitute_teacher: null,
          created_at: null,
          updated_at: null,
          deleted_at: null
        }

        const { data: materializedSession, error: materializeError } = await materializeSession(virtualSession)

        if (materializeError || !materializedSession) {
          results.push({
            sessionId: session.id,
            classroomName: session.classroomName,
            status: 'present',
            alreadyCheckedIn: false,
            error: 'Failed to create session'
          })
          continue
        }

        actualSessionId = materializedSession.id
      }

      // Determine status based on current time vs session start time
      const [hours, minutes] = session.startTime.split(':').map(Number)
      const sessionStartTime = new Date()
      sessionStartTime.setHours(hours, minutes, 0, 0)

      const status: 'present' | 'late' = now > sessionStartTime ? 'late' : 'present'

      // Check if attendance record already exists
      const { data: existing, error: existingError } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('classroom_session_id', actualSessionId)
        .eq('student_id', studentId)
        .maybeSingle()

      if (existingError) {
        results.push({
          sessionId: actualSessionId,
          classroomName: session.classroomName,
          status: status,
          alreadyCheckedIn: false,
          error: 'Failed to check attendance status'
        })
        continue
      }

      if (existing) {
        // Already checked in
        results.push({
          sessionId: actualSessionId,
          classroomName: session.classroomName,
          status: existing.status as 'present' | 'late',
          alreadyCheckedIn: true
        })
        continue
      }

      // Look up student_record_id from classroom_students
      const { data: classroomStudent } = await supabase
        .from('classroom_students')
        .select('student_record_id')
        .eq('classroom_id', session.classroomId)
        .eq('student_id', studentId)
        .maybeSingle()

      // Create new attendance record
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          classroom_session_id: actualSessionId,
          student_id: studentId,
          student_record_id: classroomStudent?.student_record_id,
          status: status,
          note: note
        })

      if (insertError) {
        console.error('Error creating attendance:', insertError)
        results.push({
          sessionId: actualSessionId,
          classroomName: session.classroomName,
          status: status,
          alreadyCheckedIn: false,
          error: 'Failed to record attendance'
        })
        continue
      }

      results.push({
        sessionId: actualSessionId,
        classroomName: session.classroomName,
        status: status,
        alreadyCheckedIn: false
      })
    }

    // Trigger notifications for successful check-ins (not already checked in)
    const successfulCheckIns = results.filter(r => !r.error && !r.alreadyCheckedIn)
    if (successfulCheckIns.length > 0) {
      const classroomNames = successfulCheckIns.map(r => r.classroomName)
      const statuses = successfulCheckIns.map(r => r.status)

      // Fire and forget - don't block on notification sending
      triggerSelfCheckInNotifications(studentId, studentName, classroomNames, statuses)
        .catch(err => console.error('Error sending self check-in notifications:', err))
    }

    return { results, error: null }
  } catch (err) {
    console.error('Exception during check-in:', err)
    return { results: [], error: 'An error occurred during check-in' }
  }
}
