/**
 * Canonical status enums for the database's CHECK-constrained text columns.
 *
 * These mirror the DB constraints verbatim — if you add or rename a status,
 * update the migration AND this file in the same commit. The generated
 * `database.types.ts` types these columns as bare `string`, so this file is
 * the source of truth for the application layer.
 *
 * Background: we previously had a silent mismatch where the report page
 * compared against `'not_submitted'` (underscore) while the DB CHECK only
 * allowed `'not submitted'` (space). Result: non-submitted assignments
 * never appeared in the report. Use these unions everywhere instead of
 * inline string literals so the next mismatch becomes a compile error.
 *
 * Verified against live DB on 2026-05-25 (migrations 001–032).
 */

/** classroom_sessions.status */
export type ClassroomSessionStatus = 'scheduled' | 'completed' | 'cancelled'

/**
 * assignment_grades.status
 *
 * NOTE: 'not submitted' has a SPACE, not an underscore. The DB CHECK
 * constraint enforces this exact form. Some legacy code defensively
 * checked both forms — that workaround is no longer needed.
 */
export type AssignmentGradeStatus =
  | 'pending'
  | 'submitted'
  | 'not submitted'
  | 'excused'
  | 'overdue'

/** attendance.status */
export type AttendanceStatus =
  | 'pending'
  | 'present'
  | 'absent'
  | 'excused'
  | 'late'

/** invoices.status */
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded'

/**
 * student_reports.status
 *
 * Not enforced by a DB CHECK constraint as of 2026-05-25 — application code
 * is the only enforcement. Listed here for completeness and to make the
 * report-status workflow legible.
 */
export type StudentReportStatus =
  | 'Draft'
  | 'Finished'
  | 'Approved'
  | 'Sent'
  | 'Viewed'
  | 'Error'

/* ──────────────────────────────────────────────────────────────────────────
 * Type guards — use when narrowing untyped data from the DB or external APIs.
 * ────────────────────────────────────────────────────────────────────────── */

const ASSIGNMENT_GRADE_STATUSES: readonly AssignmentGradeStatus[] = [
  'pending',
  'submitted',
  'not submitted',
  'excused',
  'overdue',
] as const

export function isAssignmentGradeStatus(v: unknown): v is AssignmentGradeStatus {
  return typeof v === 'string' && (ASSIGNMENT_GRADE_STATUSES as readonly string[]).includes(v)
}

const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  'pending',
  'present',
  'absent',
  'excused',
  'late',
] as const

export function isAttendanceStatus(v: unknown): v is AttendanceStatus {
  return typeof v === 'string' && (ATTENDANCE_STATUSES as readonly string[]).includes(v)
}

const CLASSROOM_SESSION_STATUSES: readonly ClassroomSessionStatus[] = [
  'scheduled',
  'completed',
  'cancelled',
] as const

export function isClassroomSessionStatus(v: unknown): v is ClassroomSessionStatus {
  return typeof v === 'string' && (CLASSROOM_SESSION_STATUSES as readonly string[]).includes(v)
}

const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'pending',
  'paid',
  'failed',
  'refunded',
] as const

export function isInvoiceStatus(v: unknown): v is InvoiceStatus {
  return typeof v === 'string' && (INVOICE_STATUSES as readonly string[]).includes(v)
}
