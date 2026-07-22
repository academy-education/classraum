import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';

/**
 * Admin review queue for student-filed question reports.
 *
 * GET  /api/admin/study/reports?status=open   → list reports (newest first)
 * PATCH /api/admin/study/reports              → { id, status, archiveItem? }
 *   - transitions a report's status (open|reviewing|resolved|dismissed)
 *   - archiveItem:true also best-effort archives the underlying bank item
 *     (matched by the reported prompt) so it stops being served.
 *
 * Admin-only; mutations are logged to admin_activity_logs.
 */

export const dynamic = 'force-dynamic';

const STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const status = req.nextUrl.searchParams.get('status') ?? 'open';
  let query = supabaseAdmin
    .from('study_question_reports')
    .select('id, student_id, session_id, question_hash, question_snapshot, reason, note, status, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all' && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq('status', status);
  }
  const { data: reports, error } = await query;
  if (error) {
    console.error('[admin/study/reports] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }

  // Attach reporter name/email for context (single round-trip).
  const ids = Array.from(new Set((reports ?? []).map(r => r.student_id as string)));
  const nameMap = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, name, email').in('id', ids);
    for (const u of users ?? []) nameMap.set(u.id as string, { name: u.name as string | null, email: u.email as string | null });
  }

  // Counts per status for the tab badges.
  const { data: allStatuses } = await supabaseAdmin.from('study_question_reports').select('status');
  const counts: Record<string, number> = { open: 0, reviewing: 0, resolved: 0, dismissed: 0 };
  for (const r of allStatuses ?? []) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;

  return NextResponse.json({
    reports: (reports ?? []).map(r => ({ ...r, reporter: nameMap.get(r.student_id as string) ?? null })),
    counts,
  });
}

const PatchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
  archiveItem: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { id, status, archiveItem } = parsed.data;

  const terminal = status === 'resolved' || status === 'dismissed';
  const { data: updated, error } = await supabaseAdmin
    .from('study_question_reports')
    .update({ status, resolved_at: terminal ? new Date().toISOString() : null })
    .eq('id', id)
    .select('question_snapshot')
    .maybeSingle();
  if (error) {
    console.error('[admin/study/reports] update', error);
    return NextResponse.json({ error: 'update failed' }, { status: 500 });
  }

  // Best-effort: archive the underlying bank item so it stops being served.
  // Served questions carry no id, so match on the exact prompt text of the
  // reported snapshot. Only archives an EXACT prompt match (no fuzzy).
  let archived = 0;
  if (archiveItem) {
    const prompt = (updated?.question_snapshot as { prompt?: string } | null)?.prompt;
    if (prompt) {
      const { data: rows, error: archErr } = await supabaseAdmin
        .from('study_item_bank')
        .update({ archived: true })
        .eq('item->>prompt', prompt)
        .eq('archived', false)
        .select('id');
      if (archErr) console.error('[admin/study/reports] archive', archErr);
      archived = rows?.length ?? 0;
    }
  }

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_REPORT_UPDATE',
    description: `Report ${id} → ${status}${archiveItem ? ` (archived ${archived} bank item(s))` : ''}`,
  });

  return NextResponse.json({ ok: true, archived });
}
