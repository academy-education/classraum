import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { requireStudyUser } from '@/lib/study/auth'
import { resolveDisplayNames } from '@/lib/study/identity'
import { findFriendship } from '@/lib/study/friends'
import { generateReferralCode, normalizeReferralCode } from '@/lib/study/referral'
import { normalizeNickname, validateNickname } from '@/lib/study/nickname'

/**
 * Friends API.
 *
 * GET /api/study/friends
 *   → { friends: Person[], incoming: Request[], outgoing: Request[], myCode }
 *   friends = accepted edges (either direction); incoming/outgoing = pending
 *   requests I received / sent. myCode is the caller's friend code (the same
 *   short code the referral loop uses), minted lazily so it can be shared.
 *
 * POST /api/study/friends  { action, ... }
 *   action='request'  { code? | nickname? } — send a friend request (or, if
 *                       they already requested me, accept it). Resolves the
 *                       target by friend code OR nickname.
 *   action='accept'   { id }  — accept a pending request I received.
 *   action='decline'  { id }  — decline a pending request I received.
 *   action='cancel'   { id }  — withdraw a pending request I sent.
 *   action='remove'   { friendId } — remove an accepted friend (either side).
 */

export const dynamic = 'force-dynamic'

interface Person { student_id: string; display_name: string }
interface FriendRequest extends Person { id: string }

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const { data: rows } = await supabaseAdmin
    .from('study_friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const all = rows ?? []
  const friendIds: string[] = []
  const incoming: { id: string; other: string }[] = []
  const outgoing: { id: string; other: string }[] = []
  for (const r of all) {
    if (r.status === 'accepted') {
      friendIds.push(r.requester_id === user.id ? r.addressee_id : r.requester_id)
    } else if (r.addressee_id === user.id) {
      incoming.push({ id: r.id, other: r.requester_id })
    } else {
      outgoing.push({ id: r.id, other: r.addressee_id })
    }
  }

  const names = await resolveDisplayNames(
    [...friendIds, ...incoming.map(i => i.other), ...outgoing.map(o => o.other)],
    user.id,
  )
  const person = (id: string): Person => ({ student_id: id, display_name: names.get(id) ?? 'Student' })

  return NextResponse.json({
    friends: friendIds.map(person).sort((a, b) => a.display_name.localeCompare(b.display_name)),
    incoming: incoming.map(i => ({ id: i.id, ...person(i.other) })) as FriendRequest[],
    outgoing: outgoing.map(o => ({ id: o.id, ...person(o.other) })) as FriendRequest[],
    myCode: await getOrCreateCode(user.id),
  })
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  const blocked = enforceRateLimit(`friends:user:${user.id}`, { windowMs: 60 * 1000, max: 40 })
  if (blocked) return blocked

  let body: { action?: string; code?: string; nickname?: string; id?: string; friendId?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  switch (body.action) {
    case 'request': return handleRequest(user.id, body)
    case 'accept':  return handleRespond(user.id, body.id, 'accept')
    case 'decline': return handleRespond(user.id, body.id, 'decline')
    case 'cancel':  return handleCancel(user.id, body.id)
    case 'remove':  return handleRemove(user.id, body.friendId)
    default: return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }
}

async function handleRequest(
  me: string,
  body: { code?: string; nickname?: string },
): Promise<NextResponse> {
  // Resolve the target by friend code or nickname.
  let targetId: string | null = null
  if (typeof body.code === 'string' && body.code.trim()) {
    const code = normalizeReferralCode(body.code)
    const { data } = await supabaseAdmin
      .from('study_referral_codes').select('student_id').eq('code', code).maybeSingle()
    targetId = (data?.student_id as string | undefined) ?? null
  } else if (typeof body.nickname === 'string' && body.nickname.trim()) {
    if (validateNickname(body.nickname)) {
      return NextResponse.json({ error: 'invalid nickname', code: 'invalid' }, { status: 400 })
    }
    const pattern = normalizeNickname(body.nickname).replace(/([\\%_])/g, '\\$1')
    const { data } = await supabaseAdmin
      .from('study_user_prefs').select('student_id').ilike('nickname', pattern).limit(1).maybeSingle()
    targetId = (data?.student_id as string | undefined) ?? null
  } else {
    return NextResponse.json({ error: 'code or nickname required', code: 'missing' }, { status: 400 })
  }

  if (!targetId) return NextResponse.json({ error: 'user not found', code: 'not_found' }, { status: 404 })
  if (targetId === me) return NextResponse.json({ error: 'cannot add yourself', code: 'self' }, { status: 400 })

  const existing = await findFriendship(me, targetId)
  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ status: 'accepted' })
    }
    // A pending edge exists. If THEY requested ME, accept it now; otherwise
    // I already have an outstanding request out.
    if (existing.addressee_id === me) {
      await supabaseAdmin
        .from('study_friendships')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', existing.id)
      return NextResponse.json({ status: 'accepted' })
    }
    return NextResponse.json({ status: 'pending_out' })
  }

  const { error } = await supabaseAdmin
    .from('study_friendships')
    .insert({ requester_id: me, addressee_id: targetId, status: 'pending' })
  if (error) {
    // Unique-pair race — someone created the edge between the find and the
    // insert. Re-resolve and report its current state instead of 500.
    const raced = await findFriendship(me, targetId)
    if (raced) return NextResponse.json({ status: raced.status === 'accepted' ? 'accepted' : 'pending_out' })
    return NextResponse.json({ error: 'could not send request' }, { status: 500 })
  }
  return NextResponse.json({ status: 'pending_out' })
}

