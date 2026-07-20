import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'

/**
 * Academy invite acceptance — server-side, "link don't create".
 *
 * Invite links attach an academy membership to the EXISTING logged-in
 * account (join-table row), never a fresh account. This must run with
 * the service role because RLS intentionally blocks the two cases the
 * feature exists for:
 *   - academies SELECT is members-only, so an invitee can't even read
 *     the academy name for the confirmation modal;
 *   - students/parents self-INSERT requires users.role to already
 *     match, so a study-first account (role=student) could never
 *     accept a parent invite (or vice versa).
 *
 * Possession of the invite link (unguessable academy UUID, optionally a
 * family_member UUID) is the authorization — the same trust model the
 * old client-side flow used for same-role joins.
 *
 * GET  ?academy_id=…[&family_member_id=…] → preview for the modal
 *      { academyName, member?: { name, role, familyId } }
 * POST { role, academyId, familyId?, familyMemberId? } → performs the
 *      join + reconciles the users.role default-surface pointer.
 */

export const dynamic = 'force-dynamic'

async function academyName(academyId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .maybeSingle()
  return (data?.name as string | undefined) ?? null
}

export async function GET(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response

  const academyId = req.nextUrl.searchParams.get('academy_id')
  const familyMemberId = req.nextUrl.searchParams.get('family_member_id')
  if (!academyId) return NextResponse.json({ error: 'academy_id required' }, { status: 400 })

  const name = await academyName(academyId)
  if (!name) return NextResponse.json({ error: 'academy not found' }, { status: 404 })

  // Personalized invite → surface the pre-created family member so the
  // modal can greet them by name. Only unlinked members are claimable.
  if (familyMemberId) {
    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('id, user_name, role, family_id, user_id, families!inner(academy_id)')
      .eq('id', familyMemberId)
      .maybeSingle()
    const familyAcademy = (member?.families as { academy_id?: string } | null)?.academy_id
    if (!member || member.user_id !== null || familyAcademy !== academyId) {
      return NextResponse.json({ error: 'invite not found' }, { status: 404 })
    }
    return NextResponse.json({
      academyName: name,
      member: { name: member.user_name, role: member.role, familyId: member.family_id },
    })
  }

  return NextResponse.json({ academyName: name })
}

export async function POST(req: NextRequest) {
  const authResult = await requireStudyUser(req)
  if (authResult.response) return authResult.response
  const user = authResult.user

  let body: { role?: string; academyId?: string; familyId?: string; familyMemberId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  let role = body.role
  const academyId = body.academyId
  if ((role !== 'student' && role !== 'parent') || !academyId) {
    return NextResponse.json({ error: 'role (student|parent) and academyId required' }, { status: 400 })
  }
  const name = await academyName(academyId)
  if (!name) return NextResponse.json({ error: 'academy not found' }, { status: 404 })

  // Personalized invite: claim the pre-created family member. The member
  // row is server-authoritative for role + family — the URL params are
  // only hints.
  if (body.familyMemberId) {
    const { data: member } = await supabaseAdmin
      .from('family_members')
      .select('id, role, family_id, user_id, families!inner(academy_id)')
      .eq('id', body.familyMemberId)
      .maybeSingle()
    const familyAcademy = (member?.families as { academy_id?: string } | null)?.academy_id
    if (!member || familyAcademy !== academyId) {
      return NextResponse.json({ error: 'invite not found' }, { status: 404 })
    }
    if (member.user_id !== null && member.user_id !== user.id) {
      return NextResponse.json({ error: 'invite already claimed' }, { status: 409 })
    }
    if (member.role === 'student' || member.role === 'parent') role = member.role
    if (member.user_id === null) {
      const { error } = await supabaseAdmin
        .from('family_members')
        .update({ user_id: user.id })
        .eq('id', member.id)
        .is('user_id', null)
      if (error) return NextResponse.json({ error: 'claim failed' }, { status: 500 })
    }
  } else if (body.familyId) {
    // General invite that carries a family: add the user to it.
    const { data: u } = await supabaseAdmin
      .from('users').select('name').eq('id', user.id).maybeSingle()
    const { error } = await supabaseAdmin
      .from('family_members')
      .insert({ family_id: body.familyId, user_id: user.id, user_name: u?.name ?? '', role })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'family join failed' }, { status: 500 })
    }
  }

  // The actual academy link — one join-table row per (user, academy).
  const { error: joinError } = role === 'student'
    ? await supabaseAdmin.from('students').insert({ user_id: user.id, academy_id: academyId, active: true })
    : await supabaseAdmin.from('parents').insert({ user_id: user.id, academy_id: academyId })
  if (joinError && !joinError.message.includes('duplicate')) {
    return NextResponse.json({ error: 'join failed' }, { status: 500 })
  }

  // Reconcile the users.role default-surface pointer. role only says
  // which surface opens on login — the join tables are the identity —
  // but the routers read it, so a study-first account (role=student,
  // no academy) that just joined as a PARENT must flip or auth-wrapper
  // keeps looking in the wrong join table. Flip ONLY when the user has
  // no memberships under their current role type; if they do (e.g. an
  // academy student also invited as a parent elsewhere), the current
  // surface stays and the new row simply exists.
  const { data: userRow } = await supabaseAdmin
    .from('users').select('role').eq('id', user.id).maybeSingle()
  const currentRole = userRow?.role as string | undefined
  if ((currentRole === 'student' || currentRole === 'parent') && currentRole !== role) {
    let existing = supabaseAdmin
      .from(currentRole === 'student' ? 'students' : 'parents')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (currentRole === 'student') existing = existing.eq('active', true)
    const { count } = await existing
    if ((count ?? 0) === 0) {
      await supabaseAdmin.from('users').update({ role }).eq('id', user.id)
    }
  }

  return NextResponse.json({ ok: true, academyName: name, role })
}
