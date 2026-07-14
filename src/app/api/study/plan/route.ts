import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { computeSatPrediction } from '@/lib/study/predict'
import { buildWeekPlan, type WeakTopic } from '@/lib/study/plan'

/**
 * GET /api/study/plan — this week's study plan for the target test.
 *
 * Combines the shared prediction (gap + weeks to test) with the student's
 * weakest mastery topics and daily-minutes goal to produce a concrete
 * weekly workload + focus list. Renders even pre-diagnostic (focus +
 * workload without the points framing).
 */
export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  try {
    const pred = await computeSatPrediction(user.id)
    if (!pred.supported) {
      return NextResponse.json({ supported: false, targetTest: pred.targetTest })
    }

    // Weakest mastery topics first — the biggest movers to attack.
    const { data: mastery } = await supabaseAdmin
      .from('study_mastery')
      .select('score, attempts_count, topic:study_topics ( slug, name_en, name_ko )')
      .eq('student_id', user.id)
      .gte('attempts_count', 1)
      .order('score', { ascending: true })
      .limit(12)

    const weakTopics: WeakTopic[] = (mastery ?? [])
      .map(m => {
        const raw = m.topic as unknown
        const t = (Array.isArray(raw) ? raw[0] : raw) as { slug: string; name_en: string; name_ko: string } | null
        return t?.slug ? { slug: t.slug, name_en: t.name_en, name_ko: t.name_ko, masteryScore: Number(m.score) } : null
      })
      .filter((x): x is WeakTopic => x !== null)
      .slice(0, 6)

    const plan = buildWeekPlan({
      gap: pred.gap,
      weeksToTest: pred.weeksToTest,
      dailyGoalMinutes: pred.dailyGoalMinutes,
      weakTopics,
    })

    return NextResponse.json({
      supported: true,
      goalScore: pred.goalScore,
      predicted: pred.predicted,
      enoughData: pred.enoughData,
      ...plan,
    })
  } catch (e) {
    console.error('[study/plan] failed', e)
    return NextResponse.json({ error: 'plan failed' }, { status: 500 })
  }
}
