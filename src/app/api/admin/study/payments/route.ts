import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminAuth, logAdminActivity } from '@/lib/admin-auth';
import { cancelPayment } from '@/lib/portone-charge';

/**
 * Admin view of study-system income (the PortOne side) + refunds.
 *
 * GET /api/admin/study/payments?studentId=<uuid>   → one student's payments
 * GET /api/admin/study/payments?scope=all&kind=&q=&page=  → all study payments
 *   Rows: credit packs, exam passes, and subscription charges (backfilled +
 *   recorded going forward). Refund state comes from the local `refunded_at`
 *   column — set by our refund action — so the list is fast and doesn't need a
 *   per-row live PortOne call. (A refund issued directly in the PortOne console,
 *   outside this tool, won't be reflected here.)
 *
 * POST /api/admin/study/payments   { paymentId, reason }
 *   → full refund via PortOne (operator-initiated only) + stamp refunded_at.
 *
 * Admin-only; study data is minors' billing info so access is gated.
 */

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const KINDS = ['study_credit_pack', 'study_exam_pass', 'study_subscription'] as const;

interface PayRow {
  payment_id: string;
  student_id: string;
  kind: string;
  amount_won: number | null;
  created_at: string | null;
  refunded_at: string | null;
}

function toDto(r: PayRow, student?: { name: string | null; email: string | null }) {
  return {
    paymentId: r.payment_id,
    studentId: r.student_id,
    studentName: student?.name ?? null,
    studentEmail: student?.email ?? null,
    kind: r.kind,
    amountWon: r.amount_won ?? null,
    createdAt: r.created_at,
    refunded: !!r.refunded_at,
    refundedAt: r.refunded_at,
  };
}

async function attachStudents(rows: PayRow[]) {
  const ids = Array.from(new Set(rows.map((r) => r.student_id)));
  const map = new Map<string, { name: string | null; email: string | null }>();
  if (ids.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, name, email').in('id', ids);
    for (const u of users ?? []) map.set(u.id as string, { name: u.name as string | null, email: u.email as string | null });
  }
  return rows.map((r) => toDto(r, map.get(r.student_id)));
}

// Net revenue = paid minus refunded.
function netRevenue(rows: PayRow[]) {
  return rows.filter((r) => !r.refunded_at).reduce((sum, r) => sum + (r.amount_won ?? 0), 0);
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const sp = req.nextUrl.searchParams;
  const studentId = sp.get('studentId');
  const scope = sp.get('scope');

  // ── Per-student ────────────────────────────────────────────────────────
  if (studentId) {
    const { data, error } = await supabaseAdmin
      .from('study_payments')
      .select('payment_id, student_id, kind, amount_won, created_at, refunded_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[admin/study/payments] per-student', error);
      return NextResponse.json({ error: 'list failed' }, { status: 500 });
    }
    const rows = (data ?? []) as PayRow[];
    return NextResponse.json({ payments: rows.map((r) => toDto(r)), grossWon: netRevenue(rows) });
  }

  // ── Global list ────────────────────────────────────────────────────────
  if (scope !== 'all') return NextResponse.json({ error: 'studentId or scope=all required' }, { status: 400 });

  const kind = sp.get('kind');
  const q = sp.get('q')?.trim();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);

  // Resolve a name/email search to the matching student ids first.
  let studentFilter: string[] | null = null;
  if (q) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(500);
    studentFilter = (users ?? []).map((u) => u.id as string);
    if (studentFilter.length === 0) {
      return NextResponse.json({ payments: [], total: 0, page, pageSize: PAGE_SIZE, grossWon: 0 });
    }
  }

  let query = supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, kind, amount_won, created_at, refunded_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (kind && (KINDS as readonly string[]).includes(kind)) query = query.eq('kind', kind);
  if (studentFilter) query = query.in('student_id', studentFilter);

  const { data, error } = await query;
  if (error) {
    console.error('[admin/study/payments] global', error);
    return NextResponse.json({ error: 'list failed' }, { status: 500 });
  }
  const all = (data ?? []) as PayRow[];
  const grossWon = netRevenue(all);
  const total = all.length;
  const pageRows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const payments = await attachStudents(pageRows);
  return NextResponse.json({ payments, total, page, pageSize: PAGE_SIZE, grossWon });
}

const RefundSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.success) return auth.response;

  const parsed = RefundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad body' }, { status: 400 });
  const { paymentId, reason } = parsed.data;

  // Only refund payments that are ours (a study_payments row).
  const { data: row } = await supabaseAdmin
    .from('study_payments')
    .select('payment_id, student_id, amount_won, kind, refunded_at')
    .eq('payment_id', paymentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: 'payment not found' }, { status: 404 });
  if (row.refunded_at) return NextResponse.json({ error: 'already refunded' }, { status: 409 });

  const result = await cancelPayment({ paymentId, reason });
  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? 'refund failed' }, { status: 502 });
  }

  // Stamp the local refund so the lists reflect it without a PortOne round-trip.
  await supabaseAdmin
    .from('study_payments')
    .update({ refunded_at: new Date().toISOString(), refund_reason: reason })
    .eq('payment_id', paymentId);

  await logAdminActivity({
    adminUserId: auth.user.id,
    action: 'STUDY_PAYMENT_REFUND',
    description: `Refunded study payment ${paymentId} (${row.kind}, ${row.amount_won ?? '?'} KRW) — ${reason}`,
  });

  return NextResponse.json({ ok: true, status: result.status ?? 'CANCELLED', cancelledAmount: result.cancelledAmount ?? null });
}
