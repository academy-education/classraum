import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { isAcademyManager, isAcademyTeacher } from '@/lib/camp/api'
import { loadClassroomCampData } from '@/lib/camp/reports'

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
 *     for the status donut. Definitions (see classify() below):
 *       completed = the student's camp session for it is completed
 *       late      = past due_at, a session exists but is not completed
 *       missing   = past due_at, never started
 *       open      = not completed but not past due (or no due date) —
 *                   reported for the denominator note, outside the donut
 *
 * Reuses loadClassroomCampData (src/lib/camp/reports.ts) per classroom —
 * the same loader the dashboard-adjacent report builder uses, with the
 * same paged reads and session/attempt filters, so these numbers agree
 * with the per-classroom dashboard by construction.
 *
 * Read-only; academy managers and teachers.
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
    .select('id, academy_id, student_cap')
    .eq('id', programId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!program) return NextResponse.json({ error: 'camp program not found' }, { status: 404 })

  const [manager, teacher] = await Promise.all([
    isAcademyManager(user.id, program.academy_id),
    isAcademyTeacher(user.id, program.academy_id),
  ])
  if (!manager && !teacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: classrooms, error: classroomsError } = await dbAdmin
    .from('classrooms')
    .select('id, name')
    .eq('camp_program_id', programId)
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
  const nowMs = Date.now()

  for (const room of classrooms ?? []) {
    const data = await loadClassroomCampData({
      id: room.id as string,
      name: room.name as string,
      camp_program_id: programId,
    })
    if ('error' in data) return NextResponse.json({ error: data.error }, { status: 500 })

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
          const day = s.completed_at.slice(0, 10)
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
    for (const a of data.assignments) {
      // Date-parse rather than string-compare: PostgREST may emit the
      // offset as +00:00 while toISOString() uses Z.
      const pastDue = a.due_at !== null && new Date(a.due_at).getTime() < nowMs
      for (const studentId of data.studentIds) {
        const s = data.sessionByKey.get(`${a.id}:${studentId}`)
        if (s?.status === 'completed') status.completed += 1
        else if (pastDue && s) status.late += 1
        else if (pastDue) status.missing += 1
        else status.open += 1
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
    assignmentStatus: status,
  })
}
