import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { familyFromTopicSlug } from '@/lib/study/test-result'
import { scoreTrendSession, type TrendSession } from '@/lib/study/topic-trend'
import { buildSectionBreakdown, type BreakdownItem } from '@/lib/study/section-breakdown'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'

/**
 * GET /api/study/topic-insights?topicId=… — the trend chart, strengths
 * and weaknesses under a topic's progress card.
 *
 * Every point is RECOMPUTED from the session's attempts rather than read
 * from study_sessions.score; see src/lib/study/topic-trend.ts for why
 * (short version: that column still holds the pre-2026-07-29 model for
 * Speaking and Writing, and would plot 60% for a test whose own result
 * screen says 83%).
 *
 * Cost: one attempts query and one grades query per session, capped at
 * MAX_SESSIONS. A chart of the last dozen tests is what a student reads;
 * the full history belongs on the stats page.
 */

export const dynamic = 'force-dynamic'

const MAX_SESSIONS = 12

interface MasteryNote { label?: string; note?: string }

/** study_mastery.strengths / .weaknesses hold either bare strings or
 *  {label, note} objects depending on which assessment version wrote the
 *  row. Both shapes are live in the table, so read both. */
function noteLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(v => typeof v === 'string' ? v : ((v as MasteryNote)?.label ?? ''))
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4)
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const topicId = req.nextUrl.searchParams.get('topicId')
  const ko = req.nextUrl.searchParams.get('lang') === 'ko'
  if (!topicId) {
    return NextResponse.json({ error: 'topicId required' }, { status: 400 })
  }

  const [{ data: topic }, { data: mastery }, { data: sessions }] = await Promise.all([
    dbAdmin.from('study_topics').select('slug').eq('id', topicId).maybeSingle(),
    dbAdmin
      .from('study_mastery')
      .select('score, strengths, weaknesses, attempts_count, last_assessed_at')
      .eq('student_id', user.id).eq('topic_id', topicId).maybeSingle(),
    dbAdmin
      .from('study_sessions')
      .select('id, created_at, correct_count, total_count')
      .eq('student_id', user.id).eq('topic_id', topicId)
      .eq('mode', 'full_test').eq('status', 'completed')
      // Newest first so the cap keeps the RECENT dozen, not the oldest
      // dozen — reversed below so the chart still reads left to right.
      .order('created_at', { ascending: false })
      .limit(MAX_SESSIONS),
  ])

  const family = familyFromTopicSlug((topic as { slug: string } | null)?.slug ?? '')
  const rows = ((sessions ?? []) as Array<{
    id: string; created_at: string; correct_count: number | null; total_count: number | null
  }>).reverse()

  // Every item across the capped window, so the topic-page breakdown is
  // built from the same sessions the chart plots. Aggregating rather than
  // showing the newest test's breakdown: one test of 12 questions splits
  // into groups too small to survive the minimum, and the topic page is
  // the place where a pattern across sittings is the point.
  const allItems: BreakdownItem[] = []

  const points = await Promise.all(rows.map(async row => {
    const [{ data: attempts }, { data: subs }] = await Promise.all([
      dbAdmin.from('study_attempts')
        .select('question, student_answer, is_correct')
        .eq('session_id', row.id).order('position', { ascending: true }),
      dbAdmin.from('study_response_submissions')
        .select('prompt_text, study_response_grades(overall_band)')
        .eq('session_id', row.id),
    ])

    const bandByPrompt = new Map<string, number>()
    for (const s of subs ?? []) {
      const g = Array.isArray(s.study_response_grades)
        ? s.study_response_grades[0] : s.study_response_grades
      if (g) bandByPrompt.set(s.prompt_text as string, Number(g.overall_band))
    }

    const items: BreakdownItem[] = (attempts ?? []).map(a => {
      const q = a.question as Record<string, unknown> | null
      return {
        type: String(q?.type ?? ''),
        prompt: typeof q?.prompt === 'string' ? q.prompt : null,
        expectedText: typeof q?.correct_answer === 'string' ? q.correct_answer : null,
        studentAnswer: a.student_answer as string | null,
        correct: a.is_correct === true,
        rubricBand: bandByPrompt.get(String(q?.prompt ?? '')) ?? null,
      }
    })
    // Scored items only. A pilot is delivered but never counted, and
    // including them made the section rows total more points than the
    // score they sit under.
    allItems.push(...items.filter((_, i) => {
      const q = (attempts ?? [])[i]?.question as Record<string, unknown> | null
      return q?.scored !== false
    }))

    const session: TrendSession = {
      sessionId: row.id,
      at: row.created_at,
      items,
      correctCount: row.correct_count ?? 0,
      totalScored: row.total_count ?? 0,
      family,
    }
    return scoreTrendSession(session)
  }))

  return NextResponse.json({
    points,
    breakdown: buildSectionBreakdown(allItems, scoreListenRepeat, { ko }),
    mastery: mastery
      ? {
          score: (mastery.score as number | null) ?? null,
          attempts: (mastery.attempts_count as number | null) ?? 0,
          lastAssessedAt: (mastery.last_assessed_at as string | null) ?? null,
          strengths: noteLabels(mastery.strengths),
          weaknesses: noteLabels(mastery.weaknesses),
        }
      : null,
  })
}
