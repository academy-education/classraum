import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import {
  getRubric, inferSpeakingTaskType,
  type ResponseSkill, type ResponseTaskType,
} from '@/lib/study/responseRubrics'

/**
 * Every rubric grade in one session, for the result screen.
 *
 * The batch grader writes these on submit; until now nothing read them
 * back, so a TOEFL Speaking result showed a percentage covering only the
 * seven Listen-and-Repeat items while the four interview answers — the
 * part the student actually spoke — contributed nothing visible.
 *
 * Keyed by prompt_text because that is the only identifier shared by a
 * submission and a delivered question: study_response_submissions has no
 * position column, and attempt ids are not exposed to the client.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireStudyUser(req)
  if ('response' in auth) return auth.response
  const { user } = auth

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data, error } = await dbAdmin
    .from('study_response_submissions')
    .select('id, prompt_text, skill, test_family, created_at, study_response_grades(overall_band, summary, rubric_scores)')
    .eq('session_id', sessionId)
    // Ownership is enforced here, not by RLS: dbAdmin is the service role.
    .eq('student_id', user.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[response/grades]', error)
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
  }

  // A prompt can have several submissions if the student re-recorded.
  // Later rows overwrite earlier ones, so the newest grade wins.
  const byPrompt: Record<string, {
    band: number
    /** Top of this rubric's scale. Sent from the server because the
     *  client has no way to know it: Speaking and Writing are both 0-5
     *  today, but the value belongs to the rubric, not to the UI. */
    scaleMax: number
    summary: string | null
    criteria: unknown
    skill: string
  }> = {}
  for (const row of data ?? []) {
    const g = Array.isArray(row.study_response_grades)
      ? row.study_response_grades[0]
      : row.study_response_grades
    if (!g) continue
    const skill = row.skill as ResponseSkill
    const taskType: ResponseTaskType | undefined = skill === 'speaking'
      ? inferSpeakingTaskType(row.prompt_text)
      : row.prompt_text.toLowerCase().includes('email') ? 'email' : 'academic_discussion'
    byPrompt[row.prompt_text] = {
      band: Number(g.overall_band),
      scaleMax: getRubric(row.test_family as 'toefl' | 'ielts', skill, taskType).scaleMax,
      summary: g.summary,
      criteria: g.rubric_scores,
      skill: row.skill,
    }
  }

  return NextResponse.json({ grades: byPrompt })
}
