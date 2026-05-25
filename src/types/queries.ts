/**
 * Hand-modeled types for nested Supabase query results that the generated
 * `database.types.ts` can't infer cleanly (deep `.select('… nested …')` shapes,
 * `.rpc(...)` returns, etc.).
 *
 * Keep these in lockstep with the queries that produce them. Each interface
 * documents its source query so future refactors can verify the match.
 */

import type { AssignmentGradeStatus } from './db-enums'

/* ──────────────────────────────────────────────────────────────────────────
 * Student-report assignment grades
 *
 * Source: src/app/mobile/report/[id]/page.tsx
 *   1. Primary path — RPC `get_student_assignment_grades(...)` (defined in DB),
 *      which returns `assignment_data` as a JSONB built with jsonb_build_object.
 *   2. Fallback path — direct `from('assignment_grades').select('… nested …')`,
 *      then the row's `assignments` key is aliased into `assignment_data`.
 *
 * Both paths are normalised into the same shape (the code then renames
 * `assignment_data` → `assignments` for downstream consumers).
 * ────────────────────────────────────────────────────────────────────────── */

/** subjects join — RPC returns a single object or null; nested Supabase
 *  queries can return either an object or an array depending on FK
 *  cardinality declarations. Tolerate both. */
export type ReportSubjectJoin =
  | { id: string; name: string }
  | { id: string; name: string }[]
  | null

export interface ReportClassroomJoin {
  id: string
  name: string
  grade: string | null
  subjects: ReportSubjectJoin
}

export interface ReportClassroomSessionJoin {
  classroom_id: string
  classrooms: ReportClassroomJoin
}

export interface ReportAssignmentJoin {
  id: string
  title: string
  assignment_type: 'quiz' | 'homework' | 'test' | 'project' | string
  due_date: string
  assignment_categories_id: string | null
  classroom_session_id: string
  classroom_sessions: ReportClassroomSessionJoin
}

/**
 * A single row from `get_student_assignment_grades` after the local
 * normalisation step in mobile/report/[id]/page.tsx (lines ~294–312).
 * The `assignments` key holds the nested payload (called `assignment_data`
 * in the raw RPC/query result).
 */
export interface ReportAssignmentGrade {
  id: string
  status: AssignmentGradeStatus
  score: number | null
  updated_at: string
  submitted_date: string | null
  feedback?: string | null
  /** The nested assignment + classroom + classrooms + subjects payload. */
  assignments: ReportAssignmentJoin | null
}

/**
 * Helper to extract the subject name regardless of whether the join came
 * back as an object or a single-element array.
 */
export function getReportSubjectName(subjects: ReportSubjectJoin): string | null {
  if (!subjects) return null
  if (Array.isArray(subjects)) return subjects[0]?.name ?? null
  return subjects.name
}
