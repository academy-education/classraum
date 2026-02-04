// Schedule Update Library
// Handles updating classroom schedules with different strategies for virtual sessions

import { supabase } from '@/lib/supabase'
import { generateVirtualSessionsForDateRange } from './virtual-sessions'
import { format, addDays } from 'date-fns'

export interface ScheduleUpdateOptions {
  updateStrategy: 'future_only' | 'from_date' | 'materialize_existing'
  effectiveDate?: string // ISO date string for 'from_date' option
}

export interface ClassroomSchedule {
  id: string
  classroom_id: string
  day: number | string
  start_time: string
  end_time: string
  effective_from?: string | null
  effective_until?: string | null
  created_at?: string | null
  deleted_at?: string | null
}

export interface ScheduleUpdateResult {
  success: boolean
  newSchedule?: ClassroomSchedule
  materializedCount?: number
  error?: any
}

/**
 * Main function to update a classroom schedule with user-selected strategy
 */
export async function updateClassroomSchedule(
  scheduleId: string,
  newScheduleData: Partial<ClassroomSchedule>,
  options: ScheduleUpdateOptions
): Promise<ScheduleUpdateResult> {
  try {
    switch (options.updateStrategy) {
      case 'future_only':
        return await updateFromToday(supabase, scheduleId, newScheduleData)

      case 'from_date':
        if (!options.effectiveDate) {
          throw new Error('effectiveDate is required for from_date strategy')
        }
        return await updateFromDate(supabase, scheduleId, newScheduleData, options.effectiveDate)

      case 'materialize_existing':
        return await materializeAndUpdate(supabase, scheduleId, newScheduleData)

      default:
        throw new Error(`Unknown update strategy: ${options.updateStrategy}`)
    }
  } catch (error) {
    console.error('[Schedule Update] Error updating schedule:', error)
    return { success: false, error }
  }
}

/**
 * Strategy 1: Update from today onwards
 * - Sets effective_until on old schedule to yesterday
 * - Creates new schedule starting today
 */
async function updateFromToday(
  supabase: any,
  scheduleId: string,
  newScheduleData: Partial<ClassroomSchedule>
): Promise<ScheduleUpdateResult> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd')

  // Get current schedule
  const { data: currentSchedule, error: fetchError } = await supabase
    .from('classroom_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (fetchError || !currentSchedule) {
    return { success: false, error: fetchError || new Error('Schedule not found') }
  }

  // Set effective_until on old schedule (yesterday)
  const { error: updateError } = await supabase
    .from('classroom_schedules')
    .update({ effective_until: yesterday })
    .eq('id', scheduleId)

  if (updateError) {
    return { success: false, error: updateError }
  }

  // Create new schedule starting today
  const { data: newSchedule, error: insertError } = await supabase
    .from('classroom_schedules')
    .insert({
      classroom_id: currentSchedule.classroom_id,
      day: newScheduleData.day ?? currentSchedule.day,
      start_time: newScheduleData.start_time ?? currentSchedule.start_time,
      end_time: newScheduleData.end_time ?? currentSchedule.end_time,
      effective_from: today,
      effective_until: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError }
  }

  console.log('[Schedule Update] Updated from today:', { scheduleId, newSchedule })
  return { success: true, newSchedule }
}

/**
 * Strategy 2: Update from specific date
 * - Sets effective_until on old schedule to day before effective date
 * - Creates new schedule starting from effective date
 */