async function handleRespond(me: string, id: string | undefined, kind: 'accept' | 'decline'): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  // Only the ADDRESSEE of a pending request may accept/decline it.
  const { data: row } = await supabaseAdmin
    .from('study_friendships')
    .select('id, addressee_id, status')
    .eq('id', id).maybeSingle()
  if (!row || row.addressee_id !== me || row.status !== 'pending') {
    return NextResponse.json({ error: 'no such request', code: 'not_found' }, { status: 404 })
  }
  if (kind === 'accept') {
    await supabaseAdmin.from('study_friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ status: 'accepted' })
  }
  await supabaseAdmin.from('study_friendships').delete().eq('id', id)
  return NextResponse.json({ status: 'declined' })
}

async function handleCancel(me: string, id: string | undefined): Promise<NextResponse> {
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
  // Only the REQUESTER may withdraw their own pending request.
  await supabaseAdmin.from('study_friendships')
    .delete().eq('id', id).eq('requester_id', me).eq('status', 'pending')
  return NextResponse.json({ status: 'cancelled' })
}

async function handleRemove(me: string, friendId: string | undefined): Promise<NextResponse> {
  if (!friendId) return NextResponse.json({ error: 'missing friendId' }, { status: 400 })
  const edge = await findFriendship(me, friendId)
  if (edge) await supabaseAdmin.from('study_friendships').delete().eq('id', edge.id)
  return NextResponse.json({ status: 'removed' })
}

/** The caller's friend code = their referral code, minted on first use. */
async function getOrCreateCode(userId: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from('study_referral_codes').select('code').eq('student_id', userId).maybeSingle()
  if (existing?.code) return existing.code as string
  for (let i = 0; i < 5; i++) {
    const candidate = generateReferralCode()
    const { data, error } = await supabaseAdmin
      .from('study_referral_codes').insert({ student_id: userId, code: candidate }).select('code').single()
    if (!error && data) return data.code as string
    // Unique violation: either this student's row was raced in (re-read) or
    // the code collided (retry a fresh one).
    const { data: raced } = await supabaseAdmin
      .from('study_referral_codes').select('code').eq('student_id', userId).maybeSingle()
    if (raced?.code) return raced.code as string
  }
  return null
}
