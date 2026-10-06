/**
 * Camp report payload types — shared by the server-side builder
 * (src/lib/camp/reports.ts) and the client report view
 * (src/components/ui/camp/CampReportView.tsx). Keep this module free of
 * server imports: the view is a client component.
 */

/** 2 = mockTests removed (2026-10-07). Nothing gates on the number; it
 *  records which shape a snapshot was frozen in. */
export const CAMP_REPORT_PAYLOAD_VERSION = 2

/** Below this many graded answers a domain is reported in `skills` but
 *  never named a strength or weakness — same threshold the dashboard
 *  uses for skills-to-review. */
export const MIN_ANSWERS_FOR_STRENGTHS = 5

export interface CampReportSkill {
  section: string
  domain: string
  correct: number
  total: number
  accuracy: number
}

export interface CampReportAssignment {
  id: string
  title: string
  questionCount: number
  dueAt: string | null
  createdAt: string
  state: 'not_started' | 'in_progress' | 'done'
  correctCount: number | null
  totalCount: number | null
  scorePct: number | null
  completedAt: string | null
  /** The student's camp session for this assignment, when one exists —
   *  the key into GET /api/camp/student-session (teacher answer review). */
  sessionId: string | null
}

export interface CampReportPayload {
  version: number
  generatedAt: string
  program: { id: string; name: string; testFamily: string }
  classroom: { id: string; name: string }
  student: { id: string; name: string | null; email: string | null }
  period: { start: string | null; end: string | null }
  /** All non-review assignments of the classroom, oldest first — the
   *  score trend is this list filtered to state 'done'. */
  assignments: CampReportAssignment[]
  /** This student's accuracy per domain (SAT: bank domain column;
   *  TOEFL: ETS task tag), across all their camp sessions here. */
  skills: CampReportSkill[]
  strengths: CampReportSkill[]
  weaknesses: CampReportSkill[]
  /** Standing within the classroom, by overall camp accuracy among
   *  students with at least one graded answer. Percentile is the share
   *  of those classmates scoring strictly below; null when the student
   *  has no graded answers or stands alone. */
  cohort: {
    n: number
    studentAccuracy: number | null
    percentile: number | null
  }
  /** Teacher-facing only — the view routes strip this (null) for
   *  parents and students. */
  completion: { done: number; total: number; rate: number } | null
  // mockTests REMOVED 2026-10-07 (owner decision): it listed the
  // student's own personal Study full tests, which are not camp
  // assignments. Camp surfaces show camp-assignment sessions only; personal
  // Study stays private to the student. Snapshots written before then may
  // still carry the key (all 47 held [] on 2026-10-07); readers strip it
  // with withoutPersonalStudy().
}
