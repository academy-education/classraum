import { reportClientError } from '@/lib/report-client-error'

/**
 * A student's attendance status for a list of class sessions.
 *
 * WHY THIS EXISTS (2026-10-04). The mobile home merges real
 * `classroom_sessions` rows with VIRTUAL ones generated from a recurring
 * class's schedule (`virtual-${classroomId}-${date}-${time}`, see
 * virtual-sessions.ts). Those ids were passed straight into
 * `.in('classroom_session_id', ids)`. `classroom_session_id` is a uuid
 * column, so Postgres rejected the WHOLE query (22P02) — taking the real
 * sessions in the same batch down with it — and the error was never read.
 * A student with any recurring class in range saw no attendance at all.
 *
 * So: only uuid-shaped ids are ever sent (a virtual session has no
 * attendance row by definition — it has not been materialised), and a query
 * error is reported to error_logs instead of being swallowed.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids that can exist in `classroom_sessions`: uuids only, deduped. */
export function realSessionIds(ids: ReadonlyArray<string | null | undefined>): string[] {
  const out = new Set<string>()
  for (const id of ids) {
    if (typeof id === 'string' && UUID_RE.test(id)) out.add(id)
  }
  return Array.from(out)
}

/** The narrow slice of the Supabase query builder this uses. */
interface AttendanceQuery {
  from(table: 'attendance'): {
    select(cols: string): {
      in(col: string, values: string[]): {
        eq(col: string, value: string): PromiseLike<{
          data: Array<{ classroom_session_id: string; status: string }> | null
          error: { message: string; code?: string } | null
        }>
      }
    }
  }
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused'

export interface AttendanceResult {
  map: Map<string, AttendanceStatus>
  /** Set when the query failed; already reported. */
  error: { message: string; code?: string } | null
}

export async function fetchStudentAttendance(
  client: AttendanceQuery,
  sessionIds: ReadonlyArray<string | null | undefined>,
  studentId: string,
  where: string
): Promise<AttendanceResult> {
  const map = new Map<string, AttendanceStatus>()
  const ids = realSessionIds(sessionIds)
  if (ids.length === 0 || !studentId) return { map, error: null }

  const { data, error } = await client
    .from('attendance')
    .select('classroom_session_id, status')
    .in('classroom_session_id', ids)
    .eq('student_id', studentId)

  if (error) {
    console.error(`[${where}] attendance query failed:`, error)
    reportClientError(where, error.message, {
      code: error.code ?? '',
      sessionCount: ids.length,
    })
    return { map, error }
  }

  for (const row of data ?? []) map.set(row.classroom_session_id, row.status as AttendanceStatus)
  return { map, error: null }
}
