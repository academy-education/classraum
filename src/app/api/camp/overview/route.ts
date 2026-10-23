import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { classifyWork, needsAttention, summarizeWork, type CampWorkItem } from '@/lib/camp/metrics'
import { canViewProgramResults } from '@/lib/camp/access'
import { kstDate } from '@/lib/camp/dates'
import { loadProgramRooms } from '@/lib/camp/program-data'
import { CampDailyAccumulator, campDayRange } from '@/lib/camp/daily'

/**
 * GET /api/camp/overview?programId=…
 *
 * Program-level stats strip for the camp dashboard — one row of numbers
 * across ALL of the program's classrooms:
 *   - studentsEnrolled: distinct students across the program's
 *     classrooms, vs student_cap
 *   - completion: done camp sessions / expected, where expected is
 *     Σ per classroom (assignments × enrolled students)
 *   - averageScorePct: mean per-session score over completed camp
 *     sessions with a graded total
 *   - skillsToReview: cohort domains below the accuracy threshold the
 *     dashboard UI treats as "good" (70%, its green band), counted only
 *     where the dashboard's min-answers rule is met
 *   - reviewTopics: the domains behind that count (section, domain,
 *     accuracy, n), weakest first — the "suggested topics for teacher
 *     review" card
 *   - trend: completed graded camp sessions bucketed by completion DAY
 *     (UTC date of completed_at), average score per day, oldest first —
 *     the average-score trend line
 *   - assignmentStatus: (assignment × enrolled student) pairs classified
 *     for the status donut by classifyWork (src/lib/camp/metrics.ts, the
 *     one definition every camp surface uses):
 *       completed = the student's camp session for it is completed
 *       late      = past due_at, a session exists but is not completed
 *       missing   = past due_at, never started
 *       open      = not completed but not past due (or no due date) —
 *                   reported for the denominator note, outside the donut
 *   - needsAttention: one row per (classroom, student) with anything
 *     overdue or something unstarted due today (KST), most overdue first
 *   - daily: one point per KST camp day, starts_on .. min(today, ends_on),
 *     with completion of the work due that day, attendance for the camp
 *     classrooms' sessions that day, and the average score with n. Each
 *     metric is null (a gap), never 0, on a day it has no denominator.
 *     Definitions: src/lib/camp/daily.ts
 *
 * Reuses loadClassroomCampData (src/lib/camp/reports.ts) per classroom,
 * loaded in parallel (loadProgramRooms) —
 * the same loader the dashboard-adjacent report builder uses, with the
 * same paged reads and session/attempt filters, so these numbers agree
 * with the per-classroom dashboard by construction.
 *
 * Read-only; academy managers and camp teachers of THIS program.
 */

export const dynamic = 'force-dynamic'

/** Same value as the dashboard route's MIN_ANSWERS_FOR_RANKING — below
 *  this many graded answers a domain is noise, not a signal. */
const MIN_ANSWERS_FOR_RANKING = 5

/** The dashboard UI's green band starts at 70% accuracy
 *  (CampClassroomDashboard skill bars); below it a domain needs review. */
