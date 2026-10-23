/**
 * The overview's daily trend: one point per Korean camp day. Pure (no supabase), so the arithmetic is tested
 * without the data layer.
 *
 * Each metric has its own denominator and is null, never 0, when that denominator is empty. A day with nothing due,
 * no attendance taken or no graded session is a GAP in the chart: plotting it as 0 would draw a collapse that
 * did not happen.
 *
 *   completionPct   of the (assignment x enrolled student) pairs DUE that day (KST date of due_at), the share
 *                   completed by now (at any time, before or after the deadline)
 *   attendancePct   of the attendance records MARKED for camp classrooms' sessions that day (status other than
 *                   'pending'), the share present or late
 *   avgScorePct     mean per-session score of graded camp sessions completed that day (KST), with n
 */
import { kstDate } from '@/lib/camp/dates'

export interface CampDailyPoint {
  date: string
  due: number
  completed: number
  completionPct: number | null
  attendanceMarked: number
  attended: number
  attendancePct: number | null
  scoreN: number
  avgScorePct: number | null
}

/** A runaway range (a mistyped year) must not produce thousands of points. */
export const MAX_CAMP_DAYS = 400

const addDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}

/**
 * Camp days from starts_on to min(today, ends_on), inclusive, as YYYY-MM-DD Korean dates. Empty before the camp
 * starts. With no starts_on, `fallbackStart` (the earliest day with any data) is used; with neither, empty.
 */
export function campDayRange(
  startsOn: string | null,
  endsOn: string | null,
  today: string = kstDate(),
  fallbackStart: string | null = null,
): string[] {
  const start = startsOn ?? fallbackStart
  if (!start) return []
  const end = endsOn && endsOn < today ? endsOn : today
  const days: string[] = []
  for (let d = start; d <= end && days.length < MAX_CAMP_DAYS; d = addDay(d)) days.push(d)
  return days
}

export class CampDailyAccumulator {
  private due = new Map<string, { due: number; completed: number }>()
  private att = new Map<string, { marked: number; attended: number }>()
  private score = new Map<string, { sum: number; n: number }>()

  /** One (assignment x student) pair with a due date. */
  addDue(dueAt: string, completed: boolean) {
    const day = kstDate(dueAt)
    const b = this.due.get(day) ?? { due: 0, completed: 0 }
    b.due += 1
    if (completed) b.completed += 1
    this.due.set(day, b)
  }

  /** One attendance record on a session dated `sessionDate` (classroom_sessions.date, already a calendar date). */
  addAttendance(sessionDate: string, status: string | null) {
    if (!status || status === 'pending') return
    const b = this.att.get(sessionDate) ?? { marked: 0, attended: 0 }
    b.marked += 1
    if (status === 'present' || status === 'late') b.attended += 1
    this.att.set(sessionDate, b)
  }

  /** One graded camp session completed at `completedAt`. */
  addScore(completedAt: string, scorePct: number) {
    const day = kstDate(completedAt)
    const b = this.score.get(day) ?? { sum: 0, n: 0 }
    b.sum += scorePct
    b.n += 1
    this.score.set(day, b)
  }

  /** Earliest day holding any data (the range fallback when a program has no starts_on). */
  earliestDay(): string | null {
    const all = [...this.due.keys(), ...this.att.keys(), ...this.score.keys()].sort()
    return all[0] ?? null
  }

  series(days: string[]): CampDailyPoint[] {
    return days.map(date => {
      const d = this.due.get(date)
      const a = this.att.get(date)
      const s = this.score.get(date)
      return {
        date,
        due: d?.due ?? 0,
        completed: d?.completed ?? 0,
        completionPct: d && d.due > 0 ? Math.round((100 * d.completed) / d.due) : null,
        attendanceMarked: a?.marked ?? 0,
        attended: a?.attended ?? 0,
        attendancePct: a && a.marked > 0 ? Math.round((100 * a.attended) / a.marked) : null,
        scoreN: s?.n ?? 0,
        avgScorePct: s && s.n > 0 ? Math.round(s.sum / s.n) : null,
      }
    })
  }
}
