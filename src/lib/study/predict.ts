import { supabaseAdmin } from '@/lib/supabase-admin'
import { project, type Prediction, type SectionInput } from './projection'

/**
 * Server-side SAT prediction: reads the student's goal + test date + the
 * completed full-test scaled scores per SAT section, and runs the pure
 * projection. Shared by /api/study/prediction and /api/study/plan so the
 * gap is computed one way. Non-SAT targets return supported:false.
 */
export interface SatPrediction extends Prediction {
  supported: boolean
  targetTest: string | null
  testDate: string | null
  dailyGoalMinutes: number
  totalMin: number
  totalMax: number
}

export async function computeSatPrediction(userId: string): Promise<SatPrediction> {
  const empty = (supported: boolean, targetTest: string | null, testDate: string | null, dailyGoalMinutes: number): SatPrediction => ({
    supported, targetTest, testDate, dailyGoalMinutes,
    totalMin: 400, totalMax: 1600,
    enoughData: false, hasTrend: false, current: null, predicted: null, low: null, high: null,
    goalScore: null, gap: null, onTrack: null, weeksToTest: null, sections: [],
  })

  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('target_test, goal_score, test_date, daily_goal_minutes')
    .eq('student_id', userId)
    .maybeSingle()

  const target = (prefs?.target_test ?? '').toUpperCase()
  const goalScore = (prefs?.goal_score as number | null) ?? null
  const testDate = (prefs?.test_date as string | null) ?? null
  const dailyGoalMinutes = (prefs?.daily_goal_minutes as number | null) ?? 30

  if (target !== 'SAT') {
    return { ...empty(false, target || null, testDate, dailyGoalMinutes), goalScore }
  }

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
      .eq('student_id', userId)
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
  return {
    supported: true,
    targetTest: 'SAT',
    testDate,
    dailyGoalMinutes,
    totalMin: inputs.reduce((s, i) => s + i.min, 0),
    totalMax: inputs.reduce((s, i) => s + i.max, 0),
    ...prediction,
  }
}
