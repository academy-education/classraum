import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Weekly Quests — three fixed weekly goals that reset every Monday
 * (ISO week, UTC — same boundary as league XP + the stats "this week"
 * panel). Progress is DERIVED from existing weekly activity, so nothing
 * is written as the student studies. Each quest grants a one-time bonus
 * XP the first time it's seen complete; the study_quest_claims table
 * makes that idempotent per (student, quest, week).
 */

export interface QuestDef {
  key: string
  target: number
  rewardXp: number
  metric: 'sessions' | 'questions' | 'activeDays'
  label_en: string
  label_ko: string
}

export const QUESTS: QuestDef[] = [
  { key: 'sessions_5',  metric: 'sessions',   target: 5,  rewardXp: 40, label_en: 'Do 5 study sessions',       label_ko: '학습 세션 5회 완료' },
  { key: 'questions_50', metric: 'questions', target: 50, rewardXp: 60, label_en: 'Answer 50 questions',        label_ko: '문제 50개 풀기' },
  { key: 'active_4',    metric: 'activeDays', target: 4,  rewardXp: 80, label_en: 'Study on 4 different days',  label_ko: '4일 이상 학습하기' },
]

export interface QuestState {
  key: string
  target: number
  current: number
  done: boolean
  rewardXp: number
  label_en: string
  label_ko: string
}

export interface QuestsPayload {
  weekStart: string
  resetsAt: string
  quests: QuestState[]
  earnedXp: number // bonus XP granted THIS request (for a toast)
}

function isoWeekStartUtc(now = new Date()): Date {
  const dow = now.getUTCDay() // 0 Sun..6 Sat
  const diffFromMon = (dow + 6) % 7
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffFromMon))
}

export async function computeQuests(userId: string): Promise<QuestsPayload> {
  const weekStart = isoWeekStartUtc()
  const weekStartIso = weekStart.toISOString()
  const weekStartDate = weekStartIso.slice(0, 10)
  const resetsAt = new Date(weekStart.getTime() + 7 * 86400_000).toISOString()

  const [
    { count: sessions },
    { count: questions },
    { data: xpRows },
    { data: claims },
  ] = await Promise.all([
    supabaseAdmin
      .from('study_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .gte('created_at', weekStartIso),
    supabaseAdmin
      .from('study_attempts')
      .select('id, session:study_sessions!inner ( student_id )', { count: 'exact', head: true })
      .eq('study_sessions.student_id', userId)
      .gte('created_at', weekStartIso),
    supabaseAdmin
      .from('study_xp_events')
      .select('created_at')
      .eq('student_id', userId)
      .gte('created_at', weekStartIso),
    supabaseAdmin
      .from('study_quest_claims')
      .select('quest_key')
      .eq('student_id', userId)
      .eq('week_start', weekStartDate),
  ])

  const activeDays = new Set((xpRows ?? []).map(r => String(r.created_at).slice(0, 10))).size
  const metrics = {
    sessions: sessions ?? 0,
    questions: questions ?? 0,
    activeDays,
  }
  const claimed = new Set((claims ?? []).map(c => c.quest_key as string))

  let earnedXp = 0
  const quests: QuestState[] = []
  for (const q of QUESTS) {
    const current = metrics[q.metric]
    const done = current >= q.target

    // First time complete this week → grant the bonus once. The unique
    // (student, quest, week) row is the source of truth: insert first,
    // and only award XP if the insert actually took (no race double-pay).
    if (done && !claimed.has(q.key)) {
      const { error } = await supabaseAdmin
        .from('study_quest_claims')
        .insert({ student_id: userId, quest_key: q.key, week_start: weekStartDate, reward_xp: q.rewardXp })
      if (!error) {
        earnedXp += q.rewardXp
        await supabaseAdmin.rpc('award_study_xp', {
          p_student_id: userId,
          p_event_type: 'quest_reward',
          p_xp: q.rewardXp,
          p_source_id: `quest:${weekStartDate}:${q.key}`,
        }).then(({ error: e }) => { if (e) console.error('[quests] award failed', e) })
      }
      // error (likely 23505 unique-violation) → already claimed elsewhere; skip.
    }

    quests.push({
      key: q.key,
      target: q.target,
      current: Math.min(current, q.target),
      done,
      rewardXp: q.rewardXp,
      label_en: q.label_en,
      label_ko: q.label_ko,
    })
  }

  return { weekStart: weekStartDate, resetsAt, quests, earnedXp }
}
