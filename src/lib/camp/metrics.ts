/**
 * Camp work-state definitions: the ONE place "overdue", "not started", "late" and "completed late" are defined.
 *
 * Every camp surface that says one of these words (overview donut and Needs-attention card, Students tab chips
 * and filters, the classroom progress grid) calls into this file, so the same student cannot be "overdue" on one
 * screen and "on track" on another. Pure: no supabase import, so it runs in routes, components and jest alike.
 *
 * One unit of work = one (assignment x enrolled student) pair:
 *   started    a camp session exists for the pair
 *   completed  that session is completed
 *   dueAt      the assignment's due_at (null = no deadline, never overdue)
 *
 * Definitions (`now` is an instant; due_at is compared as an instant, not a date):
 *   overdue         due_at < now and not completed            (started or not)
 *   not started     no session at all                          (regardless of due date)
 *   late            started, not completed, due_at < now       (the started half of overdue)
 *   missing         not started, due_at < now                  (the unstarted half of overdue)
 *   completed late  completed, and completed_at > due_at
 *   due today       due on today's KOREAN date, not completed and not yet overdue
 */
import { kstDate } from '@/lib/camp/dates'

export interface CampWorkItem {
  dueAt: string | null
  started: boolean
  completed: boolean
  completedAt?: string | null
}

const ms = (iso: string) => new Date(iso).getTime()
// Date-parse rather than string-compare: PostgREST may emit the offset as +00:00 while toISOString() uses Z.
const pastDue = (w: CampWorkItem, now: Date) => w.dueAt !== null && ms(w.dueAt) < now.getTime()

export function isOverdue(w: CampWorkItem, now: Date = new Date()): boolean {
  return !w.completed && pastDue(w, now)
}

export function isNotStarted(w: CampWorkItem): boolean {
  return !w.started && !w.completed
}

export function isLate(w: CampWorkItem, now: Date = new Date()): boolean {
  return w.started && !w.completed && pastDue(w, now)
}

export function isMissing(w: CampWorkItem, now: Date = new Date()): boolean {
  return !w.started && !w.completed && pastDue(w, now)
}

export function isCompletedLate(w: CampWorkItem): boolean {
  return w.completed && w.dueAt !== null && !!w.completedAt && ms(w.completedAt) > ms(w.dueAt)
}

export function isDueToday(w: CampWorkItem, now: Date = new Date()): boolean {
  return w.dueAt !== null && !w.completed && !pastDue(w, now) && kstDate(w.dueAt) === kstDate(now)
}

/** The donut's buckets. `open` = not completed and not past due (or no due date): outside the ring. */
export type CampWorkBucket = 'completed' | 'late' | 'missing' | 'open'

export function classifyWork(w: CampWorkItem, now: Date = new Date()): CampWorkBucket {
  if (w.completed) return 'completed'
  if (isLate(w, now)) return 'late'
  if (isMissing(w, now)) return 'missing'
  return 'open'
}

export interface CampStudentWorkSummary {
  total: number
  completed: number
  started: number
  overdue: number
  late: number
  missing: number
  notStarted: number
  completedLate: number
  /** Not started and due today (KST), not yet overdue: the "do it today" list. */
  dueTodayNotStarted: number
}

export function summarizeWork(items: CampWorkItem[], now: Date = new Date()): CampStudentWorkSummary {
  const s: CampStudentWorkSummary = {
    total: items.length, completed: 0, started: 0, overdue: 0, late: 0, missing: 0,
    notStarted: 0, completedLate: 0, dueTodayNotStarted: 0,
  }
  for (const w of items) {
    if (w.completed) s.completed += 1
    if (w.started || w.completed) s.started += 1
    if (isOverdue(w, now)) s.overdue += 1
    if (isLate(w, now)) s.late += 1
    if (isMissing(w, now)) s.missing += 1
    if (isNotStarted(w)) s.notStarted += 1
    if (isCompletedLate(w)) s.completedLate += 1
    if (isNotStarted(w) && isDueToday(w, now)) s.dueTodayNotStarted += 1
  }
  return s
}

/** A student needs attention today when anything is overdue or something unstarted is due today. */
export function needsAttention(s: Pick<CampStudentWorkSummary, 'overdue' | 'dueTodayNotStarted'>): boolean {
  return s.overdue > 0 || s.dueTodayNotStarted > 0
}

/**
 * One category per student row, for the Students tab filter chips. Mutually exclusive, in this precedence:
 *   overdue      anything overdue
 *   not_started  has work, has started none of it (and nothing is overdue yet)
 *   on_track     everything else, including a student with no work assigned
 */
export type CampStudentCategory = 'overdue' | 'not_started' | 'on_track'

export function studentCategory(s: Pick<CampStudentWorkSummary, 'total' | 'started' | 'overdue'>): CampStudentCategory {
  if (s.overdue > 0) return 'overdue'
  if (s.total > 0 && s.started === 0) return 'not_started'
  return 'on_track'
}
