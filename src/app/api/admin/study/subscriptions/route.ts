import { NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth } from '@/lib/admin-auth';

/**
 * Admin browsable list of ALL study subscriptions.
 *
 * GET /api/admin/study/subscriptions?status=&plan=&q=&test=&page=
 *   → rows joined with the student name/email, filterable by status / plan /
 *     name-or-email search / test-user flag, paginated, with per-status
 *     counts for the filter.
 *
 *   test=test → only students flagged is_test_user; test=real → only
 *   unflagged students; anything else (or absent) → everyone. The flag lives
 *   in study_user_prefs, so both branches resolve the flagged id set first.
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
  const test = sp.get('test'); // 'test' | 'real' | anything else = all
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  // Test-user filter → the flagged student-id set. Paged past the PostgREST
  // 1000-row cap so a large flagged cohort is never silently truncated.
  let testIds: string[] | null = null;
  if (test === 'test' || test === 'real') {
    const ids: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error: tErr } = await dbAdmin
        .from('study_user_prefs')
        .select('student_id')
        .eq('is_test_user', true)
        .order('student_id')
        .range(from, from + 999);
      if (tErr) {
        console.error('[admin/study/subscriptions] test ids', tErr);
        return NextResponse.json({ error: 'list failed' }, { status: 500 });
      }
      ids.push(...(data ?? []).map((r) => r.student_id as string));
      if ((data ?? []).length < 1000) break;
    }
    testIds = ids;
    if (test === 'test' && testIds.length === 0) {
      return NextResponse.json({ subscriptions: [], total: 0, page, pageSize: PAGE_SIZE, counts: {} });
    }
  }

  // Name/email search → matching student ids first.
  let studentFilter: string[] | null = null;
  if (q) {
    const { data: users } = await dbAdmin
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

  // Exact total from Postgres (head:true fetches no rows), then only this
  // page's rows — so the count stays right as the table grows. Filters are
  // applied to both queries and MUST stay in sync.
  // PostgREST `not in` filter value: (uuid1,uuid2,...)
  const notInList = testIds && testIds.length > 0 ? `(${testIds.join(',')})` : null;

  let countQuery = dbAdmin.from('study_subscriptions').select('student_id', { count: 'exact', head: true });
  if (status && status !== 'all') countQuery = countQuery.eq('status', status);
  if (plan && plan !== 'all') countQuery = countQuery.eq('plan', plan);
  if (studentFilter) countQuery = countQuery.in('student_id', studentFilter);
  if (test === 'test' && testIds) countQuery = countQuery.in('student_id', testIds);
  if (test === 'real' && notInList) countQuery = countQuery.not('student_id', 'in', notInList);
  const { count } = await countQuery;
  const total = count ?? 0;

  const from = (page - 1) * PAGE_SIZE;
  let query = dbAdmin
    .from('study_subscriptions')
    .select(SELECT)
    .order('updated_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (status && status !== 'all') query = query.eq('status', status);
  if (plan && plan !== 'all') query = query.eq('plan', plan);
  if (studentFilter) query = query.in('student_id', studentFilter);
  if (test === 'test' && testIds) query = query.in('student_id', testIds);
  if (test === 'real' && notInList) query = query.not('student_id', 'in', notInList);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/study/subscriptions] list', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }
  const pageRows = (data ?? []) as SubRow[];

  // Attach student name/email + test-user flag for the page.
  const ids = Array.from(new Set(pageRows.map((r) => r.student_id)));
  const nameMap = new Map<string, { name: string | null; email: string | null }>();
  const testMap = new Map<string, boolean>();
  if (ids.length > 0) {
    const [{ data: users }, { data: prefs }] = await Promise.all([
      dbAdmin.from('users').select('id, name, email').in('id', ids),
      dbAdmin.from('study_user_prefs').select('student_id, is_test_user').in('student_id', ids),
    ]);
    for (const u of users ?? []) nameMap.set(u.id, { name: u.name, email: u.email });
    for (const p of prefs ?? []) testMap.set(p.student_id, p.is_test_user);
  }

  // Per-status counts for the filter (whole table, ignoring the status
  // filter) — grouped in Postgres rather than by fetching every row.
  const { data: statusRows } = await dbAdmin.rpc('admin_study_subscription_status_counts');
  const counts: Record<string, number> = {};
  for (const r of (statusRows ?? []) as Array<{ status: string; cnt: number }>) {
    counts[r.status] = Number(r.cnt);
  }

  const subscriptions = pageRows.map((r) => ({
    studentId: r.student_id,
    studentName: nameMap.get(r.student_id)?.name ?? null,
    studentEmail: nameMap.get(r.student_id)?.email ?? null,
    isTestUser: testMap.get(r.student_id) ?? false,
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
