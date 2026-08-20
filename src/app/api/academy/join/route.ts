import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireStudyUser } from '@/lib/study/auth'
import { raiseAlert } from '@/lib/ops/alert'

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
  const { data } = await dbAdmin
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
    const { data: member } = await dbAdmin
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

  let body: {
    role?: string
    academyId?: string
    familyId?: string
    familyMemberId?: string
    relation?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  let role = body.role
  const academyId = body.academyId
  if ((role !== 'student' && role !== 'parent') || !academyId) {
    return NextResponse.json({ error: 'role (student|parent) and academyId required' }, { status: 400 })
  }
  // 아버지 vs 어머니 has nowhere to live on `role` (which is only
  // parent|student), which is exactly why it ended up welded into
  // family_members.user_name on 150 rows. Carry it as a real column or
  // that fix decays on the very next join. NEVER inferred — an unsupplied
  // relation stays NULL, because a Korean mother keeps her own 성 and
  // guessing from the child would be wrong roughly half the time.
  const RELATIONS = ['father', 'mother', 'guardian', 'grandparent', 'other'] as const
  const relation =
    typeof body.relation === 'string' && (RELATIONS as readonly string[]).includes(body.relation)
      ? body.relation
      : null
  if (body.relation != null && relation === null) {
    return NextResponse.json({ error: `relation must be one of ${RELATIONS.join('|')}` }, { status: 400 })
  }

  const name = await academyName(academyId)
  if (!name) return NextResponse.json({ error: 'academy not found' }, { status: 404 })

  // Personalized invite: claim the pre-created family member. The member
  // row is server-authoritative for role + family — the URL params are
  // only hints.
  if (body.familyMemberId) {
    const { data: member } = await dbAdmin
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
      const { error } = await dbAdmin
        .from('family_members')
        .update({ user_id: user.id })
        .eq('id', member.id)
        .is('user_id', null)
      if (error) return NextResponse.json({ error: 'claim failed' }, { status: 500 })
    }
  } else if (body.familyId) {
    // General invite that carries a family: add the user to it.
    const { data: u } = await dbAdmin
      .from('users').select('name').eq('id', user.id).maybeSingle()
    const { error } = await dbAdmin
      .from('family_members')
      .insert({
        family_id: body.familyId,
        user_id: user.id,
        user_name: u?.name ?? '',
        role,
        // Only parents have a relation; a student's relation to the
        // family is their role. Omitted (NULL) when none was supplied.
        ...(role === 'parent' && relation ? { relation } : {}),
      })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: 'family join failed' }, { status: 500 })
    }
  }

  // The actual academy link — one join-table row per (user, academy).
  const { error: joinError } = role === 'student'
    ? await dbAdmin.from('students').insert({ user_id: user.id, academy_id: academyId, active: true })
    : await dbAdmin.from('parents').insert({ user_id: user.id, academy_id: academyId })
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
  const { data: userRow } = await dbAdmin
    .from('users').select('role').eq('id', user.id).maybeSingle()
  const currentRole = userRow?.role as string | undefined

  // Whether the caller's default surface now matches the role they
  // joined as. Starts true because "no flip needed" is also "correct".
  let surfaceRole = currentRole ?? role

  if ((currentRole === 'student' || currentRole === 'parent') && currentRole !== role) {
    let existing = dbAdmin
      .from(currentRole === 'student' ? 'students' : 'parents')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if (currentRole === 'student') existing = existing.eq('active', true)
    const { count } = await existing
    if ((count ?? 0) === 0) {
      // CHECKED. supabase-js resolves with { error } rather than
      // throwing, so an un-destructured await here loses the failure
      // entirely — the membership row exists but the router keeps
      // sending the user to the wrong surface (joined as a parent,
      // still lands on the student app) with nothing anywhere saying
      // why. Not fatal to the join, so we don't 500 and make the client
      // claim the invite failed; we alert and report the role the user
      // will ACTUALLY land on.
      const { error: roleFlipError } = await dbAdmin
        .from('users').update({ role }).eq('id', user.id)

      if (roleFlipError) {
        console.error('[academy/join] users.role flip failed:', roleFlipError)
        await raiseAlert({
          severity: 'warning',
          title: 'Academy join: default-surface role flip failed',
          message:
            `User ${user.id} joined academy ${academyId} as "${role}" but ` +
            `users.role stayed "${currentRole}", so they will be routed to ` +
            `the wrong surface. The membership row itself was created.`,
          dedupeKey: 'academy-join:role-flip-failed',
          error: roleFlipError,
          context: { userId: user.id, academyId, joinedAs: role, currentRole },
        })
      } else {
        surfaceRole = role
      }
    }
  }

  return NextResponse.json({
    ok: true,
    academyName: name,
    role,
    // The surface the user will actually open on — equals `role` unless
    // the flip was skipped (they still hold memberships under the old
    // role) or failed.
    surfaceRole,
  })
}