async function updateFromDate(
  supabase: any,
  scheduleId: string,
  newScheduleData: Partial<ClassroomSchedule>,
  effectiveDate: string
): Promise<ScheduleUpdateResult> {
  // Get current schedule
  const { data: currentSchedule, error: fetchError } = await supabase
    .from('classroom_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (fetchError || !currentSchedule) {
    return { success: false, error: fetchError || new Error('Schedule not found') }
  }

  // Calculate day before effective date
  const effectiveDateObj = new Date(effectiveDate)
  const dayBefore = format(addDays(effectiveDateObj, -1), 'yyyy-MM-dd')

  // Set effective_until on old schedule
  const { error: updateError } = await supabase
    .from('classroom_schedules')
    .update({ effective_until: dayBefore })
    .eq('id', scheduleId)

  if (updateError) {
    return { success: false, error: updateError }
  }

  // Create new schedule
  const { data: newSchedule, error: insertError } = await supabase
    .from('classroom_schedules')
    .insert({
      classroom_id: currentSchedule.classroom_id,
      day: newScheduleData.day ?? currentSchedule.day,
      start_time: newScheduleData.start_time ?? currentSchedule.start_time,
      end_time: newScheduleData.end_time ?? currentSchedule.end_time,
      effective_from: effectiveDate,
      effective_until: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (insertError) {
    return { success: false, error: insertError }
  }

  console.log('[Schedule Update] Updated from date:', { scheduleId, effectiveDate, newSchedule })
  return { success: true, newSchedule }
}

/**
 * Strategy 3: Materialize existing virtual sessions
 * - Generates all virtual sessions from today to 6 months with OLD schedule
 * - Converts them to real sessions (materializes)
 * - Then updates schedule for future dates
 */
async function materializeAndUpdate(
  supabase: any,
  scheduleId: string,
  newScheduleData: Partial<ClassroomSchedule>
): Promise<ScheduleUpdateResult> {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 6) // 6 months ahead

  // Get current schedule
  const { data: currentSchedule, error: fetchError } = await supabase
    .from('classroom_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (fetchError || !currentSchedule) {
    return { success: false, error: fetchError || new Error('Schedule not found') }
  }

  // Generate all virtual sessions with OLD schedule
  const virtualSessions = generateVirtualSessionsForDateRange(
    currentSchedule.classroom_id,
    [currentSchedule],
    [], // no breaks for now (you can fetch and pass breaks if needed)
    today,
    endDate
  )

  console.log('[Schedule Update] Generated virtual sessions to materialize:', virtualSessions.length)

  // Convert virtual sessions to real sessions
  const sessionsToInsert = virtualSessions.map(vs => ({
    classroom_id: vs.classroom_id,
    date: vs.date,
    start_time: vs.start_time,
    end_time: vs.end_time,
    status: 'scheduled',
    location: vs.location,
    notes: 'Auto-created from schedule change (preserving old schedule)'
  }))

  // Batch insert real sessions (use upsert to avoid duplicates)
  if (sessionsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('classroom_sessions')
      .upsert(sessionsToInsert, {
        onConflict: 'classroom_id,date,start_time',
        ignoreDuplicates: true
      })

    if (insertError) {
      console.error('[Schedule Update] Error materializing sessions:', insertError)
      return { success: false, error: insertError }
    }
  }

  // Now update the schedule for future (close old, create new)
  const yesterday = format(addDays(today, -1), 'yyyy-MM-dd')

  const { error: updateError } = await supabase
    .from('classroom_schedules')
    .update({ effective_until: yesterday })
    .eq('id', scheduleId)

  if (updateError) {
    return { success: false, error: updateError }
  }

  // Create new schedule starting today
  const { data: newSchedule, error: insertNewError } = await supabase
    .from('classroom_schedules')
    .insert({
      classroom_id: currentSchedule.classroom_id,
      day: newScheduleData.day ?? currentSchedule.day,
      start_time: newScheduleData.start_time ?? currentSchedule.start_time,
      end_time: newScheduleData.end_time ?? currentSchedule.end_time,
      effective_from: todayStr,
      effective_until: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (insertNewError) {
    return { success: false, error: insertNewError }
  }

  console.log('[Schedule Update] Materialized and updated:', {
    scheduleId,
    materializedCount: sessionsToInsert.length,
    newSchedule
  })

  return {
    success: true,
    newSchedule,
    materializedCount: sessionsToInsert.length
  }
}

/**
 * Check if a schedule change requires user decision
 */
export function requiresScheduleUpdateModal(
  oldSchedule: ClassroomSchedule,
  newSchedule: Partial<ClassroomSchedule>
): boolean {
  return (
    (newSchedule.start_time && oldSchedule.start_time !== newSchedule.start_time) ||
    (newSchedule.end_time && oldSchedule.end_time !== newSchedule.end_time) ||
    (newSchedule.day !== undefined && oldSchedule.day !== newSchedule.day)
  )
}
