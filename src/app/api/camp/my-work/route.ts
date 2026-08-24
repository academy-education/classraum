import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/api-auth'
import { isParentOfStudent } from '@/lib/camp/reports'
import { loadStudentCampAssignments } from '@/lib/camp/student'

/**
 * GET /api/camp/my-work[?studentId=…]
 *
 * The student's own live camp assignments, for the Camp card on the
 * GRADES surfaces (/mobile and /mobile/assignments).
 *
 * /api/study/landing already returns the same rows, but only to the
 * study landing and bundled with streaks, XP, prefs and the daily
 * challenge — none of which the Grades surface has or wants. This route
 * is that one field on its own.
 *
 * Auth mirrors /api/camp/reports?studentId=…: the caller must BE the
 * student, or be a family-linked parent (the mobile Grades pages run on
 * effectiveUserId, which is the selected child for a parent).
 */

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = req.nextUrl.searchParams.get('studentId') || user.id
  if (studentId !== user.id && !(await isParentOfStudent(user.id, studentId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const assignments = await loadStudentCampAssignments(studentId)
  return NextResponse.json({ assignments })
}
