import { NextRequest, NextResponse } from 'next/server'
import { dbAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { displayName, type Relation } from '@/lib/name'

/**
 * GET /api/account/guardian-context
 *
 * Returns { relation, childName } for the CALLING user only.
 *
 * WHY THIS IS A SERVER ROUTE AND NOT A CLIENT QUERY.
 * The name re-prompt shows the 150 relationship-label parents their child as
 * read-only context ("송지우 학생 아버지") instead of asking them to "correct"
 * a name that was never theirs — their `users.name` is the masked label
 * `송**` and their real name exists nowhere in the database.
 *
 * The first implementation read the sibling `family_members` row from the
 * browser and it silently returned nothing, so the banner rendered a bare
 * "father" with no child. The cause is RLS, not a bug in the query:
 *
 *   family_members_parents_access  USING (users.role = 'parent'
 *                                         AND user_id = auth.uid())
 *
 * A parent can read ONLY their own family_members row. The child's row, and
 * the child's users row, are both invisible to them. No amount of client-side
 * querying can produce the child's name, and loosening that policy to fix a
 * banner subtitle would widen a security boundary for cosmetic reasons.
 *
 * So the lookup runs here, under the service-role client, scoped to the
 * caller's own family and returning only a display name. The route never
 * accepts a user id from the request — it uses the verified session — so a
 * parent cannot ask about anyone else's family.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The caller's own family_members row, and only one carrying a relation:
  // a student's row has relation NULL, so this also scopes to guardians.
  const { data: member } = await dbAdmin
    .from('family_members')
    .select('family_id, relation')
    .eq('user_id', user.id)
    .not('relation', 'is', null)
    .limit(1)
    .maybeSingle()

  if (!member?.family_id) {
    return NextResponse.json({ relation: null, childName: '' })
  }

  const { data: child } = await dbAdmin
    .from('family_members')
    .select('user_id')
    .eq('family_id', member.family_id)
    .eq('role', 'student')
    .not('user_id', 'is', null)
    .limit(1)
    .maybeSingle()

  let childName = ''
  if (child?.user_id) {
    const { data: childUser } = await dbAdmin
      .from('users')
      .select('name, family_name, given_name')
      .eq('id', child.user_id)
      .maybeSingle()
    // displayName() falls back to users.name, which is NOT NULL — so this is
    // never blank for a real child row.
    if (childUser) childName = displayName(childUser)
  }

  return NextResponse.json({
    relation: (member.relation as Relation | null) ?? null,
    childName,
  })
}
