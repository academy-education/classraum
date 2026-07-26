import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveIfEnded, type ChallengeRow } from '@/lib/study/challenges'
import { recordHeartbeat } from '@/lib/ops/heartbeat'
import { verifyCronAuth } from '@/lib/cron-auth'

/**
 * GET /api/cron/study-resolve-duels — finalize expired 1v1 XP duels.
 *
 * Duels also resolve lazily on read (the friends page GET), but a player
 * who never reopens the page would otherwise never trigger their duel's
 * win reward + notifications. This sweep guarantees every ended duel is
 * settled promptly regardless of who looks.
 *
 * resolveIfEnded is idempotent (guarded active→completed flip), so the
 * reward/notification fires exactly once even if the lazy path and this
 * cron race.
 *
 * Auth: CRON_SECRET_KEY bearer header (same pattern as other crons).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SELECT = 'id, challenger_id, opponent_id, status, start_at, end_at, challenger_xp, opponent_xp, winner_id'

export async function GET(req: NextRequest) {
  // Shared guard: accepts CRON_SECRET (the name Vercel Cron actually
  // requires to send its Authorization header) as well as the legacy
  // CRON_SECRET_KEY, and allows genuinely-local dev through. This
  // route previously inlined its own CRON_SECRET_KEY check, so the
  // CRON_SECRET fix did not reach it and it would still 401 in prod.
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Heartbeat timing starts past the auth guard — a 401'd request never
  // ran the job, so nothing below may report on its behalf.
  const startedAt = Date.now()

  const nowIso = new Date().toISOString()

  // Active duels whose window has already closed. Cap the batch so a
  // backlog can't blow maxDuration; the next tick picks up the rest.
  const { data: raw, error } = await supabaseAdmin
    .from('study_challenges')
    .select(SELECT)
    .eq('status', 'active')
    .lte('end_at', nowIso)
    .order('end_at', { ascending: true })
    .limit(200)
  if (error) {
    console.error('[cron/resolve-duels] fetch failed', error)
    // Nothing was examined — recorded explicitly because this branch
    // returns rather than throws, and a silent 500 would read as healthy.
    await recordHeartbeat(
      'study-resolve-duels',
      { ok: false, detail: { stage: 'fetch', error: error.message } },
      Date.now() - startedAt,
    )
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }

  const rows = (raw as ChallengeRow[] | null) ?? []
  let resolved = 0
  for (const r of rows) {
    const settled = await resolveIfEnded(r, nowIso)
    if (settled.status === 'completed') resolved++
  }

  const summary = { examined: rows.length, resolved }
  await recordHeartbeat('study-resolve-duels', { ok: true, detail: summary }, Date.now() - startedAt)

  return NextResponse.json(summary)
}
