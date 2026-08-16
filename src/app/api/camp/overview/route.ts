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
  const byDomain = new Map<string, { correct: number; total: number }>()

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
        scoreSum += (100 * s.correct_count) / s.total_count
        scoredSessions += 1
      }
    }

    for (const perDomain of data.skillsByStudent.values()) {
      for (const [key, agg] of perDomain) {
        const merged = byDomain.get(key) ?? { correct: 0, total: 0 }
        merged.correct += agg.correct
        merged.total += agg.total
        byDomain.set(key, merged)
      }
    }
  }

  const skillsToReview = [...byDomain.values()].filter(
    d => d.total >= MIN_ANSWERS_FOR_RANKING &&
      Math.round((100 * d.correct) / d.total) < REVIEW_ACCURACY_THRESHOLD,
  ).length

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
  })
}
