/**
 * Runtime narrowing for the columns Postgres constrains with a CHECK but
 * exposes as plain `text`.
 *
 * The generated `Database` types can only say `string` for these, because a
 * CHECK constraint is not a Postgres enum. The UI, however, switches on the
 * exact literal set. These guards close that gap honestly: they verify the
 * value at runtime instead of asserting it away with a cast, so a row that
 * somehow violates the constraint degrades to a defined default rather than
 * flowing through the UI as an impossible literal.
 *
 * Keep each list in sync with the matching CHECK constraint:
 *   classroom_sessions_status_check   scheduled | completed | cancelled
 *   classroom_sessions_location_check offline | online
 *   attendance_status_check           pending | present | absent | excused | late
 *   assignments_assignment_type_check quiz | homework | test | project
 *   recurring_payment_templates_...    monthly | weekly | semesterly
 */

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'
export type SessionLocation = 'offline' | 'online'
export type AttendanceStatus = 'pending' | 'present' | 'absent' | 'excused' | 'late'
export type AssignmentType = 'quiz' | 'homework' | 'test' | 'project'
export type RecurrenceType = 'monthly' | 'weekly' | 'semesterly'

export function isSessionStatus(value: string): value is SessionStatus {
  return value === 'scheduled' || value === 'completed' || value === 'cancelled'
}

export function isSessionLocation(value: string): value is SessionLocation {
  return value === 'offline' || value === 'online'
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (
    value === 'pending' ||
    value === 'present' ||
    value === 'absent' ||
    value === 'excused' ||
    value === 'late'
  )
}

export function isAssignmentType(value: string): value is AssignmentType {
  return value === 'quiz' || value === 'homework' || value === 'test' || value === 'project'
}

/** Unrecognised statuses fall back to 'scheduled' — the pre-completion state. */
export function toSessionStatus(value: string): SessionStatus {
  return isSessionStatus(value) ? value : 'scheduled'
}

/** Unrecognised locations fall back to 'offline' — the schema's common case. */
export function toSessionLocation(value: string): SessionLocation {
  return isSessionLocation(value) ? value : 'offline'
}

/** Unrecognised statuses fall back to 'pending' — "not yet marked". */
export function toAttendanceStatus(value: string): AttendanceStatus {
  return isAttendanceStatus(value) ? value : 'pending'
}

/** Unrecognised types fall back to 'homework' — the default assignment kind. */
export function toAssignmentType(value: string): AssignmentType {
  return isAssignmentType(value) ? value : 'homework'
}

export function isRecurrenceType(value: string): value is RecurrenceType {
  return value === 'monthly' || value === 'weekly' || value === 'semesterly'
}

/** Unrecognised recurrences fall back to 'monthly' — the schema's common case. */
export function toRecurrenceType(value: string): RecurrenceType {
  return isRecurrenceType(value) ? value : 'monthly'
}
