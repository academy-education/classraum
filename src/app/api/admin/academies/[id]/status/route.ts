import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: confirm caller is admin/super_admin. Returns the user id on success.
async function requireAdmin(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return null

  const { data: userInfo } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
    return null
  }
  return { userId: user.id }
}

// ---- PATCH /api/admin/academies/[id]/status ----
//
// Suspend or reactivate an academy. This MUST run with the service-role key:
// the browser anon client is blocked by RLS on academies writes (reads were
// already migrated to the admin API for the same reason). Body:
//   { suspend: boolean, reason?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Academy id required' }, { status: 400 })
  }

  let body: { suspend?: boolean; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.suspend !== 'boolean') {
    return NextResponse.json({ error: '`suspend` (boolean) is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('academies')
    .update({
      is_suspended: body.suspend,
      suspension_reason: body.suspend ? (body.reason || null) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, is_suspended, suspension_reason')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Best-effort audit trail — never block the action on a logging failure.
  try {
    await supabase.from('admin_activity_logs').insert({
      admin_id: auth.userId,
      action_type: body.suspend ? 'ACADEMY_SUSPEND' : 'ACADEMY_UNSUSPEND',
      target_type: 'academy',
      target_id: id,
      description: body.suspend
        ? `Suspended academy "${data?.name ?? id}"${body.reason ? `: ${body.reason}` : ''}`
        : `Reactivated academy "${data?.name ?? id}"`,
    })
  } catch {
    /* ignore logging errors */
  }

  return NextResponse.json({ academy: data })
}
