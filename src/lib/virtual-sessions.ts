import { format, addDays, isWithinInterval, parseISO } from 'date-fns'
import { supabase } from './supabase'

// Virtual session interface extending the regular Session
export interface VirtualSession {
  id: string // Format: virtual-{classroom_id}-{date}-{start_time}
  classroom_id: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  status: 'scheduled' // Always scheduled for virtual sessions
  is_virtual: true
  location: string | null
  notes: string | null
  substitute_teacher: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ScheduleBreak {
  id: string
  classroom_id: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  reason: string | null
  created_at: string
  updated_at: string
}

export interface ClassroomSchedule {
  id: string
  classroom_id: string
  day: number | string // 0-6 (number) or 'Sunday'-'Saturday' (string)
  start_time: string // HH:MM
  end_time: string // HH:MM
}

// Map day names to numbers for compatibility
const DAY_NAME_TO_NUMBER: { [key: string]: number } = {
  'Sunday': 0,
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6
}

/**
 * Normalizes a day value to a number (0-6)
 * Accepts either a number or a day name string
 */
function normalizeDayToNumber(day: number | string): number {
  if (typeof day === 'number') return day
  return DAY_NAME_TO_NUMBER[day] ?? -1
}

/**
 * Generates a deterministic ID for a virtual session
 */
export function generateVirtualId(
  classroomId: string,
  date: string,
  startTime: string
): string {
  return `virtual-${classroomId}-${date}-${startTime}`
}

/**
 * Checks if a virtual session ID is valid
 */
export function isVirtualSession(sessionId: string): boolean {
  return sessionId.startsWith('virtual-')
}

/**
 * Parses a virtual session ID to extract classroom_id, date, and start_time
 */
export function parseVirtualId(virtualId: string): {
  classroom_id: string
  date: string
  start_time: string
} | null {
  if (!isVirtualSession(virtualId)) return null

  const parts = virtualId.replace('virtual-', '').split('-')
  if (parts.length < 5) return null // UUID has 5 parts + date (3 parts) + time (2 parts)

  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 parts)
  const classroom_id = parts.slice(0, 5).join('-')
  const date = parts.slice(5, 8).join('-')
  const start_time = parts.slice(8).join('-')

  return { classroom_id, date, start_time }
}

/**
 * Checks if a date falls within any schedule break
 */
export function isDateInBreaks(
  date: Date,
  breaks: ScheduleBreak[]
): boolean {
  return breaks.some(brk => {
    try {
      const startDate = parseISO(brk.start_date)
      const endDate = parseISO(brk.end_date)
      return isWithinInterval(date, { start: startDate, end: endDate })
    } catch {
      return false
    }
  })
}

/**
 * Generates virtual sessions for a classroom within a date range
 * Excludes dates that fall within schedule breaks
 */
export function generateVirtualSessionsForDateRange(
  classroom_id: string,
  schedules: ClassroomSchedule[],
  breaks: ScheduleBreak[],
  startDate: Date,
  endDate: Date
): VirtualSession[] {
  const virtualSessions: VirtualSession[] = []
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    // Skip if date is in breaks
    if (!isDateInBreaks(currentDate, breaks)) {
      const dayOfWeek = currentDate.getDay()

      // Find schedules for this day of week (support both numeric and string day values)
      const daySchedules = schedules.filter(s => normalizeDayToNumber(s.day) === dayOfWeek)

      for (const schedule of daySchedules) {
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        const virtualId = generateVirtualId(classroom_id, dateStr, schedule.start_time)

        virtualSessions.push({
          id: virtualId,
          classroom_id,
          date: dateStr,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          status: 'scheduled',
          is_virtual: true,
          location: null,
          notes: null,
          substitute_teacher: null,
          created_at: null,
          updated_at: null,
          deleted_at: null
        })
      }
    }

    currentDate = addDays(currentDate, 1)
  }

  return virtualSessions
}

/**
 * Materializes a virtual session by converting it to a real session in the database
 * Uses upsert to ensure idempotency (safe for concurrent operations)
 *
 * @param virtualSession - The virtual session to materialize
 * @param additionalData - Optional additional data to include in the materialized session
 * @returns The materialized session data or error
 */
