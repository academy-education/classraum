import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/app/api/admin/_lib/admin-auth'

/**
 * Add a manager or teacher to an existing academy.
 *
 * ── Why this route exists ────────────────────────────────────────────
 * Migration 103 closed a live privilege escalation: signup let anyone
 * pick "manager", type an academy UUID from an invite link, and read
 * that academy's students, parents and teachers. Proven against
 * production before it was closed.
 *
 * That self-serve path was ALSO the only way a second manager was ever
 * added — HERALD has five, and every one of them arrived through it. So
 * closing the hole removed a capability the product genuinely needs, and
 * this route is the replacement rather than an afterthought.
 *
 * ── Why it is admin-only rather than manager-facing ──────────────────
 * The RLS policy `managers_added_by_manager` already lets an active
 * manager add someone to their OWN academy, so a manager-facing UI is
 * possible and is the better long-term answer. It is not what this is:
 * academies themselves are provisioned out of band (there is no
 * academies INSERT anywhere in the codebase), so admin is where academy
 * membership is actually administered today, and matching that is less
 * surprising than inventing a second model.
 */
export const dynamic = 'force-dynamic'

const ROLES = ['manager', 'teacher'] as const
type MemberRole = (typeof ROLES)[number]

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { email?: string; academyId?: string; role?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const email = String(body.email ?? '').trim().toLowerCase()
  const academyId = String(body.academyId ?? '').trim()
  const role = body.role as MemberRole | undefined

  if (!email || !academyId) {
    return NextResponse.json({ error: 'email and academyId are required' }, { status: 400 })
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of ${ROLES.join(', ')}` }, { status: 400 })
  }

  // The academy must exist. Without this the row would be created against
  // a typo'd UUID and simply never appear anywhere — the same silent
  // failure the escalation fix was about.
  const { data: academy } = await dbAdmin
    .from('academies').select('id, name').eq('id', academyId).maybeSingle()
  if (!academy) return NextResponse.json({ error: 'academy not found' }, { status: 404 })

  // The person must already have an account. This route attaches an
  // existing user to an academy; it deliberately does NOT create accounts,
  // because that would put account creation behind an admin token and
  // reintroduce a way to make privileged users without their knowledge.
  const { data: user } = await dbAdmin
    .from('users').select('id, email, role').eq('email', email).maybeSingle()
  if (!user) {
    return NextResponse.json(
      { error: 'no account with that email — ask them to sign up first, then add them here' },
      { status: 404 },
    )
  }

  const table = role === 'manager' ? 'managers' : 'teachers'

  const { data: already } = await dbAdmin
    .from(table).select('user_id').eq('user_id', user.id).eq('academy_id', academyId).maybeSingle()
  if (already) {
    return NextResponse.json({ ok: true, alreadyMember: true, academy: academy.name })
  }

  const { error: insErr } = await dbAdmin
    .from(table).insert({ user_id: user.id, academy_id: academyId, active: true })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  /*
   * users.role is the DEFAULT SURFACE pointer, not the identity — the
   * join tables are the identity. It is only promoted, never demoted:
   * someone who is a manager elsewhere must not be downgraded because
   * they were just added as a teacher here, and an admin must never be
   * silently reduced to a teacher by this route.
   */
  const RANK: Record<string, number> = { student: 0, parent: 0, teacher: 1, manager: 2, admin: 3, super_admin: 4 }
  let surfaceUpdated = false
  if ((RANK[user.role] ?? 0) < RANK[role]) {
    /*
     * CHECKED, not fire-and-forget. The membership row is already
     * written at this point, so a failure here is not fatal — the person
     * IS a manager, they just land on the wrong default screen. But it
     * must be visible: silently discarding a supabase write result is
     * how this codebase previously let RLS denials disappear, and the
     * caller needs to know the surface pointer did not move.
     */
    const { error: roleErr } = await dbAdmin.from('users').update({ role }).eq('id', user.id)
    if (roleErr) {
      console.error('[academy-members] membership created but users.role not promoted:', roleErr)
    } else {
      surfaceUpdated = true
    }
  }

  return NextResponse.json({
    ok: true, academy: academy.name, role, userId: user.id,
    surfaceUpdated,
    ...(!surfaceUpdated && (RANK[user.role] ?? 0) < RANK[role]
      ? { warning: 'added to the academy, but their default screen could not be updated' }
      : {}),
  })
}
