import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { resolveDisplayNames } from '@/lib/study/identity'
import { listAcceptedFriendIds } from '@/lib/study/friends'
import { DUEL_DAYS, resolveIfEnded, sumXpInWindow, type ChallengeRow } from '@/lib/study/challenges'
import { trackEvent } from '@/lib/study/analytics'

/**
 * 1v1 XP duels.
 *
 * GET  /api/study/challenges
 *   → { active, incoming, outgoing, recent }. Ended active duels are
 *     finalized on read. Active duels carry live XP for both sides.
 *
 * POST /api/study/challenges { action, ... }
 *   action='challenge' { friendId } — challenge an accepted friend.
 *   action='accept'    { id }       — opponent accepts → 7-day duel starts.
 *   action='decline'   { id }       — opponent declines.
 *   action='cancel'    { id }       — challenger withdraws a pending duel.
 */

export const dynamic = 'force-dynamic'

const SELECT = 'id, challenger_id, opponent_id, status, start_at, end_at, challenger_xp, opponent_xp, winner_id'

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user
  const nowIso = new Date().toISOString()

  const { data: raw } = await supabaseAdmin
    .from('study_challenges')
    .select(SELECT)
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  // Finalize any active duels whose window has closed.
  const rows: ChallengeRow[] = await Promise.all(
    (raw as ChallengeRow[] ?? []).map(r => resolveIfEnded(r, nowIso)),
  )

  const otherId = (r: ChallengeRow) => (r.challenger_id === user.id ? r.opponent_id : r.challenger_id)
  const names = await resolveDisplayNames([...new Set(rows.map(otherId))], user.id)
  const opp = (r: ChallengeRow) => ({ student_id: otherId(r), display_name: names.get(otherId(r)) ?? 'Student' })
  const iAmChallenger = (r: ChallengeRow) => r.challenger_id === user.id

  // Live XP for active duels (each side, start → now).
  const activeRows = rows.filter(r => r.status === 'active' && r.start_at)
  const liveXp = new Map<string, { c: number; o: number }>()
  await Promise.all(activeRows.map(async r => {
    const end = r.end_at && r.end_at < nowIso ? r.end_at : nowIso
    const [c, o] = await Promise.all([
      sumXpInWindow(r.challenger_id, r.start_at!, end),
      sumXpInWindow(r.opponent_id, r.start_at!, end),
    ])
    liveXp.set(r.id, { c, o })
  }))

  const active = activeRows.map(r => {
    const live = liveXp.get(r.id) ?? { c: r.challenger_xp, o: r.opponent_xp }
    return {
      id: r.id,
      opponent: opp(r),
      my_xp: iAmChallenger(r) ? live.c : live.o,
      their_xp: iAmChallenger(r) ? live.o : live.c,
      ends_at: r.end_at,
    }
  })

  const incoming = rows.filter(r => r.status === 'pending' && r.opponent_id === user.id)
    .map(r => ({ id: r.id, opponent: opp(r) }))
  const outgoing = rows.filter(r => r.status === 'pending' && r.challenger_id === user.id)
    .map(r => ({ id: r.id, opponent: opp(r) }))
  const recent = rows.filter(r => r.status === 'completed').slice(0, 8).map(r => {
    const mine = iAmChallenger(r) ? r.challenger_xp : r.opponent_xp
    const theirs = iAmChallenger(r) ? r.opponent_xp : r.challenger_xp
    return {
      id: r.id,
      opponent: opp(r),
      my_xp: mine,
      their_xp: theirs,
      // true = I won, false = I lost, null = tie
      won: r.winner_id === null ? null : r.winner_id === user.id,
    }
  })

  return NextResponse.json({ active, incoming, outgoing, recent })
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`challenges:user:${user.id}`, { windowMs: 60 * 1000, max: 30 })
  if (blocked) return blocked

  let body: { action?: string; friendId?: string; id?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  switch (body.action) {
    case 'challenge': return handleChallenge(user.id, body.friendId)
    case 'accept':    return handleAccept(user.id, body.id)
    case 'decline':   return handleRespond(user.id, body.id, 'declined')
    case 'cancel':    return handleCancel(user.id, body.id)
    default: return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}

async function handleChallenge(me: string, friendId: string | undefined): Promise<NextResponse> {
  if (!friendId) return NextResponse.json({ error: 'missing friendId' }, { status: 400 })
  if (friendId === me) return NextResponse.json({ error: 'cannot challenge yourself', code: 'self' }, { status: 400 })

  // Only accepted friends may be challenged.
  const friends = await listAcceptedFriendIds(me)
  if (!friends.includes(friendId)) {
    return NextResponse.json({ error: 'not friends', code: 'not_friends' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('study_challenges')
    .insert({ challenger_id: me, opponent_id: friendId, status: 'pending' })
  if (error) {
    // The partial unique index rejects a second open duel for this pair.
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'a duel already exists', code: 'exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'could not create challenge' }, { status: 500 })
  }
  void trackEvent(me, 'challenge_sent', { opponentId: friendId })
  return NextResponse.json({ status: 'pending' })
}

async function handleAccept(me: string, id: string | undefined): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  const { data: row } = await supabaseAdmin
    .from('study_challenges').select('id, opponent_id, status').eq('id', id).maybeSingle()
  if (!row || row.opponent_id !== me || row.status !== 'pending') {
    return NextResponse.json({ error: 'no such challenge', code: 'not_found' }, { status: 404 })
  }
  const now = new Date()
  const end = new Date(now.getTime() + DUEL_DAYS * 24 * 60 * 60 * 1000)
  await supabaseAdmin.from('study_challenges').update({
    status: 'active',
    start_at: now.toISOString(),
    end_at: end.toISOString(),
    responded_at: now.toISOString(),
  }).eq('id', id).eq('status', 'pending')
  return NextResponse.json({ status: 'active', ends_at: end.toISOString() })
}

async function handleRespond(me: string, id: string | undefined, status: 'declined'): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  await supabaseAdmin.from('study_challenges')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id).eq('opponent_id', me).eq('status', 'pending')
  return NextResponse.json({ status })
}

async function handleCancel(me: string, id: string | undefined): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  await supabaseAdmin.from('study_challenges')
    .update({ status: 'cancelled' })
    .eq('id', id).eq('challenger_id', me).eq('status', 'pending')
  return NextResponse.json({ status: 'cancelled' })
}
