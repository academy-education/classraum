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
  /** Some callers select session id + date, others don't. */
  id?: string
  date?: string
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

/* ──────────────────────────────────────────────────────────────────────────
 * Student-mobile assignment-list RPCs
 *
 * Three RPCs fetch the mobile assignments+grades view:
 *   get_student_classrooms(student_uuid, academy_uuids)
 *     → TABLE(classroom_id uuid, classrooms jsonb)
 *   get_classroom_sessions(classroom_uuids)
 *     → TABLE(id uuid, classroom_id uuid, date date, start_time, end_time,
 *             status text, location text, classrooms jsonb)
 *   get_assignments_for_sessions(session_uuids)
 *     → TABLE(id uuid, title, description, due_date timestamptz,
 *             classroom_session_id uuid, assignment_type, assignment_categories_id,
 *             category_name)
 *
 * Note: the `classrooms` column is a JSON payload built by jsonb_build_object
 * inside the SQL function. Shape varies slightly per RPC — model what each
 * caller actually reads, not every possible field.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Sub-shape embedded in `classrooms` jsonb from get_student_classrooms /
 * get_classroom_sessions. The PostgREST jsonb payload includes whatever
 * the SQL function's jsonb_build_object emits — we model the fields the
 * mobile pages actually read.
 */
export interface MobileClassroomEmbed {
  id?: string
  name?: string
  color?: string
  subject?: string
  subjects?: { name?: string } | null
  teacher_id?: string
  academy_id?: string
}

/** Resolve a classroom join that may come back as object or 1-element array. */
export function unwrapClassroom(
  c: MobileClassroomEmbed | MobileClassroomEmbed[] | null | undefined
): MobileClassroomEmbed | null {
  if (!c) return null
  return Array.isArray(c) ? (c[0] ?? null) : c
}

export interface MobileStudentClassroomRow {
  classroom_id: string
  classrooms: MobileClassroomEmbed | MobileClassroomEmbed[]
}

export interface MobileClassroomSessionRow {
  id: string
  classroom_id: string
  date: string
  start_time: string | null
  end_time: string | null
  status: string  // 'scheduled' | 'completed' | 'cancelled' but the RPC returns text
  location: string | null
  classrooms?: MobileClassroomEmbed | null
}

export interface MobileAssignmentRow {
  id: string
  title: string
  description: string | null
  due_date: string
  classroom_session_id: string
  assignment_type: string
  assignment_categories_id: string | null
  category_name: string | null
  /** Not in the current RPC return, but some callers tolerate it for downstream
   *  components that expected created_at on legacy direct-query paths. */
  created_at?: string
}
