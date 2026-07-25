import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/admin-auth';

/**
 * Admin browsable list of ALL study subscriptions.
 *
 * GET /api/admin/study/subscriptions?status=&plan=&q=&page=
 *   → rows joined with the student name/email, filterable by status / plan /
 *     name-or-email search, paginated, with per-status counts for the filter.
 *
 * Admin-only.
 */

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

interface SubRow {
  student_id: string;
  status: string;
  plan: string;
  currency: string | null;
  price_cents: number | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  grant_credits_remaining: number | null;
  purchased_credits_remaining: number | null;
  pending_plan: string | null;
  last_payment_failure: string | null;
  updated_at: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const plan = sp.get('plan');
  const q = sp.get('q')?.trim();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  // Name/email search → matching student ids first.
  let studentFilter: string[] | null = null;
  if (q) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(500);
    studentFilter = (users ?? []).map((u) => u.id as string);
    if (studentFilter.length === 0) {
      return NextResponse.json({ subscriptions: [], total: 0, page, pageSize: PAGE_SIZE, counts: {} });
    }
  }

  const SELECT = 'student_id, status, plan, currency, price_cents, current_period_end, cancel_at_period_end, grant_credits_remaining, purchased_credits_remaining, pending_plan, last_payment_failure, updated_at';
  let query = supabaseAdmin.from('study_subscriptions').select(SELECT).order('updated_at', { ascending: false }).limit(2000);
  if (status && status !== 'all') query = query.eq('status', status);
  if (plan && plan !== 'all') query = query.eq('plan', plan);
  if (studentFilter) query = query.in('student_id', studentFilter);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/study/subscriptions] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }
  const all = (data ?? []) as SubRow[];
  const total = all.length;
  const pageRows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Attach student name/email for the page.
  const ids = Array.from(new Set(pageRows.map((r) => r.student_id)));
  const nameMap = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, name, email').in('id', ids);
    for (const u of users ?? []) nameMap.set(u.id as string, { name: u.name as string | null, email: u.email as string | null });
  }

  // Per-status counts for the filter (whole table, ignoring the status filter).
  const { data: statusRows } = await supabaseAdmin.from('study_subscriptions').select('status');
  const counts: Record<string, number> = {};
  for (const r of statusRows ?? []) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;

  const subscriptions = pageRows.map((r) => ({
    studentId: r.student_id,
    studentName: nameMap.get(r.student_id)?.name ?? null,
    studentEmail: nameMap.get(r.student_id)?.email ?? null,
    status: r.status,
    plan: r.plan,
    priceWon: typeof r.price_cents === 'number' ? Math.round(r.price_cents / 100) : null,
    currentPeriodEnd: r.current_period_end,
    cancelAtPeriodEnd: !!r.cancel_at_period_end,
    creditsTotal: (r.grant_credits_remaining ?? 0) + (r.purchased_credits_remaining ?? 0),
    pendingPlan: r.pending_plan,
    lastPaymentFailure: r.last_payment_failure,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ subscriptions, total, page, pageSize: PAGE_SIZE, counts });
}
