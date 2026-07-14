import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { project, type SectionInput } from '@/lib/study/projection'

/**
 * GET /api/study/prediction — predicted total score + per-section
 * breakdown for the student's target test.
 *
 * SAT-only for P1: pulls the completed full-test scaled scores for each
 * SAT section (200–800 each), reads the goal + test date from prefs, and
 * runs the pure projection. Non-SAT targets return { supported: false }
 * so the card can show a "coming soon" state without erroring.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  try {
    const { data: prefs } = await supabaseAdmin
      .from('study_user_prefs')
      .select('target_test, goal_score, test_date')
      .eq('student_id', user.id)
      .maybeSingle()

    const target = (prefs?.target_test ?? '').toUpperCase()
    const goalScore = (prefs?.goal_score as number | null) ?? null
    const testDate = (prefs?.test_date as string | null) ?? null

    if (target !== 'SAT') {
      return NextResponse.json({ supported: false, targetTest: target || null, goalScore, testDate })
    }

    // SAT scoring sections = children of the test-sat root (drop the
    // retired essay). Each full-test session carries the section topic +
    // its 200–800 scaled score.
    const { data: root } = await supabaseAdmin
      .from('study_topics').select('id').eq('slug', 'test-sat').maybeSingle()
    const { data: sectionRows } = root
      ? await supabaseAdmin
          .from('study_topics')
          .select('id, slug, name_en, name_ko')
          .eq('parent_id', root.id)
          .order('sort_order', { ascending: true })
      : { data: null }
    const sections = (sectionRows ?? []).filter(s => s.slug !== 'sat-essay')

    let inputs: SectionInput[] = []
    if (sections.length > 0) {
      const ids = sections.map(s => s.id)
      const { data: testSessions } = await supabaseAdmin
        .from('study_sessions')
        .select('score, completed_at, topic_id')
        .eq('student_id', user.id)
        .eq('archived', false)
        .eq('mode', 'full_test')
        .eq('status', 'completed')
        .not('score', 'is', null)
        .not('completed_at', 'is', null)
        .in('topic_id', ids)
        .order('completed_at', { ascending: true })

      const byTopic = new Map<string, Array<{ score: number; date: string }>>()
      for (const row of testSessions ?? []) {
        const tid = row.topic_id as string
        const arr = byTopic.get(tid) ?? []
        arr.push({ score: Math.round(Number(row.score)), date: String(row.completed_at).slice(0, 10) })
        byTopic.set(tid, arr)
      }
      inputs = sections.map(s => ({
        key: s.slug as string,
        label_en: s.name_en as string,
        label_ko: s.name_ko as string,
        min: 200,
        max: 800,
        attempts: byTopic.get(s.id as string) ?? [],
      }))
    }

    const prediction = project(inputs, goalScore, testDate)
    return NextResponse.json({
      supported: true,
      targetTest: 'SAT',
      testDate,
      totalMin: inputs.reduce((s, i) => s + i.min, 0),
      totalMax: inputs.reduce((s, i) => s + i.max, 0),
      ...prediction, // includes goalScore
    })
  } catch (e) {
    console.error('[study/prediction] failed', e)
    return NextResponse.json({ error: 'prediction failed' }, { status: 500 })
  }
}