const REVIEW_ACCURACY_THRESHOLD = 70

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const programId = req.nextUrl.searchParams.get('programId')
  if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 })

  const { data: program } = await dbAdmin
    .from('camp_programs')
    .select('id, academy_id, student_cap, starts_on, ends_on')
    .eq('id', programId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  // Study results: academy managers and CAMP TEACHERS OF THIS PROGRAM
  // only (owner rule 2026-10-07, src/lib/camp/access.ts). This used to
  // admit every teacher of the academy — a regular academy teacher, or
  // the teacher of a different camp, could read every camp student's
  // scores here.
  if (!(await canViewProgramResults(user.id, program))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: classrooms, error: classroomsError } = await dbAdmin
    .from('classrooms')
    .select('id, name')
    .eq('camp_program_id', programId)
    // Same academy only, as /api/camp/program does: a classroom in ANOTHER academy pointed at this program can only
    // exist through the pre-122 write gap, and its roster is not this camp's.
    .eq('academy_id', program.academy_id)
    .is('deleted_at', null)
  if (classroomsError) {
    return NextResponse.json({ error: classroomsError.message }, { status: 500 })
  }

  const enrolled = new Set<string>()
  let expected = 0
  let doneSessions = 0
  let scoreSum = 0
  let scoredSessions = 0
  const byDomain = new Map<string, { section: string; domain: string; correct: number; total: number }>()
  /** avg-score trend buckets: UTC day of completed_at → graded sums. */
  const byDay = new Map<string, { sum: number; n: number }>()
  const status = { completed: 0, late: 0, missing: 0, open: 0 }
  const now = new Date()
  const attention: Array<{
    studentId: string
    name: string | null
    email: string | null
    classroomId: string
    classroomName: string
    overdue: number
    late: number
    missing: number
    dueTodayNotStarted: number
  }> = []

  const daily = new CampDailyAccumulator()
  const loadedRooms = await loadProgramRooms(
    (classrooms ?? []).map(r => ({ id: r.id as string, name: r.name as string })),
    programId,
    program.academy_id as string,
  )
  if ('error' in loadedRooms) return NextResponse.json({ error: loadedRooms.error }, { status: 500 })

  for (const { id: roomId, name: roomName, data } of loadedRooms.rooms) {

    for (const sid of data.studentIds) enrolled.add(sid)
    expected += data.assignments.length * data.studentIds.length

    for (const s of data.sessionByKey.values()) {
      if (s.status !== 'completed') continue
      doneSessions += 1
      if (s.correct_count !== null && s.total_count !== null && s.total_count > 0) {
        const scorePct = (100 * s.correct_count) / s.total_count
        scoreSum += scorePct
        scoredSessions += 1
        if (s.completed_at) {
          daily.addScore(s.completed_at, scorePct)
          const day = kstDate(s.completed_at)
          const bucket = byDay.get(day) ?? { sum: 0, n: 0 }
          bucket.sum += scorePct
          bucket.n += 1
          byDay.set(day, bucket)
        }
      }
    }

    // Assignment-status donut: classify every (assignment × enrolled
    // student) pair. `late` and `missing` only exist once due_at has
    // passed — before the deadline an unfinished pair is `open`.
    // The same per-pair items feed the Needs-attention list, so the card and the donut cannot disagree.
    for (const studentId of data.studentIds) {
      const items: CampWorkItem[] = data.assignments.map(a => {
        const s = data.sessionByKey.get(`${a.id}:${studentId}`)
        return {
          dueAt: a.due_at,
          started: !!s,
          completed: s?.status === 'completed',
          completedAt: s?.status === 'completed' ? s.completed_at : null,
        }
      })
      for (const w of items) {
        status[classifyWork(w, now)] += 1
        if (w.dueAt) daily.addDue(w.dueAt, w.completed)
      }
      const summary = summarizeWork(items, now)
      if (needsAttention(summary)) {
        const info = data.usersById.get(studentId)
        attention.push({
          studentId,
          name: info?.name ?? null,
          email: info?.email ?? null,
          classroomId: roomId,
          classroomName: roomName,
          overdue: summary.overdue,
          late: summary.late,
          missing: summary.missing,
          dueTodayNotStarted: summary.dueTodayNotStarted,
        })
      }
    }

    for (const perDomain of data.skillsByStudent.values()) {
      for (const [key, agg] of perDomain) {
        const merged = byDomain.get(key)
          ?? { section: agg.section, domain: agg.domain, correct: 0, total: 0 }
        merged.correct += agg.correct
        merged.total += agg.total
        byDomain.set(key, merged)
      }
    }
  }

  // Weakest first; same eligibility rule as the count (min answers, and
  // accuracy below the dashboard's green band).
  const reviewTopics = [...byDomain.values()]
    .filter(d => d.total >= MIN_ANSWERS_FOR_RANKING &&
      Math.round((100 * d.correct) / d.total) < REVIEW_ACCURACY_THRESHOLD)
    .map(d => ({
      section: d.section,
      domain: d.domain,
      accuracy: Math.round((100 * d.correct) / d.total),
      n: d.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.n - a.n)
  const skillsToReview = reviewTopics.length

  // Attendance for the camp classrooms' sessions, by session date. Read errors are a 500: an attendance line
  // that silently drops to nothing would read as "nobody came".
  const roomIds = loadedRooms.rooms.map(r => r.id)
  const today = kstDate()
  const rangeStart = (program.starts_on as string | null) ?? null
  const rangeEnd = (program.ends_on as string | null) && (program.ends_on as string) < today ? (program.ends_on as string) : today
  if (roomIds.length > 0) {
    let sessionsQ = dbAdmin
      .from('classroom_sessions')
      .select('id, date')
      .in('classroom_id', roomIds)
      .is('deleted_at', null)
      .lte('date', rangeEnd)
    if (rangeStart) sessionsQ = sessionsQ.gte('date', rangeStart)
    const PAGE = 1000
    const sessionDate = new Map<string, string>()
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error } = await sessionsQ.order('id', { ascending: true }).range(from, from + PAGE - 1)
      if (error) return NextResponse.json({ error: `camp sessions query failed: ${error.message}` }, { status: 500 })
      for (const r of rows ?? []) sessionDate.set(r.id as string, r.date as string)
      if (!rows || rows.length < PAGE) break
    }
    const sessionIds = [...sessionDate.keys()]
    const CHUNK = 200
    for (let i = 0; i < sessionIds.length; i += CHUNK) {
      const chunk = sessionIds.slice(i, i + CHUNK)
      for (let from = 0; ; from += PAGE) {
        const { data: rows, error } = await dbAdmin
          .from('attendance')
          .select('id, classroom_session_id, status')
          .in('classroom_session_id', chunk)
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1)
        if (error) return NextResponse.json({ error: `camp attendance query failed: ${error.message}` }, { status: 500 })
        for (const r of rows ?? []) {
          const date = sessionDate.get(r.classroom_session_id as string)
          if (date) daily.addAttendance(date, r.status as string | null)
        }
        if (!rows || rows.length < PAGE) break
      }
    }
  }
  const dailySeries = daily.series(
    campDayRange(rangeStart, (program.ends_on as string | null) ?? null, today, daily.earliestDay()),
  )

  const trend = [...byDay.entries()]
    .map(([date, b]) => ({ date, avgPct: Math.round(b.sum / b.n), sessions: b.n }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    programId,
    studentsEnrolled: enrolled.size,
    studentCap: program.student_cap as number,
    completion: {
      done: doneSessions,
      expected,
      pct: expected > 0 ? Math.round((100 * doneSessions) / expected) : 0,
    },
    averageScorePct: scoredSessions > 0 ? Math.round(scoreSum / scoredSessions) : null,
    scoredSessions,
    skillsToReview: {
      count: skillsToReview,
      accuracyThreshold: REVIEW_ACCURACY_THRESHOLD,
      minAnswers: MIN_ANSWERS_FOR_RANKING,
    },
    reviewTopics,
    trend,
    daily: dailySeries,
    assignmentStatus: status,
    needsAttention: attention.sort((a, b) =>
      b.overdue - a.overdue ||
      b.dueTodayNotStarted - a.dueTodayNotStarted ||
      (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '')),
  })
}
