import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { computeDailyChallenge } from '@/lib/study/daily-challenge'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * POST /api/study/daily-challenge/start — create the practice session
 * for today's daily challenge, tagged via config.dailyChallenge so we
 * can find it back without a new schema.
 *
 * Idempotent: if a session for today already exists, returns its id
 * instead of creating a duplicate.
 */

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  topicId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`daily-challenge-start:user:${user.id}`, { windowMs: 60 * 1000, max: 10 })
  if (blocked) return blocked

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  // The topic must be TODAY'S computed challenge topic — otherwise any
  // caller can mint free 5-question practice sessions on an arbitrary
  // topic through this route.
  const challenge = await computeDailyChallenge(user.id)
  if (!challenge.topic || challenge.topic.id !== parsed.data.topicId) {
    return NextResponse.json({ error: 'topic is not today\'s challenge' }, { status: 400 })
  }

  // Idempotency — if today's session already exists, return it.
  const { data: existing } = await supabaseAdmin
    .from('study_sessions')
    .select('id')
    .eq('student_id', user.id)
    .contains('config', { dailyChallenge: today })
    .limit(1)
  if (existing && existing[0]) {
    return NextResponse.json({ sessionId: existing[0].id, reused: true })
  }

  // Language: respect prefs. Default to en.
  const { data: prefs } = await supabaseAdmin
    .from('study_user_prefs')
    .select('default_language')
    .eq('student_id', user.id)
    .maybeSingle()
  const language = (prefs?.default_language as string | null) === 'ko' ? 'ko' : 'en'

  const { data, error } = await supabaseAdmin
    .from('study_sessions')
    .insert({
      student_id: user.id,
      topic_id: parsed.data.topicId,
      mode: 'practice',
      language,
      config: { questionCount: 3, dailyChallenge: today },
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[daily-challenge/start]', error)
    return NextResponse.json({ error: 'create failed' }, { status: 500 })
  }
  return NextResponse.json({ sessionId: data.id, reused: false })
}
