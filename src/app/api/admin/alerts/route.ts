import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';

/**
 * Admin resolve endpoint for operational alerts.
 *
 * PATCH /api/admin/alerts   → body one of:
 *   { ids: string[] }   — resolve a specific set of alert rows
 *   { all: true }       — resolve every currently-unresolved alert
 *
 * The `alerts` table has an admin-only SELECT RLS policy but NO update
 * policy, so a browser `update()` silently no-ops (0 rows, no error) and
 * the alert reappears on reload. Mutations therefore MUST go through this
 * service-role route. Admin-only; logged to admin_activity_logs.
 */

export const dynamic = 'force-dynamic';

const PatchSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1) }),
  z.object({ all: z.literal(true) }),
]);

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });

  const resolvedAt = new Date().toISOString();
  let query = supabaseAdmin
    .from('alerts')
    .update({ resolved: true, resolved_at: resolvedAt })
    .eq('resolved', false);

  if ('ids' in parsed.data) {
    query = query.in('id', parsed.data.ids);
  }

  const { data: updated, error } = await query.select('id');
  if (error) {
    console.error('[admin/alerts] resolve', error);
    return NextResponse.json({ error: 'resolve failed' }, { status: 500 });
  }

  const count = updated?.length ?? 0;
  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'ALERTS_RESOLVE',
    description: 'all' in parsed.data
      ? `Resolved all unresolved alerts (${count})`
      : `Resolved ${count} alert(s)`,
  });

  return NextResponse.json({ ok: true, resolved: count });
}