export async function materializeSession(
  virtualSession: VirtualSession,
  additionalData?: {
    location?: string
    notes?: string
    substitute_teacher?: string
    status?: 'scheduled' | 'completed' | 'cancelled'
  }
) {
  try {
    console.log('Materializing virtual session:', virtualSession)
    console.log('Additional data:', additionalData)

    const sessionData = {
      classroom_id: virtualSession.classroom_id,
      date: virtualSession.date,
      start_time: virtualSession.start_time,
      end_time: virtualSession.end_time,
      status: additionalData?.status || 'scheduled',
      location: additionalData?.location || virtualSession.location || 'offline', // Default to 'offline' if null
      notes: additionalData?.notes || virtualSession.notes || null,
      substitute_teacher: additionalData?.substitute_teacher || null // substitute_teacher should be UUID or null
    }

    // Check if session already exists (materialized)
    const { data: existing } = await supabase
      .from('classroom_sessions')
      .select('id')
      .eq('classroom_id', sessionData.classroom_id)
      .eq('date', sessionData.date)
      .eq('start_time', sessionData.start_time)
      .is('deleted_at', null)
      .single()

    // If already exists, return it
    if (existing) {
      const { data: existingFull, error: fetchError } = await supabase
        .from('classroom_sessions')
        .select('*')
        .eq('id', existing.id)
        .single()

      return { data: existingFull, error: fetchError }
    }

    // Insert new session
    const { data, error } = await supabase
      .from('classroom_sessions')
      .insert(sessionData)
      .select()
      .single()

    if (error) {
      console.error('Error materializing session:', JSON.stringify(error, null, 2))
      console.error('Session data attempted:', JSON.stringify(sessionData, null, 2))
      return { data: null, error }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Exception during materialization:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error during materialization')
    }
  }
}

/**
 * Fetches schedule breaks for a classroom
 */
export async function fetchScheduleBreaks(
  classroom_id: string
): Promise<{ data: ScheduleBreak[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('schedule_breaks')
      .select('*')
      .eq('classroom_id', classroom_id)
      .order('start_date')

    return { data, error }
  } catch (err) {
    console.error('Error fetching schedule breaks:', err)
    return { data: null, error: err }
  }
}

/**
 * Fetches classroom schedules
 */
export async function fetchClassroomSchedules(
  classroom_id: string
): Promise<{ data: ClassroomSchedule[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('classroom_schedules')
      .select('*')
      .eq('classroom_id', classroom_id)
      .order('day')

    return { data, error }
  } catch (err) {
    console.error('Error fetching classroom schedules:', err)
    return { data: null, error: err }
  }
}

/**
 * Generates all sessions (virtual + real) for a date range
 * This is the main function to use in the UI
 *
 * @param classroom_id - The classroom to generate sessions for
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param realSessions - Existing real sessions from the database
 * @returns Combined array of virtual and real sessions, with duplicates removed
 */
export async function getSessionsForDateRange(
  classroom_id: string,
  startDate: Date,
  endDate: Date,
  realSessions: any[] // Existing sessions from DB
): Promise<any[]> {
  // Fetch schedules and breaks
  const { data: schedules, error: schedulesError } = await fetchClassroomSchedules(classroom_id)
  const { data: breaks, error: breaksError } = await fetchScheduleBreaks(classroom_id)

  if (schedulesError || !schedules) {
    console.error('Error fetching schedules:', schedulesError)
    return realSessions // Return only real sessions if we can't fetch schedules
  }

  if (breaksError) {
    console.warn('Error fetching breaks:', breaksError)
  }

  // Generate virtual sessions
  const virtualSessions = generateVirtualSessionsForDateRange(
    classroom_id,
    schedules,
    breaks || [],
    startDate,
    endDate
  )

  // Create a set of existing real session keys (classroom_id + date + start_time)
  const realSessionKeys = new Set(
    realSessions
      .filter(s => !s.deleted_at) // Exclude deleted sessions
      .map(s => `${s.classroom_id}-${s.date}-${s.start_time}`)
  )

  // Filter out virtual sessions that have been materialized
  const uniqueVirtualSessions = virtualSessions.filter(vs => {
    const key = `${vs.classroom_id}-${vs.date}-${vs.start_time}`
    return !realSessionKeys.has(key)
  })

  // Combine real and virtual sessions
  const allSessions = [
    ...realSessions.filter(s => !s.deleted_at),
    ...uniqueVirtualSessions
  ]

  return allSessions
}
