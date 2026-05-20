import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

/**
 * GET /api/account/check-deletion-eligibility
 *
 * Tells the client what kind of deletion confirmation modal to show.
 * The /api/account/delete endpoint re-validates everything server-side —
 * this endpoint is purely UX (so we can show the right warning before
 * the user types their email and clicks confirm).
 *
 * Response shapes:
 *   { canDelete: true, role: 'student' | 'parent' | 'teacher' }
 *     → standard delete modal
 *
 *   { canDelete: true, role: 'manager', requiresCascadeConfirmation: false }
 *     → standard modal (multi-manager; deletion only removes this user)
 *
 *   { canDelete: true, role: 'manager', requiresCascadeConfirmation: true,
 *     soleManagedAcademies: [{ academyId, academyName, memberCount }] }
 *     → enhanced modal: warns about academy closure, requires extra
 *       confirmation toggle, the delete request must include
 *       confirmCascadeAcademy: true
 *
 *   { canDelete: false, reason: 'unsupported_role' }
 *     → admin/super_admin accounts can't self-delete
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Look up the user's role.
  const { data: userRow, error: userRowError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userRowError || !userRow) {
    return NextResponse.json(
      { error: 'User record not found' },
      { status: 404 }
    )
  }

  const role = userRow.role as string

  if (role === 'admin' || role === 'super_admin') {
    return NextResponse.json({
      canDelete: false,
      reason: 'unsupported_role',
    })
  }

  // Non-manager roles never trigger the academy cascade path.
  if (role !== 'manager') {
    return NextResponse.json({
      canDelete: true,
      role,
      requiresCascadeConfirmation: false,
    })
  }

  // Manager: check sole-manager status via the SECURITY DEFINER function
  // that bypasses RLS so we can read across all academies they manage.
  const { data: soleAcademies, error: soleError } = await supabaseAdmin
    .rpc('user_sole_managed_academies', { p_user_id: user.id })

  if (soleError) {
    console.error('[eligibility] user_sole_managed_academies failed:', soleError)
    return NextResponse.json(
      { error: 'Eligibility check failed' },
      { status: 500 }
    )
  }

  const academies = (soleAcademies ?? []) as Array<{
    academy_id: string
    academy_name: string
    member_count: number
  }>

  if (academies.length === 0) {
    return NextResponse.json({
      canDelete: true,
      role: 'manager',
      requiresCascadeConfirmation: false,
    })
  }

  return NextResponse.json({
    canDelete: true,
    role: 'manager',
    requiresCascadeConfirmation: true,
    soleManagedAcademies: academies.map((a) => ({
      academyId: a.academy_id,
      academyName: a.academy_name,
      // member_count includes the manager themselves; subtract for clarity.
      otherMemberCount: Math.max(0, Number(a.member_count) - 1),
    })),
  })
}
